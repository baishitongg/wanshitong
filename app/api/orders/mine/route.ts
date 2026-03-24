import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { autoReceiveShippedOrders } from "@/lib/commerce";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id?: string;
};

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  if (!user.id) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  await autoReceiveShippedOrders({ userId: user.id });

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    include: {
      shop: {
        select: {
          id: true,
          name: true,
          slug: true,
          whatsappPhone: true,
          telegramUsername: true,
        },
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              imageUrl: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    orders.map((order) => ({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    })),
  );
}
