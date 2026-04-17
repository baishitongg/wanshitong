import bcrypt from "bcryptjs";
import { CategoryMode, CheckoutMode, Role, ShopStatus, ShopType } from "@prisma/client";
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

export function normalizeShopDomain(value?: string | null) {
  const domain = value
    ?.trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    ?.split(":")[0]
    ?.trim();

  return domain || null;
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
  domain?: string | null;
  description?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  whatsappPhone?: string | null;
  telegramUsername?: string | null;
  shopType?: ShopType;
  ownershipType?: "MARKETPLACE" | "SELF_OPERATED";
  checkoutMode?: CheckoutMode;
  categoryMode?: CategoryMode;
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

const SHOP_TYPE_THEMES = {
  PRODUCT: {
    themePrimary: "#7f1d1d",
    themeSecondary: "#b91c1c",
    themeAccent: "#ef4444",
    themeSurface: "#ffffff",
  },
  SERVICE: {
    themePrimary: "#C85C7C",
    themeSecondary: "#F4A261",
    themeAccent: "#FF6B6B",
    themeSurface: "#ffffff",
  },
  HYBRID: {
    themePrimary: "#7f1d1d",
    themeSecondary: "#b91c1c",
    themeAccent: "#ef4444",
    themeSurface: "#ffffff",
  },
} satisfies Record<ShopType, {
  themePrimary: string;
  themeSecondary: string;
  themeAccent: string;
  themeSurface: string;
}>;

export async function createShop(input: CreateShopInput) {
  const name = input.name.trim();
  const slug = normalizeShopSlug(input.slug?.trim() || name);
  const shopType = input.shopType ?? ShopType.PRODUCT;
  const domain =
    shopType === ShopType.SERVICE ? null : normalizeShopDomain(input.domain);
  const theme = SHOP_TYPE_THEMES[shopType];

  if (name.length < 2) {
    throw new Error("INVALID_SHOP_NAME");
  }

  if (slug.length < 2) {
    throw new Error("INVALID_SHOP_SLUG");
  }

  const existingShop = (await prisma.shop.findFirst({
    where: {
      OR: [{ slug }, { name }, ...(domain ? [{ domain }] : [])],
    } as never,
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
    } as never,
  })) as { name: string; slug: string; domain?: string | null } | null;

  if (existingShop?.slug === slug) {
    throw new Error("SHOP_SLUG_EXISTS");
  }

  if (existingShop?.name === name) {
    throw new Error("SHOP_NAME_EXISTS");
  }

  if (domain && String(existingShop?.domain) === domain) {
    throw new Error("SHOP_DOMAIN_EXISTS");
  }

  return prisma.shop.create({
    data: {
      name,
      slug,
      domain,
      description: input.description?.trim() || null,
      heroTitle: input.heroTitle?.trim() || name,
      heroSubtitle: input.heroSubtitle?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
      whatsappPhone: input.whatsappPhone?.trim() || null,
      telegramUsername:
        input.telegramUsername?.trim().replace(/^@+/, "") || null,
      shopType,
      ownershipType: input.ownershipType ?? "MARKETPLACE",
      checkoutMode: input.checkoutMode ?? "DELIVERY",
      categoryMode: input.categoryMode ?? "FLAT",
      themePrimary: theme.themePrimary,
      themeSecondary: theme.themeSecondary,
      themeAccent: theme.themeAccent,
      themeSurface: theme.themeSurface,
      logoUrl: input.logoUrl?.trim() || null,
      homepageVariant: input.homepageVariant?.trim() || null,
      paymentQrImageUrl: null,
      bankName: null,
      bankAccountName: null,
      bankAccountNumber: null,
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

type UpdateShopInput = {
  id: string;
  name?: string;
  slug?: string;
  domain?: string | null;
  description?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  heroImageUrl?: string | null;
  whatsappPhone?: string | null;
  telegramUsername?: string | null;
  shopType?: ShopType;
  ownershipType?: "MARKETPLACE" | "SELF_OPERATED";
  checkoutMode?: CheckoutMode;
  categoryMode?: CategoryMode;
  logoUrl?: string | null;
  homepageVariant?: string | null;
  status?: ShopStatus;
};

export async function updateShop(input: UpdateShopInput) {
  const existing = (await prisma.shop.findUnique({
    where: { id: input.id },
    select: { id: true, name: true, slug: true, domain: true, shopType: true, categoryMode: true } as never,
  })) as {
    id: string;
    name: string;
    slug: string;
    domain?: string | null;
    shopType: ShopType;
    categoryMode: CategoryMode;
  } | null;

  if (!existing) {
    throw new Error("SHOP_NOT_FOUND");
  }

  const name = input.name?.trim() || existing.name;
  const slug = normalizeShopSlug(input.slug?.trim() || existing.slug);
  const shopType = input.shopType ?? existing.shopType;
  const domain =
    shopType === ShopType.SERVICE ? null : normalizeShopDomain(input.domain);
  const theme = SHOP_TYPE_THEMES[shopType];

  if (name.length < 2) {
    throw new Error("INVALID_SHOP_NAME");
  }

  if (slug.length < 2) {
    throw new Error("INVALID_SHOP_SLUG");
  }

  const duplicate = (await prisma.shop.findFirst({
    where: {
      id: { not: input.id },
      OR: [{ name }, { slug }, ...(domain ? [{ domain }] : [])],
    } as never,
    select: { name: true, slug: true, domain: true } as never,
  })) as { name: string; slug: string; domain?: string | null } | null;

  if (duplicate?.slug === slug) {
    throw new Error("SHOP_SLUG_EXISTS");
  }

  if (duplicate?.name === name) {
    throw new Error("SHOP_NAME_EXISTS");
  }

  if (domain && String(duplicate?.domain) === domain) {
    throw new Error("SHOP_DOMAIN_EXISTS");
  }

  return prisma.shop.update({
    where: { id: input.id },
    data: {
      name,
      slug,
      domain,
      description: input.description?.trim() || null,
      heroTitle: input.heroTitle?.trim() || name,
      heroSubtitle: input.heroSubtitle?.trim() || null,
      heroImageUrl: input.heroImageUrl?.trim() || null,
      whatsappPhone: input.whatsappPhone?.trim() || null,
      telegramUsername: input.telegramUsername?.trim().replace(/^@+/, "") || null,
      shopType,
      ownershipType: input.ownershipType ?? "MARKETPLACE",
      checkoutMode:
        input.checkoutMode ?? (shopType === ShopType.SERVICE ? "BOOKING" : "DELIVERY"),
      categoryMode: input.categoryMode ?? existing.categoryMode,
      themePrimary: theme.themePrimary,
      themeSecondary: theme.themeSecondary,
      themeAccent: theme.themeAccent,
      themeSurface: theme.themeSurface,
      logoUrl: input.logoUrl?.trim() || null,
      homepageVariant: input.homepageVariant?.trim() || null,
      paymentQrImageUrl: null,
      bankName: null,
      bankAccountName: null,
      bankAccountNumber: null,
      status: input.status ?? "ACTIVE",
    } as never,
  });
}

type UpdateStaffAccountInput = {
  profileId: string;
  name?: string;
  loginId?: string;
  password?: string;
  shopId?: string;
  isActive?: boolean;
};

export async function updateStaffAccount(input: UpdateStaffAccountInput) {
  const profile = await prisma.staffProfile.findUnique({
    where: { id: input.profileId },
    include: {
      user: {
        select: { id: true, phone: true },
      },
    },
  });

  if (!profile) {
    throw new Error("STAFF_NOT_FOUND");
  }

  const name = input.name?.trim();
  const loginId = input.loginId?.trim();

  if (name !== undefined && name.length < 2) {
    throw new Error("INVALID_STAFF_NAME");
  }

  if (loginId !== undefined && !validateLoginId(loginId)) {
    throw new Error("INVALID_LOGIN_ID");
  }

  if (input.password && input.password.length < 6) {
    throw new Error("INVALID_PASSWORD");
  }

  if (input.shopId) {
    const shop = await prisma.shop.findUnique({
      where: { id: input.shopId },
      select: { id: true },
    });

    if (!shop) {
      throw new Error("SHOP_NOT_FOUND");
    }
  }

  if (loginId && loginId !== profile.user.phone) {
    const existingUser = await prisma.user.findUnique({
      where: { phone: loginId },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("LOGIN_ID_EXISTS");
    }
  }

  const hashedPassword = input.password
    ? await bcrypt.hash(input.password, 12)
    : undefined;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: profile.userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(loginId !== undefined ? { phone: loginId } : {}),
        ...(hashedPassword ? { password: hashedPassword } : {}),
      },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    const updatedProfile = await tx.staffProfile.update({
      where: { id: input.profileId },
      data: {
        ...(input.shopId ? { shopId: input.shopId } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
      include: {
        shop: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    return {
      user,
      profile: updatedProfile,
    };
  });
}

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
