import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/lib/commerce";
import { getSessionUser, requireShopBySlug } from "@/lib/shops";

type ContactChannel = "PHONE" | "TELEGRAM";

interface Params {
  params: Promise<{ shopSlug: string }>;
}

type Body = {
  customerName?: string;
  customerPhone?: string;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel;
  notes?: string;
  addressId?: string;
};

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  if (!body.addressId) {
    return NextResponse.json({ error: "请选择收货地址" }, { status: 400 });
  }

  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    const order = await createOrderFromCart({
      shopId: shop.id,
      userId: user.id,
      customerName: body.customerName ?? user.name ?? null,
      customerPhone: body.customerPhone ?? user.phone ?? null,
      telegramUsername: body.telegramUsername ?? user.telegramUsername ?? null,
      preferredContactChannel:
        body.preferredContactChannel ?? user.preferredContactChannel ?? "PHONE",
      notes: body.notes ?? null,
      addressId: body.addressId,
    });
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const map: Record<string, string> = {
      ADDRESS_NOT_FOUND: "地址不存在",
      EMPTY_CART: "购物车为空",
      PHONE_REQUIRED: "您选择了手机号作为联系方式，但手机号为空",
      TELEGRAM_REQUIRED: "您选择了 Telegram 作为联系方式，但用户名为空",
      INSUFFICIENT_STOCK: "库存不足",
    };
    return NextResponse.json(
      { error: map[message] ?? "下单失败，请稍后重试" },
      { status: 400 },
    );
  }
}
