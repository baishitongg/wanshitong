"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type { Order, OrderStatus } from "@/types";

type SessionUser = {
  role?: string;
  name?: string;
  staffShopId?: string | null;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "DONE",
  "CANCELLED",
];

const STATUS_LABELS: Record<string, string> = {
  ALL: "全部",
  PENDING: "待处理",
  CONFIRMED: "已确认",
  PROCESSING: "处理中",
  DONE: "已完成",
  CANCELLED: "已取消",
};

function formatDateTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatTime(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function buildScheduleSummary(order: Order) {
  const scheduledItems = order.items.filter(
    (item) => item.scheduledStart && item.scheduledEnd,
  );

  if (scheduledItems.length === 0) {
    return null;
  }

  const first = scheduledItems[0];
  const startText = formatDateTime(first.scheduledStart);
  const endText = formatTime(first.scheduledEnd);

  if (!startText || !endText) {
    return null;
  }

  return scheduledItems.length === 1
    ? `${startText} - ${endText}`
    : `${startText} - ${endText} · 共 ${scheduledItems.length} 个预约项目`;
}

function buildWhatsAppMessageByStatus(order: Order, nextStatus?: string) {
  const status = nextStatus ?? order.status;

  switch (status) {
    case "PROCESSING":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 正在处理中。`,
        `如有更新，我们会再通知您。`,
      ].join("\n");

    case "DONE":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 已完成。`,
        `感谢您的支持。`,
      ].join("\n");

    case "CANCELLED":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `很抱歉，您的订单 #${order.id.slice(-8).toUpperCase()} 已取消。`,
        `如需协助，请直接回复我们。`,
      ].join("\n");

    default:
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `关于您的订单 #${order.id.slice(-8).toUpperCase()}，如有问题欢迎联系。`,
      ].join("\n");
  }
}

function buildWhatsAppLink(phone: string, order: Order, nextStatus?: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  const text = encodeURIComponent(buildWhatsAppMessageByStatus(order, nextStatus));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

export default function StaffOrdersTab() {
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  const fetchOrders = useCallback(async (): Promise<Order[]> => {
    const url =
      filterStatus === "ALL"
        ? "/api/staff/shop/orders"
        : `/api/staff/shop/orders?status=${filterStatus}`;

    const res = await fetch(url);
    if (!res.ok) throw new Error("加载订单失败");
    return (await res.json()) as Order[];
  }, [filterStatus]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch {
      toast.error("加载订单失败");
    } finally {
      setLoading(false);
    }
  }, [fetchOrders]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      try {
        const data = await fetchOrders();
        if (active) setOrders(data);
      } catch {
        if (active) toast.error("加载订单失败");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [fetchOrders]);

  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => {
      const role = String(currentUser?.role ?? "").toUpperCase();
      if (role === "ADMIN") {
        socket.emit("join_assistants");
      } else if (role === "STAFF" && currentUser?.staffShopId) {
        socket.emit("join_shop_staff", currentUser.staffShopId);
      }
      setConnected(true);
    };

    if (socket.connected) joinRoom();

    socket.on(SOCKET_EVENTS.CONNECT, joinRoom);
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));
    socket.on(SOCKET_EVENTS.NEW_ORDER, (order: Order) => {
      toast.success(`收到新订单！来自 ${order.customerName ?? "访客"}`, {
        description: `RM${Number(order.totalAmount).toFixed(2)} · 共 ${order.items.length} 项`,
      });
      setOrders((prev) => [order, ...prev]);
    });
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, (updated: Order) => {
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, joinRoom);
      socket.off(SOCKET_EVENTS.DISCONNECT);
      socket.off(SOCKET_EVENTS.NEW_ORDER);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED);
    };
  }, [currentUser?.role, currentUser?.staffShopId, selectedOrder?.id]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, searchOrderId]);

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId);

    try {
      const res = await fetch(`/api/staff/shop/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error || "更新失败，请重试");
        return;
      }

      const updatedOrder = data as Order;

      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      toast.success("订单状态已更新");

      if (updatedOrder.customerPhone) {
        window.open(buildWhatsAppLink(updatedOrder.customerPhone, updatedOrder, newStatus), "_blank");
      }
    } catch {
      toast.error("更新失败，请重试");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchStatus = filterStatus === "ALL" ? true : order.status === filterStatus;
      const keyword = searchOrderId.trim().toLowerCase();
      const matchSearch = keyword ? order.id.toLowerCase().includes(keyword) : true;
      return matchStatus && matchSearch;
    });
  }, [filterStatus, orders, searchOrderId]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const stats = {
    total: orders.length,
    pending: orders.filter((order) => order.status === "PENDING").length,
    processing: orders.filter((order) => order.status === "PROCESSING").length,
    done: orders.filter((order) => order.status === "DONE").length,
  };

  const cleanedTelegram = selectedOrder?.telegramUsername?.trim().replace(/^@+/, "") ?? "";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> 加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {connected ? (
            <>
              <Wifi className="h-3 w-3 text-green-600" /> 实时更新已连接
            </>
          ) : (
            <>
              <WifiOff className="h-3 w-3 text-destructive" /> 正在重新连接...
            </>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={loadOrders} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> 刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "总订单数", value: stats.total, color: "text-foreground" },
          { label: "待处理", value: stats.pending, color: "text-yellow-600" },
          { label: "处理中", value: stats.processing, color: "text-purple-600" },
          { label: "已完成", value: stats.done, color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">筛选：</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchOrderId}
            onChange={(event) => setSearchOrderId(event.target.value)}
            placeholder="搜索订单 ID"
            className="pl-9"
          />
        </div>

        <span className="text-sm text-muted-foreground">共 {filteredOrders.length} 条</span>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
          <Package className="h-14 w-14 opacity-20" />
          <p className="font-medium">暂无订单</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map((order) => {
              const scheduleSummary = buildScheduleSummary(order);
              return (
                <Card
                  key={order.id}
                  className="cursor-pointer transition-colors hover:border-primary/40"
                  onClick={() => setSelectedOrder(order)}
                >
                  <CardContent className="flex flex-col justify-between gap-3 py-4 sm:flex-row sm:items-center">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">{order.customerName ?? "访客"}</span>
                        <OrderStatusBadge status={order.status} />
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {order.id}
                        </Badge>
                        {order.customerPhone && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <MessageCircle className="h-3 w-3 text-green-600" />
                            {order.customerPhone}
                          </Badge>
                        )}
                      </div>

                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleString("zh-CN")} · 共 {order.items.length} 项
                      </p>

                      {scheduleSummary && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          预约时间：{scheduleSummary}
                        </p>
                      )}

                      {order.deliveryCity && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {order.deliveryRecipient} · {order.deliveryCity}, {order.deliveryState}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-lg font-bold">RM{Number(order.totalAmount).toFixed(2)}</span>

                      <Select
                        value={order.status}
                        onValueChange={(value) => updateStatus(order.id, value as OrderStatus)}
                        disabled={updatingId === order.id || order.status === "CANCELLED"}
                      >
                        <SelectTrigger
                          className="h-8 w-28 text-xs"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent onClick={(event) => event.stopPropagation()}>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status} value={status} className="text-xs">
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
              第 {currentPage} / {totalPages} 页
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                上一页
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              >
                下一页
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{selectedOrder.customerName ?? "访客"}</p>
                  {selectedOrder.customerPhone && (
                    <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone}</p>
                  )}
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    订单 ID：{selectedOrder.id}
                  </p>
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              <div className="space-y-2">
                {selectedOrder.customerPhone && (
                  <a
                    href={buildWhatsAppLink(selectedOrder.customerPhone, selectedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 transition-colors hover:bg-green-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp 联系：{selectedOrder.customerPhone}
                  </a>
                )}

                {cleanedTelegram && (
                  <a
                    href={`https://t.me/${cleanedTelegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-sky-600 hover:underline"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Telegram 联系：@{cleanedTelegram}
                  </a>
                )}
              </div>

              {selectedOrder.deliveryStreet && (
                <div className="space-y-1 rounded-lg bg-muted/50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <MapPin className="h-3 w-3" /> 配送地址
                  </p>
                  <p className="text-sm font-medium">
                    {selectedOrder.deliveryRecipient}
                    {selectedOrder.deliveryPhone && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {selectedOrder.deliveryPhone}
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedOrder.deliveryStreet}, {selectedOrder.deliveryCity}, {selectedOrder.deliveryState}{" "}
                    {selectedOrder.deliveryPostcode}, {selectedOrder.deliveryCountry}
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <p className="rounded-lg bg-muted px-4 py-3 text-sm">备注：{selectedOrder.notes}</p>
              )}

              <Separator />

              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3 text-sm">
                    <div className="space-y-1">
                      <div>
                        {item.product.name} × {item.quantity}
                      </div>
                      {item.scheduledStart && item.scheduledEnd && (
                        <div className="text-xs text-muted-foreground">
                          预约日期：{formatDateTime(item.scheduledStart)} · 时段：
                          {formatTime(item.scheduledStart)} - {formatTime(item.scheduledEnd)}
                        </div>
                      )}
                    </div>
                    <span className="whitespace-nowrap font-medium">
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
                下单时间：{new Date(selectedOrder.createdAt).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
