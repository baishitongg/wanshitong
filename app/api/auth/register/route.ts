import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
    const { name, phone, password } = await req.json();

    if (!phone || !password) {
        return NextResponse.json({ error: "手机号码和密码为必填项" }, { status: 400 });
    }

    // Check if phone already registered
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) {
        return NextResponse.json({ error: "该手机号码已注册" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            name,
            phone,
            password: hashedPassword,
            role: "CUSTOMER",
            profileCompleted: true,
        },
    });

    return NextResponse.json({ id: user.id, name: user.name, phone: user.phone }, { status: 201 });
}