import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/commerce";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  id?: string;
};

interface Params {
  params: Promise<{ ordersId: string }>;
}

export async function PATCH(_req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  if (!user.id) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  try {
    const { ordersId } = await params;
    const currentOrder = await prisma.order.findFirst({
      where: {
        id: ordersId,
        userId: user.id,
      },
      select: {
        status: true,
      },
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    if (String(currentOrder.status) !== "SHIPPED") {
      return NextResponse.json({ error: "当前订单还不能确认收货" }, { status: 400 });
    }

    const order = await updateOrderStatus(ordersId, "RECEIVED" as never, {
      userId: user.id,
    });

    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "ORDER_NOT_FOUND"
        ? 404
        : message === "ORDER_STATUS_LOCKED" || message === "INVALID_STATUS"
          ? 400
          : 500;

    return NextResponse.json({ error: "确认收货失败" }, { status });
  }
}
