"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
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
  staffShopId?: string | null;
};

const STATUS_OPTIONS: OrderStatus[] = [
  "VERIFYING",
  "PROCESSING",
  "SHIPPED",
  "RECEIVED",
  "CANCELLED",
];

const STATUS_LABELS: Record<string, string> = {
  ALL: "全部",
  VERIFYING: "验证中",
  PROCESSING: "处理中",
  SHIPPED: "已发货",
  RECEIVED: "已收货",
  CANCELLED: "已取消",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  QR: "扫码付款",
  BANK_TRANSFER: "银行转账",
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

function isLikelyImageUrl(value?: string | null) {
  if (!value) return false;
  return /\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(value);
}

function buildStatusMessage(order: Order, nextStatus?: string) {
  const status = nextStatus ?? order.status;

  switch (status) {
    case "VERIFYING":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 正在验证付款中。`,
        "验证完成后我们会尽快为您处理。",
      ].join("\n");
    case "PROCESSING":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 已进入处理中。`,
        "我们正在联系店铺安排出货。",
      ].join("\n");
    case "SHIPPED":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 已发货。`,
        "收到商品后可在订单页确认收货。",
      ].join("\n");
    case "RECEIVED":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `您的订单 #${order.id.slice(-8).toUpperCase()} 已完成收货。`,
        "感谢您的支持。",
      ].join("\n");
    case "CANCELLED":
      return [
        `您好，${order.customerName ?? "顾客"}，`,
        `很抱歉，您的订单 #${order.id.slice(-8).toUpperCase()} 已取消。`,
        "如需协助，请直接联系平台客服。",
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
  const text = encodeURIComponent(buildStatusMessage(order, nextStatus));
  return `https://wa.me/${cleanPhone}?text=${text}`;
}

function buildDirectWhatsAppLink(phone: string, text?: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  const encoded = text ? `?text=${encodeURIComponent(text)}` : "";
  return `https://wa.me/${cleanPhone}${encoded}`;
}

export default function StaffOrdersTab() {
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
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

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("加载订单失败");
    }

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
    void loadOrders();
  }, [loadOrders]);

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

    if (socket.connected) {
      joinRoom();
    }

    socket.on(SOCKET_EVENTS.CONNECT, joinRoom);
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));
    socket.on(SOCKET_EVENTS.NEW_ORDER, (order: Order) => {
      toast.success(`收到新订单：${order.customerName ?? "顾客"}`);
      setOrders((prev) => [order, ...prev]);
    });
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, (updated: Order) => {
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
      setSelectedOrder((prev) => (prev?.id === updated.id ? updated : prev));
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, joinRoom);
      socket.off(SOCKET_EVENTS.DISCONNECT);
      socket.off(SOCKET_EVENTS.NEW_ORDER);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED);
    };
  }, [currentUser?.role, currentUser?.staffShopId]);

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
      setSelectedOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));

      toast.success("订单状态已更新");

      if (updatedOrder.customerPhone) {
        window.open(
          buildWhatsAppLink(updatedOrder.customerPhone, updatedOrder, newStatus),
          "_blank",
        );
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
    verifying: orders.filter((order) => order.status === "VERIFYING").length,
    processing: orders.filter((order) => order.status === "PROCESSING").length,
    shipped: orders.filter((order) => order.status === "SHIPPED").length,
  };

  const cleanedTelegram =
    selectedOrder?.telegramUsername?.trim().replace(/^@+/, "") ?? "";
  const cleanedShopTelegram =
    selectedOrder?.shop?.telegramUsername?.trim().replace(/^@+/, "") ?? "";

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

        <Button variant="outline" size="sm" onClick={() => void loadOrders()} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> 刷新
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "总订单数", value: stats.total, color: "text-foreground" },
          { label: "验证中", value: stats.verifying, color: "text-amber-600" },
          { label: "处理中", value: stats.processing, color: "text-blue-600" },
          { label: "已发货", value: stats.shipped, color: "text-indigo-600" },
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

                      {order.paymentMethod && (
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          付款方式：
                          {PAYMENT_METHOD_LABELS[order.paymentMethod] ?? order.paymentMethod}
                          {order.paymentReceiptUrl ? " · 已上传凭证" : ""}
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
                        onValueChange={(value) => void updateStatus(order.id, value as OrderStatus)}
                        disabled={
                          updatingId === order.id ||
                          order.status === "CANCELLED" ||
                          order.status === "RECEIVED"
                        }
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
                    联系顾客 WhatsApp：{selectedOrder.customerPhone}
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
                    联系顾客 Telegram：@{cleanedTelegram}
                  </a>
                )}

                {selectedOrder.shop?.whatsappPhone && (
                  <a
                    href={buildDirectWhatsAppLink(
                      selectedOrder.shop.whatsappPhone,
                      `您好，这里是万事通工作人员，关于订单 ${selectedOrder.id} 需要和您确认。`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    联系店铺 WhatsApp：{selectedOrder.shop.whatsappPhone}
                  </a>
                )}

                {cleanedShopTelegram && (
                  <a
                    href={`https://t.me/${cleanedShopTelegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-sky-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    联系店铺 Telegram：@{cleanedShopTelegram}
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

              {(selectedOrder.paymentMethod || selectedOrder.paymentReceiptUrl) && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    付款信息
                  </p>

                  {selectedOrder.paymentMethod && (
                    <p className="text-sm">
                      付款方式：
                      <span className="ml-1 font-medium">
                        {PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] ??
                          selectedOrder.paymentMethod}
                      </span>
                    </p>
                  )}

                  {selectedOrder.paymentReceiptUploadedAt && (
                    <p className="text-sm text-muted-foreground">
                      上传时间：{formatDateTime(selectedOrder.paymentReceiptUploadedAt)}
                    </p>
                  )}

                  {selectedOrder.paymentReceiptUrl && (
                    <div className="space-y-3">
                      <a
                        href={selectedOrder.paymentReceiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-sky-600 hover:underline"
                      >
                        <ExternalLink className="h-4 w-4" />
                        查看付款凭证
                      </a>

                      {isLikelyImageUrl(selectedOrder.paymentReceiptUrl) && (
                        <div className="overflow-hidden rounded-xl border bg-white">
                          <img
                            src={selectedOrder.paymentReceiptUrl}
                            alt="付款凭证"
                            className="max-h-80 w-full object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
