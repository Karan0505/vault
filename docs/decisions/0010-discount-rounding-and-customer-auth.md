# 0010 — Discount rounding lands proportionally, and customer auth stays a thin placeholder

## Status
Accepted — Phase 2

## Context
Two smaller decisions that didn't each need their own ADR but are both
things a reviewer would reasonably ask "why did you do it that way?"
about.

## Decision: discount remainder cents split by line weight, not evenly
A percentage discount applied to a multi-line cart doesn't divide
evenly in cents — 10% of a cart with a $10.00 line and a $20.01 line is
$3.001, and someone has to decide which line eats the fractional cent.
`computeDiscount()` in `src/lib/discounts.ts` uses
`splitProportionally()` (added in `lib/money.ts` alongside the
Phase 1 `splitEvenly()`): the discount is distributed weighted by each
line's share of the subtotal, with the remainder cent(s) going to the
line(s) with the largest fractional remainder (the standard
largest-remainder method). This was a deliberate choice over
`splitEvenly()`, which exists for a genuinely different case — equal
shares, like splitting one refund across identical units — not this
one, where the shares are supposed to be proportional to what each line
actually costs.

## Decision: customer auth stays a find-or-create-by-email placeholder
ADR 0004 deferred customer accounts to Phase 2 specifically because
they'd have nothing to do until the cart-merge-on-login flow existed.
That flow exists now (`mergeGuestCartIntoUser()`,
`src/app/(storefront)/account/sign-in/page.tsx`), but real credential
verification — password, magic link, OTP — depends on the Resend email
infrastructure that's Phase 4 scope. Rather than build a second
throwaway auth mechanism now and a third real one later, the customer
`Credentials` provider in `src/lib/auth.ts` stays exactly as thin as
the staff one: find-or-create a `User` by email, no password, no
verification. It's enough to prove the cart-merge behavior end-to-end
now, and it upgrades to real verification later without changing
anything that depends on `session.user.id` existing.

## Consequences
- Anyone can "sign in" as any email right now. That's an explicit,
  documented gap, not an oversight — this build is not deployed
  anywhere a stranger could exploit it, and the alternative (building
  throwaway password auth now) would cost more than it teaches.
- `computeDiscount`'s proportional split is unit tested against an
  intentionally uneven three-line cart in
  `src/lib/__tests__/discounts.test.ts` specifically to catch a
  regression to equal-split, which would silently pass on evenly-priced
  test carts and only misbehave on real ones.
