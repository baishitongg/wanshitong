import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/addresses — fetch current user's addresses
export async function GET() {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;

    const addresses = await prisma.address.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(addresses);
}

// POST /api/addresses — create a new address
export async function POST(req: Request) {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "未登录" }, { status: 401 });

    const userId = (session.user as any).id as string;

    const body = await req.json();
    const { label, recipient, phone, street, city, state, postcode, country, isDefault } = body;

    if (!recipient || !phone || !street || !city || !state || !postcode) {
        return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
        await prisma.address.updateMany({
            where: { userId },
            data: { isDefault: false },
        });
    }

    // If this is the first address, auto-set as default
    const count = await prisma.address.count({ where: { userId } });
    const shouldBeDefault = isDefault || count === 0;

    const address = await prisma.address.create({
        data: {
            userId,
            label: label || null,
            recipient,
            phone,
            street,
            city,
            state,
            postcode,
            country: country || "Malaysia",
            isDefault: shouldBeDefault,
        },
    });

    return NextResponse.json(address, { status: 201 });
}