"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import type { Order } from "@/types";

type StaffOption = {
  id: string;
  name: string | null;
  loginId: string;
  shopId: string;
};

type ShopOption = {
  id: string;
  name: string;
  staff: StaffOption[];
};

interface AdminOrdersPanelProps {
  initialOrders: Order[];
  shops: ShopOption[];
}

export default function AdminOrdersPanel({
  initialOrders,
  shops,
}: AdminOrdersPanelProps) {
  const [orders, setOrders] = useState(initialOrders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<Record<string, string>>({});

  const shopStaffMap = useMemo(
    () => Object.fromEntries(shops.map((shop) => [shop.id, shop.staff])),
    [shops],
  );

  const handleAssign = async (orderId: string) => {
    const order = orders.find((item) => item.id === orderId);
    const staffUserId = selectedStaff[orderId];

    if (!order || !staffUserId) {
      toast.error("请先选择要接单的店铺员工");
      return;
    }

    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignedStaffUserId: staffUserId }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "派单失败");
        return;
      }

      const updated = data as Order;
      setOrders((prev) => prev.map((item) => (item.id === orderId ? updated : item)));
      toast.success("已验证付款并派给店铺员工");
    } catch {
      toast.error("派单失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCancel = async (orderId: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "取消失败");
        return;
      }

      const updated = data as Order;
      setOrders((prev) => prev.map((item) => (item.id === orderId ? updated : item)));
      toast.success("订单已取消");
    } catch {
      toast.error("取消失败");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const staffOptions = shopStaffMap[order.shopId] ?? [];
        const isVerifying = order.status === "VERIFYING";

        return (
          <Card key={order.id}>
            <CardContent className="space-y-4 py-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{order.customerName ?? "顾客"}</span>
                    <OrderStatusBadge status={order.status} />
                    <span className="rounded-md border px-2 py-1 font-mono text-xs">
                      {order.id}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    电话：{order.customerPhone || "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    店铺：{order.shop?.name ?? "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    下单时间：{new Date(order.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold">
                    RM{Number(order.totalAmount).toFixed(2)}
                  </div>
                  {order.assignedStaff && (
                    <p className="text-sm text-muted-foreground">
                      已派给：{order.assignedStaff.name || order.assignedStaff.phone}
                    </p>
                  )}
                </div>
              </div>

              {order.deliveryStreet && (
                <div className="rounded-xl bg-muted/50 p-4 text-sm">
                  <div className="font-medium">配送地址</div>
                  <div className="mt-1">
                    {order.deliveryRecipient} {order.deliveryPhone}
                  </div>
                  <div className="text-muted-foreground">
                    {order.deliveryStreet}, {order.deliveryCity}, {order.deliveryState} {order.deliveryPostcode},{" "}
                    {order.deliveryCountry}
                  </div>
                </div>
              )}

              {(order.paymentMethod || order.paymentReceiptUrl) && (
                <div className="rounded-xl bg-muted/50 p-4 text-sm space-y-2">
                  <div className="font-medium">付款信息</div>
                  {order.paymentMethod && (
                    <div>付款方式：{order.paymentMethod === "QR" ? "扫码付款" : "银行转账"}</div>
                  )}
                  {order.paymentReceiptUploadedAt && (
                    <div className="text-muted-foreground">
                      上传时间：{new Date(order.paymentReceiptUploadedAt).toLocaleString("zh-CN")}
                    </div>
                  )}
                  {order.paymentReceiptUrl && (
                    <a
                      href={order.paymentReceiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sky-600 hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      查看付款凭证
                    </a>
                  )}
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="font-medium">订单商品</div>
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.product.name} × {item.quantity}
                    </span>
                    <span>RM{(Number(item.unitPrice) * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {isVerifying && (
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                  <Select
                    value={selectedStaff[order.id] ?? ""}
                    onValueChange={(value) =>
                      setSelectedStaff((prev) => ({ ...prev, [order.id]: value }))
                    }
                  >
                    <SelectTrigger className="w-full lg:w-80">
                      <SelectValue placeholder="选择店铺员工" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffOptions.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          {staff.name || staff.loginId} ({staff.loginId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => void handleAssign(order.id)}
                      disabled={updatingId === order.id}
                      className="cursor-pointer bg-black text-white transition-colors hover:bg-black/90"
                    >
                      {updatingId === order.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      验证通过并派单
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => void handleCancel(order.id)}
                      disabled={updatingId === order.id}
                      className="cursor-pointer"
                    >
                      取消订单
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
