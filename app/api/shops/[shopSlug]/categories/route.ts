import { NextResponse } from "next/server";
import { getCategoriesForShop } from "@/lib/commerce";
import { requireShopBySlug } from "@/lib/shops";

interface Params {
  params: Promise<{ shopSlug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    const categories = await getCategoriesForShop(shop.id);
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
  }
}
