# 0012 — Facet counts, and one verified by hand against SQL

## Status
Accepted — Phase 3

## Context
The brief is specific about the failure mode it's worried about: "the
number next to 'Blue' reflects the other filters currently applied...
most implementations get it wrong," and separately requires verifying
one facet count combination by hand against SQL.

The wrong version of this is a facet query that either (a) ignores the
other active filters entirely (a Colour facet that always shows global
counts, so "Blue (47)" stays 47 even after you've filtered down to a
category with three blue items in it), or (b) accidentally includes
the facet's *own* filter in its own count query (so selecting "Blue"
collapses every other colour's count to 0, because the query is now
also filtering by the colour it's trying to count options for).

## Decision
Every facet query and the main result-set query in
`src/lib/search.server.ts` are built from the exact same function,
`buildConditions(filters, exclude)`. The main query calls it with an
empty exclude set (every active filter applies). Each facet calls it
with exactly its own dimension excluded — the size facet excludes
`"size"` but keeps category, price, colour, in-stock, and the search
term active; the colour facet excludes `"colour"` but keeps everything
else. There's no separate code path per facet that could drift from
this rule — get it right once, in one function, and every facet
inherits it.

## Worked example, verified by hand

Using the seeded catalogue (`prisma/seed.ts`) — the "Merino Watch Cap"
product (category **Accessories**, Colour-only, no Size dimension) has
three variants, seeded with `onHand = [0, 2, 4, 12, 20][index % 5]` at
matrix indices 0, 1, 2:

| Colour   | index | onHand |
|----------|-------|--------|
| Charcoal | 0     | 0      |
| Oat      | 1     | 2      |
| Rust     | 2     | 4      |

The **Accessories** category has two products: Merino Watch Cap
(Colour only, no `Size` key) and Waxed Canvas Belt (`Size` only, no
`Colour` key). So under `category = accessories`, the Colour facet —
which requires `v.options->>'Colour' IS NOT NULL` — only ever sees
Merino Watch Cap's three variants; Waxed Canvas Belt's variants are
excluded by that `IS NOT NULL`, not by anything colour-specific.

**Query 1 — filters: `{ categorySlug: "accessories" }`, computing the
Colour facet (excludes `"colour"` only):**

```sql
SELECT (v.options->>'Colour') AS value, COUNT(DISTINCT p.id)::int AS count
FROM "products" p
JOIN "product_variants" v ON v."productId" = p.id AND v."isEnabled" = true
LEFT JOIN "inventory_items" i ON i."variantId" = v.id
LEFT JOIN "categories" c ON c.id = p."categoryId"
WHERE p.status = 'active'
  AND c.slug = 'accessories'
  AND v.options->>'Colour' IS NOT NULL
GROUP BY v.options->>'Colour'
```

Traced by hand: three variant rows survive the WHERE clause (Merino
Watch Cap's three colours; Waxed Canvas Belt contributes zero rows
since its `options->>'Colour'` is NULL). Each colour appears on exactly
one product, so:

**Result: Charcoal → 1, Oat → 1, Rust → 1.**

**Query 2 — filters: `{ categorySlug: "accessories", inStockOnly: true
}`, same Colour facet (still excludes only `"colour"`, but now also
applies the in-stock condition since it wasn't the excluded
dimension):**

```sql
-- same query, with this line added to the WHERE clause:
  AND (i."onHand" - COALESCE(i.reserved, 0)) > 0
```

Traced by hand against the table above: Charcoal's only variant has
`onHand = 0`, so `0 - 0 > 0` is false — that row is dropped, and
Charcoal has zero surviving rows, so it **disappears from the GROUP BY
entirely** (`getFacets` fills it back in as `count: 0` when merging
against the full `PRICE_BUCKETS`-style fixed list — Colour has no
fixed list, so a colour with zero count simply doesn't appear as a
facet option, which is the correct behaviour: don't offer a filter that
would produce an empty result). Oat (`onHand = 2`) and Rust
(`onHand = 4`) both pass.

**Result: Oat → 1, Rust → 1, Charcoal → absent (0).**

That's the property the brief is checking for, demonstrated
concretely: ticking "In stock only" changed the Colour facet's counts
— specifically dropped Charcoal — without anyone touching the Colour
facet's own query logic. The in-stock filter did that because it's one
of the "other filters currently applied" that `buildConditions` keeps
active for every facet except its own.

## Consequences
- A facet dimension with zero remaining options under the current
  filters (colours, sizes) simply doesn't render a row — see
  `FacetSidebar`'s `facets.sizes.length > 0` / `facets.colours.length >
  0` guards. Price buckets and category are shown even at zero count
  (greyed out, unclickable) since those lists are fixed and losing a
  bucket from view entirely would be more confusing than showing it
  disabled.
- Category and Availability facets are semantically "a product can be
  in more than one state" in a subtler way than Size/Colour: a product
  with one in-stock and one out-of-stock variant contributes to both
  the in-stock and out-of-stock counts (see the `stock` facet's own
  note in `search.server.ts`). That's intentional — a shopper filtering
  "in stock only" wants any product with *at least one* available
  option, and the count reflects that.
