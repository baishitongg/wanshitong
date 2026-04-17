import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getCategoryAndDescendantIds } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

type SessionUser = {
  role?: string;
};

type CreateProductBody = {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string | null;
  status?: boolean;
};

async function getDefaultShop() {
  const shop = await prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
    select: { id: true, categoryMode: true },
  });

  return shop;
}

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();
  const isStaff = role === "STAFF" || role === "ADMIN";

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const shop = await getDefaultShop();
  const categories =
    shop && categoryId
      ? await prisma.category.findMany({ where: { shopId: shop.id } })
      : [];
  const categoryIds =
    categoryId && categories.length > 0
      ? getCategoryAndDescendantIds(categories, categoryId)
      : categoryId
        ? [categoryId]
        : [];

  const products = await prisma.product.findMany({
    where: {
      ...(shop ? { shopId: shop.id } : {}),
      ...(isStaff ? {} : { status: true }),
      ...(categoryId ? { categoryId: { in: categoryIds } } : {}),
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = products.map((product) => ({
    ...product,
    price: Number(product.price),
    costPrice: product.costPrice == null ? null : Number(product.costPrice),
  }));

  return NextResponse.json(serialized);
}

export async function POST(req: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();

  if (role !== "STAFF" && role !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const shop = await getDefaultShop();
  if (!shop) {
    return NextResponse.json({ error: "店铺不存在" }, { status: 400 });
  }

  const body = (await req.json()) as CreateProductBody;
  const { name, description, price, stock, categoryId, imageUrl, status } = body;

  if (!name || price === undefined || !categoryId) {
    return NextResponse.json(
      { error: "商品名称、价格和分类为必填项" },
      { status: 400 },
    );
  }

  const category = await prisma.category.findFirst({
    where: { id: categoryId, shopId: shop.id },
    include: {
      _count: {
        select: { children: true },
      },
    },
  });

  if (!category) {
    return NextResponse.json({ error: "分类不存在" }, { status: 400 });
  }

  if (shop.categoryMode === "NESTED" && category._count.children > 0) {
    return NextResponse.json({ error: "请选择最后一级分类" }, { status: 400 });
  }

  const product = await prisma.product.create({
    data: {
      shopId: shop.id,
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

  return NextResponse.json(
    {
      ...product,
      price: Number(product.price),
      costPrice: product.costPrice == null ? null : Number(product.costPrice),
    },
    { status: 201 },
  );
}
