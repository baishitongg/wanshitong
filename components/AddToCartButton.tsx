"use client";

import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/lib/store/cartStore";

interface Props {
  shopSlug: string;
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl?: string | null;
    stock: number;
  };
}

export default function AddToCartButton({ shopSlug, product }: Props) {
  const { addItem } = useShopCart(shopSlug);

  return (
    <Button
      onClick={() => addItem(product, 1)}
      disabled={product.stock <= 0}
      className="bg-red-700 hover:bg-red-600 text-white"
    >
      <ShoppingCart className="h-4 w-4 mr-2" />
      加入购物车
    </Button>
  );
}
