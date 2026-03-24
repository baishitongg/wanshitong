"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Briefcase,
  Home,
  Loader2,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { useShopCart } from "@/lib/store/cartStore";
import { buildShopHref } from "@/lib/shops";
import { formatServiceSlotLabel } from "@/lib/service-booking";
import type { ShopTheme } from "@/lib/shopTheme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Address } from "@/types";

type ContactChannel = "PHONE" | "TELEGRAM";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  phone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: ContactChannel | null;
};

function getLabelIcon(label: string | null) {
  if (!label) return <MapPin className="h-3.5 w-3.5" />;
  const lower = label.toLowerCase();
  if (lower.includes("home") || lower.includes("家")) {
    return <Home className="h-3.5 w-3.5" />;
  }
  if (lower.includes("office") || lower.includes("work") || lower.includes("公司")) {
    return <Briefcase className="h-3.5 w-3.5" />;
  }
  return <MapPin className="h-3.5 w-3.5" />;
}

function getServiceSlotText(item: {
  meta?: Record<string, unknown> | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
}) {
  if (item.meta && typeof item.meta.slotLabel === "string") {
    return item.meta.slotLabel;
  }

  if (item.scheduledStart && item.scheduledEnd) {
    return formatServiceSlotLabel(
      new Date(item.scheduledStart),
      new Date(item.scheduledEnd),
    );
  }

  return null;
}

interface Props {
  shopSlug: string;
  shopName?: string;
  theme?: ShopTheme;
  supportWhatsApp?: string | null;
  supportTelegram?: string | null;
}

export default function ShopCartPage({
  shopSlug,
  shopName,
  theme,
  supportWhatsApp,
  supportTelegram,
}: Props) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, loading, fetchCart, updateQuantity, removeItem } = useShopCart(shopSlug);
  const user = session?.user as SessionUser | undefined;

  const [placing, setPlacing] = useState(false);
  const [notes, setNotes] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [selectedContactChannel, setSelectedContactChannel] =
    useState<ContactChannel>("PHONE");
  const [telegramDialogOpen, setTelegramDialogOpen] = useState(false);
  const [telegramInput, setTelegramInput] = useState("");
  const [savingTelegram, setSavingTelegram] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchCart();
      void fetchAddresses();
    }

    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [fetchCart, router, status]);

  useEffect(() => {
    setSelectedContactChannel(
      user?.preferredContactChannel === "TELEGRAM" ? "TELEGRAM" : "PHONE",
    );
  }, [user?.preferredContactChannel]);

  useEffect(() => {
    if (!user?.telegramUsername && selectedContactChannel === "TELEGRAM") {
      setSelectedContactChannel("PHONE");
    }
  }, [selectedContactChannel, user?.telegramUsername]);

  useEffect(() => {
    setTelegramInput(user?.telegramUsername?.replace(/^@+/, "") ?? "");
  }, [user?.telegramUsername]);

  const fetchAddresses = async () => {
    setAddressesLoading(true);
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = (await res.json()) as Address[];
        setAddresses(data);
        const defaultAddress = data.find((address) => address.isDefault) ?? data[0] ?? null;
        if (defaultAddress) {
          setSelectedAddressId(defaultAddress.id);
        }
      }
    } finally {
      setAddressesLoading(false);
    }
  };

  const requestedSelectedIds = useMemo(() => {
    const selected = searchParams.get("selected");
    if (!selected) return [];
    return selected
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }, [searchParams]);

  const selectedProductIds = useMemo(() => {
    const availableIds = new Set(items.map((item) => item.productId));
    const matchingIds = requestedSelectedIds.filter((id) => availableIds.has(id));

    if (matchingIds.length > 0) {
      return matchingIds;
    }

    return items.map((item) => item.productId);
  }, [items, requestedSelectedIds]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedProductIds.includes(item.productId)),
    [items, selectedProductIds],
  );
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const requiresAddress = selectedItems.some(
    (item) => item.product.requiresAddress !== false,
  );

  const handleTelegramClick = () => {
    if (user?.telegramUsername?.trim()) {
      setSelectedContactChannel("TELEGRAM");
      return;
    }

    setTelegramDialogOpen(true);
  };

  const handleSaveTelegram = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingTelegram(true);

    try {
      const res = await fetch("/api/profile/telegram", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUsername: telegramInput,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        telegramUsername?: string | null;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Telegram 用户名保存失败");
        return;
      }

      await update({
        telegramUsername: data.telegramUsername,
      });

      setSelectedContactChannel("TELEGRAM");
      setTelegramDialogOpen(false);
      toast.success("Telegram 用户名已更新");
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSavingTelegram(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (items.length === 0) return;
    if (selectedProductIds.length === 0) {
      return toast.error("请至少选择一个商品进行结算");
    }
    if (requiresAddress && !selectedAddressId) {
      return toast.error("请先选择收货地址");
    }
    if (selectedContactChannel === "PHONE" && !user?.phone) {
      return toast.error("您选择了手机号作为联系方式，但当前未填写手机号");
    }
    if (selectedContactChannel === "TELEGRAM" && !user?.telegramUsername?.trim()) {
      return toast.error("您选择了 Telegram 作为联系方式，但当前未填写 Telegram 用户名");
    }

    setPlacing(true);
    try {
      const nextParams = new URLSearchParams({
        selected: selectedProductIds.join(","),
        channel: selectedContactChannel,
      });

      if (requiresAddress && selectedAddressId) {
        nextParams.set("addressId", selectedAddressId);
      }

      if (notes.trim()) {
        nextParams.set("notes", notes.trim());
      }

      router.push(`/shops/${shopSlug}/payment?${nextParams.toString()}`);
    } finally {
      setPlacing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar
          shopSlug={shopSlug}
          shopName={shopName}
          theme={theme}
          supportWhatsApp={supportWhatsApp}
          supportTelegram={supportTelegram}
        />
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        shopSlug={shopSlug}
        shopName={shopName}
        theme={theme}
        supportWhatsApp={supportWhatsApp}
        supportTelegram={supportTelegram}
      />
      <div className="container mx-auto max-w-3xl px-6 py-8 md:px-20">
        <Link
          href={buildShopHref(shopSlug)}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回店铺首页
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-red-600" />
          <h1 className="text-2xl font-bold">购物车</h1>
          {items.length > 0 && (
            <span className="text-sm text-muted-foreground">
              本次结算 {selectedQuantity} / 共{" "}
              {items.reduce((sum, item) => sum + item.quantity, 0)} 件商品
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
            <Package className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">购物车是空的</p>
            <Link href={buildShopHref(shopSlug)}>
              <Button variant="outline" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                去选购
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="font-medium">结算商品</span>
                <span className="text-muted-foreground">选择请回到购物车抽屉调整</span>
              </div>
            </div>

            {selectedProductIds.length < items.length && selectedItems.length > 0 && (
              <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                还有 {items.length - selectedItems.length} 件商品保留在购物车中，本次不会结算。
              </div>
            )}

            <div className="space-y-3">
              {selectedItems.map((item) => {
                const serviceSlotText = getServiceSlotText(item);
                return (
                  <Card key={item.id}>
                    <CardContent className="space-y-4 py-4">
                      <div className="flex items-start gap-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {item.product.imageUrl ? (
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/40" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-medium leading-5">
                                {item.product.name}
                              </p>
                              <p className="mt-1 text-sm font-semibold text-red-600">
                                RM{Number(item.product.price).toFixed(2)}
                              </p>
                              {serviceSlotText && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  预约时段：{serviceSlotText}
                                </p>
                              )}
                            </div>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeItem(item.productId)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() =>
                              updateQuantity(item.productId, Math.max(item.quantity - 1, 1))
                            }
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="min-w-6 text-center font-medium">{item.quantity}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={
                              item.product.itemType !== "SERVICE" &&
                              item.quantity >= item.product.stock
                            }
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-lg font-bold">
                          RM{(Number(item.product.price) * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {requiresAddress && (
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-red-500" />
                    <h2 className="text-xl font-semibold">收货地址</h2>
                  </div>
                  <Link href="/profile" className="text-sm text-red-500 hover:underline">
                    管理地址
                  </Link>
                </div>

                {addressesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载地址中...
                  </div>
                ) : addresses.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-10 text-center">
                      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-yellow-500" />
                      <p className="text-base font-medium">还没有收货地址</p>
                      <Link href="/profile" className="mt-4 inline-block">
                        <Button>前往添加地址</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((address) => {
                      const active = selectedAddressId === address.id;
                      return (
                        <button
                          key={address.id}
                          type="button"
                          onClick={() => setSelectedAddressId(address.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            active ? "border-red-500 bg-red-50" : "border-border bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
                                  {getLabelIcon(address.label)}
                                  {address.label || "地址"}
                                </span>
                                {address.isDefault && (
                                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                                    默认
                                  </span>
                                )}
                              </div>
                              <p className="font-semibold">
                                {address.recipient}
                                <span className="ml-2 font-normal text-muted-foreground">
                                  {address.phone}
                                </span>
                              </p>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {address.street}, {address.city}, {address.state} {address.postcode},{" "}
                                {address.country}
                              </p>
                            </div>
                            <div
                              className={`mt-1 h-5 w-5 rounded-full border-2 ${
                                active ? "border-red-500" : "border-muted-foreground/30"
                              }`}
                            >
                              {active && <div className="m-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            <div className="space-y-2">
              <Label htmlFor="cart-notes">备注（可选）</Label>
              <Textarea
                id="cart-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="如有特殊要求，请在此注明..."
                rows={4}
              />
            </div>

            <div className="space-y-4 rounded-2xl border bg-white p-5">
              <div className="space-y-2">
                <Label>沟通方式</Label>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between gap-3">
                    <span>手机号</span>
                    <span>{user?.phone || "未填写"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Telegram</span>
                    <span>{user?.telegramUsername ? `@${user.telegramUsername.replace(/^@+/, "")}` : "未填写"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant={selectedContactChannel === "PHONE" ? "default" : "outline"}
                  className={selectedContactChannel === "PHONE" ? "bg-red-700 hover:bg-red-600" : ""}
                  onClick={() => setSelectedContactChannel("PHONE")}
                >
                  <Phone className="mr-2 h-4 w-4" />
                  手机号
                </Button>
                <Button
                  type="button"
                  variant={selectedContactChannel === "TELEGRAM" ? "default" : "outline"}
                  className={selectedContactChannel === "TELEGRAM" ? "bg-red-700 hover:bg-red-600" : ""}
                  onClick={handleTelegramClick}
                >
                  Telegram
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>已选商品小计</span>
                <span>RM{selectedTotal.toFixed(2)}</span>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xl font-bold">已选商品合计</span>
                <span className="text-2xl font-bold text-red-600">RM{selectedTotal.toFixed(2)}</span>
              </div>
              {selectedProductIds.length < items.length ? (
                <p className="mt-2 text-xs text-muted-foreground">未勾选的商品会保留在购物车中</p>
              ) : null}
            </div>

            <Button
              className="h-12 w-full bg-red-700 text-base text-white hover:bg-red-600"
              onClick={handlePlaceOrder}
              disabled={placing || selectedProductIds.length === 0 || (requiresAddress && !selectedAddressId)}
            >
              {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              前往付款
            </Button>

            <Link
              href={buildShopHref(shopSlug)}
              className="block text-center text-sm text-muted-foreground hover:underline"
            >
              继续购物
            </Link>
          </div>
        )}
      </div>

      <Dialog open={telegramDialogOpen} onOpenChange={setTelegramDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>设置 Telegram 用户名</DialogTitle>
            <DialogDescription>
              您还没有设置 Telegram 用户名，是否现在填写？保存后可直接作为订单首选联系方式。
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveTelegram} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="telegram-username">Telegram 用户名</Label>
              <Input
                id="telegram-username"
                value={telegramInput}
                onChange={(event) => setTelegramInput(event.target.value.replace(/^@+/, ""))}
                placeholder="例如：wanshitong_user"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTelegramDialogOpen(false)}
                disabled={savingTelegram}
              >
                取消
              </Button>
              <Button type="submit" disabled={savingTelegram}>
                {savingTelegram ? "保存中..." : "保存并使用 Telegram"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
