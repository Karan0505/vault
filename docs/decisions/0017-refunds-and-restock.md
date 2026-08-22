# 0017 — Refunds are itemized, restock is always an explicit parameter, and only a full refund flips order status

## Status
Accepted — Phase 4

## Context
The brief is specific: "Refunds through Stripe, full and partial, with
the restock decision handled explicitly rather than implied." Three
separate design questions hide in that sentence: how a partial refund's
dollar amount is computed without either shorting the customer or
double-refunding a line across multiple partial refunds; whether
restocking should ever be inferred from something else (the refund
reason, whether it's a full refund) rather than asked; and what a
partial refund does to the order's own status.

## Decision

**Amount, per unit, exactly once.** `createItemizedRefund()`
(`src/lib/refunds.server.ts`) computes each line's per-unit refund
amount with `splitEvenly(orderItem.lineTotal, orderItem.quantity)` —
the same function and the same remainder-distribution Phase 2 used for
discount rounding (ADR 0002 lineage). That produces an array of
per-unit shares that sums exactly to the line's total. A refund
request for a line slices that array starting at
`orderItem.refundedQuantity` (how many units of this line were already
refunded by *previous* calls) for the requested quantity. Three
one-unit refunds on a five-unit line each take a different, non-
overlapping slice of the same precomputed array — so no matter how many
separate partial refunds happen over the life of an order, refunding
every unit of a line sums to exactly its `lineTotal`, never a cent more
or less, regardless of where the discount's own remainder cent landed
when the order was placed.

**Restock is a required boolean, always.** `createItemizedRefund`'s
`restock` parameter has no default value in its type — TypeScript
requires it at every call site. There is no branch anywhere that
infers "customer says item was damaged, so probably don't restock" or
"full refund, so probably do." The one exception is the *goodwill*
refund path (`createGoodwillRefund`, no itemized lines) — restock is
hardcoded `false` there because there's no item list for an explicit
choice to apply to; that's not an inference, it's the only value that
makes sense with nothing to restock.

**Order status only moves to `refunded` on a full refund.** Both
refund functions sum this refund's amount against every prior refund
on the order (`order.refunds` totals) and only call
`assertTransition(order.status, "refunded")` when that cumulative total
reaches `order.totalAmount`. A $10 refund on a $200 order leaves the
order `paid`/`fulfilled`/`delivered` — flipping the whole order to
`refunded` on a small partial refund would misrepresent an order that's
still substantially fulfilled and paid for.

## Consequences
- Restocking runs through `adjustStockInTx` (see ADR 0007's locking
  pattern) **inside the same transaction as the refund record**, not
  as an independent side effect — this was an actual bug caught and
  fixed during this phase's implementation: an earlier version of
  `adjustStock` opened its own nested transaction, which meant a
  restock could commit even if the surrounding refund transaction
  later rolled back. `adjustStockInTx` takes an ambient transaction
  instead, closing that gap.
- The `Refund` → `RefundLineItem` relationship makes every itemized
  refund's restock decision traceable to specific variants and
  quantities — the audit log entry for a refund (`action: "refund"`)
  records the items and the restock flag together, not just a total
  dollar amount.
- A goodwill refund can't restock by construction, which is a real
  limitation if a future need arises for "refund this specific item
  AND also don't restock it AND also refund an extra $5 for
  inconvenience" in one action — that's two calls (an itemized refund
  with `restock: false`, then a goodwill refund for the extra amount)
  rather than one, which is an acceptable seam for now.
