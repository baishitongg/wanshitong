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
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  Minus,
  Package,
  Phone,
  Plus,
  Send,
  ShoppingCart,
  Star,
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
import { Badge } from "@/components/ui/badge";
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
}

export default function ShopCartPage({ shopSlug, shopName, theme }: Props) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, loading, fetchCart, updateQuantity, removeItem, clearCart } =
    useShopCart(shopSlug);
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
      const res = await fetch(`/api/shops/${shopSlug}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: user?.name,
          customerPhone: user?.phone,
          telegramUsername: user?.telegramUsername ?? null,
          preferredContactChannel: selectedContactChannel,
          notes,
          addressId: requiresAddress ? selectedAddressId : null,
          selectedProductIds,
        }),
      });

      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) {
        return toast.error(data.error ?? "下单失败，请重试");
      }

      if (selectedProductIds.length === items.length) {
        await clearCart();
      } else {
        await fetchCart();
      }

      router.push(`/order-success?id=${data.id}&shop=${shopSlug}`);
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setPlacing(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar shopSlug={shopSlug} shopName={shopName} theme={theme} />
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar shopSlug={shopSlug} shopName={shopName} theme={theme} />
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
              本次结算 {selectedQuantity} / 共 {items.reduce((sum, item) => sum + item.quantity, 0)} 件商品
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
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3 text-sm">
                <span className="font-medium">结算商品</span>
                <span className="text-muted-foreground">选择请回到购物车抽屉调整</span>
              </div>

              {selectedProductIds.length < items.length && selectedItems.length > 0 && (
                <div className="rounded-xl border border-dashed bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
                  还有 {items.length - selectedItems.length} 件商品保留在购物车中，本次不会结算。
                </div>
              )}

              {selectedItems.map((item) => {
                const isService =
                  item.product.itemType === "SERVICE" ||
                  item.product.requiresScheduling === true ||
                  item.product.fulfillmentType === "BOOKING";
                const serviceSlotText = getServiceSlotText(item);

                return (
                  <Card key={item.productId}>
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

                      <div className="flex items-center justify-between gap-3 border-t pt-3">
                        {isService ? (
                          <p className="text-sm text-muted-foreground">服务预约每次只结算一个时段</p>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
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
                              className="h-8 w-8"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        )}

                        <p className="min-w-0 text-right text-base font-bold text-foreground">
                          RM{(Number(item.product.price) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {requiresAddress && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4 text-red-600" />
                    收货地址
                  </h2>
                  <Link
                    href={`/profile?shop=${shopSlug}`}
                    className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                  >
                    管理地址
                    <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>

                {addressesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    加载地址中...
                  </div>
                ) : addresses.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed p-6 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 opacity-70 text-yellow-500" />
                    <p className="text-sm font-medium">还没有收货地址</p>
                    <Link href={`/profile?shop=${shopSlug}`}>
                      <Button
                        size="sm"
                        className="flex items-center gap-2 bg-red-700 text-white hover:bg-red-600"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        前往添加地址
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                          selectedAddressId === address.id
                            ? "border-red-600 bg-red-50/40 dark:bg-red-950/10"
                            : "border-border hover:border-red-300"
                        }`}
                        onClick={() => setSelectedAddressId(address.id)}
                      >
                        <div
                          className={`absolute right-4 top-4 flex h-4 w-4 items-center justify-center rounded-full border-2 transition-colors ${
                            selectedAddressId === address.id
                              ? "border-red-600"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selectedAddressId === address.id && (
                            <div className="h-2 w-2 rounded-full bg-red-600" />
                          )}
                        </div>

                        <div className="space-y-1 pr-6">
                          <div className="flex flex-wrap items-center gap-2">
                            {address.label && (
                              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                                {getLabelIcon(address.label)}
                                {address.label}
                              </Badge>
                            )}
                            {address.isDefault && (
                              <Badge className="flex items-center gap-1 border-0 bg-red-700 text-xs text-white">
                                <Star className="h-2.5 w-2.5 fill-current" />
                                默认
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm font-medium">
                            {address.recipient}
                            <span className="ml-2 font-normal text-muted-foreground">
                              {address.phone}
                            </span>
                          </p>

                          <p className="text-sm text-muted-foreground">
                            {address.street}, {address.city}, {address.state} {address.postcode},{" "}
                            {address.country}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label>备注（可选）</Label>
              <Textarea
                placeholder="如有特殊要求，请在此注明..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>沟通方式</Label>
              <div className="space-y-4 rounded-xl border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">手机号</span>
                  <span className="font-medium">{user?.phone ?? "未填写"}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Telegram</span>
                  <span className="font-medium">
                    {user?.telegramUsername
                      ? `@${user.telegramUsername.replace(/^@+/, "")}`
                      : "未填写"}
                  </span>
                </div>
                <div className="space-y-2">
                  <Label>请选择本次订单首选联系方式</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      variant={selectedContactChannel === "PHONE" ? "default" : "outline"}
                      className={
                        selectedContactChannel === "PHONE"
                          ? "bg-red-700 text-white hover:bg-red-600"
                          : ""
                      }
                      onClick={() => setSelectedContactChannel("PHONE")}
                      disabled={!user?.phone}
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      手机号
                    </Button>
                    <Button
                      type="button"
                      variant={selectedContactChannel === "TELEGRAM" ? "default" : "outline"}
                      className={
                        selectedContactChannel === "TELEGRAM"
                          ? "bg-red-700 text-white hover:bg-red-600"
                          : ""
                      }
                      onClick={handleTelegramClick}
                    >
                      <Send className="mr-2 h-4 w-4" />
                      Telegram
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>已选商品小计</span>
                <span>RM{selectedTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>已选商品合计</span>
                <span className="text-red-600">RM{selectedTotal.toFixed(2)}</span>
              </div>
              {selectedProductIds.length === 0 ? (
                <p className="text-xs text-destructive">
                  当前没有可结算商品，请先回到购物车抽屉选择商品
                </p>
              ) : selectedProductIds.length < items.length ? (
                <p className="text-xs text-muted-foreground">未勾选的商品会保留在购物车中</p>
              ) : null}
            </div>

            <Button
              className="h-12 w-full bg-red-700 text-base text-white hover:bg-red-600"
              onClick={handlePlaceOrder}
              disabled={placing || selectedProductIds.length === 0 || (requiresAddress && !selectedAddressId)}
            >
              {placing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              结算已选商品
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
            <DialogTitle>还没有设置 Telegram</DialogTitle>
            <DialogDescription>
              您当前还没有填写 Telegram 用户名。现在设置后，本次订单就可以使用 Telegram
              作为首选联系方式。
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSaveTelegram}>
            <div className="space-y-2">
              <Label htmlFor="telegram-username">Telegram 用户名</Label>
              <Input
                id="telegram-username"
                placeholder="例如：wanshitong_user"
                value={telegramInput}
                onChange={(event) => setTelegramInput(event.target.value)}
                disabled={savingTelegram}
              />
              <p className="text-xs text-muted-foreground">请输入用户名，不需要填写 @。</p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTelegramDialogOpen(false)}
                disabled={savingTelegram}
              >
                稍后再说
              </Button>
              <Button
                type="submit"
                className="bg-red-700 text-white hover:bg-red-600"
                disabled={savingTelegram}
              >
                {savingTelegram && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                保存并使用 Telegram
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
