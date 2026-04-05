import { redirect } from "next/navigation";
import AdminNav from "@/components/AdminNav";
import AdminOrdersPanel from "@/components/admin/AdminOrdersPanel";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Order } from "@/types";

type SessionUser = {
  role?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();

  if (!session || role !== "ADMIN") {
    redirect("/admin/login");
  }

  const [orders, shops] = await Promise.all([
    prisma.order.findMany({
      include: {
        assignedStaff: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        shop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.shop.findMany({
      select: {
        id: true,
        name: true,
        staffProfiles: {
          where: {
            isActive: true,
          },
          select: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav active="orders" />
        <AdminOrdersPanel
          initialOrders={orders.map(
            (order): Order => ({
              ...order,
              totalAmount: Number(order.totalAmount),
              createdAt: order.createdAt.toISOString(),
              updatedAt: order.updatedAt.toISOString(),
              scheduledDate: order.scheduledDate?.toISOString() ?? null,
              scheduledStartTime: order.scheduledStartTime?.toISOString() ?? null,
              scheduledEndTime: order.scheduledEndTime?.toISOString() ?? null,
              paymentReceiptUploadedAt:
                order.paymentReceiptUploadedAt?.toISOString() ?? null,
              assignedToStaffAt: order.assignedToStaffAt?.toISOString() ?? null,
              items: order.items.map((item) => ({
                ...item,
                unitPrice: Number(item.unitPrice),
                costPriceSnapshot:
                  item.costPriceSnapshot == null ? null : Number(item.costPriceSnapshot),
                scheduledDate: item.scheduledDate?.toISOString() ?? null,
                scheduledStart: item.scheduledStart?.toISOString() ?? null,
                scheduledEnd: item.scheduledEnd?.toISOString() ?? null,
              })),
            }),
          )}
          shops={shops.map((shop) => ({
            id: shop.id,
            name: shop.name,
            staff: shop.staffProfiles.map((profile) => ({
              id: profile.user.id,
              name: profile.user.name,
              loginId: profile.user.phone,
              shopId: shop.id,
            })),
          }))}
        />
      </div>
    </div>
  );
}
