import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/cart/[productId] — remove one item from cart
export async function DELETE(
    _req: Request,
    { params }: { params: { productId: string } }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;
    const { productId } = params;

    const cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) return NextResponse.json({ error: "购物车不存在" }, { status: 404 });

    await prisma.cartItem.deleteMany({
        where: { cartId: cart.id, productId },
    });

    return NextResponse.json({ ok: true });
}