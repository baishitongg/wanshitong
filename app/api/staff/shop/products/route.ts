import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProductsForShop } from "@/lib/commerce";
import { getStaffShopContext, serializeProduct } from "@/lib/shops";
import {
  buildServiceAttributes,
  type ServiceAvailabilityDay,
  type ServiceMediaItem,
  type ServicePackageOption,
} from "@/lib/service-booking";
import { Prisma } from "@prisma/client";

type Body = {
  name?: string;
  description?: string | null;
  price?: number;
  costPrice?: number | null;
  stock?: number;
  categoryId?: string;
  imageUrl?: string | null;
  status?: boolean;
  attributes?: Record<string, unknown> | null;
  galleryUrls?: string[];
  galleryMedia?: ServiceMediaItem[];
  packageOptions?: ServicePackageOption[];
  weeklyAvailability?: ServiceAvailabilityDay[];
  durationMinutes?: number;
  minAdvanceHours?: number;
  maxAdvanceDays?: number;
  requiresAddress?: boolean;
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

    const shop = await prisma.shop.findUnique({
      where: { id: context.shopId! },
      select: { id: true, shopType: true, ownershipType: true },
    });

    if (!shop) {
      return NextResponse.json({ error: "店铺不存在" }, { status: 404 });
    }

    const body = (await req.json()) as Body;
    if (!body.name || body.price === undefined || !body.categoryId) {
      return NextResponse.json({ error: "名称、价格和分类为必填项" }, { status: 400 });
    }

    if (shop.ownershipType === "SELF_OPERATED" && body.costPrice === undefined) {
      return NextResponse.json({ error: "请填写成本价" }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id: body.categoryId, shopId: context.shopId! },
    });

    if (!category) {
      return NextResponse.json({ error: "分类不存在" }, { status: 400 });
    }

    const isServiceShop = shop.shopType === "SERVICE";
    const serviceAttributes = isServiceShop
        ? buildServiceAttributes({
          galleryMedia:
            body.galleryMedia ??
            (body.galleryUrls ?? []).map((url) => ({ url, type: "image" as const })),
          galleryUrls: body.galleryUrls ?? [],
          packageOptions: body.packageOptions ?? [],
          weeklyAvailability: body.weeklyAvailability ?? [],
        })
      : null;

    const product = await prisma.product.create({
      data: {
        shopId: context.shopId!,
        categoryId: body.categoryId,
        name: body.name,
        description: body.description ?? null,
        price: body.price,
        costPrice: shop.ownershipType === "SELF_OPERATED" ? body.costPrice ?? null : null,
        stock: isServiceShop ? 1 : body.stock ?? 0,
        imageUrl: body.imageUrl ?? null,
        status: body.status ?? true,
        itemType: isServiceShop ? "SERVICE" : "PHYSICAL",
        fulfillmentType: isServiceShop ? "BOOKING" : "DELIVERY",
        requiresScheduling: isServiceShop,
        durationMinutes: isServiceShop ? body.durationMinutes ?? 60 : null,
        minAdvanceHours: isServiceShop ? 0 : null,
        maxAdvanceDays: isServiceShop ? 14 : null,
        requiresAddress: isServiceShop ? body.requiresAddress ?? false : true,
        requiresContact: true,
        attributes: isServiceShop
          ? (serviceAttributes as Prisma.InputJsonValue)
          : body.attributes !== undefined
            ? (body.attributes as Prisma.InputJsonValue)
            : Prisma.JsonNull,
      },
      include: { category: true },
    });

    return NextResponse.json(serializeProduct(product), { status: 201 });
  } catch {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }
}
