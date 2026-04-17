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
      select: { id: true, name: true, slug: true, ownershipType: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      select: {
        id: true,
        shopId: true,
        status: true,
        totalAmount: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            costPriceSnapshot: true,
          },
        },
      },
    }),
  ]);

  const nonCancelledOrders = orders.filter(
    (order) => !["CANCELLED", "REFUND"].includes(String(order.status)),
  );
  const selfOperatedShopIds = new Set(
    shops
      .filter((shop) => shop.ownershipType === "SELF_OPERATED")
      .map((shop) => shop.id),
  );

  const selfOperatedOrders = nonCancelledOrders.filter((order) =>
    selfOperatedShopIds.has(order.shopId),
  );

  const totalCost = selfOperatedOrders.reduce((sum, order) => {
    const orderCost = order.items.reduce(
      (itemSum: number, item) =>
        itemSum + Number(item.costPriceSnapshot ?? 0) * item.quantity,
      0,
    );

    return sum + orderCost;
  }, 0);
  const totalRevenue = nonCancelledOrders.reduce(
    (sum: number, order) => sum + Number(order.totalAmount),
    0,
  );

  return NextResponse.json({
    totals: {
      shops: shops.length,
      orders: orders.length,
      revenue: totalRevenue,
      cost: totalCost,
      profit: selfOperatedOrders.reduce(
        (sum, order) =>
          sum +
          order.items.reduce(
            (itemSum: number, item) =>
              itemSum +
              (Number(item.unitPrice) - Number(item.costPriceSnapshot ?? 0)) * item.quantity,
            0,
          ),
        0,
      ),
    },
    shops: shops.map((shop) => {
      const shopOrders = nonCancelledOrders.filter((order) => order.shopId === shop.id);
      const cost =
        shop.ownershipType === "SELF_OPERATED"
          ? shopOrders.reduce(
              (sum, order) =>
                sum +
                order.items.reduce(
                  (itemSum: number, item) =>
                    itemSum + Number(item.costPriceSnapshot ?? 0) * item.quantity,
                  0,
                ),
              0,
            )
          : 0;
      const revenue = shopOrders.reduce(
        (sum: number, order) => sum + Number(order.totalAmount),
        0,
      );

      return {
        ...shop,
        orderCount: shopOrders.length,
        revenue,
        cost,
        profit: shop.ownershipType === "SELF_OPERATED" ? revenue - cost : null,
      };
    }),
  });
}
