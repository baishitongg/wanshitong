import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

type SessionUser = {
  id?: string;
  role?: string;
};

type CreateCategoryBody = {
  name?: string;
};

async function getDefaultShopId() {
  const shop = await prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
    select: { id: true },
  });

  return shop?.id ?? null;
}

export async function GET() {
  const shopId = await getDefaultShopId();

  const categories = await prisma.category.findMany({
    where: shopId ? { shopId } : undefined,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const shopId = await getDefaultShopId();
  if (!shopId) {
    return NextResponse.json({ error: "店铺不存在" }, { status: 400 });
  }

  const body = (await req.json()) as CreateCategoryBody;
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
  }

  const existing = await prisma.category.findUnique({
    where: {
      shopId_name: {
        shopId,
        name,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "该分类名称已存在" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      name,
      shopId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
