import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import { prisma } from "@/lib/prisma";
import { requireShopBySlug, serializeProduct } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopCategoryPage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);

  const [category, allCategories, products] = await Promise.all([
    prisma.category.findFirst({
      where: { id, shopId: shop.id },
    }),
    prisma.category.findMany({
      where: { shopId: shop.id },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { shopId: shop.id, categoryId: id, status: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!category) notFound();

  const serializedProducts = products.map(serializeProduct);

  return (
    <div className="min-h-screen bg-background">
      <Navbar shopSlug={shop.slug} shopName={shop.name} />

      <section className="bg-gradient-to-r from-red-950 to-red-900 text-white py-10 px-6 md:px-20">
        <div className="container mx-auto max-w-5xl space-y-2">
          <nav className="flex items-center gap-1.5 text-sm text-red-300/80">
            <Link href="/" className="hover:text-white transition-colors">
              平台首页
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link
              href={`/shops/${shop.slug}`}
              className="hover:text-white transition-colors"
            >
              {shop.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">{category.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
          <p className="text-red-200/80 text-sm">共 {serializedProducts.length} 件商品</p>
        </div>
      </section>

      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-6 md:px-20 max-w-5xl">
          <div className="flex items-center gap-2 overflow-x-auto py-3" style={{ scrollbarWidth: "none" }}>
            <Link
              href={`/shops/${shop.slug}`}
              className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-red-400 hover:text-foreground transition-all"
            >
              全部分类
            </Link>

            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shops/${shop.slug}/category/${cat.id}`}
                className={`flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  cat.id === id
                    ? "bg-red-700 text-white border-red-700"
                    : "border-border text-muted-foreground hover:border-red-400 hover:text-foreground"
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="container mx-auto px-6 md:px-20 py-8 pb-20 max-w-5xl">
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
            products={serializedProducts}
            categories={[]}
            hideCategoryPills
          />
        </Suspense>
      </section>
    </div>
  );
}
