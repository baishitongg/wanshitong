import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// GET /api/products — fetch all products (staff gets all, public gets active only)
export async function GET(req: Request) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isStaff = role === "STAFF" || role === "ADMIN";

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const products = await prisma.product.findMany({
        where: {
            ...(isStaff ? {} : { status: true }),
            ...(categoryId ? { categoryId } : {}),
        },
        include: { category: true },
        orderBy: { createdAt: "desc" },
    });

    const serialized = products.map((p) => ({
        ...p,
        price: Number(p.price),
    }));

    return NextResponse.json(serialized);
}

// POST /api/products — create a new product (staff only)
export async function POST(req: Request) {
    const session = await auth();
    const role = (session?.user as any)?.role;
    if (role !== "STAFF" && role !== "ADMIN") {
        return NextResponse.json({ error: "无权限" }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, stock, categoryId, imageUrl, status } = body;

    if (!name || price === undefined || !categoryId) {
        return NextResponse.json({ error: "商品名称、价格和分类为必填项" }, { status: 400 });
    }

    const product = await prisma.product.create({
        data: {
            name,
            description: description || null,
            price,
            stock: stock ?? 0,
            categoryId,
            imageUrl: imageUrl || null,
            status: status ?? true,
        },
        include: { category: true },
    });

    revalidatePath("/");

    return NextResponse.json({ ...product, price: Number(product.price) }, { status: 201 });
}