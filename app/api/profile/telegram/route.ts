import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
};

type Body = {
    telegramUsername?: string;
};

function normalizeTelegramUsername(value: string) {
    return value.trim().replace(/^@+/, "");
}

export async function PATCH(req: Request) {
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const user = session.user as SessionUser;

    if (!user.id) {
        return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
    }

    const body = (await req.json()) as Body;
    const raw = body.telegramUsername ?? "";
    const telegramUsername = normalizeTelegramUsername(raw);

    if (!telegramUsername) {
        return NextResponse.json({ error: "Telegram 用户名不能为空" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_]{5,32}$/.test(telegramUsername)) {
        return NextResponse.json(
            { error: "Telegram 用户名格式无效，应为 5-32 位字母、数字或下划线" },
            { status: 400 }
        );
    }

    const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { telegramUsername },
        select: {
            id: true,
            name: true,
            phone: true,
            telegramUsername: true,
        },
    });

    return NextResponse.json(updatedUser);
}