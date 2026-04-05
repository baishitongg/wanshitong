import { prisma } from "@/lib/prisma";
import {
  serializeOrder,
  serializeProduct,
  STAFF_ORDER_INCLUDE,
  VALID_ORDER_STATUSES,
} from "@/lib/shops";
import type { ContactChannel, OrderStatus, Prisma } from "@prisma/client";

const AUTO_RECEIVE_DAYS = 20;

type CreateOrderInput = {
  shopId: string;
  userId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel | null;
  notes?: string | null;
  addressId?: string | null;
  selectedProductIds?: string[];
  paymentMethod?: "QR" | "BANK_TRANSFER" | null;
  paymentReceiptUrl?: string | null;
};

type CartLineItem = {
  id: string;
  productId: string;
  quantity: number;
  slotKey?: string | null;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  meta?: Prisma.JsonValue | null;
  product: {
    id: string;
    price: Prisma.Decimal | number;
    costPrice?: Prisma.Decimal | number | null;
    stock: number;
    itemType: "PHYSICAL" | "SERVICE";
    fulfillmentType: "DELIVERY" | "PICKUP" | "BOOKING";
    requiresScheduling: boolean;
    requiresAddress: boolean;
  };
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
  slotKey?: string | null;
  scheduledStart?: string | Date | null;
  scheduledEnd?: string | Date | null;
  meta?: Prisma.JsonValue | null;
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

  const isService =
    product.itemType === "SERVICE" ||
    product.requiresScheduling ||
    product.fulfillmentType === "BOOKING";

  if (!isService && product.stock < params.quantity) {
    throw new Error("INSUFFICIENT_STOCK");
  }

  if (
    isService &&
    (!params.slotKey || !params.scheduledStart || !params.scheduledEnd)
  ) {
    throw new Error("SLOT_REQUIRED");
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

  const existing = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId: params.productId,
    },
  });

  if (existing) {
    return prisma.cartItem.update({
      where: { id: existing.id },
      data: {
        quantity: isService ? 1 : params.quantity,
        slotKey: isService ? params.slotKey : null,
        scheduledStart: isService ? new Date(params.scheduledStart!) : null,
        scheduledEnd: isService ? new Date(params.scheduledEnd!) : null,
        meta: isService ? params.meta ?? null : null,
      } as never,
      include: {
        product: {
          include: { category: true },
        },
      },
    });
  }

  return prisma.cartItem.create({
    data: {
      cartId: cart.id,
      productId: params.productId,
      quantity: isService ? 1 : params.quantity,
      slotKey: isService ? params.slotKey : null,
      scheduledStart: isService ? new Date(params.scheduledStart!) : null,
      scheduledEnd: isService ? new Date(params.scheduledEnd!) : null,
      meta: isService ? params.meta ?? null : null,
    } as never,
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
  const cart = (await getCartByUserAndShop(input.userId, input.shopId)) as
    | ({
        id: string;
        items: CartLineItem[];
      })
    | null;

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

  const requiresAddress = selectedItems.some((item) => item.product.requiresAddress);
  let address = null;

  if (requiresAddress) {
    if (!input.addressId) {
      throw new Error("ADDRESS_REQUIRED");
    }

    address = await prisma.address.findUnique({
      where: { id: input.addressId },
    });

    if (!address || address.userId !== input.userId) {
      throw new Error("ADDRESS_NOT_FOUND");
    }
  }

  const resolvedPhone = (input.customerPhone ?? "").trim();
  const resolvedTelegram = (input.telegramUsername ?? "")
    .trim()
    .replace(/^@+/, "");
  const preferredChannel = input.preferredContactChannel ?? "PHONE";
  const paymentReceiptUrl = input.paymentReceiptUrl?.trim() || null;

  if (preferredChannel === "PHONE" && !resolvedPhone) {
    throw new Error("PHONE_REQUIRED");
  }

  if (preferredChannel === "TELEGRAM" && !resolvedTelegram) {
    throw new Error("TELEGRAM_REQUIRED");
  }

  if (!input.paymentMethod) {
    throw new Error("PAYMENT_METHOD_REQUIRED");
  }

  if (!paymentReceiptUrl) {
    throw new Error("PAYMENT_RECEIPT_REQUIRED");
  }

  const order = await prisma.$transaction(async (tx) => {
    for (const item of selectedItems) {
      if (item.product.itemType === "SERVICE" || item.product.fulfillmentType === "BOOKING") {
        if (!item.slotKey || !item.scheduledStart || !item.scheduledEnd) {
          throw new Error("SLOT_REQUIRED");
        }

        const bookedCount = await tx.orderItem.count({
          where: {
            productId: item.productId,
            scheduledStart: item.scheduledStart,
            scheduledEnd: item.scheduledEnd,
            order: {
              shopId: input.shopId,
              status: {
                not: "CANCELLED",
              },
            },
          },
        });

        if (bookedCount > 0) {
          throw new Error("SLOT_UNAVAILABLE");
        }
      } else {
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
    }

    const totalAmount = selectedItems.reduce(
      (sum, item) => sum + Number(item.product.price) * item.quantity,
      0,
    );
    const bookingSnapshot = selectedItems.find(
      (item) => item.scheduledStart && item.scheduledEnd,
    );
    const bookingFlow = selectedItems.every(
      (item) => item.product.fulfillmentType === "BOOKING",
    );

    const newOrder = await tx.order.create({
      data: {
        shopId: input.shopId,
        userId: input.userId,
        flowType: bookingFlow ? "BOOKING" : "DELIVERY",
        customerName: input.customerName ?? null,
        customerPhone: resolvedPhone || null,
        telegramUsername: resolvedTelegram || null,
        preferredContactChannel: preferredChannel,
        notes: input.notes ?? null,
        totalAmount,
        addressId: address?.id ?? null,
        deliveryRecipient: address?.recipient ?? null,
        deliveryPhone: address?.phone ?? null,
        deliveryStreet: address?.street ?? null,
        deliveryCity: address?.city ?? null,
        deliveryState: address?.state ?? null,
        deliveryPostcode: address?.postcode ?? null,
        deliveryCountry: address?.country ?? null,
        scheduledDate: bookingSnapshot?.scheduledStart ?? null,
        scheduledStartTime: bookingSnapshot?.scheduledStart ?? null,
        scheduledEndTime: bookingSnapshot?.scheduledEnd ?? null,
        paymentMethod: input.paymentMethod,
        paymentReceiptUrl,
        paymentReceiptUploadedAt: paymentReceiptUrl ? new Date() : null,
        items: {
          create: selectedItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.product.price,
            costPriceSnapshot:
              item.product.costPrice === undefined || item.product.costPrice === null
                ? null
                : item.product.costPrice,
            itemType: item.product.itemType,
            fulfillmentType: item.product.fulfillmentType,
            scheduledDate: item.scheduledStart ?? null,
            scheduledStart: item.scheduledStart ?? null,
            scheduledEnd: item.scheduledEnd ?? null,
          })),
        },
      } as never,
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
  await autoReceiveShippedOrders({
    userId,
    shopId,
  });

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
  await autoReceiveShippedOrders(where);

  const orders = await prisma.order.findMany({
    where,
    include: STAFF_ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return orders.map(serializeOrder);
}

export async function autoReceiveShippedOrders(where?: Prisma.OrderWhereInput) {
  const cutoff = new Date(Date.now() - AUTO_RECEIVE_DAYS * 24 * 60 * 60 * 1000);

  await prisma.order.updateMany({
    where: {
      status: "SHIPPED" as never,
      updatedAt: {
        lte: cutoff,
      },
      ...(where ?? {}),
    } as never,
    data: {
      status: "RECEIVED" as never,
    } as never,
  });
}

export async function updateOrderStatus(
  orderId: string,
  nextStatus: OrderStatus,
  scope?: { shopId?: string; userId?: string; assignedStaffUserId?: string },
) {
  if (!VALID_ORDER_STATUSES.includes(nextStatus as (typeof VALID_ORDER_STATUSES)[number])) {
    throw new Error("INVALID_STATUS");
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    const existingOrder = await tx.order.findFirst({
      where: {
        id: orderId,
        ...(scope?.shopId ? { shopId: scope.shopId } : {}),
        ...(scope?.userId ? { userId: scope.userId } : {}),
        ...(scope?.assignedStaffUserId
          ? { assignedStaffUserId: scope.assignedStaffUserId }
          : {}),
      },
      include: {
        items: true,
      },
    });

    if (!existingOrder) {
      throw new Error("ORDER_NOT_FOUND");
    }

    const existingStatus = String(existingOrder.status);

    if (
      (existingStatus === "CANCELLED" || existingStatus === "RECEIVED") &&
      nextStatus !== existingStatus
    ) {
      throw new Error("ORDER_STATUS_LOCKED");
    }

    if (existingStatus !== "CANCELLED" && nextStatus === "CANCELLED") {
      for (const item of existingOrder.items) {
        if (item.itemType !== "SERVICE") {
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
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: STAFF_ORDER_INCLUDE,
    });
  });

  return serializeOrder(updatedOrder);
}

export async function assignOrderToStaff(orderId: string, staffUserId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      shopId: true,
      status: true,
    },
  });

  if (!order) {
    throw new Error("ORDER_NOT_FOUND");
  }

  const staffProfile = await prisma.staffProfile.findFirst({
    where: {
      userId: staffUserId,
      shopId: order.shopId,
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (!staffProfile) {
    throw new Error("STAFF_NOT_IN_SHOP");
  }

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      assignedStaffUserId: staffUserId,
      assignedToStaffAt: new Date(),
      status: "PROCESSING" as never,
    } as never,
    include: STAFF_ORDER_INCLUDE,
  });

  return serializeOrder(updatedOrder);
}
