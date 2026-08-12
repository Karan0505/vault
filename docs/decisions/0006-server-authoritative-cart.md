# 0006 — Server-authoritative cart: CartItem stores no price at all

## Status
Accepted — Phase 2

## Context
The brief's tamper test is specific: "POSTing a modified price in a cart
request changes nothing." The usual way this goes wrong is subtler than
"trust `req.body.price`" — it's a cart that stores a price *snapshot* at
add-to-cart time, which is defensible-sounding (locks in the price the
shopper saw) but means the total the server returns is a stored number
that was, at some point, written from a request. If that write path is
ever reachable with attacker-controlled input, the "recompute on
checkout" step people add as a fix is a patch on a design that
shouldn't have had the hole.

## Decision
`CartItem` has exactly two fields that matter: `variantId` and
`quantity`. There is no price column on it — see
`prisma/schema.prisma`. `getCartView()` in `src/lib/cart.server.ts` is
the only place a cart's prices exist, and it computes every
`unitAmount` and `lineTotal` by reading `ProductVariant.priceAmount`
fresh, every single call. Nothing about the price is ever written to
`CartItem`, so there's no stored number for a tampered request to
overwrite — the guarantee is structural, not procedural.

The same is true one step further down: `createCheckoutSession()` in
`src/lib/orders.server.ts` builds the Stripe PaymentIntent amount from
`getCartView()`'s output, not from anything in the checkout request
body. The checkout API only accepts `email` and `discountCode` — see
`checkoutInputSchema` — there is no field in that schema a price could
even arrive through.

## Consequences
- A price change in admin is reflected in every open cart immediately,
  with no cart-refresh logic needed — there's nothing cached to
  invalidate.
- This does mean a shopper's cart total can shift under them between
  page loads if a price changes mid-session. That's the intentional
  trade for correctness; Phase 3+ could add an explicit "price changed"
  notice in the cart UI, but silently wrong is worse than visibly
  current.
- `tests/integration/cart-pricing.test.ts` demonstrates the recompute
  behavior directly against the database rather than mocking it, since
  the guarantee's whole point is that it holds at the data layer.
