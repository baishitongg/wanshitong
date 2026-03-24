import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProductGridWithFilter from "@/components/ProductGridWithFilter";
import { prisma } from "@/lib/prisma";
import { requireShopBySlug, serializeProduct } from "@/lib/shops";
import { resolveShopTheme, withAlpha } from "@/lib/shopTheme";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopCategoryPage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);
  const theme = resolveShopTheme(shop);

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
            <Link href="/" className="transition-colors hover:text-white">
              平台首页
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link href={`/shops/${shop.slug}`} className="transition-colors hover:text-white">
              {shop.name}
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="font-medium text-white">{category.name}</span>
          </nav>

          <h1 className="text-3xl font-bold md:text-4xl">{category.name}</h1>
          <p className="text-sm" style={{ color: withAlpha("#ffffff", 0.82) }}>
            共 {serializedProducts.length} 件商品
          </p>
        </div>
      </section>

      <div className="sticky top-16 z-30 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="container mx-auto max-w-5xl px-6 md:px-20">
          <div className="flex items-center gap-2 overflow-x-auto py-3" style={{ scrollbarWidth: "none" }}>
            <Link
              href={`/shops/${shop.slug}`}
              className="inline-flex flex-shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground transition-all"
              style={{ borderColor: withAlpha(theme.secondary, 0.22) }}
            >
              全部分类
            </Link>

            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/shops/${shop.slug}/category/${cat.id}`}
                className={`inline-flex flex-shrink-0 items-center rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                  cat.id === id ? "text-white" : "text-muted-foreground"
                }`}
                style={
                  cat.id === id
                    ? {
                        backgroundColor: theme.secondary,
                        borderColor: theme.secondary,
                      }
                    : {
                        borderColor: withAlpha(theme.secondary, 0.2),
                      }
                }
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="container mx-auto max-w-5xl px-6 py-8 pb-20 md:px-20">
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
            products={serializedProducts}
            categories={[]}
            hideCategoryPills
            theme={theme}
          />
        </Suspense>
      </section>
    </div>
  );
}
