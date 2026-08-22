# 0019 — Transactional email fires after the transaction commits, never inside it; logging and error tracking are both optional-by-default

## Status
Accepted — Phase 4

## Context
The brief asks for three transactional emails (order confirmation,
shipping notice, refund notice) via Resend and React Email, plus
structured logging and Sentry. Two design questions matter more than
which libraries: *when* does an email actually send relative to the
database write that triggers it, and what happens when Resend/Sentry
aren't configured at all (local dev, CI, this project's own sandbox).

## Decision

**Email sends happen after commit, not inside the transaction.** Every
email-triggering function — `markOrderPaidByPaymentIntent` (webhook),
`fulfilOrderItems`, `createItemizedRefund`/`createGoodwillRefund` —
returns the data the email needs (an order id, a shipped-items list, a
refund amount) from inside its `prisma.$transaction(...)` block, and
the actual `sendOrderConfirmationEmail`/`sendShippingNoticeEmail`/
`sendRefundNoticeEmail` call happens in the caller, after that
`await prisma.$transaction(...)` has resolved. This was a deliberate
refactor during this phase, not the first instinct: an earlier draft
of `markOrderPaidByPaymentIntent` had a `console.log` email stub
directly inside the transaction (a Phase 2 placeholder, by design,
per that phase's own ADR 0009), and the natural-looking next step
would have been to replace that stub in place with a real `await
resend.emails.send(...)` call — still inside the transaction. That's
wrong: a slow Resend API call would hold a Postgres transaction (and
whatever locks it's holding — reservations, inventory rows) open for
the duration of an external HTTP request, and a failed send would roll
back an order that was, in every way that matters, actually paid.
Holding a database transaction open across a network call to a third
party is the kind of subtle-under-load mistake this project has tried
to name and avoid at every phase (see ADR 0007's locking discussion
for the same category of concern in a different shape).

**A failed send doesn't fail the action.** `sendEmail()` in
`src/lib/email.server.ts` catches its own errors and logs them via
`logger.error` rather than throwing — an order that's genuinely paid,
fulfilled, or refunded stays that way even if Resend is down. The
alternative (throw, and let the caller's error handling roll back or
500) would mean a third party's outage decides whether a customer's
payment succeeded, which is backwards.

**Both Resend and Sentry degrade to no-ops without configuration.**
Without `RESEND_API_KEY`, emails are logged instead of sent
(`src/lib/email.server.ts`). Without `SENTRY_DSN`, `src/instrumentation.ts`
returns immediately and no Sentry code ever initializes. This is the
same pattern Stripe (`lib/stripe.ts`) and UploadThing already use
elsewhere in this project — every optional third-party integration is
safe to run completely unconfigured, which is what makes `npm run dev`
and this project's CI both work with zero secrets.

**Logging is a thin custom wrapper, not pino/winston.** `src/lib/logger.ts`
is ~30 lines: one function that emits a JSON line per call with a
level, message, timestamp, and arbitrary context. What "structured
logging" actually requires — every line is a parseable JSON object
with consistent fields, not a free-form string — doesn't require a
dependency to get right at this project's scale, and every call site
(`logger.error("orders.refund_failed", { orderId, error })`) would look
identical if this were swapped for pino later.

## Consequences
- `webhooks.server.ts`'s "one order, one email" property (tested in
  `tests/integration/webhook-idempotency.test.ts`) now depends on
  `markOrderPaidByPaymentIntent` returning `null` for a duplicate/no-op
  call — the caller only sends an email when it gets back a real
  `{ orderId }`, so a replayed event that hits the `StripeEvent`
  uniqueness guard (ADR 0009) never reaches the email call at all, by
  construction, not by the email function happening to be idempotent
  on its own.
- Every admin action route that can fail unexpectedly
  (`orders/[id]/fulfil`, `/cancel`, `/refund`,
  `inventory/[variantId]/adjust`) calls `Sentry.captureException` in
  its catch block before re-throwing — visible in
  `src/app/api/admin/**/route.ts` — specifically because these are the
  order/payment/refund paths named in `instrumentation.ts`'s own
  comment as where a silent failure is most expensive.
- No emails have actually been sent from this codebase in the
  environment it was built in — there's no Resend account configured
  here, consistent with every other "not run without real credentials"
  caveat in this project's ADRs (Lighthouse in 0014, axe in 0015). What
  was verified is that the code path is correct and the graceful-
  degradation behavior (log instead of send) actually triggers, not
  that a real email was received.
