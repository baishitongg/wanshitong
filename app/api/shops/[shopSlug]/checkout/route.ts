import { NextResponse } from "next/server";
import { createOrderFromCart } from "@/lib/commerce";
import { getSessionUser, requireShopBySlug } from "@/lib/shops";

type ContactChannel = "PHONE" | "TELEGRAM";

interface Params {
  params: Promise<{ shopSlug: string }>;
}

type Body = {
  customerName?: string | null;
  customerPhone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel;
  notes?: string | null;
  addressId?: string | null;
  selectedProductIds?: string[];
};

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const body = (await req.json()) as Body;

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
      addressId: body.addressId ?? null,
      selectedProductIds: body.selectedProductIds ?? [],
      requirePayment: false,
      initialStatus: "VERIFYING",
    });

    try {
      const io = (globalThis as {
        io?: {
          to: (room: string) => {
            emit: (event: string, payload: unknown) => void;
          };
        };
      }).io;

      io?.to(`shop:${shop.id}`).emit("new_order", order);
    } catch (socketError) {
      console.error("[shops][checkout] socket emit failed:", socketError);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const map: Record<string, string> = {
      ADDRESS_REQUIRED: "请先选择收货地址",
      ADDRESS_NOT_FOUND: "地址不存在",
      EMPTY_CART: "购物车为空",
      NO_ITEMS_SELECTED: "请至少选择一个商品进行结算",
      PHONE_REQUIRED: "您选择了手机号作为联系方式，但手机号为空",
      TELEGRAM_REQUIRED: "您选择了 Telegram 作为联系方式，但用户名为空",
      INSUFFICIENT_STOCK: "库存不足",
      SLOT_REQUIRED: "请先选择服务预约时段",
      SLOT_UNAVAILABLE: "该预约时段已被预订，请重新选择",
    };

    return NextResponse.json(
      { error: map[message] ?? "提交订单失败，请稍后重试" },
      { status: 400 },
    );
  }
}
