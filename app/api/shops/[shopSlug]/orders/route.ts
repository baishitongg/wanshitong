import { NextResponse } from "next/server";
import { getOrdersForUserShop } from "@/lib/commerce";
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
    const orders = await getOrdersForUserShop(user.id, shop.id);
    return NextResponse.json(orders);
  } catch {
    return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
  }
}
