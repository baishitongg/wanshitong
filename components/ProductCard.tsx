"use client";

import Image from "next/image";
import { ShoppingCart, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store/cartStore";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Product } from "@/types";

interface ProductCardProps extends Product {
  mode?: "buyer" | "admin";
  onEdit?: (product: Product) => void;
}

export default function ProductCard({ mode = "buyer", onEdit, ...product }: ProductCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Must be logged in
    if (!session?.user) {
      toast.error("请先登录后再加入购物车");
      router.push("/login");
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
      1
    );

    toast.success(`已将 ${product.name} 加入购物车`);
  };

  const outOfStock = product.stock === 0;

  return (
    <div className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-300">
      {/* Image */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Badge variant="secondary" className="text-xs">已售罄</Badge>
          </div>
        )}
        <Badge className="absolute top-2 left-2 text-xs bg-background/80 text-foreground border border-border/50 backdrop-blur-sm">
          {product.category?.name}
        </Badge>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <h3 className="font-medium text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {product.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-base text-foreground">
            ¥{Number(product.price).toFixed(2)}
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
              onClick={(e) => { e.preventDefault(); onEdit?.(product as Product); }}
            >
              编辑
            </Button>
          )}
        </div>

        {!outOfStock && (
          <p className="text-xs text-muted-foreground">库存 {product.stock} 件</p>
        )}
      </div>
    </div>
  );
}