import { Badge } from "@/components/ui/Badge";

interface StockBadgeProps {
  onHand: number;
  lowStockThreshold?: number;
}

export function StockBadge({ onHand }: StockBadgeProps) {
  if (onHand <= 0) {
    return <Badge tone="red">OUT OF STOCK</Badge>;
  }
  if (onHand <= 5) {
    return <Badge tone="amber">LOW STOCK · {onHand} LEFT</Badge>;
  }
  return <Badge tone="green">IN STOCK</Badge>;
}
