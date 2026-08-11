# 0004 — Auth.js v5 scoped to staff roles in Phase 1; customer accounts wait for Phase 2

## Status
Accepted — Phase 1

## Context
The project brief specifies Auth.js v5 with customer accounts plus
staff roles (`admin`, `fulfilment`, `support`) as a global rule, not a
phase-specific one. But customer accounts only matter once there's
something a customer *does* while signed in — the cart-merge-on-login
behaviour is explicitly Phase 2 scope ("logging in merges the guest
cart"). Building customer sign-in in Phase 1 means building it against
nothing, then likely rebuilding it once the cart exists to merge into.

## Decision
Phase 1 wires up just enough of Auth.js v5 to gate the ops console
behind a staff role: a `Credentials` provider that checks
`User.staffRole` and rejects anyone without one, a JWT session carrying
that role, and `requireStaff()` as the one guard every admin route and
API handler calls. `src/app/admin/(protected)/layout.tsx` redirects to
`/admin/sign-in` for anyone who fails that check; the sign-in route
itself sits outside the `(protected)` group so it isn't caught in its
own redirect loop.

Customer-facing sign-in (magic link and/or OAuth), account pages, and
the guest-cart-merge flow are deferred to Phase 2, built against the
same Auth.js v5 instance.

## Consequences
- The `Credentials` provider here is intentionally thin — an email
  lookup against `User.staffRole`, no password. It's a placeholder for
  real staff authentication (magic link or SSO), not a production
  credential flow; the brief's staff-role enforcement tests exercise
  the role-check logic, not this specific provider.
- Role enforcement is centralized in `requireStaff()` / `STAFF_ROLES` so
  Phase 4's "support can't issue refunds, fulfilment can't edit prices"
  requirement extends this instead of inventing a second auth path.
- `next-auth` is pinned to a `5.0.0-beta` release since v5 has not had a
  stable tag as of this writing; upgrading to stable when it ships is a
  tracked follow-up, not a Phase 1 blocker.
