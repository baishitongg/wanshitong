import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// GET /api/orders/mine — fetch the logged-in customer's own orders
export async function GET() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    const orders = await prisma.order.findMany({
        where: { userId },
        include: {
            items: {
                include: {
                    product: { select: { id: true, name: true, imageUrl: true } },
                },
            },
        },
        orderBy: { createdAt: "desc" },
    });

    // Coerce Decimal fields
    const serialized = orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
            ...i,
            unitPrice: Number(i.unitPrice),
        })),
    }));

    return NextResponse.json(serialized);
}