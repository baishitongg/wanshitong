import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// DELETE /api/cart/[productId] — remove one item from cart
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ productId: string }> }
) {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    const { productId } = await params;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
        return NextResponse.json({ error: "购物车不存在" }, { status: 404 });
    }

    await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
    });

    return NextResponse.json({ ok: true });
}