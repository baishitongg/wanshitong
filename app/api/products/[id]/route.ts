import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// PATCH /api/products/[id] — update a product (staff only)
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "STAFF" && role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, description, price, stock, categoryId, imageUrl, status } = body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "商品不存在" }, { status: 404 });

    const product = await prisma.product.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(description !== undefined && { description: description || null }),
            ...(price !== undefined && { price }),
            ...(stock !== undefined && { stock }),
            ...(categoryId !== undefined && { categoryId }),
            ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
            ...(status !== undefined && { status }),
        },
        include: { category: true },
    });

    revalidatePath("/");
}

// DELETE /api/products/[id] — delete a product (staff only)
export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "STAFF" && role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const { id } = params;

    await prisma.product.delete({ where: { id } });

    revalidatePath("/");
}