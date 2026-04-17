import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/commerce";

type SessionUser = {
  id?: string;
  role?: string;
};

type Params = {
  params: Promise<{
    ordersId: string;
  }>;
};

type UpdateOrderBody = {
  status?: string;
};

const validStatuses = [
  "VERIFYING",
  "PROCESSING",
  "SHIPPED",
  "RECEIVED",
  "CANCELLED",
  "REFUND",
];

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;

  if (String(user.role ?? "").toUpperCase() !== "STAFF") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { ordersId } = await params;
  const body = (await req.json()) as UpdateOrderBody;
  const newStatus = body.status;

  if (!newStatus || !validStatuses.includes(newStatus)) {
    return NextResponse.json({ error: "无效的订单状态" }, { status: 400 });
  }

  try {
    const updatedOrder = await updateOrderStatus(ordersId, newStatus as never);
    return NextResponse.json(updatedOrder);
  } catch (error) {
    const message = error instanceof Error ? error.message : "更新订单状态失败";
    const statusCode = message === "ORDER_NOT_FOUND" ? 404 : 400;
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
