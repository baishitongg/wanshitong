import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductsForShop } from "@/lib/commerce";
import { getStaffShopContext } from "@/lib/shops";

type Body = {
  name?: string;
  description?: string | null;
  price?: number;
  stock?: number;
  categoryId?: string;
  imageUrl?: string | null;
  status?: boolean;
  attributes?: Record<string, unknown> | null;
};

export async function GET() {
  try {
    const context = await getStaffShopContext();
    if (context.isAdmin && !context.shopId) {
      return NextResponse.json({ error: "管理员请使用平台管理接口" }, { status: 400 });
    }

    const products = await getProductsForShop(context.shopId!, true);
    return NextResponse.json(products);
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

    const body = (await req.json()) as Body;
    if (!body.name || body.price === undefined || !body.categoryId) {
      return NextResponse.json({ error: "商品名称、价格和分类为必填项" }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, shopId: context.shopId! },
    });

    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        shopId: context.shopId!,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        stock: body.stock ?? 0,
        imageUrl: body.imageUrl ?? null,
        status: body.status ?? true,
        attributes: body.attributes ?? null,
      },
      include: { category: true },
    });

    return NextResponse.json({ ...product, price: Number(product.price) }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}
