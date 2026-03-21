import { redirect } from "next/navigation";
import AdminManagementPanel from "@/components/AdminManagementPanel";
import AdminNav from "@/components/AdminNav";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type SessionUser = {
  role?: string;
};

export const dynamic = "force-dynamic";

export default async function AdminShopsPage() {
  const session = await auth();
  const user = session?.user as SessionUser | undefined;
  const role = String(user?.role ?? "").toUpperCase();

  if (!session || role !== "ADMIN") {
    redirect("/admin/login");
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

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <AdminNav active="shops" />
        <AdminManagementPanel
          mode="shops"
          shops={shops.map((shop) => ({
            ...shop,
            description: shop.description ?? null,
            heroTitle: shop.heroTitle ?? null,
            heroSubtitle: shop.heroSubtitle ?? null,
            heroImageUrl: shop.heroImageUrl ?? null,
          }))}
          staffProfiles={[]}
        />
      </div>
    </div>
  );
}
