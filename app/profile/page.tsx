"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  Package,
  Loader2,
  User,
  ShoppingBag,
  Clock,
  Home,
  Briefcase,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import type { Address, Order } from "@/types";
import { buildShopHref } from "@/lib/shops";

type ContactChannel = "PHONE" | "TELEGRAM";

type SessionUser = {
  id?: string;
  role?: string;
  name?: string | null;
  phone?: string | null;
  telegramUsername?: string | null;
  preferredContactChannel?: "PHONE" | "TELEGRAM" | null;
};

// ─── Address Form ─────────────────────────────────────────────────────────────
const emptyForm = {
  label: "",
  recipient: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  postcode: "",
  country: "Malaysia",
  isDefault: false,
};

type AddressForm = typeof emptyForm;

const STATES_MY = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Kuala Lumpur",
  "Labuan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Penang",
  "Perak",
  "Perlis",
  "Putrajaya",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
];

function getLabelIcon(label: string | null) {
  if (!label) return <MapPin className="h-3.5 w-3.5" />;
  const l = label.toLowerCase();
  if (l.includes("home") || l.includes("家")) {
    return <Home className="h-3.5 w-3.5" />;
  }
  if (
    l.includes("office") ||
    l.includes("work") ||
    l.includes("公司") ||
    l.includes("工作")
  ) {
    return <Briefcase className="h-3.5 w-3.5" />;
  }
  return <MapPin className="h-3.5 w-3.5" />;
}

// ─── Addresses Tab ────────────────────────────────────────────────────────────
function AddressesTab() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchAddresses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        setAddresses((await res.json()) as Address[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAdd = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const openEdit = (addr: Address) => {
    setForm({
      label: addr.label ?? "",
      recipient: addr.recipient,
      phone: addr.phone,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      postcode: addr.postcode,
      country: addr.country,
      isDefault: addr.isDefault,
    });
    setEditingId(addr.id);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (
      !form.recipient ||
      !form.phone ||
      !form.street ||
      !form.city ||
      !form.state ||
      !form.postcode
    ) {
      toast.error("请填写所有必填字段");
      return;
    }

    setSaving(true);
    try {
      const method = editingId ? "PATCH" : "POST";
      const url = editingId ? `/api/addresses/${editingId}` : "/api/addresses";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "保存失败");
      }

      toast.success(editingId ? "地址已更新" : "地址已添加");
      setDialogOpen(false);
      fetchAddresses();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "保存失败";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    const res = await fetch(`/api/addresses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });

    if (res.ok) {
      toast.success("默认地址已更新");
      fetchAddresses();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const res = await fetch(`/api/addresses/${deleteId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("地址已删除");
      fetchAddresses();
    } else {
      toast.error("删除失败");
    }

    setDeleteId(null);
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> 加载中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">管理您的收货地址</p>
        <Button
          size="sm"
          className="bg-red-700 hover:bg-red-600 text-white flex items-center gap-2"
          onClick={openAdd}
        >
          <Plus className="h-4 w-4" /> 添加地址
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-4 text-muted-foreground border-2 border-dashed rounded-xl">
          <MapPin className="h-12 w-12 opacity-20" />
          <div className="text-center">
            <p className="font-medium">还没有收货地址</p>
            <p className="text-sm mt-1">添加地址以便快速结账</p>
          </div>
          <Button
            variant="outline"
            onClick={openAdd}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> 添加第一个地址
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <Card
              key={addr.id}
              className={`transition-colors ${
                addr.isDefault
                  ? "border-red-600/40 bg-red-50/30 dark:bg-red-950/10"
                  : ""
              }`}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {addr.label && (
                        <Badge
                          variant="secondary"
                          className="flex items-center gap-1 text-xs"
                        >
                          {getLabelIcon(addr.label)}
                          {addr.label}
                        </Badge>
                      )}
                      {addr.isDefault && (
                        <Badge className="text-xs bg-red-700 text-white border-0 flex items-center gap-1">
                          <Star className="h-2.5 w-2.5 fill-current" /> 默认
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span>{addr.recipient}</span>
                      <span className="text-muted-foreground font-normal">
                        {addr.phone}
                      </span>
                    </div>

                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {addr.street}, {addr.city}, {addr.state} {addr.postcode},{" "}
                      {addr.country}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!addr.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => handleSetDefault(addr.id)}
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(addr)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(addr.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(o) => {
          setDialogOpen(o);
          if (!o) setForm(emptyForm);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑地址" : "添加新地址"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>地址标签（可选）</Label>
              <div className="flex gap-2">
                {["家", "公司", "其他"].map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant={form.label === preset ? "default" : "outline"}
                    size="sm"
                    className={`text-xs h-8 ${
                      form.label === preset
                        ? "bg-red-700 hover:bg-red-600 text-white"
                        : ""
                    }`}
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        label: f.label === preset ? "" : preset,
                      }))
                    }
                  >
                    {preset}
                  </Button>
                ))}
                <Input
                  className="flex-1 h-8 text-sm"
                  placeholder="自定义标签..."
                  value={form.label}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, label: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>收件人 *</Label>
                <Input
                  placeholder="姓名"
                  value={form.recipient}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, recipient: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>联系电话 *</Label>
                <Input
                  placeholder="手机号"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>街道地址 *</Label>
              <Input
                placeholder="门牌号、街道名称"
                value={form.street}
                onChange={(e) =>
                  setForm((f) => ({ ...f, street: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>城市 *</Label>
                <Input
                  placeholder="城市"
                  value={form.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, city: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>邮政编码 *</Label>
                <Input
                  placeholder="邮编"
                  value={form.postcode}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      postcode: e.target.value.replace(/\D/g, ""),
                    }))
                  }
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>州属 *</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={form.state}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, state: e.target.value }))
                  }
                >
                  <option value="">请选择州属</option>
                  {STATES_MY.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>国家</Label>
                <Input
                  value={form.country}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, country: e.target.value }))
                  }
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <div
                className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                  form.isDefault
                    ? "bg-red-700 border-red-700"
                    : "border-input group-hover:border-red-400"
                }`}
                onClick={() =>
                  setForm((f) => ({ ...f, isDefault: !f.isDefault }))
                }
              >
                {form.isDefault && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                设为默认地址
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingId ? "保存修改" : "添加地址"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o: boolean) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除地址？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销，地址将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={handleDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED"
  >("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  const ORDERS_PER_PAGE = 6;

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders/mine", { cache: "no-store" });
        if (res.ok) {
          setOrders((await res.json()) as Order[]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const normalizeStatus = (status: string) => {
    const s = status.toUpperCase();

    if (s === "PENDING" || status === "待处理") return "PENDING";
    if (s === "PROCESSING" || status === "处理中") return "PROCESSING";
    if (s === "COMPLETED" || s === "DONE" || status === "已完成") {
      return "COMPLETED";
    }
    if (s === "CANCELLED" || s === "CANCELED" || status === "已取消") {
      return "CANCELLED";
    }

    return s;
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter(
      (order) => normalizeStatus(order.status) === statusFilter,
    );
  }, [orders, statusFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredOrders.length / ORDERS_PER_PAGE),
  );

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(start, start + ORDERS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> 加载中...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">查看您的历史订单</p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={statusFilter === "ALL" ? "default" : "outline"}
            className={
              statusFilter === "ALL"
                ? "bg-red-700 hover:bg-red-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter("ALL")}
          >
            全部
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "PENDING" ? "default" : "outline"}
            className={
              statusFilter === "PENDING"
                ? "bg-red-700 hover:bg-red-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter("PENDING")}
          >
            待处理
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "PROCESSING" ? "default" : "outline"}
            className={
              statusFilter === "PROCESSING"
                ? "bg-red-700 hover:bg-red-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter("PROCESSING")}
          >
            处理中
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "COMPLETED" ? "default" : "outline"}
            className={
              statusFilter === "COMPLETED"
                ? "bg-red-700 hover:bg-red-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter("COMPLETED")}
          >
            已完成
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "CANCELLED" ? "default" : "outline"}
            className={
              statusFilter === "CANCELLED"
                ? "bg-red-700 hover:bg-red-600 text-white"
                : ""
            }
            onClick={() => setStatusFilter("CANCELLED")}
          >
            已取消
          </Button>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="py-16 flex flex-col items-center gap-4 text-muted-foreground border-2 border-dashed rounded-xl">
          <ShoppingBag className="h-12 w-12 opacity-20" />
          <div className="text-center">
            <p className="font-medium">
              {statusFilter === "ALL" ? "还没有订单" : "该状态下没有订单"}
            </p>
            <p className="text-sm mt-1">
              {statusFilter === "ALL"
                ? "去选购您喜欢的商品吧"
                : "请切换其他筛选条件查看"}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <OrderStatusBadge status={order.status} />
                        <span className="text-xs text-muted-foreground font-mono">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        共 {order.items.length} 件商品
                        {order.deliveryCity &&
                          ` · 配送至 ${order.deliveryCity}`}
                      </p>
                    </div>
                    <span className="font-bold text-base shrink-0">
                      RM{Number(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-muted-foreground">
                第 {currentPage} 页 / 共 {totalPages} 页
              </p>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  上一页
                </Button>

                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        size="sm"
                        variant={currentPage === page ? "default" : "outline"}
                        className={
                          currentPage === page
                            ? "bg-red-700 hover:bg-red-600 text-white min-w-9"
                            : "min-w-9"
                        }
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <Dialog
        open={!!selectedOrder}
        onOpenChange={(o) => !o && setSelectedOrder(null)}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-mono">
                  订单号：#{selectedOrder.id.slice(-8).toUpperCase()}
                </span>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {selectedOrder.deliveryStreet && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground uppercase tracking-wide">
                    <MapPin className="h-3 w-3" /> 配送地址
                  </p>
                  <p className="text-sm font-medium">
                    {selectedOrder.deliveryRecipient}
                    <span className="text-muted-foreground font-normal ml-2">
                      {selectedOrder.deliveryPhone}
                    </span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.deliveryStreet}, {selectedOrder.deliveryCity}
                    , {selectedOrder.deliveryState}{" "}
                    {selectedOrder.deliveryPostcode},{" "}
                    {selectedOrder.deliveryCountry}
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <p className="text-sm bg-muted rounded-lg px-4 py-3">
                  备注：{selectedOrder.notes}
                </p>
              )}

              <Separator />

              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="font-medium">
                      RM{(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex justify-between font-bold">
                <span>合计</span>
                <span>RM{Number(selectedOrder.totalAmount).toFixed(2)}</span>
              </div>

              <p className="text-xs text-muted-foreground">
                下单时间：
                {new Date(selectedOrder.createdAt).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [telegramUsername, setTelegramUsername] = useState("");
  const [preferredChannel, setPreferredChannel] =
    useState<ContactChannel>("PHONE");
  const [savingContact, setSavingContact] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  const user = session?.user as SessionUser | undefined;
  const shopSlug = useMemo(() => {
    const value = searchParams.get("shop")?.trim();
    return value ? value : undefined;
  }, [searchParams]);

  useEffect(() => {
    setTelegramUsername(user?.telegramUsername ?? "");
    setPreferredChannel(
      user?.preferredContactChannel === "TELEGRAM" ? "TELEGRAM" : "PHONE",
    );
  }, [user?.telegramUsername, user?.preferredContactChannel]);

  useEffect(() => {
    if (!telegramUsername.trim() && preferredChannel === "TELEGRAM") {
      setPreferredChannel("PHONE");
    }
  }, [telegramUsername, preferredChannel]);

  const handleSaveContactPreference = async () => {
    const cleanedTelegram = telegramUsername.trim().replace(/^@+/, "");

    const finalPreferredChannel: ContactChannel = cleanedTelegram
      ? preferredChannel
      : "PHONE";

    if (finalPreferredChannel === "TELEGRAM" && !cleanedTelegram) {
      toast.error("选择 Telegram 作为联系方式时，请先填写 Telegram 用户名");
      return;
    }

    setSavingContact(true);

    try {
      const res = await fetch("/api/profile/telegram", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramUsername: cleanedTelegram || null,
          preferredContactChannel: finalPreferredChannel,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        telegramUsername?: string | null;
        preferredContactChannel?: ContactChannel;
      };

      if (!res.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }

      setTelegramUsername(data.telegramUsername ?? "");
      setPreferredChannel(data.preferredContactChannel ?? "PHONE");

      await update?.({
        telegramUsername: data.telegramUsername ?? "",
        preferredContactChannel: data.preferredContactChannel ?? "PHONE",
      });

      toast.success("联系方式偏好已保存");
      setContactDialogOpen(false);
    } catch {
      toast.error("保存失败，请重试");
    } finally {
      setSavingContact(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-40 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> 加载中...
        </div>
      </div>
    );
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() ?? "用";

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        shopSlug={shopSlug}
        homeHref={shopSlug ? buildShopHref(shopSlug) : "/"}
      />
      <div className="container mx-auto px-6 md:px-20 py-8 max-w-2xl">
        {shopSlug && (
          <Link
            href={buildShopHref(shopSlug)}
            className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回店铺首页
          </Link>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-14 w-14 rounded-full bg-red-950 flex items-center justify-center text-white text-xl font-bold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-bold">{user?.name ?? "用户"}</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {user?.phone ?? ""}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => setContactDialogOpen(true)}
              className="shrink-0"
            >
              联系偏好
            </Button>
          </div>

          <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>联系偏好</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div>
                  <p className="text-sm text-muted-foreground">
                    您可以选择商家优先通过手机号码或 Telegram 联系您
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>手机号码</Label>
                  <Input value={user?.phone ?? ""} disabled />
                </div>

                <div className="space-y-2">
                  <Label>Telegram 用户名（可选）</Label>
                  <Input
                    placeholder="例如：@your_username"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                  />
                </div>

                {!!telegramUsername.trim() && (
                  <div className="space-y-2">
                    <Label>首选联系方式</Label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        type="button"
                        variant={
                          preferredChannel === "PHONE" ? "default" : "outline"
                        }
                        className={
                          preferredChannel === "PHONE"
                            ? "bg-red-700 hover:bg-red-600 text-white"
                            : ""
                        }
                        onClick={() => setPreferredChannel("PHONE")}
                      >
                        手机号码
                      </Button>

                      <Button
                        type="button"
                        variant={
                          preferredChannel === "TELEGRAM"
                            ? "default"
                            : "outline"
                        }
                        className={
                          preferredChannel === "TELEGRAM"
                            ? "bg-red-700 hover:bg-red-600 text-white"
                            : ""
                        }
                        onClick={() => setPreferredChannel("TELEGRAM")}
                      >
                        Telegram
                      </Button>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      商家将优先通过您选择的渠道联系您
                    </p>
                  </div>
                )}

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    当前首选：
                    {telegramUsername.trim()
                      ? preferredChannel === "TELEGRAM"
                        ? "Telegram"
                        : "手机号码"
                      : "手机号码"}
                  </p>

                  {!!telegramUsername.trim() && (
                    <p>当前 Telegram：@{telegramUsername.replace(/^@+/, "")}</p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setContactDialogOpen(false)}
                >
                  取消
                </Button>
                <Button
                  className="bg-red-700 hover:bg-red-600 text-white"
                  onClick={handleSaveContactPreference}
                  disabled={savingContact}
                >
                  {savingContact && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  保存
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="addresses">
          <TabsList className="mb-4 w-full">
            <TabsTrigger
              value="addresses"
              className="flex-1 flex items-center gap-2"
            >
              <MapPin className="h-4 w-4" /> 收货地址
            </TabsTrigger>
            <TabsTrigger
              value="orders"
              className="flex-1 flex items-center gap-2"
            >
              <Package className="h-4 w-4" /> 我的订单
            </TabsTrigger>
          </TabsList>

          <TabsContent value="addresses">
            <AddressesTab />
          </TabsContent>
          <TabsContent value="orders">
            <OrdersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
