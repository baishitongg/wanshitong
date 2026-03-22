import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getCachedCategories, getCachedProducts } from "@/lib/queries";
import { requireShopBySlug } from "@/lib/shops";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import MobileCategoryDropdown from "@/components/MobileCategoryDropdown";

interface Props {
  params: Promise<{ shopSlug: string }>;
}

export default async function ShopHomePage({ params }: Props) {
  const { shopSlug } = await params;
  const shop = await requireShopBySlug(shopSlug);

  const [products, categories] = await Promise.all([
    getCachedProducts(shopSlug),
    getCachedCategories(shopSlug),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar shopSlug={shop.slug} shopName={shop.name} />

      <section className="relative overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-rose-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.14),_transparent_36%)]" />
        {shop.heroImageUrl ? (
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center"
            style={{ backgroundImage: `url(${shop.heroImageUrl})` }}
          />
        ) : null}

        <div className="relative container mx-auto px-6 py-10 md:px-20 md:py-14">
          <div className="max-w-2xl text-white">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-red-100/85">
              Wanshitong Platform
            </span>
            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {shop.heroTitle ?? shop.name}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-red-50/85 md:text-lg md:leading-8">
              {shop.heroSubtitle ?? shop.description ?? "探索店铺商品与分类。"}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link
                href="#products"
                className="inline-flex items-center justify-center rounded-full bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-400"
              >
                立即选购
              </Link>
              <Link
                href={`/shops/${shop.slug}/how-to-use`}
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/15"
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

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shops/${shop.slug}/category/${cat.id}`}
                  className="flex flex-shrink-0 items-center gap-0.5 whitespace-nowrap text-sm text-muted-foreground transition-colors hover:text-red-600"
                >
                  {cat.name}
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
          />
        </Suspense>
      </section>
    </div>
  );
}
