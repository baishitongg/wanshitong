import { NextResponse } from "next/server";
import {
  clearCart,
  getCartByUserAndShop,
  upsertCartItem,
} from "@/lib/commerce";
import { getSessionUser, requireShopBySlug } from "@/lib/shops";

interface Params {
  params: Promise<{ shopSlug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    const cart = await getCartByUserAndShop(user.id, shop.id);
    return NextResponse.json(cart ?? { items: [] });
  } catch {
    return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = (await req.json()) as { productId?: string; quantity?: number };

  if (!body.productId || typeof body.quantity !== "number" || body.quantity < 1) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    const item = await upsertCartItem({
      userId: user.id,
      shopId: shop.id,
      productId: body.productId,
      quantity: body.quantity,
    });
    return NextResponse.json(item);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }
    if (message === "INSUFFICIENT_STOCK") {
      return NextResponse.json({ error: "库存不足" }, { status: 400 });
    }
    return NextResponse.json({ error: "加购失败" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    await clearCart(user.id, shop.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
  }
}
