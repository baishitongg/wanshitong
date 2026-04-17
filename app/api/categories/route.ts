import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeCategorySlug } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

type SessionUser = {
  id?: string;
  role?: string;
};

type CreateCategoryBody = {
  name?: string;
  parentId?: string | null;
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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
  const parentId = body.parentId?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "分类名称不能为空" }, { status: 400 });
  }

  if (parentId) {
    const parent = await prisma.category.findFirst({
      where: {
        id: parentId,
        shopId,
      },
    });

    if (!parent) {
      return NextResponse.json({ error: "父分类不存在" }, { status: 400 });
    }
  }

  const existing = await prisma.category.findFirst({
    where: {
      shopId,
      parentId,
      name,
    },
  });

  if (existing) {
    return NextResponse.json({ error: "该分类名称已存在" }, { status: 409 });
  }

  const category = await prisma.category.create({
    data: {
      name,
      slug: normalizeCategorySlug(name) || null,
      shopId,
      parentId,
    },
  });

  return NextResponse.json(category, { status: 201 });
}
