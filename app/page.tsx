import { Suspense } from "react";
import { getCachedProducts, getCachedCategories } from "@/lib/queries";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import MobileCategoryDropdown from "@/components/MobileCategoryDropdown";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getCachedProducts(),
    getCachedCategories(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero banner */}
      <section className="relative h-[420px] overflow-hidden bg-gradient-to-br from-red-950 via-red-900 to-rose-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-red-700/30 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-red-300/80 mb-2">
            万事通 · 品质生活
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white">中国超市</h1>
          <p className="text-lg md:text-xl text-red-100/80 max-w-xl">
            正宗中国商品，品种齐全，物美价廉，就在您身边。
          </p>
          <Link
            href="#products"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
          >
            立即选购
          </Link>
        </div>
      </section>

      {/* Category section */}
      {categories.length > 0 && (
        <>
          {/* Mobile */}
          <MobileCategoryDropdown categories={categories} />

          {/* Desktop */}
          <div className="hidden md:block border-b border-border bg-background">
            <div className="container mx-auto px-6 md:px-20 py-3 flex items-center gap-4 overflow-x-auto whitespace-nowrap no-scrollbar">
              <span className="text-xs text-muted-foreground font-medium flex-shrink-0 uppercase tracking-wide">
                分类
              </span>

              {categories.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.id}`}
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

      {/* Products with category filter */}
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
          <ProductGridWithFilter products={products} categories={categories} />
        </Suspense>
      </section>
    </div>
  );
}