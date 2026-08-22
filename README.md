# VAULT — Phase 1 + Phase 2 + Phase 3 + Phase 4

A production-shaped commerce storefront and its ops console, complete
through all four phases of the brief. **Phase 1**: catalogue and data
model. **Phase 2**: cart, inventory reservation, Stripe checkout, order
state machine, discount codes. **Phase 3**: search, discovery, and
storefront speed. **Phase 4**: operations and hardening — order
management, refunds, inventory adjustments, an append-only audit log,
transactional email, role enforcement, structured logging and error
tracking. See `docs/decisions/` (20 ADRs) for what was deliberately
built a certain way and why, phase by phase.

## Stack

Next.js 15 (App Router, Partial Prerendering), TypeScript (`strict`,
`noUncheckedIndexedAccess`, no `any` in `src/`), Postgres + Prisma
(full-text search + `pg_trgm`), Tailwind, Framer Motion, Auth.js v5,
Stripe (Payment Intents + webhooks, test mode), UploadThing, Resend +
React Email, Sentry, Zod, Vitest.

## What's here

```
src/
  app/
    (storefront)/    search/, cart/, checkout/, orders/[id]/, products/[slug]/, ...
    admin/(protected)/
      products/, categories/, collections/          Phase 1
      orders/, orders/[id]/                          Phase 4 — list, detail, fulfil/cancel/refund
      inventory/                                     Phase 4 — stock levels, adjustments
      audit-log/                                     Phase 4 — admin-only, read-only
    api/
      admin/
        products/, categories/                       Phase 1 (now via lib/permissions.ts)
        orders/[id]/fulfil, /cancel, /refund          Phase 4
        inventory/[variantId]/adjust                  Phase 4
        audit-log/                                    Phase 4
      cart/, checkout/, webhooks/stripe/              Phase 2
  components/  ui/, storefront/, admin/, cart/, checkout/, search/
  emails/      OrderConfirmationEmail, ShippingNoticeEmail, RefundNoticeEmail  — Phase 4
  lib/
    permissions.ts              role capability matrix, pure, unit tested — Phase 4
    audit.server.ts             the ONLY function that writes to the audit log — Phase 4
    fulfillment.server.ts       partial fulfilment, order cancellation — Phase 4
    refunds.server.ts           itemized + goodwill refunds, explicit restock — Phase 4
    inventory-admin.server.ts   stock adjustments (FOR UPDATE, same as Phase 2's reservation lock) — Phase 4
    email.server.ts             Resend + React Email, sent after commit — Phase 4
    logger.ts                   structured JSON logging — Phase 4
    search.server.ts, recommendations.server.ts, search-params.ts     Phase 3
    cart.server.ts, inventory.server.ts, orders.server.ts, discounts.server.ts, webhooks.server.ts   Phase 2
    variants.ts, money.ts, revalidate.ts, products.server.ts          Phase 1
  instrumentation.ts, instrumentation-client.ts       Sentry, DSN-conditional — Phase 4
prisma/
  schema.prisma   all four phases' models
  manual/audit-log-append-only.sql   DB trigger — run once, see below — Phase 4
  seed.ts
tests/
  concurrency/   the twenty-parallel-checkouts oversell test
  integration/   webhook idempotency, cart pricing, facet counts, search,
                 role enforcement (Phase 4) — all require a real Postgres
                 except role-enforcement's 403/401 cases, which need none
docs/
  decisions/   ADRs 0001–0020
  perf/        Phase 3 — reports not generated in this environment, see docs/perf/README.md
.github/workflows/ci.yml
```

## Running it locally

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
psql "$DATABASE_URL" -f prisma/manual/audit-log-append-only.sql   # Phase 4 — required, see ADR 0018
npm run db:seed
npm run dev
```

Storefront: `http://localhost:3000` · Search: `/search`
Ops console: `http://localhost:3000/admin` — `admin@vault.internal`,
`fulfilment@vault.internal`, `support@vault.internal` (staff auth is a
thin placeholder — ADR 0004/0010).

### Stripe, Resend, Sentry (all optional — everything degrades gracefully unconfigured)

```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...        # from `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
RESEND_API_KEY=re_...                  # without this, emails are logged instead of sent
SENTRY_DSN=https://...                 # without this, Sentry never initializes
```

Test card: `4242 4242 4242 4242`. Discount codes: `WELCOME10`, `FREESHIP`.

## Tests

```bash
npm run test:unit          # pure functions — no database needed
npm run test:concurrency   # the oversell test — REQUIRES DATABASE_URL
npm run test:integration   # webhook idempotency, cart pricing, facet counts,
                            # search, role enforcement — REQUIRES DATABASE_URL
                            # (role-enforcement's 403/401 cases run without one)
```

New in Phase 4:
- `src/lib/__tests__/permissions.test.ts` — the full role matrix, pure.
- `tests/integration/role-enforcement.test.ts` — the brief's two
  explicit constraints ("support can't issue refunds," "fulfilment
  can't edit prices"), asserted against the real HTTP route handlers
  (session mocked, permission check not) rather than only at the
  matrix level.

## Done-criteria check — Phase 4

- *"Order management: search and filter orders, view detail, fulfil
  with a tracking number, partial fulfilment, cancel."* —
  `/admin/orders`, `/admin/orders/[id]`; `fulfilOrderItems` tracks
  fulfilment per line item and derives the order's own "fully
  fulfilled" state rather than storing it separately (ADR 0020);
  `cancelOrder` is restricted to pending (unpaid) orders — a paid order
  goes through refund instead (ADR 0017).
- *"Refunds through Stripe, full and partial, with the restock decision
  handled explicitly rather than implied."* — `refunds.server.ts`;
  `restock` has no default anywhere in its type; itemized refunds use
  `splitEvenly` sliced by already-refunded quantity so repeated partial
  refunds on the same line sum exactly to its total. See ADR 0017.
- *"Inventory console: stock levels, low stock alerts, adjustment
  history with reason codes."* — `/admin/inventory`;
  `InventoryAdjustment` records reason + note + resulting on-hand for
  every change, using the same `FOR UPDATE` locking as Phase 2's
  reservation system (ADR 0007).
- *"An immutable audit log... append only means append only, no update
  path."* — enforced twice: `appendAuditLog` is the only function that
  writes to it (no update/delete function exists anywhere in the
  codebase), AND a database trigger
  (`prisma/manual/audit-log-append-only.sql`) rejects UPDATE/DELETE
  outright. See ADR 0018.
- *"Transactional email through Resend and React Email."* — three
  templates in `src/emails/`; every send fires after its triggering
  transaction commits, never from inside one (a real bug caught and
  fixed during this phase — see ADR 0019).
- *"Role enforcement... enforced server side and covered by a test."*
  — `lib/permissions.ts` + the two test files above.
- *"Structured logging, Sentry."* — `lib/logger.ts`;
  `src/instrumentation.ts` / `instrumentation-client.ts`, both
  DSN-conditional no-ops when unconfigured.

## What's honestly still open

Lighthouse/bundle/axe reports (Phase 3) are unmeasured in this
environment — see `docs/perf/README.md` and ADR 0014/0015. No real
email has been sent and no real Sentry event has been captured from
this codebase — the graceful-degradation paths were verified, not the
live integrations, consistent with every other "needs real credentials
to fully verify" caveat across these ADRs. Staff and customer auth
remain thin placeholders (ADR 0004/0010) — real password/OTP/magic-link
verification was never in scope for any of the four phases as
specified.
