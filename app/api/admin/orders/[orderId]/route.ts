import { NextResponse } from "next/server";
import { assignOrderToStaff, updateOrderStatus } from "@/lib/commerce";
import { requireAdminUser } from "@/lib/admin";

interface Params {
  params: Promise<{ orderId: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    await requireAdminUser();

    const { orderId } = await params;
    const body = (await req.json()) as {
      status?: "VERIFYING" | "PROCESSING" | "SHIPPED" | "RECEIVED" | "CANCELLED";
      assignedStaffUserId?: string;
    };

    if (body.assignedStaffUserId) {
      const order = await assignOrderToStaff(orderId, body.assignedStaffUserId);
      const io = (globalThis as {
        io?: {
          to: (room: string) => {
            emit: (event: string, payload: unknown) => void;
          };
        };
      }).io;
      io?.to(`shop:${order.shop?.id ?? order.shopId}`).emit("order_updated", order);
      io?.to("assistants").emit("order_updated", order);
      return NextResponse.json(order);
    }

    if (!body.status) {
      return NextResponse.json({ error: "缺少状态或派单员工" }, { status: 400 });
    }

    const order = await updateOrderStatus(orderId, body.status as never);
    const io = (globalThis as {
      io?: {
        to: (room: string) => {
          emit: (event: string, payload: unknown) => void;
        };
      };
    }).io;
    io?.to(`shop:${order.shop?.id ?? order.shopId}`).emit("order_updated", order);
    io?.to("assistants").emit("order_updated", order);
    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status =
      message === "ORDER_NOT_FOUND"
        ? 404
        : message === "STAFF_NOT_IN_SHOP" || message === "INVALID_STATUS"
          ? 400
          : message === "FORBIDDEN"
            ? 403
            : 500;

    return NextResponse.json({ error: "更新订单失败" }, { status });
  }
}
