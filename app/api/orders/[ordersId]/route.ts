import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";

type SessionUser = {
    id?: string;
    role?: string;
    name?: string | null;
    phone?: string | null;
};

type Params = {
    params: Promise<{
        ordersId: string;
    }>;
};

type UpdateOrderBody = {
    status?: OrderStatus;
};

const validStatuses: OrderStatus[] = [
    "PENDING",
    "CONFIRMED",
    "PROCESSING",
    "DONE",
    "CANCELLED",
];

export async function PATCH(req: Request, { params }: Params) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (user.role !== "STAFF") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { ordersId } = await params;
    const body = (await req.json()) as UpdateOrderBody;
    const newStatus = body.status;

    if (!newStatus || !validStatuses.includes(newStatus)) {
        return NextResponse.json({ error: "无效的订单状态" }, { status: 400 });
    }

    try {
        const updatedOrder = await prisma.$transaction(async (tx) => {
            const existingOrder = await tx.order.findUnique({
                where: { id: ordersId },
                include: {
                    items: true,
                },
            });

            if (!existingOrder) {
                throw new Error("订单不存在");
            }

            // 已取消订单不可恢复
            if (existingOrder.status === "CANCELLED" && newStatus !== "CANCELLED") {
                throw new Error("已取消订单不能恢复状态");
            }

            // 只有第一次改成 CANCELLED 时才回补库存
            const shouldRestock =
                existingOrder.status !== "CANCELLED" && newStatus === "CANCELLED";

            if (shouldRestock) {
                for (const item of existingOrder.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stock: {
                                increment: item.quantity,
                            },
                        },
                    });
                }
            }

            const order = await tx.order.update({
                where: { id: ordersId },
                data: { status: newStatus },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                        },
                    },
                },
            });

            return order;
        });

        try {
            const io = (globalThis as {
                io?: {
                    to: (room: string) => {
                        emit: (event: string, payload: unknown) => void;
                    };
                };
            }).io;

            io?.to("assistants").emit("order_updated", updatedOrder);
        } catch (error) {
            console.error("[orders] socket emit failed:", error);
        }

        return NextResponse.json(updatedOrder);
    } catch (error) {
        console.error("[orders] update status failed:", error);

        const message =
            error instanceof Error ? error.message : "更新订单状态失败";

        let statusCode = 500;

        if (message === "订单不存在") statusCode = 404;
        if (message === "已取消订单不能恢复状态") statusCode = 400;

        return NextResponse.json({ error: message }, { status: statusCode });
    }
}