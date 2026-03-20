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

      <section className="relative h-[420px] overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-rose-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-700/30 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-red-300/80 mb-2">
            Wanshitong Platform
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            {shop.heroTitle ?? shop.name}
          </h1>
          <p className="text-lg md:text-xl text-red-100/80 max-w-xl">
            {shop.heroSubtitle ?? shop.description ?? "探索店铺商品与分类。"}
          </p>
          <Link
            href="#products"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            立即选购
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <>
          <MobileCategoryDropdown shopSlug={shop.slug} categories={categories} />

          <div className="hidden md:block border-b border-border bg-background">
            <div className="container mx-auto px-6 md:px-20 py-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap no-scrollbar">
              <span className="text-xs text-muted-foreground font-medium flex-shrink-0 uppercase tracking-wide">
                分类
              </span>

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/shops/${shop.slug}/category/${cat.id}`}
                  className="flex-shrink-0 text-sm text-muted-foreground hover:text-red-600 transition-colors flex items-center gap-0.5 whitespace-nowrap"
                >
                  {cat.name}
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      <section id="products" className="container mx-auto px-6 md:px-20 py-10 pb-20">
        <Suspense
          fallback={
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
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
