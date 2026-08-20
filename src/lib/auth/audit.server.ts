import "server-only";
import type { Prisma, StaffRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export interface AuditActor {
  userId: string;
  email: string;
  role: StaffRole | null;
}

export type AuditableAction = "create" | "update" | "delete" | "transition" | "refund" | "adjustment";

type Tx = Prisma.TransactionClient | typeof prisma;

/**
 * Writes exactly one audit log row. This function — and only this
 * function — writes to `audit_log_entries` anywhere in this codebase.
 * There is deliberately no `updateAuditLog` or `deleteAuditLog`: the
 * append-only guarantee starts here (no code path to violate it exists)
 * and is backed by a database trigger for the case where that
 * discipline isn't enough — see
 * prisma/manual/audit-log-append-only.sql and
 * docs/decisions/0018-audit-log-append-only.md.
 *
 * `before`/`after` are plain JSON snapshots of only the fields that
 * changed (or the full entity for create/delete) — callers decide what
 * "before and after values" means for their entity, this function just
 * persists whatever they pass.
 */
export async function appendAuditLog(
  tx: Tx,
  params: {
    actor: AuditActor;
    entityType: string;
    entityId: string;
    action: AuditableAction;
    before?: Prisma.InputJsonValue | null;
    after?: Prisma.InputJsonValue | null;
  }
): Promise<void> {
  await tx.auditLogEntry.create({
    data: {
      actorUserId: params.actor.userId,
      actorEmail: params.actor.email,
      actorRole: params.actor.role,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      before: params.before ?? undefined,
      after: params.after ?? undefined,
    },
  });
}
