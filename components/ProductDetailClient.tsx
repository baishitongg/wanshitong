"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Check, Package, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCartStore } from "@/lib/store/cartStore";
import { toast } from "sonner";
import type { Product } from "@/types";

interface Props {
  product: Product;
}

export default function ProductDetailClient({ product }: Props) {
  const { data: session } = useSession();
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock === 0;
  const maxQty = Math.min(product.stock, 99);

  const handleAddToCart = async () => {
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
      quantity
    );

    toast.success(`已将 ${product.name} × ${quantity} 加入购物车`);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Stock level indicator
  const stockLevel =
    outOfStock
      ? "out"
      : product.stock <= 5
      ? "low"
      : product.stock <= 20
      ? "medium"
      : "high";

  const stockColors = {
    out:    "bg-red-100 text-red-700 border-red-200",
    low:    "bg-orange-100 text-orange-700 border-orange-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    high:   "bg-green-100 text-green-700 border-green-200",
  };

  const stockLabels = {
    out:    "已售罄",
    low:    `仅剩 ${product.stock} 件`,
    medium: `库存 ${product.stock} 件`,
    high:   `库存充足（${product.stock} 件）`,
  };

  return (
    <div className="flex flex-col gap-5 py-1">
      {/* Category badge */}
      {product.category && (
        <div>
          <Badge variant="outline" className="flex items-center gap-1 w-fit text-xs">
            <Tag className="h-3 w-3" />
            {product.category.name}
          </Badge>
        </div>
      )}

      {/* Name */}
      <h1 className="text-2xl md:text-3xl font-bold leading-tight text-foreground">
        {product.name}
      </h1>

      {/* Price */}
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-red-600">
          RM{Number(product.price).toFixed(2)}
        </span>
      </div>

      {/* Stock badge */}
      <div>
        <span
          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${stockColors[stockLevel]}`}
        >
          {stockLabels[stockLevel]}
        </span>
      </div>

      {/* Description */}
      {product.description && (
        <div className="border-t border-border pt-4">
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {product.description}
          </p>
        </div>
      )}

      {/* Quantity selector + Add to cart */}
      {!outOfStock && (
        <div className="border-t border-border pt-5 space-y-4">
          {/* Qty selector */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground w-10">数量</span>
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="h-9 w-12 flex items-center justify-center text-sm font-semibold border-x border-border">
                {quantity}
              </span>
              <button
                className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-30"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">
              小计：
              <span className="font-semibold text-foreground ml-1">
                RM{(Number(product.price) * quantity).toFixed(2)}
              </span>
            </span>
          </div>

          {/* Add to cart button */}
          <Button
            size="lg"
            className={`w-full h-12 text-base font-semibold transition-all ${
              added
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-700 hover:bg-red-600"
            } text-white`}
            onClick={handleAddToCart}
          >
            {added ? (
              <>
                <Check className="h-5 w-5 mr-2" />
                已加入购物车
              </>
            ) : (
              <>
                <ShoppingCart className="h-5 w-5 mr-2" />
                加入购物车
              </>
            )}
          </Button>
        </div>
      )}

      {outOfStock && (
        <div className="border-t border-border pt-5">
          <Button
            size="lg"
            disabled
            className="w-full h-12 text-base"
          >
            <Package className="h-5 w-5 mr-2" />
            已售罄
          </Button>
        </div>
      )}
    </div>
  );
}