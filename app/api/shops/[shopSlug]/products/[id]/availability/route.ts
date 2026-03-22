import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireShopBySlug } from "@/lib/shops";
import { buildUpcomingServiceSlots, isServiceProduct } from "@/lib/service-booking";

interface Params {
  params: Promise<{ shopSlug: string; id: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const { shopSlug, id } = await params;
    const shop = await requireShopBySlug(shopSlug);

    const product = await prisma.product.findFirst({
      where: {
        id,
        shopId: shop.id,
        status: true,
      },
      select: {
        id: true,
        itemType: true,
        fulfillmentType: true,
        requiresScheduling: true,
        durationMinutes: true,
        minAdvanceHours: true,
        maxAdvanceDays: true,
        attributes: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "服务不存在" }, { status: 404 });
    }

    if (!isServiceProduct(product)) {
      return NextResponse.json({ slots: [] });
    }

    const bookings = await prisma.orderItem.findMany({
      where: {
        productId: product.id,
        scheduledStart: { not: null },
        order: {
          shopId: shop.id,
          status: {
            not: "CANCELLED",
          },
        },
      },
      select: {
        scheduledStart: true,
        scheduledEnd: true,
      },
    });

    const slots = buildUpcomingServiceSlots({
      attributes: product.attributes as Record<string, unknown> | null | undefined,
      durationMinutes: product.durationMinutes,
      minAdvanceHours: product.minAdvanceHours,
      maxAdvanceDays: product.maxAdvanceDays,
      bookedSlots: bookings,
    });

    return NextResponse.json({ slots });
  } catch {
    return NextResponse.json({ error: "获取可预约时段失败" }, { status: 400 });
  }
}
