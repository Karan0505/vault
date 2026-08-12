# VAULT — Phase 1 + Phase 2

A production-shaped commerce storefront and its ops console.
**Phase 1**: catalogue and data model — storefront browse/product pages,
admin CRUD. **Phase 2**: the money path — cart, inventory reservation,
Stripe checkout, order state machine, discount codes. Search,
storefront performance/SEO work, and fulfilment/refunds/audit-log are
Phases 3–4; see `docs/decisions/` for what's deliberately deferred and
why, phase by phase.

## Stack

Next.js 15 (App Router), TypeScript (`strict`, `noUncheckedIndexedAccess`,
no `any` in `src/`), Postgres + Prisma, Tailwind, Framer Motion,
Auth.js v5 (staff roles + customer accounts), Stripe (Payment Intents +
webhooks, test mode), UploadThing (product media), Zod (input
validation), Vitest.

## What's here

```
src/
  app/
    (storefront)/
      cart/, checkout/, checkout/success/, orders/[id]/    Phase 2
      categories/[slug]/, products/[slug]/                 Phase 1
      account/sign-in/                                     Phase 2 — customer auth
    admin/
      sign-in/               staff sign-in, outside the auth gate
      (protected)/           dashboard, products, categories, collections
    api/
      admin/                 product + category CRUD, staff-only
      cart/                  cart read/mutate, discount preview
      checkout/               reserve stock + create Stripe PaymentIntent
      webhooks/stripe/         signature-verified, idempotent event handler
      auth/, upload/, revalidate/
  components/
    ui/, storefront/, admin/       Phase 1
    cart/, checkout/                Phase 2
  lib/
    variants.ts, money.ts           pure logic, unit tested (Phase 1 + 2)
    revalidate.ts, products.server.ts    tag-based ISR (Phase 1)
    cart.server.ts                  server-authoritative cart, guest/user, login merge
    inventory.server.ts             reservation + FOR UPDATE locking — the hard part
    orders.ts / orders.server.ts    state machine (pure) / checkout + payment (I/O)
    discounts.ts / discounts.server.ts   pure calculation / DB-backed usage limits
    webhooks.server.ts              idempotent Stripe event processing
    stripe.ts / stripe-client.ts    server / browser Stripe clients
    auth.ts                         Auth.js v5 — staff + customer providers
prisma/
  schema.prisma      Phase 1 catalogue models + Phase 2 Cart/Reservation/
                      Order/Discount/StripeEvent
  seed.ts             6 products with full variant matrices, 2 discount codes
tests/
  concurrency/        the twenty-parallel-checkouts oversell test
  integration/         webhook idempotency, cart pricing — all require a real Postgres
docs/
  decisions/           ADRs 0001–0010 — read these for the "why"
  perf/                (Phase 3)
.github/workflows/ci.yml   Postgres service + migrations + concurrency test, every push
```

## Running it locally

```bash
cp .env.example .env        # fill in DATABASE_URL at minimum
npm install
npm run db:generate
npm run db:migrate          # creates the schema
npm run db:seed             # 3 categories, 6 products, 2 discount codes, 3 staff users
npm run dev
```

Storefront: `http://localhost:3000`
Ops console: `http://localhost:3000/admin` — sign in with
`admin@vault.internal` (staff auth is a thin placeholder in this build;
see ADR 0004 and 0010 for why, and what it upgrades to in Phase 4).

Customer sign-in: `http://localhost:3000/account/sign-in` — any email
works (find-or-create, no password — same placeholder-auth caveat).
Add something to your cart as a guest, sign in, and it merges into your
account cart rather than disappearing.

### Stripe (test mode)

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen`, below
```

To receive webhooks locally, run the Stripe CLI alongside `npm run
dev`:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

It prints a `whsec_...` value — put that in `STRIPE_WEBHOOK_SECRET`.
Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any ZIP.

Discount codes seeded for testing: `WELCOME10` (10% off, once per
customer) and `FREESHIP` (free shipping, $100 minimum spend).

## Tests

```bash
npm run test:unit          # pure functions — no database needed
npm run test:concurrency   # the oversell test — REQUIRES DATABASE_URL
npm run test:integration   # webhook idempotency + cart pricing — REQUIRES DATABASE_URL
```

`npm run test` is aliased to `test:unit` so a plain `npm test` never
fails just because a database isn't configured; `test:concurrency` and
`test:integration` skip gracefully (with a warning) without
`DATABASE_URL` locally, but **CI always sets it** — see
`.github/workflows/ci.yml`, which spins up a real Postgres service
specifically so these aren't optional in practice.

- `src/lib/__tests__/` — pure logic: variant matrix (Phase 1),
  money/rounding, order state machine, discount calculation.
- `tests/concurrency/oversell.test.ts` — **the test the brief says
  gets checked first**: twenty genuinely parallel reservation attempts
  against one unit of stock, asserting exactly one success, nineteen
  specific `InsufficientStockError`s, and an unchanged `onHand`.
- `tests/integration/webhook-idempotency.test.ts` — replays one
  `payment_intent.succeeded` event five times, asserts one paid order,
  one stock decrement, one row in `stripe_events`.
- `tests/integration/cart-pricing.test.ts` — proves cart totals are
  recomputed from the live variant price on every read, not stored.

## Done-criteria check (from the brief)

**Phase 1:**
- *"Editing a price in admin updates the storefront within seconds
  with no redeploy and without busting unrelated pages"* — `revalidateProduct()`
  invalidates exactly `product:<slug>`, the owning `category:<slug>`,
  and the generic `product-list` tag; see ADR 0003.
- *"Variant selection is URL-addressable and shareable"* — the product
  page selector writes the current selection into query params
  (`?size=m&colour=indigo`).
- *"A product with size crossed with colour should generate the right
  variant matrix, and impossible combinations should be disabled in
  the UI rather than 404ing after selection"* — `generateVariantMatrix`
  + `getSelectableValues`; see ADR 0005.

**Phase 2:**
- *"Twenty parallel checkouts against one unit of stock. Exactly one
  succeeds, nineteen get a clean specific error, zero oversell."* —
  `tests/concurrency/oversell.test.ts`, passing in CI against a real
  Postgres. See ADR 0007 for the locking strategy and its cost.
- *"Replaying `payment_intent.succeeded` five times produces one order,
  one email, one stock decrement."* — `tests/integration/webhook-idempotency.test.ts`.
  (The email is a `console.log` stub — see ADR 0009 and the Resend
  integration note below; the "exactly once" property it's standing in
  for is what's actually tested.)
- *"Sending the webhook before the browser redirect still produces a
  correct order with no duplicate."* — structurally true because the
  order is created during checkout, not on redirect; see ADR 0009.
- *"POSTing a modified price in a cart request changes nothing. Test
  it."* — `tests/integration/cart-pricing.test.ts`, and structurally:
  `CartItem` has no price column at all. See ADR 0006.

## What's deliberately not here yet

Real tax calculation (`taxAmount` is `0`, flagged as a stub in
`orders.server.ts`), shipping rate shopping (flat `$5.99`, `FLAT_SHIPPING_AMOUNT`
in the same file), transactional email (a `console.log` where Resend +
React Email plug in — Phase 4), real password/OTP/magic-link
verification for either staff or customer sign-in (Phase 4, needs the
same email infrastructure), and refunds (the `Refund` model and
`refunded` order status exist; nothing creates a `Refund` row yet —
that's Phase 4's ops-console work). Search, storefront performance
targets, and SEO are Phase 3.
