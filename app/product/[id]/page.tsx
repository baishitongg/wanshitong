import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ProductDetailClient from "@/components/ProductDetailClient";
import ProductCard from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Package } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  if (!id) notFound();

  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product || !product.status) notFound();

  const relatedProducts = await prisma.product.findMany({
    where: {
      categoryId: product.categoryId,
      status: true,
      id: { not: id },
    },
    include: { category: true },
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const serializedProduct = {
    ...product,
    price: Number(product.price),
  };

  const serializedRelated = relatedProducts.map((p) => ({
    ...p,
    price: Number(p.price),
  }));

  const outOfStock = product.stock === 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-6 md:px-20 py-8 max-w-5xl">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6 flex-wrap">
          <Link href="/" className="hover:text-foreground transition-colors">
            首页
          </Link>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
          <Link
            href={`/category/${product.categoryId}`}
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

          <ProductDetailClient product={serializedProduct} />
        </div>

        {serializedRelated.length > 0 && (
          <div className="mt-16 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">同类商品</h2>
              <Link
                href={`/category/${product.categoryId}`}
                className="text-sm text-red-600 hover:underline"
              >
                查看全部 →
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {serializedRelated.map((p) => (
                <Link key={p.id} href={`/product/${p.id}`} className="block">
                  <ProductCard {...p} mode="buyer" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
