"use client";

import { useEffect, useState } from "react";
import { Loader2, Package, Plus, Trash2, Upload } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Category, OwnershipType, Product, ShopType } from "@/types";
import {
  normalizeServiceAttributes,
  type ServiceAvailabilityDay,
  type ServiceWeekday,
} from "@/lib/service-booking";

type StaffShopInfo = {
  id: string;
  name: string;
  slug: string;
  shopType: ShopType;
  ownershipType: OwnershipType;
  checkoutMode: string;
};

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  costPrice: string;
  stock: string;
  categoryId: string;
  imageUrl: string;
  galleryUrls: string[];
  durationMinutes: string;
  minAdvanceHours: string;
  maxAdvanceDays: string;
  requiresAddress: boolean;
  weeklyAvailability: ServiceAvailabilityDay[];
};

const WEEKDAY_LABELS: Record<ServiceWeekday, string> = {
  MONDAY: "星期一",
  TUESDAY: "星期二",
  WEDNESDAY: "星期三",
  THURSDAY: "星期四",
  FRIDAY: "星期五",
  SATURDAY: "星期六",
  SUNDAY: "星期日",
};

const buildEmptyProductForm = (): ProductFormState => ({
  name: "",
  description: "",
  price: "",
  costPrice: "",
  stock: "",
  categoryId: "",
  imageUrl: "",
  galleryUrls: [],
  durationMinutes: "60",
  minAdvanceHours: "0",
  maxAdvanceDays: "14",
  requiresAddress: false,
  weeklyAvailability: normalizeServiceAttributes(null).weeklyAvailability,
});

export default function StaffProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [shop, setShop] = useState<StaffShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [form, setForm] = useState<ProductFormState>(buildEmptyProductForm());
  const [editingId, setEditingId] = useState<string | null>(null);

  const isServiceShop = shop?.shopType === "SERVICE";
  const isSelfOperatedShop = shop?.ownershipType === "SELF_OPERATED";

  useEffect(() => {
    const load = async () => {
      try {
        const [dashboardRes, productsRes, categoriesRes] = await Promise.all([
          fetch("/api/staff/shop/dashboard"),
          fetch("/api/staff/shop/products"),
          fetch("/api/staff/shop/categories"),
        ]);

        if (dashboardRes.ok) {
          const dashboard = (await dashboardRes.json()) as { shop?: StaffShopInfo | null };
          setShop(dashboard.shop ?? null);
        }

        if (productsRes.ok) {
          setProducts((await productsRes.json()) as Product[]);
        }

        if (categoriesRes.ok) {
          setCategories((await categoriesRes.json()) as Category[]);
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const uploadAsset = async (file: File, type: "cover" | "gallery") => {
    const folderShopSlug = shop?.slug ?? "staff-shop";
    const assetBase = isServiceShop ? "services" : "products";
    const folder =
      type === "cover"
        ? `shops/${folderShopSlug}/${assetBase}/cover`
        : `shops/${folderShopSlug}/${assetBase}/gallery`;

    if (type === "cover") {
      setCoverUploading(true);
    } else {
      setGalleryUploading(true);
    }

    try {
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          folder,
        }),
      });

      const urlData = (await urlRes.json()) as {
        error?: string;
        signedUrl?: string;
        publicUrl?: string;
      };

      if (!urlRes.ok || !urlData.signedUrl || !urlData.publicUrl) {
        throw new Error(urlData.error ?? "获取上传链接失败");
      }

      const uploadRes = await fetch(urlData.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("图片上传失败");
      }

      toast.success(type === "cover" ? "封面图片上传成功" : "服务图片上传成功");
      return urlData.publicUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "上传失败";
      toast.error(message);
      return null;
    } finally {
      if (type === "cover") {
        setCoverUploading(false);
      } else {
        setGalleryUploading(false);
      }
    }
  };

  const handleCoverUpload = async (file: File) => {
    const publicUrl = await uploadAsset(file, "cover");
    if (!publicUrl) return;
    setForm((current) => ({ ...current, imageUrl: publicUrl }));
  };

  const handleGalleryUpload = async (file: File) => {
    const publicUrl = await uploadAsset(file, "gallery");
    if (!publicUrl) return;
    setForm((current) => ({
      ...current,
      galleryUrls: [...current.galleryUrls, publicUrl],
    }));
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error("分类名称不能为空");
      return;
    }

    setCreatingCategory(true);
    try {
      const res = await fetch("/api/staff/shop/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      const data = (await res.json()) as Category | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data && data.error ? data.error : "创建分类失败");
      }

      const createdCategory = data as Category;
      setCategories((prev) =>
        [...prev, createdCategory].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setForm((current) => ({ ...current, categoryId: createdCategory.id }));
      setNewCategoryName("");
      setCategoryDialogOpen(false);
      toast.success("分类创建成功");
    } catch (error) {
      const message = error instanceof Error ? error.message : "创建分类失败";
      toast.error(message);
    } finally {
      setCreatingCategory(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      toast.error("名称、价格和分类为必填项");
      return;
    }

    if (isSelfOperatedShop && form.costPrice === "") {
      toast.error("自营店铺请填写成本价");
      return;
    }

    if (isServiceShop) {
      const hasAvailability = form.weeklyAvailability.some(
        (day) => day.enabled && day.slots.length > 0,
      );
      if (!hasAvailability) {
        toast.error("请至少设置一个可预约时段");
        return;
      }
    }

    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId
        ? `/api/staff/shop/products/${editingId}`
        : "/api/staff/shop/products";

      const payload = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        costPrice:
          isSelfOperatedShop && form.costPrice !== ""
            ? parseFloat(form.costPrice)
            : null,
        stock: parseInt(form.stock || "0", 10),
        categoryId: form.categoryId,
        imageUrl: form.imageUrl || null,
        galleryUrls: form.galleryUrls,
        durationMinutes: parseInt(form.durationMinutes || "60", 10),
        minAdvanceHours: parseInt(form.minAdvanceHours || "0", 10),
        maxAdvanceDays: parseInt(form.maxAdvanceDays || "14", 10),
        requiresAddress: form.requiresAddress,
        weeklyAvailability: form.weeklyAvailability,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as Product | { error?: string };
      if (!res.ok) {
        throw new Error("error" in data && data.error ? data.error : "保存失败");
      }

      const saved = data as Product;
      setProducts((prev) =>
        editingId ? prev.map((product) => (product.id === editingId ? saved : product)) : [saved, ...prev],
      );

      toast.success(editingId ? "内容已更新" : isServiceShop ? "服务已添加" : "商品已添加");
      setDialogOpen(false);
      setEditingId(null);
      setForm(buildEmptyProductForm());
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存失败";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(buildEmptyProductForm());
    setDialogOpen(true);
  };

  const openEdit = (product: Product) => {
    const serviceAttributes = normalizeServiceAttributes(product.attributes);

    setForm({
      name: product.name,
      description: product.description ?? "",
      price: String(product.price),
      costPrice: product.costPrice != null ? String(product.costPrice) : "",
      stock: String(product.stock),
      categoryId: product.categoryId,
      imageUrl: product.imageUrl ?? "",
      galleryUrls: serviceAttributes.galleryUrls,
      durationMinutes: String(product.durationMinutes ?? 60),
      minAdvanceHours: String(product.minAdvanceHours ?? 0),
      maxAdvanceDays: String(product.maxAdvanceDays ?? 14),
      requiresAddress: product.requiresAddress,
      weeklyAvailability: serviceAttributes.weeklyAvailability,
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const updateAvailabilityDay = (
    day: ServiceWeekday,
    updater: (current: ServiceAvailabilityDay) => ServiceAvailabilityDay,
  ) => {
    setForm((current) => ({
      ...current,
      weeklyAvailability: current.weeklyAvailability.map((entry) =>
        entry.day === day ? updater(entry) : entry,
      ),
    }));
  };

  const addTimeSlot = (day: ServiceWeekday) => {
    updateAvailabilityDay(day, (current) => ({
      ...current,
      enabled: true,
      slots: [...current.slots, { start: "10:00", end: "12:00" }],
    }));
  };

  const updateTimeSlot = (
    day: ServiceWeekday,
    index: number,
    field: "start" | "end",
    value: string,
  ) => {
    updateAvailabilityDay(day, (current) => ({
      ...current,
      slots: current.slots.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    }));
  };

  const removeTimeSlot = (day: ServiceWeekday, index: number) => {
    updateAvailabilityDay(day, (current) => {
      const nextSlots = current.slots.filter((_, slotIndex) => slotIndex !== index);
      return {
        ...current,
        enabled: nextSlots.length > 0 ? current.enabled : false,
        slots: nextSlots,
      };
    });
  };

  const removeGalleryImage = (url: string) => {
    setForm((current) => ({
      ...current,
      galleryUrls: current.galleryUrls.filter((entry) => entry !== url),
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid flex-1 grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {isServiceShop ? "服务总数" : "商品总数"}
              </p>
              <p className="mt-1 text-3xl font-bold">{products.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">上架中</p>
              <p className="mt-1 text-3xl font-bold text-green-600">
                {products.filter((product) => product.status).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                {isServiceShop ? "需补时段" : "已售罄"}
              </p>
              <p className="mt-1 text-3xl font-bold text-destructive">
                {isServiceShop
                  ? products.filter((product) => {
                      const attributes = normalizeServiceAttributes(product.attributes);
                      return !attributes.weeklyAvailability.some(
                        (day) => day.enabled && day.slots.length > 0,
                      );
                    }).length
                  : products.filter((product) => product.stock === 0).length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Button
          className="flex w-full shrink-0 items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700 sm:w-auto"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4" />
          {isServiceShop ? "添加服务" : "添加商品"}
        </Button>
      </div>

      {shop && (
        <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          当前店铺：<span className="font-medium text-foreground">{shop.name}</span>
          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs">
            {shop.shopType}
          </span>
          <span className="ml-2 rounded-full bg-background px-2 py-0.5 text-xs">
            {shop.ownershipType}
          </span>
        </div>
      )}

      {products.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Package className="h-14 w-14 opacity-20" />
          <p className="font-medium">{isServiceShop ? "暂无服务" : "暂无商品"}</p>
          <Button variant="outline" onClick={openCreate}>
            {isServiceShop ? "添加第一个服务" : "添加第一个商品"}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} mode="admin" onEdit={openEdit} />
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setForm(buildEmptyProductForm());
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? isServiceShop
                  ? "编辑服务"
                  : "编辑商品"
                : isServiceShop
                  ? "添加新服务"
                  : "添加新商品"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-1.5">
              <Label>{isServiceShop ? "服务名称 *" : "商品名称 *"}</Label>
              <Input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder={isServiceShop ? "请输入服务名称" : "请输入商品名称"}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{isServiceShop ? "服务描述" : "商品描述"}</Label>
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder={isServiceShop ? "请输入服务介绍..." : "请输入商品描述..."}
                rows={3}
              />
            </div>

            <div
              className={`grid gap-4 ${
                isServiceShop || isSelfOperatedShop ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2"
              }`}
            >
              <div className="space-y-1.5">
                <Label>价格（RM）*</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="0.00"
                />
              </div>

              {isSelfOperatedShop && (
                <div className="space-y-1.5">
                  <Label>成本价（RM）</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.costPrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, costPrice: event.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
              )}

              {!isServiceShop && (
                <div className="space-y-1.5">
                  <Label>库存数量</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, stock: event.target.value }))
                    }
                    placeholder="0"
                  />
                </div>
              )}

              {isServiceShop && (
                <>
                  <div className="space-y-1.5">
                    <Label>单次时长（分钟）</Label>
                    <Input
                      type="number"
                      min="15"
                      step="15"
                      value={form.durationMinutes}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          durationMinutes: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>最早提前预约（小时）</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.minAdvanceHours}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          minAdvanceHours: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>最远可预约（天）</Label>
                    <Input
                      type="number"
                      min="1"
                      value={form.maxAdvanceDays}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          maxAdvanceDays: event.target.value,
                        }))
                      }
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>{isServiceShop ? "服务分类 *" : "商品分类 *"}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryDialogOpen(true)}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  新建分类
                </Button>
              </div>

              <Select
                value={form.categoryId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, categoryId: value }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="请选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{isServiceShop ? "服务封面" : "商品图片"}</Label>
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="product-cover-upload"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleCoverUpload(file);
                  }}
                />
                <Label
                  htmlFor="product-cover-upload"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                >
                  {coverUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {coverUploading ? "上传中..." : "上传封面"}
                </Label>

                {form.imageUrl && <Badge variant="secondary">已上传封面</Badge>}
              </div>

              {form.imageUrl && (
                <div className="space-y-2">
                  <Input
                    value={form.imageUrl}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, imageUrl: event.target.value }))
                    }
                    placeholder="或直接粘贴图片链接"
                    className="text-xs"
                  />
                  <div className="h-24 w-24 overflow-hidden rounded-xl border bg-muted">
                    <img src={form.imageUrl} alt="封面预览" className="h-full w-full object-cover" />
                  </div>
                </div>
              )}
            </div>

            {isServiceShop && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>服务图片（可多张）</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="service-gallery-upload"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void handleGalleryUpload(file);
                      }}
                    />
                    <Label
                      htmlFor="service-gallery-upload"
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
                    >
                      {galleryUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {galleryUploading ? "上传中..." : "添加图片"}
                    </Label>
                  </div>

                  {form.galleryUrls.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                      还没有额外服务图片
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {form.galleryUrls.map((url) => (
                        <div key={url} className="space-y-2">
                          <div className="h-24 overflow-hidden rounded-xl border bg-muted">
                            <img src={url} alt="服务图片" className="h-full w-full object-cover" />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => removeGalleryImage(url)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            删除
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>每周可预约时段</Label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={form.requiresAddress}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            requiresAddress: event.target.checked,
                          }))
                        }
                      />
                      该服务需要客户提供地址
                    </label>
                  </div>

                  <div className="space-y-3">
                    {form.weeklyAvailability.map((day) => (
                      <div key={day.day} className="rounded-xl border p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <label className="flex items-center gap-2 text-sm font-medium">
                            <input
                              type="checkbox"
                              checked={day.enabled}
                              onChange={(event) =>
                                updateAvailabilityDay(day.day, (current) => ({
                                  ...current,
                                  enabled: event.target.checked,
                                  slots:
                                    event.target.checked && current.slots.length === 0
                                      ? [{ start: "10:00", end: "12:00" }]
                                      : current.slots,
                                }))
                              }
                            />
                            {WEEKDAY_LABELS[day.day]}
                          </label>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!day.enabled}
                            onClick={() => addTimeSlot(day.day)}
                          >
                            <Plus className="mr-1 h-4 w-4" />
                            添加时段
                          </Button>
                        </div>

                        {!day.enabled ? (
                          <p className="mt-3 text-sm text-muted-foreground">当天不开放预约</p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            {day.slots.map((slot, index) => (
                              <div
                                key={`${day.day}-${index}`}
                                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
                              >
                                <Input
                                  type="time"
                                  value={slot.start}
                                  onChange={(event) =>
                                    updateTimeSlot(day.day, index, "start", event.target.value)
                                  }
                                />
                                <Input
                                  type="time"
                                  value={slot.end}
                                  onChange={(event) =>
                                    updateTimeSlot(day.day, index, "end", event.target.value)
                                  }
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeTimeSlot(day.day, index)}
                                >
                                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "保存修改" : isServiceShop ? "添加服务" : "添加商品"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建分类</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>分类名称</Label>
              <Input
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                placeholder="例如：饮料 / 服务套餐 / 热门推荐"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCategoryDialogOpen(false);
                setNewCategoryName("");
              }}
            >
              取消
            </Button>
            <Button onClick={handleCreateCategory} disabled={creatingCategory}>
              {creatingCategory && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              创建分类
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
