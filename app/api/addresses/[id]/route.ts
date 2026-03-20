import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

// PATCH /api/addresses/[id] — update an address
export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
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

    const { id } = params;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 404 });
    }

    const body = await req.json();
    const { label, recipient, phone, street, city, state, postcode, country, isDefault } =
        body as {
            label?: string | null;
            recipient?: string;
            phone?: string;
            street?: string;
            city?: string;
            state?: string;
            postcode?: string;
            country?: string;
            isDefault?: boolean;
        };

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
            ...(recipient !== undefined && { recipient }),
            ...(phone !== undefined && { phone }),
            ...(street !== undefined && { street }),
            ...(city !== undefined && { city }),
            ...(state !== undefined && { state }),
            ...(postcode !== undefined && { postcode }),
            ...(country !== undefined && { country }),
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
    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;
    const userId = user.id;

    if (!userId) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    const { id } = params;

    const existing = await prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
        return NextResponse.json({ error: "地址不存在" }, { status: 404 });
    }

    await prisma.address.delete({ where: { id } });

    if (existing.isDefault) {
        const next = await prisma.address.findFirst({
            where: { userId },
            orderBy: { createdAt: "asc" },
        });

        if (next) {
            await prisma.address.update({
                where: { id: next.id },
                data: { isDefault: true },
            });
        }
    }

    return NextResponse.json({ ok: true });
}