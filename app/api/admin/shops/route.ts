import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/shops";

export async function GET() {
  const user = await getSessionUser();
  if (String(user?.role ?? "").toUpperCase() !== "ADMIN") {
    return NextResponse.json({ error: "无权限" }, { status: 403 });
  }

  const shops = await prisma.shop.findMany({
    include: {
      _count: {
        select: {
          products: true,
          categories: true,
          orders: true,
          staffProfiles: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(shops);
}
