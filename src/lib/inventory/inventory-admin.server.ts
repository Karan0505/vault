import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { InventoryAdjustmentReason } from "@prisma/client";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";
import { revalidateProduct } from "@/lib/validation/revalidate";

export class NegativeStockError extends Error {
  constructor(public readonly variantId: string, public readonly attempted: number) {
    super(`Adjustment would take variant ${variantId} to a negative stock level (${attempted})`);
    this.name = "NegativeStockError";
  }
}

/**
 * Applies a manual stock adjustment. Uses the same `SELECT ... FOR
 * UPDATE` row lock as `reserveStock` in Phase 2 (see ADR 0007) — not
 * because two admins racing to adjust the same variant is a pressing
 * concurrency problem, but because it's the one already-correct pattern
 * in this codebase for "read a stock number, decide, write it back
 * safely," and reusing it here means there's only one locking strategy
 * to reason about, not two.
 *
 * Takes an ambient transaction rather than opening its own — the lock
 * only means anything for the duration of one transaction, and a
 * caller like `createItemizedRefund` (refunds.server.ts) needs this
 * adjustment to commit or roll back atomically with the refund record
 * it's part of, not as an independent side transaction that could
 * commit even if the refund itself later fails. `adjustStockStandalone`
 * below is the version for callers (the admin inventory route) that
 * have no outer transaction of their own.
 */
export async function adjustStockInTx(
  tx: Prisma.TransactionClient,
  params: {
    variantId: string;
    delta: number;
    reason: InventoryAdjustmentReason;
    note?: string;
    actor: AuditActor;
  }
): Promise<{ adjustmentId: string; resultingOnHand: number; productSlug: string; categorySlug?: string | null }> {
  const { variantId, delta, reason, note, actor } = params;
  if (delta === 0) throw new Error("delta must be non-zero");

  const locked = await tx.$queryRaw<{ id: string; onHand: number }[]>`
    SELECT "id", "onHand"
    FROM "inventory_items"
    WHERE "variantId" = ${variantId}
    FOR UPDATE
  `;

  const item = locked[0];
  if (!item) throw new Error(`No inventory row for variant ${variantId}`);

  const resultingOnHand = item.onHand + delta;
  if (resultingOnHand < 0) {
    throw new NegativeStockError(variantId, resultingOnHand);
  }

  await tx.inventoryItem.update({ where: { id: item.id }, data: { onHand: resultingOnHand } });

  const adjustment = await tx.inventoryAdjustment.create({
    data: {
      inventoryItemId: item.id,
      variantId,
      delta,
      resultingOnHand,
      reason,
      note,
      actorUserId: actor.userId,
      actorEmail: actor.email,
    },
  });

  await appendAuditLog(tx, {
    actor,
    entityType: "InventoryItem",
    entityId: item.id,
    action: "adjustment",
    before: { onHand: item.onHand },
    after: { onHand: resultingOnHand, delta, reason },
  });

  const variant = await tx.productVariant.findUniqueOrThrow({
    where: { id: variantId },
    include: { product: { include: { category: true } } },
  });

  return {
    adjustmentId: adjustment.id,
    resultingOnHand,
    productSlug: variant.product.slug,
    categorySlug: variant.product.category?.slug,
  };
}

/** Standalone entry point for callers with no outer transaction — opens one, runs the adjustment, then revalidates the storefront cache the same way an admin price edit does (ADR 0003). */
export async function adjustStockStandalone(params: {
  variantId: string;
  delta: number;
  reason: InventoryAdjustmentReason;
  note?: string;
  actor: AuditActor;
}): Promise<{ adjustmentId: string; resultingOnHand: number }> {
  const result = await prisma.$transaction((tx) => adjustStockInTx(tx, params));

  revalidateProduct({ productSlug: result.productSlug, categorySlug: result.categorySlug });

  return { adjustmentId: result.adjustmentId, resultingOnHand: result.resultingOnHand };
}

export interface InventoryOverviewRow {
  variantId: string;
  sku: string;
  productId: string;
  productTitle: string;
  productSlug: string;
  options: Record<string, string>;
  onHand: number;
  reserved: number;
  lowStockThreshold: number;
}

/** Powers the admin inventory console — all variants, or just the ones at/below their low-stock threshold. */
export async function listInventory(params: { lowStockOnly?: boolean } = {}): Promise<InventoryOverviewRow[]> {
  const items = await prisma.inventoryItem.findMany({
    where: params.lowStockOnly ? {} : undefined,
    include: { variant: { include: { product: true } } },
    orderBy: { onHand: "asc" },
  });

  return items
    .filter((item) => !params.lowStockOnly || item.onHand <= item.lowStockThreshold)
    .map((item) => ({
      variantId: item.variant.id,
      sku: item.variant.sku,
      productId: item.variant.product.id,
      productTitle: item.variant.product.title,
      productSlug: item.variant.product.slug,
      options: item.variant.options as Record<string, string>,
      onHand: item.onHand,
      reserved: item.reserved,
      lowStockThreshold: item.lowStockThreshold,
    }));
}

export async function getAdjustmentHistory(variantId: string) {
  return prisma.inventoryAdjustment.findMany({
    where: { variantId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
