import { NextResponse } from "next/server";
import { removeCartItem } from "@/lib/commerce";
import { getSessionUser, requireShopBySlug } from "@/lib/shops";

interface Params {
  params: Promise<{ shopSlug: string; productId: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await getSessionUser();
  if (!user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { shopSlug, productId } = await params;
    const shop = await requireShopBySlug(shopSlug);
    await removeCartItem(user.id, shop.id, productId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
  }
}
