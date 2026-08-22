export type OrderStatus = "pending" | "paid" | "fulfilled" | "delivered" | "cancelled" | "refunded" | "failed";

/**
 * The full legal-transition table. Anything not listed here is illegal —
 * including transitions that "should obviously be fine" like paid ->
 * pending. If a transition needs to exist, it gets added here first, not
 * inferred from whatever the UI happens to allow.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "cancelled", "failed"],
  paid: ["fulfilled", "cancelled", "refunded", "failed"],
  fulfilled: ["delivered", "refunded"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
  failed: ["refunded"],
};

export class IllegalOrderTransitionError extends Error {
  constructor(public readonly from: OrderStatus, public readonly to: OrderStatus) {
    super(`Illegal order transition: ${from} -> ${to}`);
    this.name = "IllegalOrderTransitionError";
  }
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Throws IllegalOrderTransitionError if the transition isn't in the table. Callers apply the transition themselves after this passes. */
export function assertTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransition(from, to)) {
    throw new IllegalOrderTransitionError(from, to);
  }
}

export function isTerminal(status: OrderStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

/** Human labels for the storefront order-tracking page and admin order list. */
export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  failed: "Failed",
};
