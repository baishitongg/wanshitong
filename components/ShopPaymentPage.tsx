"use client";

import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Loader2,
  Package,
  Receipt,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useShopCart } from "@/lib/store/cartStore";
import { buildShopHref } from "@/lib/shops";
import { withAlpha, type ShopTheme } from "@/lib/shopTheme";

type ContactChannel = "PHONE" | "TELEGRAM";
type PaymentMethod = "QR" | "BANK_TRANSFER";

type SessionUser = {
  id?: string;
  name?: string | null;
  phone?: string | null;
  telegramUsername?: string | null;
};

interface Props {
  shopSlug: string;
  shopName: string;
  theme?: ShopTheme;
  supportWhatsApp?: string | null;
  supportTelegram?: string | null;
  paymentQrImageUrl?: string | null;
  bankName?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
}

export default function ShopPaymentPage({
  shopSlug,
  shopName,
  theme,
  supportWhatsApp,
  supportTelegram,
  paymentQrImageUrl,
  bankName,
  bankAccountName,
  bankAccountNumber,
}: Props) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, loading, fetchCart, clearCart, removeItem } = useShopCart(shopSlug);
  const user = session?.user as SessionUser | undefined;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      void fetchCart();
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [fetchCart, router, status]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  const availableMethods = useMemo(
    () =>
      [
        paymentQrImageUrl ? "QR" : null,
        bankName || bankAccountName || bankAccountNumber ? "BANK_TRANSFER" : null,
      ].filter(Boolean) as PaymentMethod[],
    [bankAccountName, bankAccountNumber, bankName, paymentQrImageUrl],
  );

  useEffect(() => {
    if (!paymentMethod && availableMethods.length === 1) {
      setPaymentMethod(availableMethods[0]);
    }
  }, [availableMethods, paymentMethod]);

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
  const selectedTotal = selectedItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const requiresAddress = selectedItems.some(
    (item) => item.product.requiresAddress !== false,
  );

  const addressId = searchParams.get("addressId");
  const notes = searchParams.get("notes") ?? "";
  const preferredContactChannel =
    (searchParams.get("channel") as ContactChannel | null) ?? "PHONE";

  const handleReceiptFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setReceiptFile(file);
    setReceiptUrl(null);

    if (receiptPreviewUrl) {
      URL.revokeObjectURL(receiptPreviewUrl);
    }

    setReceiptPreviewUrl(file ? URL.createObjectURL(file) : null);
    event.currentTarget.value = "";
  };

  const uploadReceipt = async () => {
    if (!receiptFile) {
      toast.error("请先选择付款凭证");
      return null;
    }

    setUploadingReceipt(true);
    try {
      const uploadUrlRes = await fetch("/api/payment-upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: receiptFile.name,
          shopSlug,
        }),
      });

      const uploadUrlData = (await uploadUrlRes.json()) as {
        error?: string;
        signedUrl?: string;
        publicUrl?: string;
      };

      if (!uploadUrlRes.ok || !uploadUrlData.signedUrl || !uploadUrlData.publicUrl) {
        toast.error(uploadUrlData.error ?? "获取上传链接失败");
        return null;
      }

      const uploadRes = await fetch(uploadUrlData.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": receiptFile.type || "application/octet-stream",
        },
        body: receiptFile,
      });

      if (!uploadRes.ok) {
        toast.error("上传付款凭证失败");
        return null;
      }

      setReceiptUrl(uploadUrlData.publicUrl);
      toast.success("付款凭证已上传");
      return uploadUrlData.publicUrl;
    } catch {
      toast.error("网络错误，请稍后重试");
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (selectedItems.length === 0) {
      toast.error("没有可付款的商品");
      return;
    }

    if (requiresAddress && !addressId) {
      toast.error("缺少收货地址，请返回上一页重新选择");
      return;
    }

    if (!paymentMethod) {
      toast.error("请选择付款方式");
      return;
    }

    let finalReceiptUrl = receiptUrl;
    if (!finalReceiptUrl) {
      finalReceiptUrl = await uploadReceipt();
    }

    if (!finalReceiptUrl) {
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/shops/${shopSlug}/payments/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: user?.name ?? null,
          customerPhone: user?.phone ?? null,
          telegramUsername: user?.telegramUsername ?? null,
          preferredContactChannel,
          notes,
          addressId: requiresAddress ? addressId : null,
          selectedProductIds,
          paymentMethod,
          paymentReceiptUrl: finalReceiptUrl,
        }),
      });

      const data = (await res.json()) as { id?: string; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "提交付款失败，请重试");
        return;
      }

      if (selectedProductIds.length === items.length) {
        await clearCart();
      } else {
        await Promise.all(selectedProductIds.map(async (productId) => removeItem(productId)));
      }

      router.push(`/order-success?id=${data.id}&shop=${shopSlug}`);
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
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

  if (selectedItems.length === 0) {
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
            href={`${buildShopHref(shopSlug)}/cart`}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回购物车
          </Link>

          <div className="flex flex-col items-center gap-4 py-24 text-muted-foreground">
            <Package className="h-16 w-16 opacity-20" />
            <p className="text-lg font-medium">没有待付款商品</p>
            <Link href={`${buildShopHref(shopSlug)}/cart`}>
              <Button variant="outline">返回购物车</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background"
      style={{ backgroundColor: theme?.surface }}
    >
      <Navbar
        shopSlug={shopSlug}
        shopName={shopName}
        theme={theme}
        supportWhatsApp={supportWhatsApp}
        supportTelegram={supportTelegram}
      />

      <div className="container mx-auto max-w-5xl px-6 py-8 md:px-16">
        <Link
          href={`${buildShopHref(shopSlug)}/cart?selected=${selectedProductIds.join(",")}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          返回结算页
        </Link>

        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium tracking-wide" style={{ color: theme?.secondary }}>
              付款确认
            </p>
            <h1 className="mt-2 text-3xl font-bold text-foreground">上传付款凭证后提交订单</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              请先按店铺提供的收款方式完成付款，再上传凭证。提交成功后，订单才会进入 staff 后台。
            </p>
          </div>

          <Card className="min-w-[220px]">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">本次付款</p>
              <div className="mt-2 text-2xl font-bold">RM{selectedTotal.toFixed(2)}</div>
              <p className="mt-1 text-sm text-muted-foreground">共 {selectedQuantity} 件商品</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" style={{ color: theme?.secondary }} />
                  <h2 className="text-lg font-semibold">订单内容</h2>
                </div>

                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <div
                      key={item.productId}
                      className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="line-clamp-1 text-sm font-medium">{item.product.name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          数量 {item.quantity} · 单价 RM{Number(item.product.price).toFixed(2)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        RM{(Number(item.product.price) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>联系方式</span>
                    <span>{preferredContactChannel === "TELEGRAM" ? "Telegram" : "手机号"}</span>
                  </div>
                  {requiresAddress && (
                    <div className="flex items-center justify-between">
                      <span>收货地址</span>
                      <span>{addressId ? "已选择" : "未选择"}</span>
                    </div>
                  )}
                  {notes ? (
                    <div>
                      <span className="font-medium text-foreground">备注</span>
                      <p className="mt-1 rounded-lg bg-muted/50 px-3 py-2">{notes}</p>
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" style={{ color: theme?.secondary }} />
                  <h2 className="text-lg font-semibold">选择付款方式</h2>
                </div>

                {availableMethods.length === 0 ? (
                  <div
                    className="rounded-2xl border px-4 py-5 text-sm text-muted-foreground"
                    style={{
                      borderColor: withAlpha(theme?.secondary ?? "#b91c1c", 0.18),
                      backgroundColor: withAlpha(theme?.accent ?? "#ef4444", 0.05),
                    }}
                  >
                    当前店铺尚未设置收款方式，请联系店铺 staff。
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {paymentQrImageUrl && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("QR")}
                        className="rounded-2xl border p-4 text-left transition-all"
                        style={{
                          borderColor:
                            paymentMethod === "QR"
                              ? theme?.secondary
                              : withAlpha(theme?.secondary ?? "#b91c1c", 0.18),
                          boxShadow:
                            paymentMethod === "QR"
                              ? `0 0 0 2px ${withAlpha(theme?.secondary ?? "#b91c1c", 0.14)}`
                              : "none",
                        }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <CheckCircle2
                            className={`h-4 w-4 ${paymentMethod === "QR" ? "opacity-100" : "opacity-30"}`}
                          />
                          扫码付款
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          按店铺二维码转账付款
                        </p>
                      </button>
                    )}

                    {(bankName || bankAccountName || bankAccountNumber) && (
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("BANK_TRANSFER")}
                        className="rounded-2xl border p-4 text-left transition-all"
                        style={{
                          borderColor:
                            paymentMethod === "BANK_TRANSFER"
                              ? theme?.secondary
                              : withAlpha(theme?.secondary ?? "#b91c1c", 0.18),
                          boxShadow:
                            paymentMethod === "BANK_TRANSFER"
                              ? `0 0 0 2px ${withAlpha(theme?.secondary ?? "#b91c1c", 0.14)}`
                              : "none",
                        }}
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Landmark
                            className={`h-4 w-4 ${paymentMethod === "BANK_TRANSFER" ? "opacity-100" : "opacity-40"}`}
                          />
                          银行转账
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          按银行账户资料完成转账
                        </p>
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {paymentMethod === "QR" && paymentQrImageUrl && (
              <Card>
                <CardContent className="space-y-4 py-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">店铺收款二维码</h2>
                      <p className="text-sm text-muted-foreground">请扫码并完成付款</p>
                    </div>
                    <Badge variant="outline">QR</Badge>
                  </div>

                  <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl border bg-white">
                    <Image
                      src={paymentQrImageUrl}
                      alt={`${shopName} payment QR`}
                      fill
                      className="object-contain p-4"
                      sizes="320px"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentMethod === "BANK_TRANSFER" && (
              <Card>
                <CardContent className="space-y-4 py-6">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold">银行账户资料</h2>
                      <p className="text-sm text-muted-foreground">请按以下资料完成转账</p>
                    </div>
                    <Badge variant="outline">BANK</Badge>
                  </div>

                  <div className="space-y-3 rounded-2xl border bg-white p-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground">银行名称</div>
                      <div className="mt-1 font-medium">{bankName ?? "未设置"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">账户名称</div>
                      <div className="mt-1 font-medium">{bankAccountName ?? "未设置"}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">账号</div>
                      <div className="mt-1 font-medium">{bankAccountNumber ?? "未设置"}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="space-y-4 py-6">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5" style={{ color: theme?.secondary }} />
                  <h2 className="text-lg font-semibold">上传付款凭证</h2>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-white px-4 py-6 text-center transition-colors hover:bg-muted/20">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleReceiptFileChange}
                  />
                  <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">选择付款凭证文件</p>
                  <p className="mt-1 text-sm text-muted-foreground">支持图片或 PDF</p>
                </label>

                {receiptFile && (
                  <div className="rounded-2xl border bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{receiptFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void uploadReceipt()}
                        disabled={uploadingReceipt}
                      >
                        {uploadingReceipt ? "上传中..." : receiptUrl ? "重新上传" : "先上传"}
                      </Button>
                    </div>

                    {receiptPreviewUrl && receiptFile.type.startsWith("image/") && (
                      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-xl border bg-muted">
                        <img
                          src={receiptPreviewUrl}
                          alt="Receipt preview"
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    {receiptUrl && (
                      <p className="mt-3 text-sm text-green-600">付款凭证已上传，可以提交订单。</p>
                    )}
                  </div>
                )}

                <Button
                  type="button"
                  className="w-full text-white"
                  disabled={
                    submitting ||
                    uploadingReceipt ||
                    availableMethods.length === 0 ||
                    !paymentMethod ||
                    !receiptFile
                  }
                  style={{ backgroundColor: theme?.secondary ?? "#b91c1c" }}
                  onClick={() => void handleSubmitPayment()}
                >
                  {submitting ? "提交中..." : "我已付款，提交订单"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
