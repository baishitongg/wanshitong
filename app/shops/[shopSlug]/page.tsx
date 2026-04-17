import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCachedCategories, getCachedProducts } from "@/lib/queries";
import { flattenCategoryTree } from "@/lib/categories";
import { requireShopBySlug } from "@/lib/shops";
import { resolveShopTheme, withAlpha } from "@/lib/shopTheme";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import MobileCategoryDropdown from "@/components/MobileCategoryDropdown";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopHomePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);
  const theme = resolveShopTheme(shop);

  const [products, categories] = await Promise.all([
    getCachedProducts(shopSlug),
    getCachedCategories(shopSlug),
  ]);
  const categoryNav = flattenCategoryTree(categories);

  return (
    <div className="min-h-screen bg-background" style={{ backgroundColor: theme.surface }}>
      <Navbar
        shopSlug={shop.slug}
        shopName={shop.name}
        theme={theme}
        supportWhatsApp={shop.whatsappPhone}
        supportTelegram={shop.telegramUsername}
        hideCart={shop.shopType === "SERVICE"}
      />

      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.secondary} 58%, ${theme.accent} 100%)`,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at top right, ${withAlpha("#ffffff", 0.14)}, transparent 36%)`,
          }}
        />
        {shop.heroImageUrl ? (
          <div
            className="pointer-events-none absolute inset-0 hidden bg-no-repeat opacity-15 md:block"
            style={{
              backgroundImage: `url(${shop.heroImageUrl})`,
              backgroundPosition: "right 14% center",
              backgroundSize: "46% auto",
            }}
          />
        ) : null}

        <div className="relative container mx-auto px-6 py-10 md:px-20 md:py-14">
          <div className="max-w-2xl text-white">
            <span
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.24em]"
              style={{
                border: `1px solid ${withAlpha("#ffffff", 0.18)}`,
                backgroundColor: withAlpha("#ffffff", 0.1),
                color: withAlpha("#ffffff", 0.86),
              }}
            >
              万事通平台
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {shop.heroTitle ?? shop.name}
            </h1>
            <p
              className="mt-3 max-w-xl text-sm leading-6 md:text-lg md:leading-8"
              style={{ color: withAlpha("#ffffff", 0.86) }}
            >
              {shop.heroSubtitle ?? shop.description ?? "探索店铺商品与分类。"}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#products"
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
                style={{ backgroundColor: theme.accent }}
              >
                立即选购
              </Link>
              <Link
                href={`/shops/${shop.slug}/how-to-use`}
                className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold text-white transition-colors"
                style={{
                  border: `1px solid ${withAlpha("#ffffff", 0.22)}`,
                  backgroundColor: withAlpha("#ffffff", 0.1),
                }}
              >
                使用说明
              </Link>
            </div>
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <>
          <MobileCategoryDropdown shopSlug={shop.slug} categories={categories} />

          <div className="hidden border-b border-border bg-background md:block">
            <div className="container mx-auto flex items-center gap-4 overflow-x-auto whitespace-nowrap px-6 py-3 no-scrollbar md:px-20">
              <span className="flex-shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                分类
              </span>

              {categoryNav.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shops/${shop.slug}/category/${cat.id}`}
                  className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap text-sm transition-colors"
                  style={{ color: theme.secondary }}
                >
                  {cat.label}
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <section id="products" className="container mx-auto px-6 py-10 pb-20 md:px-20">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          }
        >
          <ProductGridWithFilter
            shopSlug={shop.slug}
            products={products}
            categories={categories}
            theme={theme}
          />
        </Suspense>
      </section>
    </div>
  );
}
