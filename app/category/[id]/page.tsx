import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Suspense } from "react";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import { ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;

  if (!id) notFound();

  const [category, allCategories, products] = await Promise.all([
    prisma.category.findUnique({
      where: { id },
    }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { categoryId: id, status: true },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (!category) notFound();

  const serializedProducts = products.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="bg-gradient-to-r from-red-950 to-red-900 text-white py-10 px-6 md:px-20">
        <div className="container mx-auto max-w-5xl space-y-2">
          <nav className="flex items-center gap-1.5 text-sm text-red-300/80">
            <Link href="/" className="hover:text-white transition-colors">
              首页
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white font-medium">{category.name}</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold">{category.name}</h1>
          <p className="text-red-200/80 text-sm">
            共 {serializedProducts.length} 件商品
          </p>
        </div>
      </section>

      <div className="border-b border-border bg-background/95 backdrop-blur-sm sticky top-16 z-30">
        <div className="container mx-auto px-6 md:px-20 max-w-5xl">
          <div
            className="flex items-center gap-2 overflow-x-auto py-3"
            style={{ scrollbarWidth: "none" }}
          >
            <Link
              href="/"
              className="flex-shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-red-400 hover:text-foreground transition-all"
            >
              全部分类
            </Link>

            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/category/${cat.id}`}
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
                <div
                  key={i}
                  className="aspect-square rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          }
        >
          <ProductGridWithFilter
            products={serializedProducts}
            categories={[]}
            hideCategoryPills
          />
        </Suspense>
      </section>
    </div>
  );
}