# VAULT — Phase 1 + Phase 2 + Phase 3

A production-shaped commerce storefront and its ops console.
**Phase 1**: catalogue and data model. **Phase 2**: the money path —
cart, inventory reservation, Stripe checkout, order state machine,
discount codes. **Phase 3**: search, discovery, and storefront speed —
faceted search, recommendations, SEO, performance, accessibility.
Fulfilment/refunds/audit-log is Phase 4; see `docs/decisions/` for what's
deliberately deferred and why, phase by phase.

## Stack

Next.js 15 (App Router, Partial Prerendering), TypeScript (`strict`,
`noUncheckedIndexedAccess`, no `any` in `src/`), Postgres + Prisma
(full-text search + `pg_trgm`), Tailwind, Framer Motion, Auth.js v5
(staff roles + customer accounts), Stripe (Payment Intents + webhooks,
test mode), UploadThing (product media), Zod (input validation),
Vitest.

## What's here

```
src/
  app/
    (storefront)/
      search/                                              Phase 3
      cart/, checkout/, checkout/success/, orders/[id]/    Phase 2
      categories/[slug]/, products/[slug]/                 Phase 1 (+ Phase 3: PPR, JSON-LD, OG image)
      account/sign-in/                                     Phase 2
    admin/(protected)/         dashboard, products, categories, collections    Phase 1
    api/
      admin/, cart/, checkout/, webhooks/stripe/, auth/, upload/, revalidate/
    sitemap.ts, robots.ts                                   Phase 3
  components/
    ui/, storefront/, admin/       Phase 1 (+ Phase 3: ProductJsonLd, RecommendationsRail, VariantOptionGroup)
    cart/                           Phase 2 (+ Phase 3: CartDrawer, CartDrawerContext)
    checkout/                       Phase 2
    search/                         Phase 3 — SearchBar, FacetSidebar, SortControls
  lib/
    variants.ts, money.ts                    pure logic, unit tested (Phase 1/2)
    revalidate.ts, products.server.ts        tag-based ISR (Phase 1)
    cart.server.ts, inventory.server.ts      server-authoritative cart, FOR UPDATE reservation (Phase 2)
    orders.ts / orders.server.ts             state machine / checkout + payment (Phase 2)
    discounts.ts / discounts.server.ts       pure calculation / usage limits (Phase 2)
    webhooks.server.ts                       idempotent Stripe events (Phase 2)
    search.server.ts                         hybrid FTS + trigram search, facet counts — Phase 3
    search-index.server.ts                   search vector sync on product write — Phase 3
    search-params.ts                         URL <-> filter state, pure, unit tested — Phase 3
    recommendations.server.ts                co-purchase ranking from real orders — Phase 3
prisma/
  schema.prisma      Phase 1 catalogue + Phase 2 cart/order/discount + Phase 3 searchVector
  seed.ts             6 products, 2 discount codes, 6 sample completed orders (for recommendations)
tests/
  concurrency/         the twenty-parallel-checkouts oversell test — Phase 2
  integration/         webhook idempotency, cart pricing (Phase 2); facet counts, search (Phase 3)
                        — all require a real Postgres
docs/
  decisions/           ADRs 0001–0015 — read these for the "why"
  perf/                Phase 3 — see docs/perf/README.md; reports not yet generated, see below
.github/workflows/ci.yml   Postgres service + migrations + all tests, every push
```

## Running it locally

```bash
cp .env.example .env        # fill in DATABASE_URL at minimum
npm install
npm run db:generate
npm run db:migrate          # creates the schema, including the pg_trgm extension and search index
npm run db:seed             # categories, products, discount codes, sample orders
npm run dev
```

Storefront: `http://localhost:3000` · Search: `http://localhost:3000/search`
Ops console: `http://localhost:3000/admin` — `admin@vault.internal` (see ADR 0004/0010 on staff auth being a thin placeholder)
Customer sign-in: `http://localhost:3000/account/sign-in` — any email works (same placeholder-auth caveat)

### Stripe (test mode)

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen`, below
```

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.
Discount codes: `WELCOME10` (10% off, once per customer), `FREESHIP`
(free shipping, $100 minimum).

## Tests

```bash
npm run test:unit          # pure functions — no database needed
npm run test:concurrency   # the oversell test — REQUIRES DATABASE_URL
npm run test:integration   # webhook idempotency, cart pricing, facet counts, search — REQUIRES DATABASE_URL
```

`npm test` is aliased to `test:unit` so it never fails just because a
database isn't configured locally; the DB-backed suites skip
gracefully (with a warning) without `DATABASE_URL`, but **CI always
sets it** — see `.github/workflows/ci.yml`.

New in Phase 3:
- `src/lib/__tests__/search-params.test.ts` — pure URL state parsing
  and href building.
- `tests/integration/facet-counts.test.ts` — the automated version of
  the hand-verified facet walkthrough in ADR 0012 (same scenario,
  asserted in code, not just prose).
- `tests/integration/search.test.ts` — exact match, stemmed match,
  typo-tolerant match, a true negative, and a reindex-from-scratch
  check.

## Done-criteria check (from the brief)

**Phase 1 & 2** — see the previous README revisions (unchanged);
summarized in the ADR index below.

**Phase 3:**
- *"Facet counts that are actually correct... the number next to 'Blue'
  reflects the other filters currently applied."* — every facet query
  in `src/lib/search.server.ts` is built from the same
  `buildConditions(filters, exclude)` function as the main search,
  varying only which filter is excluded. Hand-verified against the
  seed data and automated in `tests/integration/facet-counts.test.ts`;
  full walkthrough in ADR 0012.
- *"Filter, sort, and pagination state in the URL. Back button works,
  results are shareable."* — `src/lib/search-params.ts` is the single
  source of truth; every facet link, sort control, and page link is a
  plain `<Link href>` built from it, no client-side state that isn't
  also in the URL.
- *"Recommendations built from real order data, not `ORDER BY
  random()`."* — `src/lib/recommendations.server.ts`; see ADR 0013.
- *SEO* — `src/app/sitemap.ts`, `src/app/robots.ts`, per-product
  JSON-LD (`ProductJsonLd`), generated OG images
  (`products/[slug]/opengraph-image.tsx`), canonical URLs on product
  and category pages.
- *Accessibility* — a real focus-trapped `CartDrawer` and a
  `VariantOptionGroup` rebuilt as a proper ARIA radiogroup with
  roving tabindex and arrow-key navigation; see ADR 0015. Not
  independently verified with axe — see that ADR's honest caveat.
- *Performance targets (Lighthouse, bundle size)* — **not measured in
  this environment; see `docs/perf/README.md` and ADR 0014 for exactly
  why and exactly how to generate the real numbers.** What was done:
  Partial Prerendering on the product page (recommendations as a
  dynamic island), conditional `priority` on above-the-fold product
  images only, and `@next/bundle-analyzer` wired in behind
  `npm run analyze`.

## What's deliberately not here yet

Real tax calculation, shipping-rate shopping, transactional email, and
refunds are Phase 4 (see the Phase 2 section of prior notes and ADR
0010). Search facets cover category/price/size/colour/in-stock as
single-select per dimension — multi-select within a dimension (Size S
*or* M) is a reasonable Phase 4+ extension, not built here; see ADR
0011's consequences. Lighthouse/axe reports are unmeasured, per above.
