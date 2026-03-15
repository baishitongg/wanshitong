"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import LoadingScreen from "@/components/LoadingScreen";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { LayoutDashboard, RefreshCw, Package, MessageCircle, Clock, Wifi, WifiOff } from "lucide-react";
import type { Order, OrderStatus } from "@/types";

const STATUS_OPTIONS: OrderStatus[] = ["PENDING", "CONFIRMED", "PROCESSING", "DONE", "CANCELLED"];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
    if (status === "authenticated" && !["ASSISTANT", "ADMIN"].includes(role)) router.push("/");
  }, [status, role, router]);

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
    socket.emit("join_assistants");
    socket.on(SOCKET_EVENTS.CONNECT, () => setConnected(true));
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));
    setConnected(socket.connected);

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

  const statusLabels: Record<string, string> = {
    ALL: "全部",
    PENDING: "待处理",
    CONFIRMED: "已确认",
    PROCESSING: "处理中",
    DONE: "已完成",
    CANCELLED: "已取消",
  };

  const displayed = filterStatus === "ALL" ? orders : orders.filter((o) => o.status === filterStatus);
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    processing: orders.filter((o) => o.status === "PROCESSING").length,
    done: orders.filter((o) => o.status === "DONE").length,
  };

  if (status === "loading" || loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-6 md:px-20 py-8 space-y-8">

        {/* 标题 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="h-7 w-7 text-green-600" />
            <div>
              <h1 className="text-2xl font-bold">订单管理</h1>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                {connected ? (
                  <><Wifi className="h-3 w-3 text-green-600" /> 实时更新已连接</>
                ) : (
                  <><WifiOff className="h-3 w-3 text-destructive" /> 正在重新连接...</>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> 刷新
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "总订单数", value: stats.total, color: "text-foreground" },
            { label: "待处理", value: stats.pending, color: "text-yellow-600" },
            { label: "处理中", value: stats.processing, color: "text-purple-600" },
            { label: "已完成", value: stats.done, color: "text-green-600" },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">筛选：</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">共 {displayed.length} 条订单</span>
        </div>

        {/* 订单列表 */}
        {displayed.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-muted-foreground">
            <Package className="h-14 w-14 opacity-20" />
            <p className="font-medium">暂无订单</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayed.map((order) => (
              <Card key={order.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setSelectedOrder(order)}>
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{order.customerName ?? "访客"}</span>
                      <OrderStatusBadge status={order.status} />
                      {(order as any).customerPhone && (
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <MessageCircle className="h-3 w-3 text-green-600" />
                          {(order as any).customerPhone}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleString("zh-CN")} · 共 {order.items.length} 件商品
                    </p>
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
      </div>

      {/* 订单详情弹窗 */}
      <Dialog open={!!selectedOrder} onOpenChange={(o) => !o && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedOrder.customerName ?? "访客"}</p>
                  {(selectedOrder as any).customerPhone && (
                    <p className="text-sm text-muted-foreground">{(selectedOrder as any).customerPhone}</p>
                  )}
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>
              {(selectedOrder as any).customerPhone && (
                <a
                  href={`https://wa.me/${(selectedOrder as any).customerPhone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-green-600 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  通过微信联系：{(selectedOrder as any).customerPhone}
                </a>
              )}
              {selectedOrder.notes && (
                <p className="text-sm bg-muted rounded-lg px-4 py-3">备注：{selectedOrder.notes}</p>
              )}
              <Separator />
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