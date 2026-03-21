import { prisma } from "@/lib/prisma";
import {
  serializeOrder,
  serializeProduct,
  STAFF_ORDER_INCLUDE,
  VALID_ORDER_STATUSES,
} from "@/lib/shops";
import type { ContactChannel, OrderStatus, Prisma } from "@prisma/client";

type CreateOrderInput = {
  shopId: string;
  userId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel | null;
  notes?: string | null;
  addressId: string;
  selectedProductIds?: string[];
};

export async function getProductsForShop(shopId: string, includeInactive = false) {
  const products = await prisma.product.findMany({
    where: {
      shopId,
      ...(includeInactive ? {} : { status: true }),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  return products.map(serializeProduct);
}

export async function getCategoriesForShop(shopId: string) {
  return prisma.category.findMany({
    where: { shopId },
    orderBy: { name: "asc" },
  });
}

export async function getCartByUserAndShop(userId: string, shopId: string) {
  return prisma.cart.findUnique({
    where: {
      userId_shopId: {
        userId,
        shopId,
      },
    },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function upsertCartItem(params: {
  userId: string;
  shopId: string;
  productId: string;
  quantity: number;
}) {
  const product = await prisma.product.findFirst({
    where: {
      id: params.productId,
      shopId: params.shopId,
      status: true,
    },
  });

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }

  if (product.stock < params.quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  const cart = await prisma.cart.upsert({
    where: {
      userId_shopId: {
        userId: params.userId,
        shopId: params.shopId,
      },
    },
    create: {
      userId: params.userId,
      shopId: params.shopId,
    },
    update: {},
  });

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId: params.productId,
      },
    },
    create: {
      cartId: cart.id,
      productId: params.productId,
      quantity: params.quantity,
    },
    update: {
      quantity: params.quantity,
    },
    include: {
      product: {
        include: { category: true },
      },
    },
  });
}

export async function removeCartItem(userId: string, shopId: string, productId: string) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId_shopId: {
        userId,
        shopId,
      },
    },
  });

  if (!cart) {
    return;
  }

  await prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
      productId,
    },
  });
}

export async function clearCart(userId: string, shopId: string) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId_shopId: {
        userId,
        shopId,
      },
    },
  });

  if (!cart) {
    return;
  }

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  await prisma.cart.delete({
    where: { id: cart.id },
  });
}

export async function createOrderFromCart(input: CreateOrderInput) {
  const address = await prisma.address.findUnique({
    where: { id: input.addressId },
  });

  if (!address || address.userId !== input.userId) {
    throw new Error("ADDRESS_NOT_FOUND");
  }

  const cart = await getCartByUserAndShop(input.userId, input.shopId);

  if (!cart || cart.items.length === 0) {
    throw new Error("EMPTY_CART");
  }

  const selectedItems =
    input.selectedProductIds && input.selectedProductIds.length > 0
      ? cart.items.filter((item) => input.selectedProductIds?.includes(item.productId))
      : cart.items;

  if (selectedItems.length === 0) {
    throw new Error("NO_ITEMS_SELECTED");
  }

  const resolvedPhone = (input.customerPhone ?? "").trim();
  const resolvedTelegram = (input.telegramUsername ?? "")
    .trim()
    .replace(/^@+/, "");
  const preferredChannel = input.preferredContactChannel ?? "PHONE";

  if (preferredChannel === "PHONE" && !resolvedPhone) {
    throw new Error("PHONE_REQUIRED");
  }

  if (preferredChannel === "TELEGRAM" && !resolvedTelegram) {
    throw new Error("TELEGRAM_REQUIRED");
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const item of selectedItems) {
      const updated = await tx.product.updateMany({
        where: {
          id: item.productId,
          shopId: input.shopId,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }
    }

    const totalAmount = selectedItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );

    const newOrder = await tx.order.create({
      data: {
        shopId: input.shopId,
        userId: input.userId,
        customerName: input.customerName ?? null,
        customerPhone: resolvedPhone || null,
        telegramUsername: resolvedTelegram || null,
        preferredContactChannel: preferredChannel,
        notes: input.notes ?? null,
        totalAmount,
        addressId: address.id,
        deliveryRecipient: address.recipient,
        deliveryPhone: address.phone,
        deliveryStreet: address.street,
        deliveryCity: address.city,
        deliveryState: address.state,
        deliveryPostcode: address.postcode,
        deliveryCountry: address.country,
        items: {
          create: selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
          })),
        },
      },
      include: STAFF_ORDER_INCLUDE,
    });

    await tx.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId: {
          in: selectedItems.map((item) => item.productId),
        },
      },
    });

    const remainingCount = await tx.cartItem.count({
      where: { cartId: cart.id },
    });

    if (remainingCount === 0) {
      await tx.cart.delete({
        where: { id: cart.id },
      });
    }

    return newOrder;
  });

  return serializeOrder(order);
}

export async function getOrdersForUserShop(userId: string, shopId: string) {
  const orders = await prisma.order.findMany({
    where: {
      userId,
      shopId,
    },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(serializeOrder);
}

export async function getStaffOrders(where: Prisma.OrderWhereInput) {
  const orders = await prisma.order.findMany({
    where,
    include: STAFF_ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(serializeOrder);
}

export async function updateOrderStatus(orderId: string, nextStatus: OrderStatus, scope?: { shopId?: string }) {
  if (!VALID_ORDER_STATUSES.includes(nextStatus)) {
    throw new Error("INVALID_STATUS");
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: {
        id: orderId,
        ...(scope?.shopId ? { shopId: scope.shopId } : {}),
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      throw new Error("ORDER_NOT_FOUND");
    }

    if (existingOrder.status === "CANCELLED" && nextStatus !== "CANCELLED") {
      throw new Error("ORDER_CANCELLED_LOCKED");
    }

    if (existingOrder.status !== "CANCELLED" && nextStatus === "CANCELLED") {
      for (const item of existingOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: STAFF_ORDER_INCLUDE,
    });
  });

  return serializeOrder(updatedOrder);
}
