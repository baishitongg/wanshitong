import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/addresses/[id] — update an address
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;
    const { id } = params;

    // Ensure address belongs to this user
    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { label, recipient, phone, street, city, state, postcode, country, isDefault } = body;

    // If setting as default, unset all others first
    if (isDefault) {
        await prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }

    const address = await prisma.address.update({
        where: { id },
        data: {
            ...(label !== undefined && { label: label || null }),
            ...(recipient && { recipient }),
            ...(phone && { phone }),
            ...(street && { street }),
            ...(city && { city }),
            ...(state && { state }),
            ...(postcode && { postcode }),
            ...(country && { country }),
            ...(isDefault !== undefined && { isDefault }),
        },
    });

    return NextResponse.json(address);
}

// DELETE /api/addresses/[id] — delete an address
export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;
    const { id } = params;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });

    // If the deleted address was default, set the next one as default
    if (existing.isDefault) {
        const next = await prisma.address.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
        });
        if (next) {
            await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
        }
    }

    return NextResponse.json({ ok: true });
}