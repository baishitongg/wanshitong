import { getCachedProducts, getCachedCategories } from "@/lib/queries";
import Navbar from "@/components/Navbar";
import ProductGrid from "@/components/ProductGrid";
import { Package } from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  // These are cached — no DB hit on every navigation
  const [products, categories] = await Promise.all([
    getCachedProducts(),
    getCachedCategories(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative h-[480px] overflow-hidden bg-gradient-to-br from-green-950 via-green-900 to-emerald-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-700/30 via-transparent to-transparent" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 px-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-green-300/80 mb-2">
            AI-powered shopping
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white">
            Discover Amazing Products
          </h1>
          <p className="text-lg md:text-xl text-green-100/80 max-w-xl">
            Shop thousands of products with personalised recommendations built
            for you.
          </p>
          <Link
            href="#products"
            className="mt-4 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600 hover:bg-green-500 text-white font-medium transition-colors"
          >
            Shop now
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-6 md:px-20 py-10">
        <h2 className="text-2xl font-bold mb-6 text-foreground">
          Shop by Category
        </h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/products?category=${category.name.toLowerCase()}`}
            >
              <div className="group bg-card border border-border rounded-lg p-5 text-center hover:shadow-lg hover:border-primary hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                <Package className="mx-auto h-9 w-9 text-muted-foreground group-hover:text-green-600 mb-2 transition-colors" />
                <p className="text-sm font-medium group-hover:text-green-600 transition-colors">
                  {category.name}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Products */}
      <section
        id="products"
        className="container mx-auto px-6 md:px-20 py-8 pb-20"
      >
        <ProductGrid products={products} />
      </section>
    </div>
  );
}
