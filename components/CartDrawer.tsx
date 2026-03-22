"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CheckSquare, Minus, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useShopCart } from "@/lib/store/cartStore";
import { buildShopHref } from "@/lib/shops";
import { formatServiceSlotLabel } from "@/lib/service-booking";

interface CartDrawerProps {
  shopSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getCartItemLabel(item: {
  meta?: Record<string, unknown> | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}) {
  const slotLabel =
    item.meta && typeof item.meta.slotLabel === "string" ? item.meta.slotLabel : null;

  if (slotLabel) {
    return slotLabel;
  }

  if (item.scheduledStart && item.scheduledEnd) {
    return formatServiceSlotLabel(
      new Date(item.scheduledStart),
      new Date(item.scheduledEnd),
    );
  }

  return null;
}

export default function CartDrawer({ shopSlug, open, onOpenChange }: CartDrawerProps) {
  const router = useRouter();
  const { items, loading, fetchCart, removeItem, updateQuantity, totalPrice, clearCart } =
    useShopCart(shopSlug);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      fetchCart();
    }
  }, [fetchCart, open]);

  useEffect(() => {
    setSelectedProductIds((current) => {
      const availableIds = items.map((item) => item.productId);
      if (availableIds.length === 0) return [];
      if (current.length === 0) return availableIds;
      const next = current.filter((id) => availableIds.includes(id));
      return next.length > 0 ? next : availableIds;
    });
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedProductIds.includes(item.productId)),
    [items, selectedProductIds],
  );
  const allSelected = items.length > 0 && selectedProductIds.length === items.length;
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId],
    );
  };

  const toggleSelectAll = () => {
    setSelectedProductIds(allSelected ? [] : items.map((item) => item.productId));
  };

  const handleCheckout = () => {
    const params = new URLSearchParams();
    if (selectedProductIds.length > 0 && selectedProductIds.length < items.length) {
      params.set("selected", selectedProductIds.join(","));
    }
    onOpenChange(false);
    const query = params.toString();
    router.push(`${buildShopHref(shopSlug, "/cart")}${query ? `?${query}` : ""}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-green-600" />
            购物车
            <span className="text-sm font-normal text-muted-foreground">
              ({items.reduce((sum, item) => sum + item.quantity, 0)} 件商品)
            </span>
          </SheetTitle>
        </SheetHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center text-muted-foreground">
            <Package className="h-16 w-16 opacity-20" />
            <p className="font-medium">购物车是空的</p>
            <p className="text-sm">去选购吧</p>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4 pr-4">
              {items.length > 1 && (
                <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border text-red-600 focus:ring-red-500"
                    />
                    <span className="inline-flex items-center gap-1.5">
                      <CheckSquare className="h-4 w-4 text-red-600" />
                      全选
                    </span>
                  </label>
                  <span className="text-xs text-muted-foreground">在这里选择结算商品</span>
                </div>
              )}

              {items.map((item) => {
                const isService =
                  item.product.itemType === "SERVICE" ||
                  item.product.requiresScheduling === true ||
                  item.product.fulfillmentType === "BOOKING";
                const slotLabel = getCartItemLabel(item);

                return (
                  <div key={item.productId} className="flex gap-3">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(item.productId)}
                      onChange={() => toggleProductSelection(item.productId)}
                      className="mt-1 h-4 w-4 shrink-0 rounded border-border text-red-600 focus:ring-red-500"
                      aria-label={`select ${item.product.name}`}
                    />

                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-contain"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        RM {Number(item.product.price).toFixed(2)}
                      </p>
                      {slotLabel && (
                        <p className="mt-1 text-xs text-muted-foreground">{slotLabel}</p>
                      )}

                      {isService ? (
                        <p className="mt-1 text-xs text-rose-600">服务预约每次只能选择一个时段</p>
                      ) : (
                        <div className="mt-1.5 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>

                          <span className="w-6 text-center text-sm font-medium">
                            {item.quantity}
                          </span>

                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between">
                      <button onClick={() => removeItem(item.productId)}>
                        <Trash2 className="h-4 w-4 text-muted-foreground transition-colors hover:text-destructive" />
                      </button>
                      <p className="text-sm font-semibold">
                        RM {(Number(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-4 border-t px-5 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>已选商品</span>
                <span>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
              </div>

              <div className="flex items-center justify-between text-base font-semibold">
                <span>总计</span>
                <span>
                  RM {(selectedProductIds.length > 0 ? selectedTotal : totalPrice()).toFixed(2)}
                </span>
              </div>

              <Button
                className="w-full bg-red-600 text-white hover:bg-red-700"
                onClick={handleCheckout}
                disabled={selectedProductIds.length === 0}
              >
                去结算
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={clearCart}
              >
                清空购物车
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
