import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/shops";

export async function GET() {
  const user = await getSessionUser();
  if (String(user?.role ?? "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const [shops, orders] = await Promise.all([
    prisma.shop.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      select: {
        shopId: true,
        status: true,
        totalAmount: true,
      },
    }),
  ]);

  return NextResponse.json({
    totals: {
      shops: shops.length,
      orders: orders.length,
      revenue: orders.reduce(
        (sum: number, order) => sum + Number(order.totalAmount),
        0,
      ),
    },
    shops: shops.map((shop) => {
      const shopOrders = orders.filter((order) => order.shopId === shop.id);
      return {
        ...shop,
        orderCount: shopOrders.length,
        revenue: shopOrders.reduce(
          (sum: number, order) => sum + Number(order.totalAmount),
          0,
        ),
      };
    }),
  });
}
