import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import { getCachedProduct } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { requireShopBySlug, serializeProduct } from "@/lib/shops";
import { resolveShopTheme } from "@/lib/shopTheme";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopProductDetailPage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);
  const theme = resolveShopTheme(shop);
  const product = await getCachedProduct(shopSlug, id);

  if (!product || !product.status) notFound();

  const relatedProducts = await prisma.product.findMany({
    where: {
      shopId: product.shopId,
      categoryId: product.categoryId,
      status: true,
      id: { not: id },
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const serializedRelated = relatedProducts.map(serializeProduct);

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

      <div className="container mx-auto max-w-5xl px-6 py-8 md:px-20">
        <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/" className="transition-colors hover:text-foreground">
            平台首页
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={`/shops/${shop.slug}`}
            className="transition-colors hover:text-foreground"
          >
            {shop.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={`/shops/${shop.slug}/category/${product.categoryId}`}
            className="transition-colors hover:text-foreground"
          >
            {product.category?.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="line-clamp-1 text-foreground">{product.name}</span>
        </nav>

        <ProductDetailClient
          shopSlug={shop.slug}
          product={product}
          theme={theme}
          supportTelegram={shop.telegramUsername}
        />

        {serializedRelated.length > 0 && (
          <div className="mt-16 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">同类商品</h2>
              <Link
                href={`/shops/${shop.slug}/category/${product.categoryId}`}
                className="text-sm hover:underline"
                style={{ color: theme.secondary }}
              >
                查看全部 →
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {serializedRelated.map((item) => (
                <Link
                  key={item.id}
                  href={`/shops/${shop.slug}/product/${item.id}`}
                  className="block"
                >
                  <ProductCard {...item} shopSlug={shop.slug} mode="buyer" theme={theme} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
