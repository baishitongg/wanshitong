"use client";

import Image from "next/image";
import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShopCart } from "@/lib/store/cartStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types";

interface ProductCardProps extends Product {
  shopSlug?: string;
  mode?: "buyer" | "admin";
  onEdit?: (product: Product) => void;
}

export default function ProductCard({
  shopSlug,
  mode = "buyer",
  onEdit,
  ...product
}: ProductCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addItem } = useShopCart(shopSlug ?? "__platform__");

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      toast.error("请先登录后再加入购物车");
      router.push("/login");
      return;
    }

    if (!shopSlug) {
      toast.error("当前商品未绑定店铺上下文");
      return;
    }

    await addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
      },
      1,
    );

    toast.success(`已将 ${product.name} 加入购物车`);
  };

  const outOfStock = product.stock === 0;

  return (
    <div className="group flex h-full flex-col bg-white border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300">
      <div className="relative aspect-square bg-white overflow-hidden shrink-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-3 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center bg-white">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">
              已售罄
            </Badge>
          </div>
        )}

        {product.category?.name && (
          <Badge className="absolute top-2 left-2 text-xs bg-background/80 text-foreground border border-border/50 backdrop-blur-sm">
            {product.category.name}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col p-3 bg-white">
        <div className="min-h-[5rem]">
          <h3
            className="font-medium text-sm leading-tight line-clamp-3 text-foreground group-hover:text-primary transition-colors min-h-[3.75rem]"
            title={product.name}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              className="mt-0.5 min-h-4 text-xs text-muted-foreground line-clamp-1"
              title={product.description}
            >
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <span className="font-bold text-base text-foreground">
            RM{Number(product.price).toFixed(2)}
          </span>

          {mode === "buyer" ? (
            <Button
              size="sm"
              className="h-8 px-3 bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={handleAddToCart}
              disabled={outOfStock}
            >
              <ShoppingCart className="h-3 w-3 mr-1" />
              加购
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={(e) => {
                e.preventDefault();
                onEdit?.(product as Product);
              }}
            >
              编辑
            </Button>
          )}
        </div>

        <p className="pt-2 text-xs text-muted-foreground min-h-5">
          {!outOfStock ? `库存 ${product.stock} 件` : ""}
        </p>
      </div>
    </div>
  );
}
