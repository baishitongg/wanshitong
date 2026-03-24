"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Clock, Copy, ExternalLink, Loader2, MapPin, ShoppingBag } from "lucide-react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Order } from "@/types";

type FilterStatus =
  | "ALL"
  | "VERIFYING"
  | "PROCESSING"
  | "SHIPPED"
  | "RECEIVED"
  | "CANCELLED";

export default function ProfileOrdersTab() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const ORDERS_PER_PAGE = 6;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders/mine", { cache: "no-store" });
      if (res.ok) {
        setOrders((await res.json()) as Order[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  const normalizeStatus = (status: string) => {
    const s = status.toUpperCase();

    if (s === "PENDING" || s === "CONFIRMED" || s === "VERIFYING" || status === "验证中") {
      return "VERIFYING";
    }
    if (s === "PROCESSING" || status === "处理中") return "PROCESSING";
    if (s === "SHIPPED" || s === "DONE" || status === "已发货") return "SHIPPED";
    if (s === "RECEIVED" || s === "COMPLETED" || status === "已收货") return "RECEIVED";
    if (s === "CANCELLED" || s === "CANCELED" || status === "已取消") return "CANCELLED";

    return s;
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === "ALL") return orders;
    return orders.filter((order) => normalizeStatus(order.status) === statusFilter);
  }, [orders, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));

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

  const handleConfirmReceived = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}/received`, {
        method: "PATCH",
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "确认收货失败");
        return;
      }

      const updatedOrder = data as Order;
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updatedOrder : order)));
      setSelectedOrder((prev) => (prev?.id === orderId ? updatedOrder : prev));
      toast.success("已确认收货");
    } catch {
      toast.error("确认收货失败");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleCopyOrderId = async (orderId: string) => {
    try {
      await navigator.clipboard.writeText(orderId);
      toast.success("订单 ID 已复制");
    } catch {
      toast.error("复制失败，请手动复制");
    }
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">查看您的历史订单</p>

        <div className="flex flex-wrap gap-2">
          {[
            ["ALL", "全部"],
            ["VERIFYING", "验证中"],
            ["PROCESSING", "处理中"],
            ["SHIPPED", "已发货"],
            ["RECEIVED", "已收货"],
            ["CANCELLED", "已取消"],
          ].map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={statusFilter === value ? "default" : "outline"}
              className={statusFilter === value ? "bg-red-700 hover:bg-red-600 text-white" : ""}
              onClick={() => setStatusFilter(value as FilterStatus)}
            >
              {label}
            </Button>
          ))}
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
              {statusFilter === "ALL" ? "去选购您喜欢的商品吧" : "请切换其他筛选条件查看"}
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(event) => {
                            event.stopPropagation();
                            void handleCopyOrderId(order.id);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(order.createdAt).toLocaleString("zh-CN")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        共 {order.items.length} 件商品
                        {order.deliveryCity ? ` · 配送至 ${order.deliveryCity}` : ""}
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
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                  ))}
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

      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>订单详情</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">
                    订单号：#{selectedOrder.id.slice(-8).toUpperCase()}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void handleCopyOrderId(selectedOrder.id)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <OrderStatusBadge status={selectedOrder.status} />
              </div>

              {(selectedOrder.paymentMethod || selectedOrder.paymentReceiptUrl) && (
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    付款信息
                  </p>

                  {selectedOrder.paymentMethod && (
                    <p className="text-sm">
                      付款方式：
                      <span className="ml-1 font-medium">
                        {selectedOrder.paymentMethod === "QR" ? "扫码付款" : "银行转账"}
                      </span>
                    </p>
                  )}

                  {selectedOrder.paymentReceiptUploadedAt && (
                    <p className="text-sm text-muted-foreground">
                      上传时间：
                      {new Date(selectedOrder.paymentReceiptUploadedAt).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
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

                      {/\.(png|jpe?g|webp|gif|bmp|svg)(\?|$)/i.test(selectedOrder.paymentReceiptUrl) && (
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
                    {selectedOrder.deliveryStreet}, {selectedOrder.deliveryCity}, {selectedOrder.deliveryState}{" "}
                    {selectedOrder.deliveryPostcode}, {selectedOrder.deliveryCountry}
                  </p>
                </div>
              )}

              {selectedOrder.notes && (
                <p className="text-sm bg-muted rounded-lg px-4 py-3">备注：{selectedOrder.notes}</p>
              )}

              <Separator />

              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm gap-3">
                    <div className="space-y-1">
                      <span>
                        {item.product.name} × {item.quantity}
                      </span>
                      {item.scheduledStart && item.scheduledEnd && (
                        <p className="text-xs text-muted-foreground">
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
                        </p>
                      )}
                    </div>
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
                下单时间：{new Date(selectedOrder.createdAt).toLocaleString("zh-CN")}
              </p>

              {selectedOrder.status === "SHIPPED" && (
                <Button
                  className="w-full bg-red-700 hover:bg-red-600 text-white"
                  onClick={() => void handleConfirmReceived(selectedOrder.id)}
                  disabled={confirmingId === selectedOrder.id}
                >
                  {confirmingId === selectedOrder.id ? "提交中..." : "确认已收货"}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
