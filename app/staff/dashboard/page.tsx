"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import LoadingScreen from "@/components/LoadingScreen";
import ProductCard from "@/components/ProductCard";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LayoutDashboard, RefreshCw, Package, MessageCircle, Clock,
  Wifi, WifiOff, Plus, Upload, Loader2, LogOut, ShieldCheck, MapPin,
} from "lucide-react";
import type { Order, OrderStatus, Product, Category } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "DONE", "CANCELLED"];
const statusLabels: Record<string, string> = {
  ALL: "全部", PENDING: "待处理", CONFIRMED: "已确认",
  PROCESSING: "处理中", DONE: "已完成", CANCELLED: "已取消",
};

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const url = filterStatus === "ALL" ? "/api/orders" : `/api/orders?status=${filterStatus}`;
    const res = await fetch(url);
    if (res.ok) setOrders(await res.json());
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => {
      socket.emit("join_assistants");
      setConnected(true);
    };

    if (socket.connected) joinRoom();
    socket.on(SOCKET_EVENTS.CONNECT, joinRoom);
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));

    socket.on(SOCKET_EVENTS.NEW_ORDER, (order: Order) => {
      toast.success(`收到新订单！来自 ${order.customerName ?? "访客"}`, {
        description: `¥${Number(order.totalAmount).toFixed(2)} · 共 ${order.items.length} 件商品`,
      });
      setOrders((prev) => [order, ...prev]);
    });

    socket.on(SOCKET_EVENTS.ORDER_UPDATED, (updated: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, joinRoom);
      socket.off(SOCKET_EVENTS.DISCONNECT);
      socket.off(SOCKET_EVENTS.NEW_ORDER);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED);
    };
  }, [selectedOrder?.id]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) toast.success("订单状态已更新");
    else toast.error("更新失败，请重试");
    setUpdatingId(null);
  };

  const displayed = filterStatus === "ALL" ? orders : orders.filter((o) => o.status === filterStatus);
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    processing: orders.filter((o) => o.status === "PROCESSING").length,
    done: orders.filter((o) => o.status === "DONE").length,
  };

  if (loading) return (
    <div className="py-20 flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> 加载中...
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Connection status + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected
            ? <><Wifi className="h-3 w-3 text-green-600" /> 实时更新已连接</>
            : <><WifiOff className="h-3 w-3 text-destructive" /> 正在重新连接...</>}
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> 刷新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "总订单数", value: stats.total,      color: "text-foreground" },
          { label: "待处理",   value: stats.pending,    color: "text-yellow-600" },
          { label: "处理中",   value: stats.processing, color: "text-purple-600" },
          { label: "已完成",   value: stats.done,       color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">筛选：</span>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">共 {displayed.length} 条</span>
      </div>

      {/* Order list */}
      {displayed.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
          <Package className="h-14 w-14 opacity-20" />
          <p className="font-medium">暂无订单</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{order.customerName ?? "访客"}</span>
                    <OrderStatusBadge status={order.status} />
                    {order.customerPhone && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-green-600" />
                        {order.customerPhone}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(order.createdAt).toLocaleString("zh-CN")} · 共 {order.items.length} 件商品
                  </p>
                  {/* Delivery city preview in list */}
                  {order.deliveryCity && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {order.deliveryRecipient} · {order.deliveryCity}, {order.deliveryState}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-bold text-lg">¥{Number(order.totalAmount).toFixed(2)}</span>
                  <Select
                    value={order.status}
                    onValueChange={(val) => updateStatus(order.id, val as OrderStatus)}
                    disabled={updatingId === order.id}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs" onClick={(e) => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent onClick={(e) => e.stopPropagation()}>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order detail dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>订单详情</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer info */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedOrder.customerName ?? "访客"}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  )}
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {/* WhatsApp link */}
              {selectedOrder.customerPhone && (
                <a
                  href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, "")}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp 联系：{selectedOrder.customerPhone}
                </a>
              )}

              {/* ── Delivery address snapshot ── */}
              {selectedOrder.deliveryStreet && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                    <MapPin className="h-3 w-3" /> 配送地址
                  </p>
                  <p className="text-sm font-medium">
                    {selectedOrder.deliveryRecipient}
                    {selectedOrder.deliveryPhone && (
                      <span className="text-muted-foreground font-normal ml-2">
                        {selectedOrder.deliveryPhone}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.deliveryStreet}, {selectedOrder.deliveryCity},{" "}
                    {selectedOrder.deliveryState} {selectedOrder.deliveryPostcode},{" "}
                    {selectedOrder.deliveryCountry}
                  </p>
                </div>
              )}

              {/* Notes */}
              {selectedOrder.notes && (
                <p className="text-sm bg-muted rounded-lg px-4 py-3">备注：{selectedOrder.notes}</p>
              )}

              <Separator />

              {/* Items */}
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.product.name} × {item.quantity}</span>
                    <span className="font-medium">¥{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>合计</span>
                <span>¥{Number(selectedOrder.totalAmount).toFixed(2)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                下单时间：{new Date(selectedOrder.createdAt).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab() {
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
        method: "PUT", headers: { "Content-Type": file.type }, body: file,
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
    setForm({
      name: product.name, description: product.description ?? "",
      price: String(product.price), stock: String(product.stock),
      categoryId: product.categoryId, imageUrl: product.imageUrl ?? "",
    });
    setEditingId(product.id);
    setDialogOpen(true);
  };

  if (loading) return (
    <div className="py-20 flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin mr-2" /> 加载中...
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-3 gap-4 flex-1 mr-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">商品总数</p><p className="text-3xl font-bold mt-1">{products.length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">上架中</p><p className="text-3xl font-bold mt-1 text-green-600">{products.filter((p) => p.status).length}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">已售罄</p><p className="text-3xl font-bold mt-1 text-destructive">{products.filter((p) => p.stock === 0).length}</p></CardContent></Card>
        </div>
        <Button
          className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 flex-shrink-0"
          onClick={() => { setForm(emptyForm); setEditingId(null); setDialogOpen(true); }}
        >
          <Plus className="h-4 w-4" /> 添加商品
        </Button>
      </div>

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
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "保存修改" : "添加商品"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StaffDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/staff/login");
      return;
    }
    if (status === "authenticated" && !["STAFF"].includes(role)) {
      router.push("/staff/login");
    }
  }, [status, role, router]);

  if (status === "loading") return <LoadingScreen />;
  if (!role || !["STAFF"].includes(role)) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 md:px-20 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold">员工后台</h1>
              <p className="text-sm text-muted-foreground">
                {role === "STAFF" ? "员工" : "顾客"} · {(session?.user as any)?.name ?? ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2 text-destructive hover:text-destructive"
            onClick={() => signOut({ callbackUrl: "/staff/login" })}
          >
            <LogOut className="h-4 w-4" /> 登出
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="mb-2">
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> 订单管理
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> 商品管理
            </TabsTrigger>
          </TabsList>
          <TabsContent value="orders"><OrdersTab /></TabsContent>
          <TabsContent value="products"><ProductsTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}