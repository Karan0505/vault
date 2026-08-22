# 0020 — Partial fulfilment tracked per line item; order status derived, never stored as a separate flag

## Status
Accepted — Phase 4

## Context
The brief asks for order fulfilment "with a tracking number, partial
fulfilment." Phase 2's `Order.status` enum has a single `fulfilled`
value — there's no `partially_fulfilled` state, and adding one would
mean either expanding the Phase 2 state machine (revisiting ADR-backed,
already-shipped design) or representing "partially fulfilled" as a
separate boolean that has to be kept in sync with whatever the real
line-item detail says.

## Decision
Fulfilment is tracked at the line-item level:
`OrderItem.fulfilledQuantity`, incremented by each `Fulfillment` (a
shipment, with its own tracking number and the specific
`FulfillmentItem` quantities it covers). An order can have any number
of `Fulfillment` records — one per shipment, supporting a genuinely
partial fulfilment followed later by a second shipment completing the
rest.

Whether the *order* has moved to `fulfilled` is computed fresh, every
time `fulfilOrderItems` runs, by checking whether every `OrderItem` on
the order now has `fulfilledQuantity >= quantity`. There is no
`isPartiallyFulfilled` column anywhere — "partially fulfilled" is just
what it looks like when that check is false but at least one
`Fulfillment` exists, derived at read time (the order detail page)
rather than stored.

## Consequences
- This can never drift: there's no second source of truth for
  "fulfilled" that a bug could leave inconsistent with the actual
  shipment records, because there is only one source of truth (the sum
  of `FulfillmentItem` quantities against each `OrderItem.quantity`).
- The order-level state machine (`lib/orders.ts`, unchanged since Phase
  2) stays exactly as simple as it was — `paid -> fulfilled` is still a
  single transition, it's just that *triggering* it now depends on a
  computed condition instead of firing unconditionally on any
  fulfilment action.
- The shipping notice email (ADR 0019) uses this same computed value
  (`isPartial` in `fulfilOrderItems`'s return) to choose between "your
  order has shipped" and "part of your order has shipped" — the
  customer-facing language and the admin-facing order status are
  reading the same underlying fact, not two independently-maintained
  ones.
- `cancelOrder` deliberately does not participate in this — it's
  restricted to `pending` orders only (see ADR 0017's discussion of why
  a *paid* order's cancellation path is a refund, not a cancel), so
  there's no interaction to define between "partially fulfilled" and
  "cancelled."
