# 0003 — Tag-based ISR revalidation, never `revalidatePath("/")`

## Status
Accepted — Phase 1

## Context
Storefront pages need to be cached aggressively (they're read far more
than they're written) but correct within seconds of an admin edit. The
lazy fix — `revalidatePath("/")` or a blanket `revalidate: 60` — either
busts far more than necessary (every category and every product,
on every edit, anywhere) or leaves stale pages up for up to a minute.
Neither survives the brief's explicit test: "editing a price in admin
updates the storefront within seconds... without busting unrelated
pages."

## Decision
Every storefront read that touches product/category/collection data
runs inside `unstable_cache` tagged with the narrowest tag that
describes it (`src/lib/revalidate.ts`):

- `product:<slug>` — that product's own page
- `category:<slug>` — that category's listing page
- `collection:<slug>` — a collection listing page
- `product-list` — the generic tag every listing page also carries, so
  a price change on a listed product busts the grid it appears in
  without guessing which listing pages reference it

`revalidateProduct()` is the single function admin mutations call. It
takes the product's slug, category slug, and collection slugs, and
invalidates exactly those tags — nothing else. `products.server.ts`
calls it from `createProduct`, `updateProduct` (for **both** the old
and new slug/category, so a slug or category change doesn't leave a
stale page under the old key), and `deleteProduct`.

## Consequences
- Prisma reads aren't covered by Next's built-in `fetch` cache, so the
  tagged reads are wrapped in `unstable_cache` explicitly rather than
  relying on `fetch` tagging — this is why `getProductBySlugForStorefront`
  and `getCategoryWithProducts` look the way they do.
- A category rename doesn't need to walk every product in it — the
  category page itself is tagged, and each product page is tagged
  independently. Only a category *deletion or product move* needs both
  tags invalidated, which `revalidateProduct` already does by taking
  the category slug as a parameter.
- The generic `/api/revalidate` route exists for out-of-process callers
  (a future CMS webhook) that only know a tag name — admin mutations
  never need it, they call the typed helpers directly.
