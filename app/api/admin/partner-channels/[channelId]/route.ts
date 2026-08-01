import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, updatePartnerChannel } from "@/lib/admin";

interface Params {
  params: Promise<{ channelId: string }>;
}

function getPartnerChannelError(error: Error) {
  const messages: Record<string, string> = {
    FORBIDDEN: "无权限",
    SHOP_NOT_FOUND: "店铺不存在",
    PROMOTED_SHOP_NOT_FOUND: "一起展示的店铺不存在",
    SHOP_DOMAIN_EXISTS: "该域名已经绑定在店铺上",
    PARTNER_CHANNEL_NOT_FOUND: "伙伴渠道不存在",
    PARTNER_CHANNEL_SHOPS_MATCH: "伙伴店铺和一起展示的店铺不能相同",
    INVALID_PARTNER_CHANNEL_NAME: "伙伴名称至少需要 2 个字符",
    INVALID_PARTNER_CHANNEL_SLUG: "伙伴 slug 无效，请使用字母、数字或连字符",
    PARTNER_CHANNEL_SLUG_EXISTS: "该伙伴 slug 已存在",
    PARTNER_CHANNEL_DOMAIN_EXISTS: "该伙伴域名已存在",
  };

  return messages[error.message];
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdminUser();

    const { channelId } = await params;
    const body = (await req.json()) as {
      name?: string;
      slug?: string;
      domain?: string | null;
      shopId?: string;
      promotedShopId?: string | null;
      isActive?: boolean;
    };

    const partnerChannel = await updatePartnerChannel({
      id: channelId,
      name: body.name,
      slug: body.slug,
      domain: body.domain,
      shopId: body.shopId,
      promotedShopId: body.promotedShopId,
      isActive: body.isActive,
    });

    return NextResponse.json({ partnerChannel });
  } catch (error) {
    if (error instanceof Error) {
      const message = getPartnerChannelError(error);

      if (message) {
        return NextResponse.json(
          { error: message },
          { status: error.message === "FORBIDDEN" ? 403 : 400 },
        );
      }
    }

    console.error("[admin][partner-channels][PATCH]", error);
    return NextResponse.json(
      { error: "更新伙伴渠道失败，请稍后重试" },
      { status: 500 },
    );
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdminUser();

    const { channelId } = await params;

    await prisma.partnerChannel.delete({
      where: { id: channelId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    console.error("[admin][partner-channels][DELETE]", error);
    return NextResponse.json(
      { error: "删除伙伴渠道失败，请稍后重试" },
      { status: 500 },
    );
  }
}
