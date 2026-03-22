import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffShopContext } from "@/lib/shops";

export async function GET() {
  try {
    const context = await getStaffShopContext();
    const shopFilter = context.isAdmin ? {} : { shopId: context.shopId! };
    const shop = context.shopId
      ? await prisma.shop.findUnique({
          where: { id: context.shopId },
          select: {
            id: true,
            name: true,
            slug: true,
            shopType: true,
            checkoutMode: true,
          },
        })
      : null;

    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        where: shopFilter,
        select: { status: true, totalAmount: true },
      }),
      prisma.product.findMany({
        where: shopFilter,
        select: { status: true, stock: true },
      }),
    ]);

    return NextResponse.json({
      shopId: context.shopId,
      shopSlug: context.shopSlug,
      shop,
      orders: {
        total: orders.length,
        pending: orders.filter((order) => order.status === "PENDING").length,
        processing: orders.filter((order) => order.status === "PROCESSING").length,
        done: orders.filter((order) => order.status === "DONE").length,
        totalAmount: orders.reduce(
          (sum, order) => sum + Number(order.totalAmount),
          0,
        ),
      },
      products: {
        total: products.length,
        active: products.filter((product) => product.status).length,
        outOfStock: products.filter((product) => product.stock === 0).length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ error: "无权限" }, { status });
  }
}
