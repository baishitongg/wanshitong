import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// GET /api/cart — fetch current user's cart
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

    const cart = await prisma.cart.findUnique({
        where: { userId },
        include: {
            items: {
                include: {
                    product: {
                        include: { category: true },
                    },
                },
                orderBy: { createdAt: "asc" },
            },
        },
    });

    return NextResponse.json(cart ?? { items: [] });
}

// POST /api/cart — add item or update quantity
// body: { productId, quantity }
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }
    const { productId, quantity } = await req.json();

    if (!productId || typeof quantity !== "number" || quantity < 1) {
        return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    // Check product exists and has stock
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    if (product.stock < quantity) return NextResponse.json({ error: "库存不足" }, { status: 400 });

    // Upsert cart
    const cart = await prisma.cart.upsert({
        where: { userId },
        create: { userId },
        update: {},
    });

    // Upsert cart item
    const item = await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId } },
        create: { cartId: cart.id, productId, quantity },
        update: { quantity },
        include: { product: { include: { category: true } } },
    });

    return NextResponse.json(item, { status: 200 });
}

// DELETE /api/cart — clear entire cart
export async function DELETE() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    await prisma.cart.deleteMany({ where: { userId } });

    return NextResponse.json({ ok: true });
}