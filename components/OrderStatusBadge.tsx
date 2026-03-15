import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@/types";

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
  PENDING:    { label: "待处理",  className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  CONFIRMED:  { label: "已确认",  className: "bg-blue-100 text-blue-800 border-blue-200" },
  PROCESSING: { label: "处理中",  className: "bg-purple-100 text-purple-800 border-purple-200" },
  DONE:       { label: "已完成",  className: "bg-green-100 text-green-800 border-green-200" },
  CANCELLED:  { label: "已取消",  className: "bg-red-100 text-red-800 border-red-200" },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const { label, className } = statusConfig[status] ?? statusConfig.PENDING;
  return (
    <Badge variant="outline" className={`text-xs font-medium ${className}`}>
      {label}
    </Badge>
  );
}