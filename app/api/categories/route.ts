import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
    id?: string;
    role?: string;
};

type CreateCategoryBody = {
    name?: string;
};

// GET /api/categories — fetch all categories
export async function GET() {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
}

// POST /api/categories — create a category (staff only)
export async function POST(req: Request) {
    const session = await auth();
    const user = session?.user as SessionUser | undefined;
    const role = user?.role;

    if (role !== "STAFF" && role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = (await req.json()) as CreateCategoryBody;
    const name = body.name?.trim();

    if (!name) {
        return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.category.findUnique({
        where: { name },
    });

    if (existing) {
        return NextResponse.json({ error: "该分类名称已存在" }, { status: 409 });
    }

    const category = await prisma.category.create({
        data: { name },
    });

    return NextResponse.json(category, { status: 201 });
}