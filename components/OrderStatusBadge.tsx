import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  VERIFYING: {
    label: "未支付",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  PROCESSING: {
    label: "处理中",
    className: "bg-blue-100 text-blue-800 border-blue-200",
  },
  SHIPPED: {
    label: "已送货",
    className: "bg-indigo-100 text-indigo-800 border-indigo-200",
  },
  RECEIVED: {
    label: "已收获",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  CANCELLED: {
    label: "已取消",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  REFUND: {
    label: "已退款",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = statusConfig[status] ?? statusConfig.VERIFYING;

  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}
