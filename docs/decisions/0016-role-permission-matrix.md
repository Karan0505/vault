# 0016 — A single role permission matrix, not per-route ad hoc checks

## Status
Accepted — Phase 4

## Context
The brief states two role constraints directly: support can't issue
refunds, fulfilment can't edit prices. Phase 1 already enforced the
second one, inline, per-route: `if (!requireStaff(role) || role ===
"support" || role === "fulfilment")`. That pattern doesn't scale past
two constraints — Phase 4 adds order fulfilment, cancellation,
inventory adjustment, and audit log access, each with its own question
of who's allowed. Repeating `role === "support" || role ===
"fulfilment"` at every new call site is exactly how two routes that are
supposed to agree quietly drift apart the first time someone edits one
and not the other.

## Decision
`src/lib/permissions.ts` defines every gated action as a
`resource:action` string (`Permission`) and a single matrix,
`ROLE_PERMISSIONS: Record<StaffRole, Set<Permission>>`. Every route —
the Phase 1 product routes (refactored in this phase to use it) and
every new Phase 4 route — calls `hasPermission(role, permission)` or
`assertPermission`. There is exactly one place that answers "can this
role do this," and it's pure and unit tested
(`src/lib/__tests__/permissions.test.ts`) independent of any route,
database, or session.

The matrix beyond the brief's two anchors:

| Permission | admin | fulfilment | support |
|---|---|---|---|
| `products:write` | ✅ | ❌ | ❌ |
| `orders:view` | ✅ | ✅ | ✅ |
| `orders:fulfil` | ✅ | ✅ | ❌ |
| `orders:cancel` | ✅ | ✅ | ✅ |
| `refunds:issue` | ✅ | ✅ | ❌ |
| `inventory:view` | ✅ | ✅ | ✅ |
| `inventory:adjust` | ✅ | ✅ | ❌ |
| `audit-log:view` | ✅ | ❌ | ❌ |

The reasoning behind the cells the brief didn't specify: `orders:cancel`
is open to all three roles because cancelling a *pending* order (the
only case `cancelOrder` allows — see ADR 0017) touches no money, only a
reservation release; support handling "customer changed their mind
before paying" doesn't need refund-level trust. `inventory:adjust`
follows `orders:fulfil` and `refunds:issue` — support isn't a warehouse
role and doesn't reconcile physical stock any more than they issue
refunds. `audit-log:view` is admin-only because the audit log is itself
a sensitive record of what every other role has done; giving
fulfilment or support read access to it isn't a security problem so
much as a scope-creep one — it's not their job function.

## Consequences
- Adding a new gated action means adding it to `Permission` and to
  every role's set in the matrix — a compile error (an unhandled
  `Permission` case) rather than a silent gap is the failure mode for
  forgetting a role, since `ROLE_PERMISSIONS` is typed as
  `Record<StaffRole, ReadonlySet<Permission>>` and must have all three
  roles populated.
- `tests/integration/role-enforcement.test.ts` asserts the two brief-
  stated constraints hold at the actual HTTP route boundary (a real
  403 from the real route handler, session mocked but the permission
  check itself not), not just in the pure matrix — see that file for
  why the matrix-level test alone wasn't considered sufficient
  evidence for "enforced server side."
