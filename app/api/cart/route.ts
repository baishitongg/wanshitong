import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";

type SessionUser = {
  id?: string;
};

async function getLegacyShopId() {
  const shop = await prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
    select: { id: true },
  });

  return shop?.id ?? null;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const userId = user.id;

  if (!userId) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { category: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(cart ?? { items: [] });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const userId = user.id;

  if (!userId) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  const { productId, quantity } = (await req.json()) as {
    productId?: string;
    quantity?: number;
  };

  if (!productId || typeof quantity !== "number" || quantity < 1) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      stock: true,
      shopId: true,
    },
  });

  if (!product) {
    return NextResponse.json({ error: "商品不存在" }, { status: 404 });
  }

  if (product.stock < quantity) {
    return NextResponse.json({ error: "库存不足" }, { status: 400 });
  }

  const shopId = product.shopId || (await getLegacyShopId());
  if (!shopId) {
    return NextResponse.json({ error: "店铺不存在" }, { status: 400 });
  }

  const cart = await prisma.cart.upsert({
    where: {
      userId_shopId: {
        userId,
        shopId,
      },
    },
    create: {
      userId,
      shopId,
    },
    update: {},
  });

  const existingItem = await prisma.cartItem.findFirst({
    where: {
      cartId: cart.id,
      productId,
    },
    select: { id: true },
  });

  const item = existingItem
    ? await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity },
        include: { product: { include: { category: true } } },
      })
    : await prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
        include: { product: { include: { category: true } } },
      });

  return NextResponse.json(item, { status: 200 });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const userId = user.id;

  if (!userId) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  await prisma.cart.deleteMany({ where: { userId } });

  return NextResponse.json({ ok: true });
}
