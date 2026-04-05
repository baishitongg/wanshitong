import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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

async function getDefaultShopId() {
  const shop = await prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
    select: { id: true },
  });

  return shop?.id ?? null;
}

export async function GET(req: Request) {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();
  const isStaff = role === "STAFF" || role === "ADMIN";

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");
  const shopId = await getDefaultShopId();

  const products = await prisma.product.findMany({
    where: {
      ...(shopId ? { shopId } : {}),
      ...(isStaff ? {} : { status: true }),
      ...(categoryId ? { categoryId } : {}),
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

  const shopId = await getDefaultShopId();
  if (!shopId) {
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

  const product = await prisma.product.create({
    data: {
      shopId,
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
