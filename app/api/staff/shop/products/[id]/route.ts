import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffShopContext, serializeProduct } from "@/lib/shops";

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

interface Params {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Params) {
  try {
    const context = await getStaffShopContext();
    if (context.isAdmin && !context.shopId) {
      return NextResponse.json({ error: "管理员请使用平台管理接口" }, { status: 400 });
    }

    const { id } = await params;
    const body = (await req.json()) as Body;
    const existing = await prisma.product.findFirst({
      where: {
        id,
        shopId: context.shopId!,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    if (body.categoryId) {
      const category = await prisma.category.findFirst({
        where: { id: body.categoryId, shopId: context.shopId! },
      });

      if (!category) {
        return NextResponse.json({ error: "分类不存在" }, { status: 400 });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description ?? null } : {}),
        ...(body.price !== undefined ? { price: body.price } : {}),
        ...(body.stock !== undefined ? { stock: body.stock } : {}),
        ...(body.categoryId !== undefined ? { categoryId: body.categoryId } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl ?? null } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.attributes !== undefined ? { attributes: body.attributes } : {}),
      },
      include: { category: true },
    });

    return NextResponse.json(serializeProduct(product));
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const context = await getStaffShopContext();
    if (context.isAdmin && !context.shopId) {
      return NextResponse.json({ error: "管理员请使用平台管理接口" }, { status: 400 });
    }

    const { id } = await params;
    const existing = await prisma.product.findFirst({
      where: {
        id,
        shopId: context.shopId!,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "商品不存在" }, { status: 404 });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}
