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
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type { Order, OrderStatus } from "@/types";

type SessionUser = {
  role?: string;
  staffShopId?: string | null;
};

const SELLER_STATUS_OPTIONS = [
  { value: "VERIFYING", label: "未支付" },
  { value: "PROCESSING", label: "处理中" },
  { value: "SHIPPED", label: "已送货" },
  { value: "CANCELLED", label: "已取消" },
  { value: "REFUND", label: "已退款" },
] satisfies Array<{ value: OrderStatus; label: string }>;

function buildWhatsAppLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function buildTelegramLink(username: string) {
  return `https://t.me/${username.replace(/^@+/, "")}`;
}

function getCustomerContact(order: Order) {
  if (order.preferredContactChannel === "TELEGRAM" && order.telegramUsername) {
    return {
      href: buildTelegramLink(order.telegramUsername),
      label: "Telegram",
      Icon: Send,
      className: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    };
  }

  if (order.customerPhone) {
    return {
      href: buildWhatsAppLink(order.customerPhone),
      label: "WhatsApp",
      Icon: MessageCircle,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    };
  }

  return null;
}

export default function StaffOrdersTab() {
  const { data: session } = useSession();
  const currentUser = session?.user as SessionUser | undefined;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 6;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/staff/shop/orders", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("加载订单失败");
      }
      setOrders((await res.json()) as Order[]);
    } catch {
      toast.error("加载订单失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const socket = getSocket();

    const joinRoom = () => {
      const role = String(currentUser?.role ?? "").toUpperCase();
      if (role === "STAFF" && currentUser?.staffShopId) {
        socket.emit("join_shop_staff", currentUser.staffShopId);
      }
      setConnected(true);
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on(SOCKET_EVENTS.CONNECT, joinRoom);
    socket.on(SOCKET_EVENTS.DISCONNECT, () => setConnected(false));
    socket.on(SOCKET_EVENTS.ORDER_UPDATED, (updated: Order) => {
      setOrders((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setSelectedOrder((prev) => (prev?.id === updated.id ? updated : prev));
    });
    socket.on(SOCKET_EVENTS.NEW_ORDER, (created: Order) => {
      setOrders((prev) =>
        prev.some((item) => item.id === created.id) ? prev : [created, ...prev],
      );
      toast.success("收到新订单");
    });

    return () => {
      socket.off(SOCKET_EVENTS.CONNECT, joinRoom);
      socket.off(SOCKET_EVENTS.DISCONNECT);
      socket.off(SOCKET_EVENTS.ORDER_UPDATED);
      socket.off(SOCKET_EVENTS.NEW_ORDER);
    };
  }, [currentUser?.role, currentUser?.staffShopId]);

  const filteredOrders = useMemo(() => {
    const keyword = searchOrderId.trim().toLowerCase();
    return orders.filter((order) =>
      keyword ? order.id.toLowerCase().includes(keyword) : true,
    );
  }, [orders, searchOrderId]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [searchOrderId]);

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/staff/shop/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "更新失败");
        return;
      }

      const updated = data as Order;
      setOrders((prev) => prev.map((item) => (item.id === orderId ? updated : item)));
      setSelectedOrder((prev) => (prev?.id === orderId ? updated : prev));
      toast.success("订单状态已更新");
    } catch {
      toast.error("更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

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

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
          <p className="font-medium">暂无派给您的订单</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginatedOrders.map((order) => {
              const contact = getCustomerContact(order);

              return (
                <Card
                  key={order.id}
                  className="cursor-pointer transition-colors hover:border-primary/40"
                  onClick={() => setSelectedOrder(order)}
                >
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{order.customerName ?? "顾客"}</span>
                      <OrderStatusBadge status={order.status} />
                      <span className="rounded-md border px-2 py-1 font-mono text-[10px]">
                        {order.id}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(order.createdAt).toLocaleString("zh-CN")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      电话：{order.customerPhone || "-"}
                    </p>
                    {contact && (
                      <a
                        href={contact.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${contact.className}`}
                      >
                        <contact.Icon className="h-3.5 w-3.5" />
                        {contact.label}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      共 {order.items.length} 项
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    <span className="text-lg font-bold">RM{Number(order.totalAmount).toFixed(2)}</span>
                    {order.status === "RECEIVED" ? (
                      <span className="rounded-lg border bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
                        顾客已收获
                      </span>
                    ) : (
                      <div onClick={(event) => event.stopPropagation()}>
                        <Select
                          value={order.status}
                          onValueChange={(value) =>
                            void updateStatus(order.id, value as OrderStatus)
                          }
                          disabled={
                            updatingId === order.id ||
                            ["CANCELLED", "REFUND"].includes(order.status)
                          }
                        >
                          <SelectTrigger className="h-9 w-32 text-xs">
                            {updatingId === order.id ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SELLER_STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-xs">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                  <p className="font-semibold">{selectedOrder.customerName ?? "顾客"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.customerPhone || "-"}</p>
                  {getCustomerContact(selectedOrder) && (
                    <a
                      href={getCustomerContact(selectedOrder)!.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${getCustomerContact(selectedOrder)!.className}`}
                    >
                      {(() => {
                        const ContactIcon = getCustomerContact(selectedOrder)!.Icon;
                        return <ContactIcon className="h-3.5 w-3.5" />;
                      })()}
                      {getCustomerContact(selectedOrder)!.label}
                    </a>
                  )}
                  <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                    订单 ID：{selectedOrder.id}
                  </p>
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
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
                          预约日期：{new Date(item.scheduledStart).toLocaleDateString("zh-CN")} · 时段：
                          {new Date(item.scheduledStart).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}{" "}
                          -{" "}
                          {new Date(item.scheduledEnd).toLocaleTimeString("zh-CN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
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
