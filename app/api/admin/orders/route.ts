import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/shops";
import { getStaffOrders } from "@/lib/commerce";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (String(user?.role ?? "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shopId");
  const status = searchParams.get("status");

  const orders = await getStaffOrders({
    ...(shopId ? { shopId } : {}),
    ...(status ? { status: status as never } : {}),
  });

  return NextResponse.json(orders);
}
