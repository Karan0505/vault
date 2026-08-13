# 0013 — Recommendations ranked by real co-purchase data, with a documented fallback

## Status
Accepted — Phase 3

## Context
The brief's line is direct: "Recommendations built from real order
data, not `ORDER BY random()`." The naive shortcut — four arbitrary
products from the same category, or four random active products — is
exactly what that's ruling out, and it's tempting specifically because
a young catalogue doesn't have much purchase history to work with yet.

## Decision
`getRecommendationsForProduct()` in `src/lib/recommendations.server.ts`
ranks by actual co-purchase count: it joins `order_items` against
itself on `orderId` to find which *other* products have shown up in
the same completed order (`status IN ('paid', 'fulfilled',
'delivered')` — a pending or cancelled order isn't a purchase signal)
as the product being viewed, grouped and ordered by how many distinct
orders contained both. That's "customers who bought this also bought,"
computed from what customers actually did.

**The fallback, named honestly**: a lightly-ordered catalogue won't
always have four co-purchased products for a given item. Rather than
pad the remaining slots with `ORDER BY random()` (or silently show
fewer than four), `bestSellersInCategory()` fills any remaining slots
by ranking the same category's other products by *their own*
completed-order volume — still real order data, just a coarser signal
(popularity within category) than the finer one (bought together with
this specific product) when the finer one runs out. Both queries are
in the same file, both order by a `COUNT(...)` over real rows, neither
ever touches `random()`.

## Consequences
- On a catalogue with little order history (a fresh deployment, or this
  project's own seed data before `orderPairings` was added), most
  recommendations come from the category fallback rather than genuine
  co-purchase — that's expected and is why the seed script
  (`prisma/seed.ts`) includes a handful of deliberately overlapping
  sample orders, so the co-purchase path has something real to rank
  even in a demo environment.
- `RecommendationsRail` renders inside a `Suspense` boundary on a
  Partial-Prerendering-enabled product page (`experimental_ppr = true`)
  — see ADR 0014 — so this query runs per-request without forcing the
  rest of the (otherwise ISR-cached) product page to become dynamic
  too. Recommendations can reflect this morning's orders without
  invalidating the product page's own cache tags.
- If a product has never been ordered and its category is empty or new,
  `getRecommendationsForProduct` can legitimately return an empty
  array — `RecommendationsRail` renders nothing in that case rather
  than forcing four items to exist. An empty rail is honest; a
  random-filled one wouldn't be.
