"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/lib/store/cartStore";
import { toast } from "sonner";
import type { Product } from "@/types";

export default function AddToCartButton({ product }: { product: Product }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const handle = () => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl,
      stock: product.stock,
    });
    toast.success(`已将 ${product.name} 加入购物车`);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (product.stock === 0) {
    return (
      <Button disabled className="w-full sm:w-auto" size="lg">
        已售罄
      </Button>
    );
  }

  return (
    <Button
      size="lg"
      className={`w-full sm:w-auto transition-all ${added ? "bg-red-700" : "bg-red-600 hover:bg-red-700"} text-white`}
      onClick={handle}
    >
      {added ? (
        <><Check className="h-5 w-5 mr-2" /> 已加入</>
      ) : (
        <><ShoppingCart className="h-5 w-5 mr-2" /> 加入购物车</>
      )}
    </Button>
  );
}