import { NextResponse } from "next/server";
import { getSessionUser, requireShopBySlug } from "@/lib/shops";
import { getProductsForShop } from "@/lib/commerce";

interface Params {
  params: Promise<{ shopSlug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { shopSlug } = await params;
    const shop = await requireShopBySlug(shopSlug);
    const user = await getSessionUser();
    const includeInactive =
      String(user?.role ?? "").toUpperCase() === "ADMIN" ||
      (String(user?.role ?? "").toUpperCase() === "STAFF" &&
        user?.staffShopId === shop.id);

    const products = await getProductsForShop(shop.id, includeInactive);
    return NextResponse.json(products);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "SHOP_NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: "店铺不存在" }, { status });
  }
}
