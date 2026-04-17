import { NextResponse } from "next/server";
import { CategoryMode, CheckoutMode, ShopStatus, ShopType } from "@prisma/client";
import { requireAdminUser, updateShop } from "@/lib/admin";

interface Params {
  params: Promise<{ shopId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdminUser();

    const { shopId } = await params;
    const body = (await req.json()) as {
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

    const shop = await updateShop({
      id: shopId,
      name: body.name,
      slug: body.slug,
      domain: body.domain,
      description: body.description,
      heroTitle: body.heroTitle,
      heroSubtitle: body.heroSubtitle,
      heroImageUrl: body.heroImageUrl,
      whatsappPhone: body.whatsappPhone,
      telegramUsername: body.telegramUsername,
      shopType: body.shopType,
      ownershipType: body.ownershipType,
      checkoutMode: body.checkoutMode,
      categoryMode: body.categoryMode,
      logoUrl: body.logoUrl,
      homepageVariant: body.homepageVariant,
      status: body.status,
    });

    return NextResponse.json({ shop });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        FORBIDDEN: "无权限",
        SHOP_NOT_FOUND: "店铺不存在",
        INVALID_SHOP_NAME: "店铺名称至少需要 2 个字符",
        INVALID_SHOP_SLUG: "店铺链接 slug 无效，请使用字母、数字或连字符",
        SHOP_SLUG_EXISTS: "该店铺 slug 已存在",
        SHOP_DOMAIN_EXISTS: "该店铺域名已存在",
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

    console.error("[admin][shops][PATCH]", error);
    return NextResponse.json(
      { error: "更新店铺失败，请稍后重试" },
      { status: 500 },
    );
  }
}
