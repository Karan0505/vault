# 0018 — Audit log: append-only in the application layer AND at the database layer

## Status
Accepted — Phase 4

## Context
The brief: "An immutable audit log covering who changed what and when,
with before and after values... Append only means append only, no
update path." That last sentence is doing real work — it's not just
asking for a log, it's asking for a guarantee that holds under
pressure (a bug, a well-intentioned "just fix this one row" migration
script, a future contributor who doesn't know the rule) rather than
one that holds only as long as everyone remembers not to write an
`updateAuditLog` function.

## Decision
The guarantee is enforced twice, at two different layers, deliberately
redundant:

1. **Application layer**: `src/lib/audit.server.ts` exports exactly one
   function, `appendAuditLog`. There is no `updateAuditLog`, no
   `deleteAuditLog`, and no Prisma call anywhere else in the codebase
   that touches `auditLogEntry` — grep for `auditLogEntry` and every
   result is either this file's `create` call or a read (the audit log
   viewer, the adjustment history queries). The guarantee holds as
   long as this discipline holds.
2. **Database layer**: `prisma/manual/audit-log-append-only.sql` installs
   `BEFORE UPDATE` and `BEFORE DELETE` triggers on `audit_log_entries`
   that unconditionally raise an exception. This layer doesn't depend
   on anyone reading the application-layer convention — it's true even
   against a direct `psql` session, a future ORM migration that
   forgets, or a bug that somehow constructs an update call. Prisma's
   schema DSL has no way to express "no UPDATE/DELETE" declaratively
   (there's no `@@noUpdate`), which is why this lives as a manual SQL
   script rather than in `schema.prisma` itself — run once via the
   command in the script's own header.

**No foreign key to `User` for the actor.** `AuditLogEntry.actorUserId`
and `actorEmail` are plain columns, not a `@relation` to `User`. An
audit trail that could be affected by deleting the user it's about —
whether that's a cascade delete wiping the audit history, or a
`SetNull` silently losing who did something — defeats the point of an
audit log. The email is captured as a snapshot at write time
specifically so the log remains readable even if the `User` row is
later deleted. The same reasoning applies to `InventoryAdjustment`'s
`actorUserId`/`actorEmail`.

## Consequences
- `appendAuditLog` is called from inside the same transaction as the
  change it's recording (product writes, fulfilments, refunds,
  inventory adjustments) — so the audit entry and the change it
  describes commit or roll back together. An audit entry for a change
  that didn't actually happen (because the transaction rolled back)
  would be worse than no audit entry at all.
- The `before`/`after` JSON columns hold whatever each caller decides
  is the meaningful diff for that entity — a full snapshot for
  create/delete, just the changed fields for update (see
  `products.server.ts`'s `updateProduct` for what "before and after
  values" means in practice: title/slug/status/variant prices). This
  is a deliberate choice not to build a generic object-diffing utility
  — callers know what "changed" means for their entity better than a
  generic algorithm would.
- Running the manual SQL script is a required, documented setup step
  (see the script's own header and the README) — a fresh `prisma
  migrate deploy` alone creates the table but not the triggers. This is
  the same category of manual step as `pg_trgm` extension setup in
  Phase 3 (ADR 0011): a real limitation of expressing everything
  through Prisma's schema DSL, handled the same way both times —
  documented, not silently skipped.
