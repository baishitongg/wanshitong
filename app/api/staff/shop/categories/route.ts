import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCategoriesForShop } from "@/lib/commerce";
import { getStaffShopContext } from "@/lib/shops";

export async function GET() {
  try {
    const context = await getStaffShopContext();
    if (context.isAdmin && !context.shopId) {
      return NextResponse.json({ error: "管理员请使用平台管理接口" }, { status: 400 });
    }

    const categories = await getCategoriesForShop(context.shopId!);
    return NextResponse.json(categories);
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}

export async function POST(req: Request) {
  try {
    const context = await getStaffShopContext();
    if (context.isAdmin && !context.shopId) {
      return NextResponse.json({ error: "管理员请使用平台管理接口" }, { status: 400 });
    }

    const body = (await req.json()) as { name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
    }

    const existing = await prisma.category.findFirst({
      where: {
        shopId: context.shopId!,
        name,
      },
    });

    if (existing) {
      return NextResponse.json({ error: "该分类名称已存在" }, { status: 409 });
    }

    const category = await prisma.category.create({
      data: {
        shopId: context.shopId!,
        name,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}
