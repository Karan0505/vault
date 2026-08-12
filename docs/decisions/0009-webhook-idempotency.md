# 0009 — Webhook idempotency: the event-id insert is the guard, and it lives inside the mutation's transaction

## Status
Accepted — Phase 2

## Context
Stripe's own documentation is direct about this: webhooks can arrive
more than once for the same event, and delivery order isn't
guaranteed. The brief turns that into three concrete requirements:
replaying `payment_intent.succeeded` five times must produce one order,
one email, one stock decrement; the handler must be safe to re-run; and
it must produce a correct order even if the webhook arrives before the
customer's browser redirects back.

The naive fix — "check if we've seen this event id before processing"
as a separate read, then process, then record — has a race in it: two
near-simultaneous deliveries of the same event can both pass the "have
we seen this?" check before either records it.

## Decision
`processStripeEvent()` in `src/lib/webhooks.server.ts` does the
opposite ordering: it *inserts* the event id into `stripe_events`
(primary key, no surrogate) as the **first statement inside the same
transaction** that then applies the event's side effects — marking an
order paid and committing its reservations via
`markOrderPaidByPaymentIntent()`. A duplicate delivery's insert hits
the primary-key constraint, throws immediately, and the whole
transaction — including any order mutation that would have followed —
never happens. There's no window where two deliveries can both get
past the check, because the "check" and the "commit" are the same
database operation.

The "before the browser redirect" case is handled by *not* needing
special handling: `createCheckoutSession()` (Phase 2, `orders.server.ts`)
writes the `Order` row synchronously during checkout, before Stripe
ever confirms payment or a browser redirects anywhere. By the time any
webhook fires, the order it needs to find already exists, keyed by
`stripePaymentIntentId` — the webhook was never depending on a
"success page" visit to create anything.

## Consequences
- If the order mutation fails for an unrelated reason (a bug, a
  transient DB error), the transaction rolls back — including the
  `stripe_events` insert — so Stripe's automatic retry on a non-2xx
  response can legitimately try again, rather than the event being
  permanently marked "seen" for something that was never actually
  applied.
- Unhandled Stripe event types still get a 200 (see the `default` case
  in `processStripeEvent`) — Stripe should never see a failure for an
  event this system simply doesn't act on yet.
- `tests/integration/webhook-idempotency.test.ts` replays the same
  event five times against a real database and asserts on the
  `stripe_events` row count directly, not just on the order's final
  state, since a passing order-state assertion alone wouldn't rule out
  a handler that happened to be idempotent by luck rather than by
  construction.
