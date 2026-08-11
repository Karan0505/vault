# 0001 — Variant options stored as JSON, not a normalized option-value table

## Status
Accepted — Phase 1

## Context
A `ProductVariant` needs to represent a point in an option matrix, e.g.
`{ Size: "M", Colour: "Indigo" }`. The conventional normalized approach
is three tables: `Option` (Size, Colour), `OptionValue` (S/M/L,
Indigo/Rust), and a join table linking values to variants. That shape
pays off when you need to query *across* the option system — "show me
every product that has a Colour option" — independent of any one
product.

Phase 1 doesn't need that. It needs to: generate a matrix from a
product's declared dimensions, render a selector, and disable
combinations that don't exist. All three are pure functions over an
in-memory list of `{ id, options, isEnabled }` once the variants are
loaded — see `src/lib/variants.ts`.

## Decision
`ProductVariant.options` is a `Json` column: `Record<string, string>`,
keyed by the names in `Product.optionNames`. A single indexed lookup
(`WHERE productId = ?`) loads everything the matrix logic needs; there
is no join.

## Consequences
- Adding an option dimension is a product-level edit (`optionNames`
  gains an entry), not a migration.
- Uniqueness of a combination is enforced in `assertVariantsMatchOptions`
  (application layer) rather than a composite unique constraint, because
  Postgres can't uniquely constrain across dynamic JSON keys cleanly.
  The `sku` column carries the real uniqueness guarantee instead.
- If a later phase needs cross-product option analytics ("which colours
  sell best across the whole catalogue"), that's a real reason to
  revisit this and introduce a normalized `OptionValue` table alongside
  the JSON — not a reason to block Phase 1 on it now.
