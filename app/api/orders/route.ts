import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SHOP_SLUG } from "@/lib/constants";
import { createOrderFromCart } from "@/lib/commerce";
import type { ContactChannel } from "@prisma/client";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  phone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel | null;
};

type CreateOrderBody = {
  customerName?: string;
  customerPhone?: string;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel;
  notes?: string;
  addressId?: string;
};

export async function GET(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  if (String(user.role ?? "").toUpperCase() !== "STAFF") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? undefined;

  const validStatuses = ["VERIFYING", "PROCESSING", "SHIPPED", "RECEIVED", "CANCELLED", "REFUND"];

  const orders = await prisma.order.findMany({
    where:
      status && validStatuses.includes(status)
        ? { status: status as never }
        : undefined,
    include: {
      items: { include: { product: true } },
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          telegramUsername: true,
          preferredContactChannel: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const user = session.user as SessionUser;
  const userId = user.id;

  if (!userId) {
    return NextResponse.json({ error: "用户信息无效" }, { status: 401 });
  }

  const body = (await req.json()) as CreateOrderBody;

  if (!body.addressId) {
    return NextResponse.json({ error: "请选择收货地址" }, { status: 400 });
  }

  const shop = await prisma.shop.findUnique({
    where: { slug: DEFAULT_SHOP_SLUG },
    select: { id: true },
  });

  if (!shop) {
    return NextResponse.json({ error: "店铺不存在" }, { status: 400 });
  }

  try {
    const order = await createOrderFromCart({
      shopId: shop.id,
      userId,
      customerName: body.customerName ?? user.name ?? null,
      customerPhone: body.customerPhone ?? user.phone ?? null,
      telegramUsername: body.telegramUsername ?? user.telegramUsername ?? null,
      preferredContactChannel:
        body.preferredContactChannel ?? user.preferredContactChannel ?? "PHONE",
      notes: body.notes ?? null,
      addressId: body.addressId,
      paymentMethod: "QR",
      paymentReceiptUrl: "legacy-api-placeholder",
    });

    try {
      const io = (globalThis as {
        io?: {
          to: (room: string) => {
            emit: (event: string, payload: unknown) => void;
          };
        };
      }).io;

      io?.to("assistants").emit("new_order", order);
    } catch (error) {
      console.error("[orders] socket emit failed:", error);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "下单失败，请稍后重试";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
