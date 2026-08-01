import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Shop } from "@prisma/client";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import ShopCategoryNavigation from "@/components/ShopCategoryNavigation";
import {
  getCategoryAncestors,
  getCategoryAndDescendantIds,
} from "@/lib/categories";
import { prisma } from "@/lib/prisma";
import { buildStorefrontHref, serializeProduct } from "@/lib/shops";
import { resolveShopTheme, withAlpha } from "@/lib/shopTheme";

type ShopCategoryPageProps = {
  shop: Shop;
  categoryId: string;
  storefrontBasePath?: string;
  showPlatformLink?: boolean;
};

export default async function ShopCategoryPage({
  shop,
  categoryId,
  storefrontBasePath,
  showPlatformLink = true,
}: ShopCategoryPageProps) {
  const theme = resolveShopTheme(shop);

  const allCategories = await prisma.category.findMany({
    where: { shopId: shop.id },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const category = allCategories.find((item) => item.id === categoryId);

  if (!category) notFound();

  const categoryIds = getCategoryAndDescendantIds(allCategories, category.id);
  const products = await prisma.product.findMany({
    where: { shopId: shop.id, categoryId: { in: categoryIds }, status: true },
    include: { category: true },
    orderBy: { createdAt: "desc" },
  });
  const serializedProducts = products.map(serializeProduct);
  const categoryAncestors = getCategoryAncestors(allCategories, category.id);
  const shopHref = buildStorefrontHref(shop.slug, "", storefrontBasePath);

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: theme.surface }}>
      <Navbar
        shopSlug={shop.slug}
        shopName={shop.name}
        theme={theme}
        supportWhatsApp={shop.whatsappPhone}
        supportTelegram={shop.telegramUsername}
        hideCart={shop.shopType === "SERVICE"}
        storefrontBasePath={storefrontBasePath}
        showPlatformLink={showPlatformLink}
      />

      <section
        className="px-6 py-10 text-white md:px-20"
        style={{
          background: `linear-gradient(90deg, ${theme.primary} 0%, ${theme.secondary} 100%)`,
        }}
      >
        <div className="container mx-auto max-w-5xl space-y-2">
          <nav
            className="flex items-center gap-1.5 text-sm"
            style={{ color: withAlpha("#ffffff", 0.8) }}
          >
            {showPlatformLink && (
              <>
                <Link href="/" className="transition-colors hover:text-white">
                  平台首页
                </Link>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <Link href={shopHref} className="transition-colors hover:text-white">
              {shop.name}
            </Link>
            {categoryAncestors.map((ancestor) => (
              <div key={ancestor.id} className="flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5" />
                <Link
                  href={buildStorefrontHref(
                    shop.slug,
                    `/category/${ancestor.id}`,
                    storefrontBasePath,
                  )}
                  className="transition-colors hover:text-white"
                >
                  {ancestor.name}
                </Link>
              </div>
            ))}
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-white">{category.name}</span>
          </nav>

          <h1 className="text-3xl font-bold md:text-4xl">{category.name}</h1>
          <p className="text-sm" style={{ color: withAlpha("#ffffff", 0.82) }}>
            共 {serializedProducts.length} 件商品
          </p>
        </div>
      </section>

      <ShopCategoryNavigation
        shopSlug={shop.slug}
        categories={allCategories}
        currentCategoryId={category.id}
        theme={theme}
        stickyDesktop
        narrow
        storefrontBasePath={storefrontBasePath}
      />

      <section className="container mx-auto max-w-5xl px-6 py-8 pb-20 md:px-20">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          }
        >
          <ProductGridWithFilter
            shopSlug={shop.slug}
            products={serializedProducts}
            categories={[]}
            hideCategoryPills
            theme={theme}
            storefrontBasePath={storefrontBasePath}
          />
        </Suspense>
      </section>
    </div>
  );
}
