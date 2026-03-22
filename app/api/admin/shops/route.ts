import { NextResponse } from "next/server";
import { CheckoutMode, ShopStatus, ShopType } from "@prisma/client";
import { createShop, requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/shops";

export async function GET() {
  const user = await getSessionUser();
  if (String(user?.role ?? "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const shops = await prisma.shop.findMany({
    include: {
      _count: {
        select: {
          products: true,
          categories: true,
          orders: true,
          staffProfiles: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(shops);
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const body = (await req.json()) as {
      name?: string;
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
      status?: ShopStatus;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "店铺名称不能为空" }, { status: 400 });
    }

    const shop = await createShop({
      name: body.name,
      slug: body.slug,
      description: body.description,
      heroTitle: body.heroTitle,
      heroSubtitle: body.heroSubtitle,
      heroImageUrl: body.heroImageUrl,
      whatsappPhone: body.whatsappPhone,
      telegramUsername: body.telegramUsername,
      shopType: body.shopType,
      checkoutMode: body.checkoutMode,
      themePrimary: body.themePrimary,
      themeSecondary: body.themeSecondary,
      themeAccent: body.themeAccent,
      themeSurface: body.themeSurface,
      logoUrl: body.logoUrl,
      homepageVariant: body.homepageVariant,
      status: body.status,
    });

    return NextResponse.json({ shop }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        FORBIDDEN: "无权限",
        INVALID_SHOP_NAME: "店铺名称至少需要 2 个字符",
        INVALID_SHOP_SLUG: "店铺链接 slug 无效，请使用字母、数字或连字符",
        SHOP_SLUG_EXISTS: "该店铺 slug 已存在",
        SHOP_NAME_EXISTS: "该店铺名称已存在",
      };

      const message = messages[error.message];
      if (message) {
        return NextResponse.json(
          { error: message },
          { status: error.message === "FORBIDDEN" ? 403 : 400 },
        );
      }
    }

    console.error("[admin][shops][POST]", error);
    return NextResponse.json(
      { error: "创建店铺失败，请稍后重试" },
      { status: 500 },
    );
  }
}
