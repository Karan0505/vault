# 0005 — Impossible variant combinations are disabled controls, not 404s

## Status
Accepted — Phase 1

## Context
A product with Size crossed with Colour doesn't necessarily stock
every cell of that matrix — Rust might only come in S/M. The naive
implementation lets the shopper pick any value in any dimension, tries
to resolve a variant on selection, and 404s (or shows a broken "add to
cart") when the combination doesn't exist. That's a dead end discovered
after the click, which the brief calls out by name as the wrong
answer.

## Decision
`getSelectableValues()` in `src/lib/variants.ts` computes, for each
option dimension not yet chosen, which values still lead to at least
one enabled variant given the rest of the current selection. The
`VariantSelector` component (`src/components/product/VariantSelector.tsx`)
uses this to render every value in every dimension, but visually
disables (with `disabled` + a strike-through style, not `display:
none`, so the shopper can see what doesn't exist and why) any value
that wouldn't resolve.

Selection state lives in the URL (`?size=m&colour=rust`) via
`useSearchParams`/`router.replace`, so a specific selection is
addressable and shareable, matching the "variant selection is URL
addressable and shareable" done-criterion.

## Consequences
- The selector needs the full (enabled) variant list up front to
  compute selectability, not just the currently resolved variant — this
  is a small, bounded payload (one product's variants) so it's fetched
  once with the page rather than round-tripped per click.
- Disabling rather than hiding means the shopper sees the gap in the
  matrix (crossed-out "Rust / L") instead of wondering why a colour
  vanished — this is a deliberate UX choice, not just a technical one.
- The same `getSelectableValues`/`findVariant` functions are pure and
  unit-testable without a browser or a database, since they only take
  arrays of `{ id, options, isEnabled }`.
