import { splitProportionally } from "@/lib/payments/money";

export type DiscountType = "percentage" | "fixed_amount" | "free_shipping";

export interface DiscountRules {
  type: DiscountType;
  value: number; // percentage: 0-100. fixed_amount: integer minor units. ignored for free_shipping.
  minimumSpend: number | null;
  startsAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export interface CartLineForDiscount {
  variantId: string;
  unitAmount: number;
  quantity: number;
}

export type DiscountIneligibleReason =
  | "inactive"
  | "not_started"
  | "expired"
  | "below_minimum_spend";

export interface DiscountResult {
  eligible: boolean;
  reason?: DiscountIneligibleReason;
  /** Discount amount per line, same order/length as the input lines. Always sums to totalDiscount. */
  perLineDiscount: number[];
  totalDiscount: number;
  freeShipping: boolean;
}

function subtotalOf(lines: readonly CartLineForDiscount[]): number {
  return lines.reduce((sum, line) => sum + line.unitAmount * line.quantity, 0);
}

/**
 * Computes a discount's effect on a cart, purely from cart lines and the
 * discount's own rules — no database, no client-supplied amount is ever
 * an input here. A percentage or fixed-amount discount is distributed
 * across lines by each line's share of the subtotal
 * (splitProportionally), so the remainder cent lands deterministically
 * instead of being dropped or double-counted.
 */
export function computeDiscount(
  lines: readonly CartLineForDiscount[],
  discount: DiscountRules,
  now: Date = new Date()
): DiscountResult {
  const ineligible = (reason: DiscountIneligibleReason): DiscountResult => ({
    eligible: false,
    reason,
    perLineDiscount: lines.map(() => 0),
    totalDiscount: 0,
    freeShipping: false,
  });

  if (!discount.isActive) return ineligible("inactive");
  if (discount.startsAt && now < discount.startsAt) return ineligible("not_started");
  if (discount.expiresAt && now > discount.expiresAt) return ineligible("expired");

  const subtotal = subtotalOf(lines);
  if (discount.minimumSpend !== null && subtotal < discount.minimumSpend) {
    return ineligible("below_minimum_spend");
  }

  if (discount.type === "free_shipping") {
    return {
      eligible: true,
      perLineDiscount: lines.map(() => 0),
      totalDiscount: 0,
      freeShipping: true,
    };
  }

  const weights = lines.map((line) => line.unitAmount * line.quantity);

  const rawTotal =
    discount.type === "percentage"
      ? Math.round((subtotal * discount.value) / 100)
      : Math.min(discount.value, subtotal); // fixed amount never exceeds the subtotal it's applied to

  const perLineDiscount = splitProportionally(rawTotal, weights);
  const totalDiscount = perLineDiscount.reduce((sum, d) => sum + d, 0);

  return { eligible: true, perLineDiscount, totalDiscount, freeShipping: false };
}
