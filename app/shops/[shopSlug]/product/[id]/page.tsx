import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight, Package } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { getCachedProduct } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { requireShopBySlug, serializeProduct } from "@/lib/shops";

interface Props {
  params: Promise<{ shopSlug: string; id: string }>;
}

export default async function ShopProductDetailPage({ params }: Props) {
  const { shopSlug, id } = await params;
  const shop = await requireShopBySlug(shopSlug);
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
  const outOfStock = product.stock === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar shopSlug={shop.slug} shopName={shop.name} />

      <div className="container mx-auto px-6 md:px-20 py-8 max-w-5xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            平台首页
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link href={`/shops/${shop.slug}`} className="hover:text-foreground transition-colors">
            {shop.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={`/shops/${shop.slug}/category/${product.categoryId}`}
            className="hover:text-foreground transition-colors"
          >
            {product.category?.name}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="text-foreground line-clamp-1">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-gray-200 flex items-center justify-center p-10">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                width={320}
                height={320}
                className="object-contain max-w-full max-h-full"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Package className="h-20 w-20 opacity-20" />
                <span className="text-sm">暂无图片</span>
              </div>
            )}

            {outOfStock && (
              <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  已售罄
                </Badge>
              </div>
            )}
          </div>

          <ProductDetailClient shopSlug={shop.slug} product={product} />
        </div>

        {serializedRelated.length > 0 && (
          <div className="mt-16 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">同类商品</h2>
              <Link
                href={`/shops/${shop.slug}/category/${product.categoryId}`}
                className="text-sm text-red-600 hover:underline"
              >
                查看全部 →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {serializedRelated.map((item) => (
                <Link
                  key={item.id}
                  href={`/shops/${shop.slug}/product/${item.id}`}
                  className="block"
                >
                  <ProductCard {...item} shopSlug={shop.slug} mode="buyer" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
