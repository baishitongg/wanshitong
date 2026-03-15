"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import LoadingScreen from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Settings, Upload, Package, Loader2 } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import type { Product, Category } from "@/types";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const emptyForm = { name: "", description: "", price: "", stock: "", categoryId: "", imageUrl: "" };
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated" && role !== "ADMIN") router.push("/");
  }, [status, role, router]);

  useEffect(() => {
    const load = async () => {
      const [pRes, cRes] = await Promise.all([fetch("/api/products"), fetch("/api/categories")]);
      if (pRes.ok) setProducts(await pRes.json());
      if (cRes.ok) setCategories(await cRes.json());
      setLoading(false);
    };
    load();
  }, []);

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const urlRes = await fetch("/api/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name }),
      });
      if (!urlRes.ok) throw new Error("获取上传链接失败");
      const { signedUrl, path } = await urlRes.json();

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("图片上传失败");

      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/product-images/${path}`;
      setForm((f) => ({ ...f, imageUrl: publicUrl }));
      toast.success("图片上传成功");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.categoryId) {
      toast.error("商品名称、价格和分类为必填项");
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/products/${editingId}` : "/api/products";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: parseFloat(form.price), stock: parseInt(form.stock || "0") }),
      });
      if (!res.ok) throw new Error("保存失败");
      const saved = await res.json();
      if (editingId) setProducts((prev) => prev.map((p) => (p.id === editingId ? saved : p)));
      else setProducts((prev) => [saved, ...prev]);
      toast.success(editingId ? "商品已更新" : "商品已添加");
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (product: Product) => {
    setForm({ name: product.name, description: product.description ?? "", price: String(product.price), stock: String(product.stock), categoryId: product.categoryId, imageUrl: product.imageUrl ?? "" });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  if (status === "loading" || loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 md:px-20 py-8 space-y-8">

        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="h-7 w-7 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold">管理后台</h1>
              <p className="text-sm text-muted-foreground">管理商品与库存</p>
            </div>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
            onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> 添加商品
          </Button>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">商品总数</p><p className="text-3xl font-bold mt-1">{products.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">上架中</p><p className="text-3xl font-bold mt-1 text-green-600">{products.filter((p) => p.status).length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">已售罄</p><p className="text-3xl font-bold mt-1 text-destructive">{products.filter((p) => p.stock === 0).length}</p></CardContent></Card>
        </div>

        {/* 商品列表 */}
        {products.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="h-14 w-14 opacity-20" />
            <p className="font-medium">暂无商品</p>
            <Button variant="outline" onClick={() => setDialogOpen(true)}>添加第一个商品</Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((p) => <ProductCard key={p.id} {...p} mode="admin" onEdit={openEdit} />)}
          </div>
        )}
      </div>

      {/* 添加/编辑商品弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setForm(emptyForm); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑商品" : "添加新商品"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>商品名称 *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="请输入商品名称" />
            </div>
            <div className="space-y-1.5">
              <Label>商品描述</Label>
              <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="请输入商品描述..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>价格（¥）*</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>库存数量</Label>
                <Input type="number" min="0" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>商品分类 *</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder="请选择分类" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>商品图片</Label>
              <div className="flex items-center gap-3">
                <Input type="file" accept="image/*" className="hidden" id="image-upload"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); }} />
                <Label htmlFor="image-upload" className="flex items-center gap-2 px-4 py-2 rounded-md border border-border text-sm cursor-pointer hover:bg-muted transition-colors">
                  {imageUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {imageUploading ? "上传中..." : "上传图片"}
                </Label>
                {form.imageUrl && <Badge variant="secondary" className="text-xs">✓ 已上传</Badge>}
              </div>
              {form.imageUrl && (
                <Input value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} placeholder="或直接粘贴图片链接" className="mt-2 text-xs" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingId ? "保存修改" : "添加商品"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}