import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowRight, Store } from "lucide-react";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";
import { getShopLandingCards } from "@/lib/shops";

function normalizeRequestDomain(host: string | null) {
  const domain = host
    ?.trim()
    .toLowerCase()
    .replace(/^www\./, "")
    .split(":")[0];

  if (!domain || domain === "localhost" || domain === "127.0.0.1") {
    return null;
  }

  return domain;
}

export default async function PlatformLandingPage() {
  const domain = normalizeRequestDomain((await headers()).get("host"));

  if (domain) {
    const domainShop = await prisma.shop.findFirst({
      where: {
        domain,
        status: "ACTIVE",
        shopType: {
          in: ["PRODUCT", "HYBRID"],
        },
      } as never,
      select: {
        slug: true,
      },
    });

    if (domainShop) {
      redirect(`/shops/${domainShop.slug}`);
    }
  }

  const shops = await prisma.shop.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });

  const shopCards = getShopLandingCards(shops);
  const productShop = shopCards.find((shop) => !/龙宫|service|spa|按摩|massage/i.test(shop.name));
  const serviceShop = shopCards.find((shop) => shop.id !== productShop?.id);
  const orderedShopCards = [productShop, serviceShop].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-10 md:py-14 xl:px-12">
        <div className="rounded-[28px] border bg-white px-8 py-8 text-center shadow-sm md:px-12 md:py-10">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">店铺入口</h1>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {orderedShopCards.map((shop, index) => {
            if (!shop) return null;

            const isService = index === 1;

            return (
            <Link
              key={shop.id}
              href={shop.href}
              className="group min-h-72 rounded-[32px] border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:border-red-300 hover:shadow-lg md:p-10"
            >
              <p className="mb-6 text-sm font-semibold tracking-[0.24em] text-red-600">
                {isService ? "放松享受" : "生活用品"}
              </p>
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-700">
                {shop.logoUrl ? (
                  <div className="relative h-16 w-16 overflow-hidden rounded-2xl">
                    <Image
                      src={shop.logoUrl}
                      alt={`${shop.name} logo`}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ) : (
                  <Store className="h-9 w-9" />
                )}
              </div>
              <h2 className="mt-8 text-3xl font-semibold">{shop.name}</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                {isService
                  ? "按摩、SPA、美容放松与享受类服务，一站式轻松预约。"
                  : shop.description ?? "日常生活用品、食品与家居好物，方便浏览与下单。"}
              </p>
              <div className="mt-10 inline-flex items-center gap-2 text-base font-semibold text-red-600">
                进入店铺
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
