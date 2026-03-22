"use client";

import Image from "next/image";
import { Package, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useShopCart } from "@/lib/store/cartStore";
import type { Product } from "@/types";
import type { ShopTheme } from "@/lib/shopTheme";

interface ProductCardProps extends Product {
  shopSlug?: string;
  mode?: "buyer" | "admin";
  onEdit?: (product: Product) => void;
  theme?: ShopTheme;
}

export default function ProductCard({
  shopSlug,
  mode = "buyer",
  onEdit,
  theme,
  ...product
}: ProductCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addItem } = useShopCart(shopSlug ?? "__platform__");
  const isService =
    product.itemType === "SERVICE" ||
    product.requiresScheduling ||
    product.fulfillmentType === "BOOKING";
  const outOfStock = !isService && product.stock === 0;

  const handleBuyerAction = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!session?.user) {
      toast.error("请先登录后再继续");
      router.push("/login");
      return;
    }

    if (!shopSlug) {
      toast.error("当前商品未绑定店铺上下文");
      return;
    }

    if (isService) {
      router.push(`/shops/${shopSlug}/product/${product.id}`);
      return;
    }

    await addItem(
      {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        stock: product.stock,
        itemType: product.itemType,
        fulfillmentType: product.fulfillmentType,
        requiresScheduling: product.requiresScheduling,
        requiresAddress: product.requiresAddress,
      },
      1,
    );

    toast.success(`已将 ${product.name} 加入购物车`);
  };

  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <div className="relative aspect-square shrink-0 overflow-hidden bg-white">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-contain p-3 transition-transform duration-500"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-white">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}

        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Badge variant="secondary" className="text-xs">
              已售罄
            </Badge>
          </div>
        )}

        {product.category?.name && (
          <Badge className="absolute left-2 top-2 border border-border/50 bg-background/80 text-xs text-foreground backdrop-blur-sm">
            {product.category.name}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col bg-white p-3">
        <div className="min-h-[5rem]">
          <h3
            className="min-h-[3.75rem] line-clamp-3 text-sm font-medium leading-tight text-foreground transition-colors group-hover:text-primary"
            title={product.name}
          >
            {product.name}
          </h3>
          {product.description && (
            <p
              className="mt-0.5 min-h-4 line-clamp-1 text-xs text-muted-foreground"
              title={product.description}
            >
              {product.description}
            </p>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-3">
          <span className="text-base font-bold text-foreground">
            RM{Number(product.price).toFixed(2)}
          </span>

          {mode === "buyer" ? (
            <Button
              size="sm"
              className="h-8 px-3 text-xs text-white"
              style={{ backgroundColor: theme?.secondary ?? "#dc2626" }}
              onClick={handleBuyerAction}
              disabled={outOfStock}
            >
              <ShoppingCart className="mr-1 h-3 w-3" />
              {isService ? "选择时段" : "加购"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 px-3 text-xs"
              onClick={(event) => {
                event.preventDefault();
                onEdit?.(product as Product);
              }}
            >
              编辑
            </Button>
          )}
        </div>

        <p className="min-h-5 pt-2 text-xs text-muted-foreground">
          {isService ? "需先选择预约时段" : !outOfStock ? `库存 ${product.stock} 件` : ""}
        </p>
      </div>
    </div>
  );
}
