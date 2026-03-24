import bcrypt from "bcryptjs";
import { CheckoutMode, Role, ShopStatus, ShopType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/shops";

export function validateLoginId(loginId: string) {
  return /^[a-zA-Z0-9_-]{4,32}$/.test(loginId);
}

export function normalizeShopSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function requireAdminUser() {
  const user = await getSessionUser();

  if (String(user?.role ?? "").toUpperCase() !== "ADMIN") {
    throw new Error("FORBIDDEN");
  }

  return user;
}

type CreateShopInput = {
  name: string;
  slug?: string;
  description?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  whatsappPhone?: string | null;
  telegramUsername?: string | null;
  shopType?: ShopType;
  checkoutMode?: CheckoutMode;
  themePrimary?: string | null;
  themeSecondary?: string | null;
  themeAccent?: string | null;
  themeSurface?: string | null;
  logoUrl?: string | null;
  homepageVariant?: string | null;
  paymentQrImageUrl?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  status?: ShopStatus;
};

export async function createShop(input: CreateShopInput) {
  const name = input.name.trim();
  const slug = normalizeShopSlug(input.slug?.trim() || name);

  if (name.length < 2) {
    throw new Error("INVALID_SHOP_NAME");
  }

  if (slug.length < 2) {
    throw new Error("INVALID_SHOP_SLUG");
  }

  const existingShop = await prisma.shop.findFirst({
    where: {
      OR: [{ slug }, { name }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (existingShop?.slug === slug) {
    throw new Error("SHOP_SLUG_EXISTS");
  }

  if (existingShop?.name === name) {
    throw new Error("SHOP_NAME_EXISTS");
  }

  return prisma.shop.create({
    data: {
      name,
      slug,
      description: input.description?.trim() || null,
      heroTitle: input.heroTitle?.trim() || name,
      heroSubtitle: input.heroSubtitle?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
      whatsappPhone: input.whatsappPhone?.trim() || null,
      telegramUsername:
        input.telegramUsername?.trim().replace(/^@+/, "") || null,
      shopType: input.shopType ?? "PRODUCT",
      checkoutMode: input.checkoutMode ?? "DELIVERY",
      themePrimary: input.themePrimary?.trim() || null,
      themeSecondary: input.themeSecondary?.trim() || null,
      themeAccent: input.themeAccent?.trim() || null,
      themeSurface: input.themeSurface?.trim() || null,
      logoUrl: input.logoUrl?.trim() || null,
      homepageVariant: input.homepageVariant?.trim() || null,
      paymentQrImageUrl: input.paymentQrImageUrl?.trim() || null,
      bankName: input.bankName?.trim() || null,
      bankAccountName: input.bankAccountName?.trim() || null,
      bankAccountNumber: input.bankAccountNumber?.trim() || null,
      status: input.status ?? "ACTIVE",
    } as never,
  });
}

type CreateStaffAccountInput = {
  name: string;
  loginId: string;
  password: string;
  shopId: string;
};

export async function createStaffAccount(input: CreateStaffAccountInput) {
  const name = input.name.trim();
  const loginId = input.loginId.trim();
  const password = input.password;

  if (name.length < 2) {
    throw new Error("INVALID_STAFF_NAME");
  }

  if (!validateLoginId(loginId)) {
    throw new Error("INVALID_LOGIN_ID");
  }

  if (password.length < 6) {
    throw new Error("INVALID_PASSWORD");
  }

  const shop = await prisma.shop.findUnique({
    where: { id: input.shopId },
    select: {
      id: true,
      name: true,
      slug: true,
    },
  });

  if (!shop) {
    throw new Error("SHOP_NOT_FOUND");
  }

  const existingUser = await prisma.user.findUnique({
    where: { phone: loginId },
    select: { id: true },
  });

  if (existingUser) {
    throw new Error("LOGIN_ID_EXISTS");
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        phone: loginId,
        password: hashedPassword,
        role: Role.STAFF,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const staffProfile = await tx.staffProfile.create({
      data: {
        userId: user.id,
        shopId: shop.id,
        isActive: true,
      },
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return {
      user,
      staffProfile,
    };
  });
}
