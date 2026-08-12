# 0008 — Cart, checkout, and order pages are fully dynamic — deliberately, not by default

## Status
Accepted — Phase 2

## Context
Phase 1's rule (ADR 0003) was that storefront browse/product pages must
be static/ISR/PPR, never fully dynamic, and that caching versus stock
accuracy has to be solved deliberately rather than defaulted into.
Phase 2 adds pages — `/cart`, `/checkout`, `/checkout/success`,
`/orders/[id]` — that are inherently per-shopper, per-session, and
transactional. The question this ADR answers: does the "never fully
dynamic" rule extend to these, or was it specifically about catalogue
pages?

## Decision
It was specifically about catalogue pages, and these four are
intentionally fully dynamic (no `export const revalidate`, no
`generateStaticParams`). The reasoning is the same reasoning that
produced the tag-based ISR scheme in the first place: cache what's
expensive to compute and safe to share across requests; don't cache
what's neither.

- `/cart` and `/checkout` read a specific cookie or session's cart —
  there is no shared response to cache across shoppers, and the whole
  point of the server-authoritative-pricing guarantee (ADR 0006) is
  that these pages reflect the database at the instant of the request.
- `/checkout/success` and `/orders/[id]` read a specific order's
  current status, which can change out from under a page render the
  moment a webhook lands — a cached version of "payment pending" would
  be actively wrong, not just stale in a harmless way.

Server-side, the `/cart` page itself is a thin shell (`CartPageBody` is
a client component that fetches `/api/cart` on mount); this keeps the
per-request cost of visiting `/cart` to exactly one query, not a
server-rendered dynamic tree plus a client refetch on top of it.

## Consequences
- These routes get no CDN cache benefit, which is correct — they
  shouldn't have one.
- The success page explicitly handles the case where it renders before
  the webhook has landed (`status: "pending"`, a "confirming your
  payment" message rather than a false confirmation) instead of
  papering over the race with an artificial delay or a client-side poll
  loop. A real-time upgrade (SSE or a short poll) is a reasonable
  Phase 3+ addition; showing an honest "pending" state is the correct
  Phase 2 baseline it upgrades from, not a bug to fix later.
- This ADR is the explicit "solve it deliberately" the brief asks for
  regarding caching versus stock accuracy — for these specific pages,
  the deliberate answer is "don't cache them," which is as much a
  decision as PPR or a dynamic stock island was for the product page in
  Phase 1.
