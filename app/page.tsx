import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { getShopLandingCards } from "@/lib/shops";

export default async function PlatformLandingPage() {
  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const shopCards = getShopLandingCards(shops);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_#7f1d1d,_#111827_60%)] px-6 py-24 text-white md:px-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-red-200">
            万事通电商平台
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            一个项目，支持多店铺运营的万事通电商平台
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-red-50/80">
            平台首页负责品牌展示与店铺入口，每个店铺在自己的路由、购物车、订单和员工权限下独立运行。
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 md:px-20">
        <div>
          <h2 className="text-2xl font-bold">店铺入口</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            选择一个店铺进入独立的商品、分类、购物车与结账流程。
          </p>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {shopCards.map((shop) => (
            <Link
              key={shop.id}
              href={shop.href}
              className="group rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-xl font-semibold">{shop.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {shop.description ?? "进入店铺浏览商品与下单。"}
              </p>
              <div className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-red-600">
                进入店铺
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
