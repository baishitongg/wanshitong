import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/lib/commerce";
import { getStaffShopContext } from "@/lib/shops";
import { VALID_ORDER_STATUSES } from "@/lib/shops";

interface Params {
  params: Promise<{ orderId: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const context = await getStaffShopContext();
    const { orderId } = await params;
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        ...(context.isAdmin ? {} : { assignedStaffUserId: context.user.id! }),
      },
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
          include: { product: true },
        },
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            telegramUsername: true,
            preferredContactChannel: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    return NextResponse.json({
      ...order,
      totalAmount: Number(order.totalAmount),
      items: order.items.map((item) => ({
        ...item,
        unitPrice: Number(item.unitPrice),
      })),
    });
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const context = await getStaffShopContext();
    const { orderId } = await params;
    const body = (await req.json()) as { status?: string };

    if (!body.status || !VALID_ORDER_STATUSES.includes(body.status as never)) {
      return NextResponse.json({ error: "无效的订单状态" }, { status: 400 });
    }

    const order = await updateOrderStatus(orderId, body.status as never, {
      ...(context.isAdmin ? {} : { assignedStaffUserId: context.user.id! }),
    });

    try {
      const targetShopId = order.shop?.id ?? context.shopId;
      const io = (globalThis as {
        io?: {
          to: (room: string) => {
            emit: (event: string, payload: unknown) => void;
          };
        };
      }).io;

      if (targetShopId) {
        io?.to(`shop:${targetShopId}`).emit("order_updated", order);
      }
      io?.to("assistants").emit("order_updated", order);
    } catch (socketError) {
      console.error("[staff][orders] socket emit failed:", socketError);
    }

    return NextResponse.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const map: Record<string, number> = {
      ORDER_NOT_FOUND: 404,
      ORDER_STATUS_LOCKED: 400,
      INVALID_STATUS: 400,
      FORBIDDEN: 403,
      UNAUTHORIZED: 401,
    };
    return NextResponse.json({ error: "更新订单失败" }, { status: map[message] ?? 400 });
  }
}
