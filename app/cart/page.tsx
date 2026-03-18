"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useCartStore } from "@/lib/store/cartStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart, Trash2, Plus, Minus, Package, Loader2, ArrowLeft,
  MapPin, Star, Home, Briefcase, ChevronRight, AlertCircle,
} from "lucide-react";
import type { Address } from "@/types";

function getLabelIcon(label: string | null) {
  if (!label) return <MapPin className="h-3.5 w-3.5" />;
  const l = label.toLowerCase();
  if (l.includes("home") || l.includes("家")) return <Home className="h-3.5 w-3.5" />;
  if (l.includes("office") || l.includes("work") || l.includes("公司") || l.includes("工作"))
    return <Briefcase className="h-3.5 w-3.5" />;
  return <MapPin className="h-3.5 w-3.5" />;
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { items, loading, fetchCart, updateQuantity, removeItem, clearCart, totalPrice } = useCartStore();

  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState("");

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  // Fetch cart + addresses on mount
  useEffect(() => {
    if (status === "authenticated") {
      fetchCart();
      fetchAddresses();
    }
    if (status === "unauthenticated") router.push("/login");
  }, [status]);

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    const res = await fetch("/api/addresses");
    if (res.ok) {
      const data: Address[] = await res.json();
      setAddresses(data);
      // Auto-select default address
      const def = data.find((a) => a.isDefault) ?? data[0] ?? null;
      if (def) setSelectedAddressId(def.id);
    }
    setAddressesLoading(false);
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;

    if (!selectedAddressId) {
      toast.error("请先选择收货地址");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: (session?.user as any)?.name,
          customerPhone: (session?.user as any)?.phone,
          notes,
          addressId: selectedAddressId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "下单失败，请重试");
        return;
      }

      clearCart();
      router.push(`/order-success?id=${data.id}`);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setPlacing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> 加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 md:px-20 py-8 max-w-3xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <ShoppingCart className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold">购物车</h1>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              共 {items.reduce((s, i) => s + i.quantity, 0)} 件商品
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="py-24 flex flex-col items-center gap-4 text-muted-foreground">
            <Package className="h-16 w-16 opacity-20" />
            <p className="font-medium text-lg">购物车是空的</p>
            <Link href="/">
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" /> 去选购
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart items */}
            <div className="space-y-3">
              {items.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="py-4 flex items-center gap-4">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                      {item.product.imageUrl ? (
                        <Image
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="h-full flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.product.name}</p>
                      <p className="text-sm text-red-600 font-semibold mt-0.5">
                        ¥{Number(item.product.price).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="font-bold text-sm w-20 text-right flex-shrink-0">
                      ¥{(Number(item.product.price) * item.quantity).toFixed(2)}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => removeItem(item.productId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Delivery Address Section ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-red-600" /> 收货地址
                </h2>
                <Link
                  href="/profile"
                  className="text-xs text-red-600 hover:underline flex items-center gap-1"
                >
                  管理地址 <ChevronRight className="h-3 w-3" />
                </Link>
              </div>

              {addressesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> 加载地址中...
                </div>
              ) : addresses.length === 0 ? (
                <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 text-yellow-500 opacity-70" />
                  <p className="text-sm font-medium">还没有收货地址</p>
                  <Link href="/profile">
                    <Button size="sm" className="bg-red-700 hover:bg-red-600 text-white flex items-center gap-2">
                      <Plus className="h-3.5 w-3.5" /> 前往添加地址
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`relative rounded-xl border-2 p-4 cursor-pointer transition-all ${
                        selectedAddressId === addr.id
                          ? "border-red-600 bg-red-50/40 dark:bg-red-950/10"
                          : "border-border hover:border-red-300"
                      }`}
                      onClick={() => setSelectedAddressId(addr.id)}
                    >
                      {/* Radio indicator */}
                      <div className={`absolute top-4 right-4 h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        selectedAddressId === addr.id ? "border-red-600" : "border-muted-foreground/40"
                      }`}>
                        {selectedAddressId === addr.id && (
                          <div className="h-2 w-2 rounded-full bg-red-600" />
                        )}
                      </div>

                      <div className="pr-6 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {addr.label && (
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              {getLabelIcon(addr.label)}
                              {addr.label}
                            </Badge>
                          )}
                          {addr.isDefault && (
                            <Badge className="text-xs bg-red-700 text-white border-0 flex items-center gap-1">
                              <Star className="h-2.5 w-2.5 fill-current" /> 默认
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {addr.recipient}
                          <span className="text-muted-foreground font-normal ml-2">{addr.phone}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {addr.street}, {addr.city}, {addr.state} {addr.postcode}, {addr.country}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="如有特殊要求，请在此注明..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Separator />

            {/* Summary */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>商品小计</span>
                <span>¥{totalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>合计</span>
                <span className="text-red-600">¥{totalPrice().toFixed(2)}</span>
              </div>
            </div>

            {/* No address warning */}
            {!selectedAddressId && addresses.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                请先添加收货地址才能下单
              </div>
            )}

            {/* Place order */}
            <Button
              className="w-full bg-red-700 hover:bg-red-600 text-white h-12 text-base"
              onClick={handlePlaceOrder}
              disabled={placing || !selectedAddressId}
            >
              {placing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              确认下单
            </Button>

            <Link href="/" className="block text-center text-sm text-muted-foreground hover:underline">
              继续购物
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}