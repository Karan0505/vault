# 0002 — Money as integer minor units, currency always explicit

## Status
Accepted — Phase 1 (binding for every phase after it)

## Context
Floating point cannot represent most decimal currency amounts exactly
(`0.1 + 0.2 !== 0.3`). A `Float` price column will eventually produce a
total that's off by a cent, silently, under load, in a way that's
nearly impossible to reproduce from a bug report. This is exactly the
kind of subtle-under-scale bug the brief calls out.

## Decision
Every monetary amount in the system — `ProductVariant.priceAmount`,
`PriceListEntry.amount`, and everything downstream in later phases
(cart totals, discounts, tax, refunds) — is stored and computed as an
**integer** in the currency's minor unit (cents for USD, pence for
GBP), never a float or a decimal type. Currency is a separate, explicit
column next to every amount; nothing assumes USD.

`src/lib/money.ts` is the single place formatting and arithmetic
happen: `formatMoney` for display, `assertIntegerMinorUnits` as a
guard other code can call, `splitEvenly` for the largest-remainder
split that discount/refund allocation will need starting Phase 2.

## Consequences
- Admin enters `4999` to mean $49.99, not `49.99`. The variant matrix
  editor's price field is explicitly labelled "minor units" for this
  reason — it's a deliberate rough edge in the UI in exchange for a
  data layer with no rounding ambiguity.
- Any code path that would coerce a price to a JS `number` used as a
  fraction (`price * 0.9` for a 10% discount) must round back to an
  integer through `splitEvenly` or equivalent — never truncate ad hoc.
  This becomes load-bearing in Phase 2 when discounts are computed
  server-side.
- Zero-decimal currencies (JPY) are handled by `MINOR_UNIT_EXPONENT` in
  `money.ts` rather than assuming 2 decimal places everywhere.
