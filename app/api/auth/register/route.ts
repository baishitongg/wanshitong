import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ─── Phone validation (mirrors client-side rules) ─────────────────────────────
const PHONE_RULES: Record<string, (local: string) => boolean> = {
    "+60": (n) => /^1\d{8,9}$/.test(n),   // Malaysia
    "+86": (n) => /^1[3-9]\d{9}$/.test(n), // China
    "+65": (n) => /^[89]\d{7}$/.test(n),   // Singapore
};

function validatePhone(phone: string): boolean {
    // phone should be e.g. "+601XXXXXXXX" / "+861XXXXXXXXXX" / "+658XXXXXXX"
    const prefix = ["+60", "+86", "+65"].find((p) => phone.startsWith(p));
    if (!prefix) return false;
    const local = phone.slice(prefix.length);
    return PHONE_RULES[prefix](local);
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, phone, password } = body as {
            name?: string;
            phone?: string;
            password?: string;
        };

        // ── Basic presence check ──────────────────────────────────────────────────
        if (!name || !phone || !password) {
            return NextResponse.json(
                { error: "姓名、手机号码和密码均为必填项" },
                { status: 400 }
            );
        }

        // ── Name length ───────────────────────────────────────────────────────────
        if (name.trim().length < 2) {
            return NextResponse.json(
                { error: "姓名至少需要 2 个字符" },
                { status: 400 }
            );
        }

        // ── Phone format ──────────────────────────────────────────────────────────
        if (!validatePhone(phone)) {
            return NextResponse.json(
                { error: "手机号码格式不正确，请检查国家/地区代码及号码格式" },
                { status: 400 }
            );
        }

        // ── Password length ───────────────────────────────────────────────────────
        if (password.length < 6) {
            return NextResponse.json(
                { error: "密码至少需要 6 位" },
                { status: 400 }
            );
        }

        // ── Check duplicate phone ─────────────────────────────────────────────────
        const existing = await prisma.user.findUnique({ where: { phone } });
        if (existing) {
            return NextResponse.json(
                { error: "该手机号码已被注册" },
                { status: 409 }
            );
        }

        // ── Hash password & create user ───────────────────────────────────────────
        const hashed = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: {
                name: name.trim(),
                phone,
                password: hashed,
                // role defaults to CUSTOMER per schema
            },
            select: { id: true, name: true, phone: true, role: true, createdAt: true },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (err) {
        console.error("[register] error:", err);
        return NextResponse.json(
            { error: "服务器错误，请稍后重试" },
            { status: 500 }
        );
    }
}