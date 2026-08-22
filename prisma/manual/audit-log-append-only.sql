-- Run once, after `prisma migrate deploy` has created the
-- audit_log_entries table: `psql "$DATABASE_URL" -f prisma/manual/audit-log-append-only.sql`
--
-- Prisma's schema DSL has no way to express "no UPDATE, no DELETE" —
-- there's no @@noUpdate directive. The application layer already
-- enforces this by only ever exposing appendAuditLog() (see
-- src/lib/audit.server.ts) and never writing an update/delete
-- function, but that guarantee only holds as long as every future
-- caller reads and respects that convention. This trigger makes it
-- true at the database level instead: an UPDATE or DELETE against this
-- table fails outright, regardless of what application code (present
-- or future, careless or malicious) attempts it.
--
-- See docs/decisions/0018-audit-log-append-only.md.

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log_entries is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_entries_no_update ON "audit_log_entries";
CREATE TRIGGER audit_log_entries_no_update
  BEFORE UPDATE ON "audit_log_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS audit_log_entries_no_delete ON "audit_log_entries";
CREATE TRIGGER audit_log_entries_no_delete
  BEFORE DELETE ON "audit_log_entries"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
