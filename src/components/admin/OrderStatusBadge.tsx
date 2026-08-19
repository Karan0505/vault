import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/Badge";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

const STATUS_TONE: Record<OrderStatus, "green" | "amber" | "red" | "neutral" | "blue"> = {
  pending: "amber",
  paid: "green",
  fulfilled: "blue",
  delivered: "green",
  cancelled: "neutral",
  refunded: "red",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ORDER_STATUS_LABEL[status]}</Badge>;
}

