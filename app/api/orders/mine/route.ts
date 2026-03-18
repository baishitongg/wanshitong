import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/orders/mine — fetch the logged-in customer's own orders
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;

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