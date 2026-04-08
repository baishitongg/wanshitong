"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  formatServiceDuration,
  normalizeServiceAttributes,
  type ServiceAvailabilityDay,
  type ServiceMediaItem,
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
  galleryMedia: ServiceMediaItem[];
  packageOptions: Array<{
    id: string;
    price: string;
    durationMinutes: string;
  }>;
  requiresAddress: boolean;
  weeklyAvailability: ServiceAvailabilityDay[];
};

function createPackageOption(price = "", durationMinutes = "60") {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    price,
    durationMinutes,
  };
}

const buildEmptyProductForm = (): ProductFormState => ({
  name: "",
  description: "",
  price: "",
  costPrice: "",
  stock: "",
  categoryId: "",
  imageUrl: "",
  galleryMedia: [],
  packageOptions: [createPackageOption()],
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
      const isVideo = file.type.startsWith("video/");
      const allowed = type === "cover" ? file.type.startsWith("image/") : isVideo || file.type.startsWith("image/");
      const maxSizeBytes = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;

      if (!allowed) {
        throw new Error(type === "cover" ? "封面仅支持图片文件" : "服务图库仅支持图片或视频文件");
      }

      if (file.size > maxSizeBytes) {
        throw new Error(isVideo ? "视频请控制在 50MB 以内" : "图片请控制在 10MB 以内");
      }

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
        throw new Error(isVideo ? "视频上传失败" : "图片上传失败");
      }

      toast.success(
        type === "cover" ? "封面图片上传成功" : isVideo ? "服务视频上传成功" : "服务图片上传成功",
      );
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
      galleryMedia: [
        ...current.galleryMedia,
        {
          url: publicUrl,
          type: file.type.startsWith("video/") ? "video" : "image",
        },
      ],
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
    if (!form.name || !form.categoryId) {
      toast.error("名称、价格和分类为必填项");
      return;
    }

    if (isSelfOperatedShop && form.costPrice === "") {
      toast.error("自营店铺请填写成本价");
      return;
    }

    const normalizedPackageOptions = isServiceShop
      ? form.packageOptions
          .map((item) => ({
            price: Number.parseFloat(item.price),
            durationMinutes: Number.parseInt(item.durationMinutes || "0", 10),
          }))
          .filter(
            (item) =>
              Number.isFinite(item.price) &&
              item.price >= 0 &&
              Number.isFinite(item.durationMinutes) &&
              item.durationMinutes > 0,
          )
      : [];

    if (isServiceShop && normalizedPackageOptions.length === 0) {
      toast.error("请至少添加一个价格和时长");
      return;
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
        price: isServiceShop
          ? normalizedPackageOptions[0]?.price ?? 0
          : parseFloat(form.price),
        costPrice:
          isSelfOperatedShop && form.costPrice !== ""
            ? parseFloat(form.costPrice)
            : null,
        stock: parseInt(form.stock || "0", 10),
        categoryId: form.categoryId,
        imageUrl: form.imageUrl || null,
        galleryMedia: form.galleryMedia,
        packageOptions: normalizedPackageOptions,
        durationMinutes: isServiceShop
          ? normalizedPackageOptions[0]?.durationMinutes ?? 60
          : null,
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
      galleryMedia: serviceAttributes.galleryMedia,
      packageOptions:
        serviceAttributes.packageOptions.length > 0
          ? serviceAttributes.packageOptions.map((item) => ({
              id: createPackageOption().id,
              price: String(item.price),
              durationMinutes: String(item.durationMinutes),
            }))
          : [
              createPackageOption(String(product.price), String(product.durationMinutes ?? 60)),
            ],
      requiresAddress: product.requiresAddress,
      weeklyAvailability: serviceAttributes.weeklyAvailability,
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  const removeGalleryItem = (url: string) => {
    setForm((current) => ({
      ...current,
      galleryMedia: current.galleryMedia.filter((entry) => entry.url !== url),
    }));
  };

  const updatePackageOption = (
    index: number,
    field: "price" | "durationMinutes",
    value: string,
  ) => {
    setForm((current) => ({
      ...current,
      packageOptions: current.packageOptions.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const addPackageOption = () => {
    setForm((current) => ({
      ...current,
      packageOptions: [...current.packageOptions, createPackageOption()],
    }));
  };

  const removePackageOption = (index: number) => {
    setForm((current) => ({
      ...current,
      packageOptions:
        current.packageOptions.length === 1
          ? [createPackageOption()]
          : current.packageOptions.filter((_, itemIndex) => itemIndex !== index),
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
                {isServiceShop ? "已添加媒体" : "已售罄"}
              </p>
              <p className="mt-1 text-3xl font-bold text-destructive">
                {isServiceShop
                  ? products.filter((product) => {
                      const attributes = normalizeServiceAttributes(product.attributes);
                      return Boolean(product.imageUrl) || attributes.galleryMedia.length > 0;
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
                isServiceShop || isSelfOperatedShop ? "grid-cols-1 md:grid-cols-2" : "grid-cols-2"
              }`}
            >
              {!isServiceShop && (
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
              )}

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
                <div className="rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                  服务价格将以下方“价格与时长”方案为准。
                </div>
              )}
            </div>

            {isServiceShop && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>价格与时长</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addPackageOption}>
                    <Plus className="mr-1 h-4 w-4" />
                    添加方案
                  </Button>
                </div>

                <div className="space-y-3">
                  {form.packageOptions.map((item, index) => (
                    <div key={item.id} className="rounded-xl border p-4">
                      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                        <div className="space-y-1.5">
                          <Label>价格（RM）*</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.price}
                            onChange={(event) => updatePackageOption(index, "price", event.target.value)}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>单次时长（分钟）*</Label>
                          <Input
                            type="number"
                            min="15"
                            step="15"
                            value={item.durationMinutes}
                            onChange={(event) =>
                              updatePackageOption(index, "durationMinutes", event.target.value)
                            }
                            placeholder="60"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removePackageOption(index)}
                        >
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          删除
                        </Button>
                      </div>

                      {item.price && item.durationMinutes && (
                        <div className="mt-3 text-sm text-muted-foreground">
                          预览：RM{item.price} / {formatServiceDuration(Number(item.durationMinutes))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                  <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-muted">
                    <Image src={form.imageUrl} alt="封面预览" fill className="object-cover" />
                  </div>
                </div>
              )}
            </div>

            {isServiceShop && (
              <>
                <div className="space-y-2">
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

                  <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                    服务可预约时段先隐藏，后面需要时再开启。
                  </div>

                  <div className="flex items-center justify-between">
                    <Label>服务媒体（图片/视频）</Label>
                    <Input
                      type="file"
                      accept="image/*,video/*"
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
                      {galleryUploading ? "上传中..." : "添加媒体"}
                    </Label>
                  </div>

                  {form.galleryMedia.length === 0 ? (
                    <div className="rounded-xl border border-dashed px-4 py-5 text-sm text-muted-foreground">
                      还没有额外服务图片或视频
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {form.galleryMedia.map((item) => (
                        <div key={item.url} className="space-y-2">
                          <div className="relative h-24 overflow-hidden rounded-xl border bg-muted">
                            {item.type === "video" ? (
                              <video
                                src={item.url}
                                className="h-full w-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                              />
                            ) : (
                              <Image src={item.url} alt="服务图片" fill className="object-cover" />
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => removeGalleryItem(item.url)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            删除
                          </Button>
                          <div className="text-center text-xs text-muted-foreground">
                            {item.type === "video" ? "视频" : "图片"}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
