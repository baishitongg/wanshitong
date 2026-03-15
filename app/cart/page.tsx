"use client";

import { useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus, Trash2, Package, ShoppingBag, MessageCircle } from "lucide-react";
import { toast } from "sonner";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    notes: "",
  });

  const handleOrder = async () => {
    if (!form.customerName || !form.customerPhone) {
      toast.error("请填写姓名和手机号码");
      return;
    }
    if (items.length === 0) {
      toast.error("购物车为空");
      return;
    }

    setLoading(true);
    try {
      const guestSession = localStorage.getItem("sessionId") || crypto.randomUUID();
      localStorage.setItem("sessionId", guestSession);

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ productId: i.id, quantity: i.quantity })),
          ...form,
          guestSession,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "下单失败");
      }

      const order = await res.json();
      clearCart();
      toast.success("下单成功！");
      router.push(`/order-success?id=${order.id}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 md:px-20 py-20 flex flex-col items-center gap-4 text-center">
          <Package className="h-20 w-20 text-muted-foreground/20" />
          <h2 className="text-2xl font-bold">购物车为空</h2>
          <p className="text-muted-foreground">请先选购商品再结算。</p>
          <Link href="/">
            <Button className="bg-green-600 hover:bg-green-700 text-white mt-2">继续购物</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 md:px-20 py-10">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-green-600" /> 我的购物车
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* 商品列表 */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="relative h-20 w-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Package className="h-7 w-7 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold line-clamp-1">{item.name}</p>
                  <p className="text-sm text-muted-foreground">¥{item.price.toFixed(2)} / 件</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)} disabled={item.quantity >= item.stock}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive transition-colors" />
                  </button>
                  <p className="font-bold">¥{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 订单信息 + 结算 */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">联系信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">姓名 *</Label>
                  <Input id="name" placeholder="请输入您的姓名" value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-green-600" /> 手机号码 *
                  </Label>
                  <Input id="phone" placeholder="请输入手机号码" value={form.customerPhone} onChange={(e) => setForm((f) => ({ ...f, customerPhone: e.target.value }))} />
                  <p className="text-xs text-muted-foreground">我们将通过微信或电话与您确认订单。</p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="notes">备注（选填）</Label>
                  <Textarea id="notes" placeholder="如有特殊要求请在此说明..." rows={3} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>共 {items.reduce((s, i) => s + i.quantity, 0)} 件商品</span>
                  <span>¥{totalPrice().toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>合计</span>
                  <span>¥{totalPrice().toFixed(2)}</span>
                </div>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white mt-2"
                  size="lg"
                  onClick={handleOrder}
                  disabled={loading}
                >
                  {loading ? "提交中..." : "确认下单"}
                </Button>
                <p className="text-xs text-center text-muted-foreground">无需在线支付，我们将联系您完成交易。</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}