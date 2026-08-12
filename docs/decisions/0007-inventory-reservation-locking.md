# 0007 — Inventory reservation via `SELECT ... FOR UPDATE`, not an optimistic version column

## Status
Accepted — Phase 2

## Context
The brief poses this directly: twenty parallel checkouts against one
unit of stock, exactly one must succeed, nineteen get a clean specific
error, zero oversell — and asks for either row-level pessimistic
locking or an optimistic version column, with an explanation of the
cost.

`InventoryItem` already has both a `reserved` counter and a `version`
column (added in Phase 1 specifically so this choice wouldn't need a
migration either way). The two approaches:

- **Optimistic** (the `version` column): read `reserved`, compute the
  new value in application code, `UPDATE ... WHERE id = ? AND version =
  ?`. If zero rows update, someone else won the race — retry from the
  read. Cheap when contention is rare (no lock held while application
  code runs), but under real contention on one popular variant, most
  attempts fail their `WHERE version = ?` check and have to retry,
  and retries under high concurrency can degrade towards a thundering
  herd rather than converging quickly.
- **Pessimistic** (`SELECT ... FOR UPDATE`): lock the row for the
  duration of the transaction. Every concurrent transaction against the
  same variant queues behind the lock instead of racing and retrying —
  serialized, not contended.

## Decision
`reserveStock()` in `src/lib/inventory.server.ts` uses `SELECT ... FOR
UPDATE`. For this specific access pattern — many simultaneous attempts
to buy the *same, often low-stock* variant, which is exactly when it
matters most that the answer be right — pessimistic locking turns a
race with a wrong-answer failure mode (naive read-then-write) or a
retry-storm failure mode (naive optimistic locking without backoff)
into a queue with a correct, bounded failure mode: everyone gets an
answer, in lock-acquisition order, and the answer is always right.

Concretely: the transaction locks the `inventory_items` row for this
variant, sweeps any of its expired reservations (crediting their
quantity back) while still holding the lock, re-reads `reserved`, and
only then decides whether this request's quantity fits — all before
releasing the lock. No other transaction can see or act on a stale
`reserved` value in between.

## Consequences
- **The cost, named directly**: throughput on a single hot variant is
  serialized to roughly one reservation attempt at a time — the
  twenty-first buyer of a chronically popular, chronically low-stock
  item waits behind the other twenty, they don't fail fast and
  independently the way optimistic retries would let them. For this
  system that's the right trade: a flash-sale item selling out is
  exactly the moment correctness matters more than throughput, and the
  lock is held only for a few small, indexed statements — not for
  network calls to Stripe, which happen after reservation succeeds and
  outside this lock entirely.
- Contention on *different* variants doesn't serialize against each
  other at all — the lock is per-row, so a rush on Product A doesn't
  slow down checkouts for Product B.
- The `version` column stays in the schema unused by this path. It's
  not dead weight: `PriceListEntry` and future per-variant optimistic
  paths (e.g. a lower-stakes admin stock adjustment that doesn't need
  to queue behind a lock) can use it without a migration.
- `tests/concurrency/oversell.test.ts` is the test the brief asks for,
  run against a real Postgres in CI (see `.github/workflows/ci.yml`) —
  this can't be verified against a mocked database, since the property
  under test is what Postgres's row lock actually does under real
  concurrent transactions.
