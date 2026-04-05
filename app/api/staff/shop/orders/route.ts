import { NextResponse } from "next/server";
import { getStaffOrders } from "@/lib/commerce";
import { getStaffShopContext, isValidOrderStatus } from "@/lib/shops";

export async function GET(req: Request) {
  try {
    const context = await getStaffShopContext();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    const orders = await getStaffOrders({
      ...(context.isAdmin ? {} : { assignedStaffUserId: context.user.id! }),
      ...(isValidOrderStatus(statusParam) ? { status: statusParam } : {}),
    });

    return NextResponse.json(orders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: "无权限" }, { status });
  }
}
