# 0012 — Guest Token Order Isolation and Access Control

## Status
Accepted — Phase 2

## Context
Customer-facing order pages (`/checkout/success` and `/orders/[id]`) display sensitive order information (purchased itemsSnapshot, minor-unit prices, email address, shipping status). Prior to this decision, order details were retrieved by fetching `prisma.order.findUnique({ where: { id } })` directly from a URL parameter with zero authorization checks. This allowed unauthenticated users or malicious actors to view arbitrary customer order details via simple ID-guessing or sequential enumeration attacks.

Providing privacy and access control requires handling two distinct shopper categories:
1. **Registered Customers (`userId != null`)**: Shoppers with an authenticated account.
2. **Guest Shoppers (`userId == null`)**: Shoppers completing checkout without an account.

Guest shoppers must be able to view their order status on `/checkout/success` immediately after payment and revisit `/orders/[id]` via email links, without requiring account creation.

## Decision
We enforce strict server-side access control using a centralized `verifyOrderAccess(order, session, token)` helper in `src/lib/auth.ts`:

1. **Staff Access**: Users with active staff sessions (`admin`, `fulfilment`, or `support` verified via `requireStaff()`) are granted access to all orders for operations, fulfillment, and customer service.
2. **Registered Customer Orders**: For orders tied to a registered user (`order.userId != null`), access is granted if and only if `session?.user?.id === order.userId`.
3. **Guest Orders**: For guest orders (`order.userId == null`):
   - At checkout creation time in `src/lib/orders.server.ts`, a cryptographically random 64-character token is generated via `crypto.randomBytes(32).toString("hex")` and stored in `order.guestToken`. Registered customer orders keep `guestToken: null`.
   - The token is plumbed through `api/checkout`, `CheckoutForm`, and `PaymentStep` into Stripe's `return_url`: `/checkout/success?order_id=${orderId}&token=${guestToken}`.
   - Access to guest orders requires a matching `token` query parameter, evaluated in constant time via `crypto.timingSafeEqual` to prevent side-channel timing attacks.

If `verifyOrderAccess()` returns `false`, both `/orders/[id]` and `/checkout/success` invoke Next.js `notFound()`, rendering a 404 page rather than confirming the existence of an order ID.

## Consequences
- **Elimination of ID-Guessing Attacks**: Bare order IDs cannot be used to inspect another customer's or guest's order details.
- **Timing-Attack Resistance**: Token comparison uses `crypto.timingSafeEqual` on UTF-8 buffers after verifying length equality, preventing byte-by-byte timing leakage.
- **Seamless Guest UX**: Guests automatically transition from checkout to `/checkout/success?order_id=...&token=...` and can click "Track this order" with the token preserved in the URL.
- **Strict Scope Boundaries**: Registered customer orders ignore token parameters entirely and strictly require matching session authentication, preventing token-reuse edge cases.
