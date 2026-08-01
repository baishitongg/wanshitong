import { NextResponse } from "next/server";
import { createPartnerChannel, requireAdminUser } from "@/lib/admin";
import { invalidateStorefrontCache } from "@/lib/queries";

export async function POST(req: Request) {
  try {
    await requireAdminUser();

    const body = (await req.json()) as {
      name?: string;
      slug?: string;
      domain?: string | null;
      shopId?: string;
      promotedShopId?: string | null;
      isActive?: boolean;
    };

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "伙伴名称不能为空" }, { status: 400 });
    }

    if (!body.shopId) {
      return NextResponse.json({ error: "请选择伙伴自己的店铺" }, { status: 400 });
    }

    if (!body.promotedShopId) {
      return NextResponse.json({ error: "请选择要一起展示的店铺" }, { status: 400 });
    }

    const partnerChannel = await createPartnerChannel({
      name: body.name,
      slug: body.slug,
      domain: body.domain,
      shopId: body.shopId,
      promotedShopId: body.promotedShopId,
      isActive: body.isActive,
    });
    await invalidateStorefrontCache();

    return NextResponse.json({ partnerChannel }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      const messages: Record<string, string> = {
        FORBIDDEN: "无权限",
        SHOP_NOT_FOUND: "店铺不存在",
        PROMOTED_SHOP_NOT_FOUND: "一起展示的店铺不存在",
        SHOP_DOMAIN_EXISTS: "该域名已经绑定在店铺上",
        PARTNER_CHANNEL_SHOPS_MATCH: "伙伴店铺和一起展示的店铺不能相同",
        INVALID_PARTNER_CHANNEL_NAME: "伙伴名称至少需要 2 个字符",
        INVALID_PARTNER_CHANNEL_SLUG: "伙伴 slug 无效，请使用字母、数字或连字符",
        PARTNER_CHANNEL_SLUG_EXISTS: "该伙伴 slug 已存在",
        PARTNER_CHANNEL_DOMAIN_EXISTS: "该伙伴域名已存在",
      };
      const message = messages[error.message];

      if (message) {
        return NextResponse.json(
          { error: message },
          { status: error.message === "FORBIDDEN" ? 403 : 400 },
        );
      }
    }

    console.error("[admin][partner-channels][POST]", error);
    return NextResponse.json(
      { error: "创建伙伴渠道失败，请稍后重试" },
      { status: 500 },
    );
  }
}
