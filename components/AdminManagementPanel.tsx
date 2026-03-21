"use client";

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
  description: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroImageUrl: string | null;
  whatsappPhone: string | null;
  telegramUsername: string | null;
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
  description: "",
  heroTitle: "",
  heroSubtitle: "",
  heroImageUrl: "",
  whatsappPhone: "",
  telegramUsername: "",
  status: "ACTIVE" as "ACTIVE" | "INACTIVE",
};

export default function AdminManagementPanel({
  shops,
  staffProfiles,
  mode = "all",
}: AdminManagementPanelProps) {
  const router = useRouter();
  const [creatingShop, setCreatingShop] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [shopForm, setShopForm] = useState(initialShopForm);
  const [staffForm, setStaffForm] = useState({
    name: "",
    loginId: "",
    password: "",
    shopId: shops[0]?.id ?? "",
  });

  const handleCreateShop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreatingShop(true);

    try {
      const response = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shopForm),
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
              管理员可以直接新增店铺资料，系统会写入 `Shop` 表并立即出现在平台中。
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
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        shop.status === "ACTIVE"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {shop.status}
                    </span>
                  </div>

                  {shop.description ? (
                    <p className="mt-3 text-sm text-gray-600">{shop.description}</p>
                  ) : null}

                  <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2 xl:grid-cols-4">
                    <p>WhatsApp：{shop.whatsappPhone ?? "未设置"}</p>
                    <p>
                      Telegram：
                      {shop.telegramUsername
                        ? `@${shop.telegramUsername.replace(/^@+/, "")}`
                        : "未设置"}
                    </p>
                    <p>商品：{shop._count.products}</p>
                    <p>分类：{shop._count.categories}</p>
                    <p>订单：{shop._count.orders}</p>
                    <p>员工：{shop._count.staffProfiles}</p>
                  </div>
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
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          profile.isActive
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {profile.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </div>
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
