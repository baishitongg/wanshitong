"use client";

import Image from "next/image";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ShopSummary = {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  whatsappPhone: string | null;
  telegramUsername: string | null;
  shopType: "PRODUCT" | "SERVICE" | "HYBRID";
  ownershipType: "MARKETPLACE" | "SELF_OPERATED";
  checkoutMode: "DELIVERY" | "BOOKING" | "FLEXIBLE";
  categoryMode: "FLAT" | "NESTED";
  themePrimary: string | null;
  themeSecondary: string | null;
  themeAccent: string | null;
  themeSurface: string | null;
  logoUrl: string | null;
  homepageVariant: string | null;
  paymentQrImageUrl: string | null;
  bankName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  status: "ACTIVE" | "INACTIVE";
  _count: {
    products: number;
    categories: number;
    orders: number;
    staffProfiles: number;
  };
};

type StaffSummary = {
  id: string;
  isActive: boolean;
  createdAt: string;
  shop: {
    id: string;
    name: string;
    slug: string;
  };
  user: {
    id: string;
    name: string | null;
    phone: string;
  };
};

interface AdminManagementPanelProps {
  shops: ShopSummary[];
  staffProfiles: StaffSummary[];
  mode?: "all" | "shops" | "staff";
}

const initialShopForm = {
  name: "",
  slug: "",
  domain: "",
  description: "",
  heroTitle: "",
  heroSubtitle: "",
  heroImageUrl: "",
  whatsappPhone: "",
  telegramUsername: "",
  shopType: "PRODUCT" as "PRODUCT" | "SERVICE" | "HYBRID",
  ownershipType: "MARKETPLACE" as "MARKETPLACE" | "SELF_OPERATED",
  checkoutMode: "DELIVERY" as "DELIVERY" | "BOOKING" | "FLEXIBLE",
  categoryMode: "FLAT" as "FLAT" | "NESTED",
  themePrimary: "",
  themeSecondary: "",
  themeAccent: "",
  themeSurface: "",
  logoUrl: "",
  homepageVariant: "",
  paymentQrImageUrl: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
};

const SHOP_TYPE_THEMES = {
  PRODUCT: {
    themePrimary: "#7f1d1d",
    themeSecondary: "#b91c1c",
    themeAccent: "#ef4444",
    themeSurface: "#ffffff",
  },
  SERVICE: {
    themePrimary: "#C85C7C",
    themeSecondary: "#F4A261",
    themeAccent: "#FF6B6B",
    themeSurface: "#ffffff",
  },
  HYBRID: {
    themePrimary: "#7f1d1d",
    themeSecondary: "#b91c1c",
    themeAccent: "#ef4444",
    themeSurface: "#ffffff",
  },
} satisfies Record<"PRODUCT" | "SERVICE" | "HYBRID", {
  themePrimary: string;
  themeSecondary: string;
  themeAccent: string;
  themeSurface: string;
}>;

function toShopForm(shop: ShopSummary) {
  return {
    name: shop.name,
    slug: shop.slug,
    domain: shop.domain ?? "",
    description: shop.description ?? "",
    heroTitle: shop.heroTitle ?? "",
    heroSubtitle: shop.heroSubtitle ?? "",
    heroImageUrl: shop.heroImageUrl ?? "",
    whatsappPhone: shop.whatsappPhone ?? "",
    telegramUsername: shop.telegramUsername ?? "",
    shopType: shop.shopType,
    ownershipType: shop.ownershipType,
    checkoutMode: shop.checkoutMode,
    categoryMode: shop.categoryMode,
    logoUrl: shop.logoUrl ?? "",
    homepageVariant: shop.homepageVariant ?? "",
    status: shop.status,
  };
}

function toStaffForm(profile: StaffSummary) {
  return {
    name: profile.user.name ?? "",
    loginId: profile.user.phone,
    password: "",
    shopId: profile.shop.id,
    isActive: profile.isActive,
  };
}

export default function AdminManagementPanel({
  shops,
  staffProfiles,
  mode = "all",
}: AdminManagementPanelProps) {
  const router = useRouter();
  const [creatingShop, setCreatingShop] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [shopForm, setShopForm] = useState(initialShopForm);
  const [editingShopId, setEditingShopId] = useState<string | null>(null);
  const [updatingShop, setUpdatingShop] = useState(false);
  const [shopEditForm, setShopEditForm] = useState<ReturnType<typeof toShopForm> | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: "",
    loginId: "",
    password: "",
    shopId: shops[0]?.id ?? "",
  });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [updatingStaff, setUpdatingStaff] = useState(false);
  const [staffEditForm, setStaffEditForm] = useState<ReturnType<typeof toStaffForm> | null>(null);

  const handleCreateShop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingShop(true);

    try {
      const response = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shopForm,
          ...SHOP_TYPE_THEMES[shopForm.shopType],
          paymentQrImageUrl: "",
          bankName: "",
          bankAccountName: "",
          bankAccountNumber: "",
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        shop?: { name: string };
      };

      if (!response.ok) {
        toast.error(data.error ?? "创建店铺失败");
        return;
      }

      toast.success(`已创建店铺：${data.shop?.name ?? shopForm.name}`);
      setShopForm(initialShopForm);
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setCreatingShop(false);
    }
  };

  const handleCreateStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingStaff(true);

    try {
      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffForm),
      });

      const data = (await response.json()) as {
        error?: string;
        user?: { name: string | null; phone: string };
      };

      if (!response.ok) {
        toast.error(data.error ?? "创建员工账号失败");
        return;
      }

      toast.success(
        `已创建员工账号：${data.user?.name ?? "未命名员工"} (${data.user?.phone ?? ""})`,
      );
      setStaffForm((current) => ({
        ...current,
        name: "",
        loginId: "",
        password: "",
      }));
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setCreatingStaff(false);
    }
  };

  const startEditShop = (shop: ShopSummary) => {
    setEditingShopId(shop.id);
    setShopEditForm(toShopForm(shop));
  };

  const handleUpdateShop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingShopId || !shopEditForm) return;

    setUpdatingShop(true);

    try {
      const response = await fetch(`/api/admin/shops/${editingShopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...shopEditForm,
          ...SHOP_TYPE_THEMES[shopEditForm.shopType],
          paymentQrImageUrl: "",
          bankName: "",
          bankAccountName: "",
          bankAccountNumber: "",
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "更新店铺失败");
        return;
      }

      toast.success("店铺资料已更新");
      setEditingShopId(null);
      setShopEditForm(null);
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setUpdatingShop(false);
    }
  };

  const startEditStaff = (profile: StaffSummary) => {
    setEditingStaffId(profile.id);
    setStaffEditForm(toStaffForm(profile));
  };

  const handleUpdateStaff = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingStaffId || !staffEditForm) return;

    setUpdatingStaff(true);

    try {
      const response = await fetch(`/api/admin/staff/${editingStaffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(staffEditForm),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        toast.error(data.error ?? "更新员工账号失败");
        return;
      }

      toast.success("员工账号已更新");
      setEditingStaffId(null);
      setStaffEditForm(null);
      router.refresh();
    } catch {
      toast.error("网络错误，请稍后重试");
    } finally {
      setUpdatingStaff(false);
    }
  };

  const uploadShopAsset = async (file: File, kind: "hero" | "logo") => {
    const slugBase = shopForm.slug.trim() || shopForm.name.trim() || "shop";
    const normalizedSlug = slugBase
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "shop";
    const folder = `shops/${normalizedSlug}/${kind}`;

    const setUploading =
      kind === "hero"
        ? setUploadingHero
        : setUploadingLogo;
    setUploading(true);

    try {
      const uploadUrlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          folder,
        }),
      });

      const uploadUrlData = (await uploadUrlRes.json()) as {
        error?: string;
        signedUrl?: string;
        publicUrl?: string;
      };

      if (!uploadUrlRes.ok || !uploadUrlData.signedUrl || !uploadUrlData.publicUrl) {
        toast.error(uploadUrlData.error ?? "获取上传链接失败");
        return;
      }

      const uploadRes = await fetch(uploadUrlData.signedUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        toast.error("上传图片失败");
        return;
      }

      setShopForm((current) => {
        if (kind === "hero") {
          return {
            ...current,
            heroImageUrl: uploadUrlData.publicUrl ?? "",
          };
        }

        if (kind === "logo") {
          return {
            ...current,
            logoUrl: uploadUrlData.publicUrl ?? "",
          };
        }

        return current;
      });

      toast.success(kind === "hero" ? "首页图片已上传" : "Logo 已上传");
    } catch {
      toast.error("上传失败，请稍后重试");
    } finally {
      setUploading(false);
    }
  };

  const showShops = mode === "all" || mode === "shops";
  const showStaff = mode === "all" || mode === "staff";

  return (
    <div
      className={`mt-6 grid gap-6 ${
        showShops && showStaff ? "xl:grid-cols-[1.1fr_0.9fr]" : "xl:grid-cols-1"
      }`}
    >
      {showShops && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">新增店铺</h2>
            <p className="mt-1 text-sm text-gray-500">
              管理员可以直接新增店铺资料，系统会写入 `Shop` 表并立刻出现在平台中。
            </p>

            <form onSubmit={handleCreateShop} className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="shop-name">店铺名称</Label>
                <Input
                  id="shop-name"
                  className="mt-2"
                  value={shopForm.name}
                  onChange={(event) =>
                    setShopForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="例如：中国超市"
                  required
                />
              </div>

              <div>
                <Label htmlFor="shop-slug">店铺 slug</Label>
                <Input
                  id="shop-slug"
                  className="mt-2"
                  value={shopForm.slug}
                  onChange={(event) =>
                    setShopForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="例如：zhongguo-chaoshi"
                />
              </div>

              <div>
                <Label htmlFor="shop-domain">产品店铺域名</Label>
                <Input
                  id="shop-domain"
                  className="mt-2"
                  value={shopForm.domain}
                  onChange={(event) =>
                    setShopForm((current) => ({ ...current, domain: event.target.value }))
                  }
                  placeholder="例如：example.com"
                />
              </div>

              <div>
                <Label htmlFor="shop-status">状态</Label>
                <select
                  id="shop-status"
                  value={shopForm.status}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      status: event.target.value as "ACTIVE" | "INACTIVE",
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>

              <div>
                <Label htmlFor="shop-type">店铺类型</Label>
                <select
                  id="shop-type"
                  value={shopForm.shopType}
                  onChange={(event) => {
                    const shopType = event.target.value as "PRODUCT" | "SERVICE" | "HYBRID";
                    setShopForm((current) => ({
                      ...current,
                      shopType,
                      checkoutMode: shopType === "SERVICE" ? "BOOKING" : "DELIVERY",
                    }));
                  }}
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="PRODUCT">PRODUCT</option>
                  <option value="SERVICE">SERVICE</option>
                  <option value="HYBRID">HYBRID</option>
                </select>
              </div>

              <div>
                <Label htmlFor="ownership-type">经营归属</Label>
                <select
                  id="ownership-type"
                  value={shopForm.ownershipType}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      ownershipType: event.target.value as
                        | "MARKETPLACE"
                        | "SELF_OPERATED",
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="MARKETPLACE">MARKETPLACE</option>
                  <option value="SELF_OPERATED">SELF_OPERATED</option>
                </select>
              </div>

              <div>
                <Label htmlFor="checkout-mode">结算模式</Label>
                <select
                  id="checkout-mode"
                  value={shopForm.checkoutMode}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      checkoutMode: event.target.value as
                        | "DELIVERY"
                        | "BOOKING"
                        | "FLEXIBLE",
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="DELIVERY">DELIVERY</option>
                  <option value="BOOKING">BOOKING</option>
                  <option value="FLEXIBLE">FLEXIBLE</option>
                </select>
              </div>

              <div>
                <Label htmlFor="category-mode">分类结构</Label>
                <select
                  id="category-mode"
                  value={shopForm.categoryMode}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      categoryMode: event.target.value as "FLAT" | "NESTED",
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="FLAT">FLAT - 只有分类</option>
                  <option value="NESTED">NESTED - 分类和子分类</option>
                </select>
              </div>

              <div>
                <Label htmlFor="shop-hero-title">首页主标题</Label>
                <Input
                  id="shop-hero-title"
                  className="mt-2"
                  value={shopForm.heroTitle}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      heroTitle: event.target.value,
                    }))
                  }
                  placeholder="例如：中国超市"
                />
              </div>

              <div>
                <Label htmlFor="shop-hero-subtitle">首页副标题</Label>
                <Input
                  id="shop-hero-subtitle"
                  className="mt-2"
                  value={shopForm.heroSubtitle}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      heroSubtitle: event.target.value,
                    }))
                  }
                  placeholder="例如：正宗中国商品，就在您身边"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="shop-image-url">首页图片 URL</Label>
                <Input
                  id="shop-image-url"
                  className="mt-2"
                  value={shopForm.heroImageUrl}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      heroImageUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadShopAsset(file, "hero");
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                    {uploadingHero ? "上传中..." : "上传首页图片"}
                  </label>
                  {shopForm.heroImageUrl ? (
                    <div className="relative h-16 w-24 overflow-hidden rounded-md border bg-muted">
                      <Image
                        src={shopForm.heroImageUrl}
                        alt="Hero preview"
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="shop-logo-url">店铺 Logo URL</Label>
                <Input
                  id="shop-logo-url"
                  className="mt-2"
                  value={shopForm.logoUrl}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      logoUrl: event.target.value,
                    }))
                  }
                  placeholder="https://..."
                />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) {
                          void uploadShopAsset(file, "logo");
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                    {uploadingLogo ? "上传中..." : "上传店铺 Logo"}
                  </label>
                  {shopForm.logoUrl ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border bg-muted">
                      <Image
                        src={shopForm.logoUrl}
                        alt="Logo preview"
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              <div>
                <Label htmlFor="homepage-variant">首页样式代号</Label>
                <Input
                  id="homepage-variant"
                  className="mt-2"
                  value={shopForm.homepageVariant}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      homepageVariant: event.target.value,
                    }))
                  }
                  placeholder="例如：classic / service / minimal"
                />
              </div>

              <div>
                <Label htmlFor="shop-whatsapp">店铺 WhatsApp 号码</Label>
                <Input
                  id="shop-whatsapp"
                  className="mt-2"
                  value={shopForm.whatsappPhone}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      whatsappPhone: event.target.value,
                    }))
                  }
                  placeholder="例如：+60123456789"
                />
              </div>

              <div>
                <Label htmlFor="shop-telegram">店铺 Telegram 用户名</Label>
                <Input
                  id="shop-telegram"
                  className="mt-2"
                  value={shopForm.telegramUsername}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      telegramUsername: event.target.value,
                    }))
                  }
                  placeholder="例如：wanshitong_shop"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="shop-description">店铺描述</Label>
                <Textarea
                  id="shop-description"
                  className="mt-2"
                  value={shopForm.description}
                  onChange={(event) =>
                    setShopForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="简短介绍店铺卖什么、面向谁。"
                  rows={4}
                />
              </div>

              <div className="md:col-span-2">
                <Button
                  type="submit"
                  className="bg-black text-white hover:bg-gray-800"
                  disabled={creatingShop}
                >
                  {creatingShop ? "创建中..." : "创建新店铺"}
                </Button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">店铺列表</h2>
            <div className="mt-4 space-y-3">
              {shops.map((shop) => (
                <div
                  key={shop.id}
                  className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{shop.name}</p>
                      <p className="text-sm text-gray-500">/shops/{shop.slug}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          shop.status === "ACTIVE"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {shop.status}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => startEditShop(shop)}
                      >
                        编辑
                      </Button>
                    </div>
                  </div>

                  {shop.description ? (
                    <p className="mt-3 text-sm text-gray-600">{shop.description}</p>
                  ) : null}

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>店铺类型：{shop.shopType}</p>
                    <p>域名：{shop.domain ?? "未设置"}</p>
                    <p>经营归属：{shop.ownershipType}</p>
                    <p>结算模式：{shop.checkoutMode}</p>
                    <p>分类结构：{shop.categoryMode}</p>
                    <p>WhatsApp：{shop.whatsappPhone ?? "未设置"}</p>
                    <p>
                      Telegram：
                      {shop.telegramUsername
                        ? `@${shop.telegramUsername.replace(/^@+/, "")}`
                        : "未设置"}
                    </p>
                    <p>首页样式：{shop.homepageVariant ?? "默认"}</p>
                    <p>商品：{shop._count.products}</p>
                    <p>分类：{shop._count.categories}</p>
                    <p>订单：{shop._count.orders}</p>
                    <p>员工：{shop._count.staffProfiles}</p>
                  </div>

                  {editingShopId === shop.id && shopEditForm ? (
                    <form
                      onSubmit={handleUpdateShop}
                      className="mt-4 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-2"
                    >
                      <div className="md:col-span-2">
                        <Label htmlFor={`edit-shop-name-${shop.id}`}>店铺名称</Label>
                        <Input
                          id={`edit-shop-name-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.name}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, name: event.target.value } : current,
                            )
                          }
                          required
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-shop-slug-${shop.id}`}>店铺 slug</Label>
                        <Input
                          id={`edit-shop-slug-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.slug}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, slug: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-shop-domain-${shop.id}`}>产品店铺域名</Label>
                        <Input
                          id={`edit-shop-domain-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.domain}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, domain: event.target.value } : current,
                            )
                          }
                          placeholder="例如：example.com"
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-shop-status-${shop.id}`}>状态</Label>
                        <select
                          id={`edit-shop-status-${shop.id}`}
                          value={shopEditForm.status}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    status: event.target.value as "ACTIVE" | "INACTIVE",
                                  }
                                : current,
                            )
                          }
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="INACTIVE">INACTIVE</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-shop-type-${shop.id}`}>店铺类型</Label>
                        <select
                          id={`edit-shop-type-${shop.id}`}
                          value={shopEditForm.shopType}
                          onChange={(event) => {
                            const shopType = event.target.value as "PRODUCT" | "SERVICE" | "HYBRID";
                            setShopEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    shopType,
                                    checkoutMode: shopType === "SERVICE" ? "BOOKING" : "DELIVERY",
                                  }
                                : current,
                            );
                          }}
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="PRODUCT">PRODUCT</option>
                          <option value="SERVICE">SERVICE</option>
                          <option value="HYBRID">HYBRID</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-checkout-mode-${shop.id}`}>结算模式</Label>
                        <select
                          id={`edit-checkout-mode-${shop.id}`}
                          value={shopEditForm.checkoutMode}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    checkoutMode: event.target.value as "DELIVERY" | "BOOKING" | "FLEXIBLE",
                                  }
                                : current,
                            )
                          }
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="DELIVERY">DELIVERY</option>
                          <option value="BOOKING">BOOKING</option>
                          <option value="FLEXIBLE">FLEXIBLE</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-category-mode-${shop.id}`}>分类结构</Label>
                        <select
                          id={`edit-category-mode-${shop.id}`}
                          value={shopEditForm.categoryMode}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current
                                ? {
                                    ...current,
                                    categoryMode: event.target.value as "FLAT" | "NESTED",
                                  }
                                : current,
                            )
                          }
                          className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="FLAT">FLAT - 只有分类</option>
                          <option value="NESTED">NESTED - 分类和子分类</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`edit-hero-title-${shop.id}`}>首页主标题</Label>
                        <Input
                          id={`edit-hero-title-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.heroTitle}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, heroTitle: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-hero-subtitle-${shop.id}`}>首页副标题</Label>
                        <Input
                          id={`edit-hero-subtitle-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.heroSubtitle}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, heroSubtitle: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`edit-hero-url-${shop.id}`}>首页图片 URL</Label>
                        <Input
                          id={`edit-hero-url-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.heroImageUrl}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, heroImageUrl: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-logo-url-${shop.id}`}>店铺 Logo URL</Label>
                        <Input
                          id={`edit-logo-url-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.logoUrl}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, logoUrl: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-homepage-variant-${shop.id}`}>首页样式代号</Label>
                        <Input
                          id={`edit-homepage-variant-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.homepageVariant}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, homepageVariant: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-whatsapp-${shop.id}`}>店铺 WhatsApp 号码</Label>
                        <Input
                          id={`edit-whatsapp-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.whatsappPhone}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, whatsappPhone: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor={`edit-telegram-${shop.id}`}>店铺 Telegram 用户名</Label>
                        <Input
                          id={`edit-telegram-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.telegramUsername}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, telegramUsername: event.target.value } : current,
                            )
                          }
                        />
                      </div>

                      <div className="md:col-span-2">
                        <Label htmlFor={`edit-description-${shop.id}`}>店铺描述</Label>
                        <Textarea
                          id={`edit-description-${shop.id}`}
                          className="mt-2"
                          value={shopEditForm.description}
                          onChange={(event) =>
                            setShopEditForm((current) =>
                              current ? { ...current, description: event.target.value } : current,
                            )
                          }
                          rows={3}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button type="submit" disabled={updatingShop}>
                          {updatingShop ? "保存中..." : "保存店铺"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditingShopId(null);
                            setShopEditForm(null);
                          }}
                        >
                          取消
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {showStaff && (
        <div className="space-y-6">
          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">创建店铺员工账号</h2>
            <p className="mt-1 text-sm text-gray-500">
              新增店铺后，可以在这里直接创建员工登录账号并绑定到对应店铺。
            </p>

            <form onSubmit={handleCreateStaff} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="staff-shop">所属店铺</Label>
                <select
                  id="staff-shop"
                  value={staffForm.shopId}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      shopId: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="" disabled>
                    请选择店铺
                  </option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>
                      {shop.name} ({shop.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="staff-name">员工姓名</Label>
                <Input
                  id="staff-name"
                  className="mt-2"
                  value={staffForm.name}
                  onChange={(event) =>
                    setStaffForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="例如：门店店长"
                  required
                />
              </div>

              <div>
                <Label htmlFor="staff-login-id">员工登录 ID</Label>
                <Input
                  id="staff-login-id"
                  className="mt-2"
                  value={staffForm.loginId}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      loginId: event.target.value,
                    }))
                  }
                  placeholder="例如：zhongguo_staff_01"
                  required
                />
              </div>

              <div>
                <Label htmlFor="staff-password">初始密码</Label>
                <Input
                  id="staff-password"
                  className="mt-2"
                  type="password"
                  value={staffForm.password}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  placeholder="至少 6 位"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-gray-900 text-white hover:bg-gray-800"
                disabled={creatingStaff || shops.length === 0}
              >
                {creatingStaff ? "创建中..." : "创建员工账号"}
              </Button>
            </form>
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">最近员工账号</h2>
            <div className="mt-4 space-y-3">
              {staffProfiles.length === 0 ? (
                <p className="text-sm text-gray-500">目前还没有店铺员工账号。</p>
              ) : (
                staffProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                  >
	                    <div className="flex items-start justify-between gap-3">
	                      <div>
	                        <p className="font-semibold text-gray-900">
	                          {profile.user.name ?? "未命名员工"}
                        </p>
                        <p className="text-sm text-gray-500">
                          登录 ID：{profile.user.phone}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
	                          店铺：{profile.shop.name}
	                        </p>
	                      </div>
	                      <div className="flex items-center gap-2">
	                        <span
	                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
	                            profile.isActive
	                              ? "bg-green-100 text-green-700"
	                              : "bg-gray-200 text-gray-700"
	                          }`}
	                        >
	                          {profile.isActive ? "ACTIVE" : "INACTIVE"}
	                        </span>
	                        <Button
	                          type="button"
	                          size="sm"
	                          variant="outline"
	                          onClick={() => startEditStaff(profile)}
	                        >
	                          编辑
	                        </Button>
	                      </div>
	                    </div>

	                    {editingStaffId === profile.id && staffEditForm ? (
	                      <form
	                        onSubmit={handleUpdateStaff}
	                        className="mt-4 space-y-3 rounded-xl border bg-white p-4"
	                      >
	                        <div>
	                          <Label htmlFor={`edit-staff-shop-${profile.id}`}>所属店铺</Label>
	                          <select
	                            id={`edit-staff-shop-${profile.id}`}
	                            value={staffEditForm.shopId}
	                            onChange={(event) =>
	                              setStaffEditForm((current) =>
	                                current ? { ...current, shopId: event.target.value } : current,
	                              )
	                            }
	                            className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
	                            required
	                          >
	                            {shops.map((shop) => (
	                              <option key={shop.id} value={shop.id}>
	                                {shop.name} ({shop.slug})
	                              </option>
	                            ))}
	                          </select>
	                        </div>

	                        <div>
	                          <Label htmlFor={`edit-staff-name-${profile.id}`}>员工姓名</Label>
	                          <Input
	                            id={`edit-staff-name-${profile.id}`}
	                            className="mt-2"
	                            value={staffEditForm.name}
	                            onChange={(event) =>
	                              setStaffEditForm((current) =>
	                                current ? { ...current, name: event.target.value } : current,
	                              )
	                            }
	                            required
	                          />
	                        </div>

	                        <div>
	                          <Label htmlFor={`edit-staff-login-${profile.id}`}>员工登录 ID</Label>
	                          <Input
	                            id={`edit-staff-login-${profile.id}`}
	                            className="mt-2"
	                            value={staffEditForm.loginId}
	                            onChange={(event) =>
	                              setStaffEditForm((current) =>
	                                current ? { ...current, loginId: event.target.value } : current,
	                              )
	                            }
	                            required
	                          />
	                        </div>

	                        <div>
	                          <Label htmlFor={`edit-staff-password-${profile.id}`}>
	                            新密码（不改就留空）
	                          </Label>
	                          <Input
	                            id={`edit-staff-password-${profile.id}`}
	                            className="mt-2"
	                            type="password"
	                            value={staffEditForm.password}
	                            onChange={(event) =>
	                              setStaffEditForm((current) =>
	                                current ? { ...current, password: event.target.value } : current,
	                              )
	                            }
	                            placeholder="不需要改密码就留空"
	                          />
	                        </div>

	                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
	                          <input
	                            type="checkbox"
	                            checked={staffEditForm.isActive}
	                            onChange={(event) =>
	                              setStaffEditForm((current) =>
	                                current ? { ...current, isActive: event.target.checked } : current,
	                              )
	                            }
	                          />
	                          启用这个员工账号
	                        </label>

	                        <div className="flex flex-wrap gap-2">
	                          <Button type="submit" disabled={updatingStaff}>
	                            {updatingStaff ? "保存中..." : "保存员工"}
	                          </Button>
	                          <Button
	                            type="button"
	                            variant="outline"
	                            onClick={() => {
	                              setEditingStaffId(null);
	                              setStaffEditForm(null);
	                            }}
	                          >
	                            取消
	                          </Button>
	                        </div>
	                      </form>
	                    ) : null}
	                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
