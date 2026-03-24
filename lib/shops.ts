import { auth } from "@/lib/auth";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { OrderStatus, Prisma, Role, type Shop } from "@prisma/client";

export type SessionUser = {
  id?: string;
  role?: Role | string;
  name?: string | null;
  phone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: "PHONE" | "TELEGRAM" | null;
  staffShopId?: string | null;
  staffShopSlug?: string | null;
};

export async function getDefaultShop() {
  return prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
  });
}

export async function getShopBySlug(shopSlug: string) {
  return prisma.shop.findUnique({
    where: { slug: shopSlug },
  });
}

export async function requireShopBySlug(shopSlug: string) {
  const shop = await getShopBySlug(shopSlug);

  if (!shop || shop.status !== "ACTIVE") {
    throw new Error("SHOP_NOT_FOUND");
  }

  return shop;
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user as SessionUser | undefined;
}

export async function getStaffShopContext() {
  const user = await getSessionUser();

  if (!user?.id) {
    throw new Error("UNAUTHORIZED");
  }

  if (String(user.role).toUpperCase() === "ADMIN") {
    return {
      user,
      isAdmin: true,
      shopId: null,
      shopSlug: null,
    };
  }

  if (String(user.role).toUpperCase() !== "STAFF") {
    throw new Error("FORBIDDEN");
  }

  const profile =
    user.staffShopId && user.staffShopSlug
      ? {
          shopId: user.staffShopId,
          shopSlug: user.staffShopSlug,
        }
      : await prisma.staffProfile.findFirst({
          where: {
            userId: user.id,
            isActive: true,
          },
          include: {
            shop: true,
          },
          orderBy: { createdAt: "asc" },
        }).then((record) =>
          record
            ? {
                shopId: record.shopId,
                shopSlug: record.shop.slug,
              }
            : null,
        );

  if (!profile) {
    throw new Error("STAFF_SHOP_NOT_FOUND");
  }

  return {
    user,
    isAdmin: false,
    shopId: profile.shopId,
    shopSlug: profile.shopSlug,
  };
}

export function buildShopHref(shopSlug: string, suffix = "") {
  return `/shops/${shopSlug}${suffix}`;
}

export function serializeProduct<
  T extends {
    price: Prisma.Decimal | number;
  },
>(product: T) {
  return {
    ...product,
    price: Number(product.price),
  };
}

export function serializeOrder<
  T extends {
    totalAmount: Prisma.Decimal | number;
    items?: Array<{
      unitPrice: Prisma.Decimal | number;
    }>;
  },
>(order: T) {
  return {
    ...order,
    totalAmount: Number(order.totalAmount),
    items: order.items?.map((item) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
    })),
  };
}

export const STAFF_ORDER_INCLUDE = {
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      whatsappPhone: true,
      telegramUsername: true,
    },
  },
  items: {
    include: {
      product: true,
    },
  },
  user: {
    select: {
      id: true,
      name: true,
      phone: true,
      telegramUsername: true,
      preferredContactChannel: true,
    },
  },
} satisfies Prisma.OrderInclude;

export const VALID_ORDER_STATUSES = [
  "VERIFYING",
  "PROCESSING",
  "SHIPPED",
  "RECEIVED",
  "CANCELLED",
] as const;

export function isValidOrderStatus(value: string | null): value is OrderStatus {
  return !!value && VALID_ORDER_STATUSES.includes(value as (typeof VALID_ORDER_STATUSES)[number]);
}

export function getShopLandingCards(shops: Shop[]) {
  return shops.map((shop) => ({
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    description: shop.description,
    logoUrl: shop.logoUrl,
    href: buildShopHref(shop.slug),
  }));
}
