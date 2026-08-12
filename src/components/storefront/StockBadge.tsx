import { Badge } from "@/components/ui/Badge";

interface StockBadgeProps {
  onHand: number;
  lowStockThreshold: number;
}

export function StockBadge({ onHand, lowStockThreshold }: StockBadgeProps) {
  const threshold = Math.max(5, lowStockThreshold);
  if (onHand <= 0) {
    return <Badge tone="red">Out of stock</Badge>;
  }
  if (onHand <= threshold) {
    return <Badge tone="amber">Only {onHand} left</Badge>;
  }
  return <Badge tone="green">In stock</Badge>;
}
