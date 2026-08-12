# 0011 — Discount code usage limit enforcement via `SELECT ... FOR UPDATE`

## Status
Accepted — Phase 2

## Context
When a promotional discount code specifies a usage limit (`usageLimit`) or per-customer limit (`perCustomerLimit`), multiple shoppers may enter checkout simultaneously using the same code.

`applyDiscountCode()` in `src/lib/discounts.server.ts` performs a pre-checkout count check to provide fail-fast UX feedback in the cart. However, because checkout creation involves asynchronous steps (such as inventory reservation and Stripe PaymentIntent creation) before the final database order is created, performing count checks prior to the transaction leaves a concurrency race window. If twenty parallel checkouts race for a discount code with `usageLimit: 1`, a naive read-then-write check permits multiple checkouts to pass the pre-check before any `DiscountRedemption` row is committed.

Like the inventory reservation problem documented in [0007-inventory-reservation-locking.md](file:///c:/Users/PCS/Desktop/vault-phase1/vault-phase1/docs/decisions/0007-inventory-reservation-locking.md), usage limit enforcement requires a concurrency guarantee under high traffic.

## Decision
Inside the order creation transaction in `createCheckoutSession()` (`src/lib/orders.server.ts`), we acquire a pessimistic row lock on the discount using `SELECT ... FOR UPDATE` via `verifyAndLockDiscount(tx, discountId, validUserId)` in `src/lib/discounts.server.ts`.

Under the protection of this lock, the transaction re-counts total redemptions (`tx.discountRedemption.count`) and per-customer redemptions before creating the `Order` and `DiscountRedemption` records.

If the limit is reached or exceeded when the lock is acquired, `verifyAndLockDiscount` throws `DiscountUsageLimitError`. The transaction aborts, and the outer `catch` block in `createCheckoutSession()` releases any stock reservations (`releaseReservations`) previously held for that checkout attempt.

## Consequences
- **Zero Over-Redemption**: Even under high concurrency, exactly `usageLimit` redemptions succeed; all exceeding concurrent checkouts fail cleanly with `DiscountUsageLimitError`.
- **Clean Failure Mode & Stock Protection**: Checkouts that lose the race fail cleanly. Their inventory holds are automatically released, preventing unfulfilled stock locks.
- **Minimal Lock Contention**: The lock on `discounts` is acquired only inside the quick database transaction that writes the `Order` and `DiscountRedemption`, *after* stock reservation and *after* network calls to Stripe. Checkouts using different discount codes (or no discount code) never serialize against each other.
- **Fail-Fast UX Preserved**: Cart-level evaluation (`applyDiscountCode()`) continues to provide instant UI feedback without holding long-lived DB locks during browsing.
