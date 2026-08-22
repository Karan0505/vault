import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/** How long a checkout holds a reservation before it's released back to the pool. */
export const RESERVATION_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class InsufficientStockError extends Error {
  constructor(
    public readonly variantId: string,
    public readonly requested: number,
    public readonly available: number
  ) {
    super(
      `Insufficient stock for variant ${variantId}: requested ${requested}, ${available} available`
    );
    this.name = "InsufficientStockError";
  }
}

type Tx = Prisma.TransactionClient | PrismaClient;

/**
 * Releases any reservations on this inventory item whose TTL has expired,
 * crediting their quantity back to the available pool. Must be called
 * while already holding the row lock from reserveStock's FOR UPDATE — see
 * that function for why this can't be a separate transaction.
 */
async function releaseExpiredReservationsLocked(
  tx: Tx,
  inventoryItemId: string
): Promise<number> {
  const expired = await tx.reservation.findMany({
    where: { inventoryItemId, expiresAt: { lt: new Date() } },
    select: { id: true, quantity: true },
  });

  if (expired.length === 0) return 0;

  const releasedQuantity = expired.reduce((sum, r) => sum + r.quantity, 0);

  await tx.reservation.deleteMany({ where: { id: { in: expired.map((r) => r.id) } } });
  await tx.inventoryItem.update({
    where: { id: inventoryItemId },
    data: { reserved: { decrement: releasedQuantity } },
  });

  return releasedQuantity;
}

/**
 * Reserves `quantity` units of a variant's stock for a checkout attempt.
 *
 * This is the concurrency-critical path the brief singles out: run twenty
 * of these in parallel against one unit of stock and exactly one must
 * succeed. The guarantee comes from `SELECT ... FOR UPDATE` on the
 * inventory_items row — Postgres serializes every concurrent reservation
 * attempt against the same variant through that row lock, so the
 * read-available / decide / write-reserved sequence below can never
 * interleave with another transaction's. See
 * docs/decisions/0007-inventory-reservation-locking.md for the pessimistic-
 * vs-optimistic tradeoff this makes and what it costs under load.
 *
 * Expired reservations for this exact variant are swept inside the same
 * locked transaction, immediately before the availability check, so a
 * reservation that just expired is credited back before it can cause a
 * false "out of stock".
 */
export async function reserveStock(params: {
  variantId: string;
  quantity: number;
  cartId?: string;
  ttlMs?: number;
}): Promise<{ reservationId: string; expiresAt: Date }> {
  const { variantId, quantity, cartId, ttlMs = RESERVATION_TTL_MS } = params;
  if (quantity <= 0) throw new Error("quantity must be positive");

  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; onHand: number; reserved: number }[]>`
      SELECT "id", "onHand", "reserved"
      FROM "inventory_items"
      WHERE "variantId" = ${variantId}
      FOR UPDATE
    `;

    const item = locked[0];
    if (!item) {
      throw new InsufficientStockError(variantId, quantity, 0);
    }

    await releaseExpiredReservationsLocked(tx, item.id);

    // Re-read reserved after the sweep — it may have just changed.
    const fresh = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
    const available = fresh.onHand - fresh.reserved;

    if (available < quantity) {
      throw new InsufficientStockError(variantId, quantity, available);
    }

    const expiresAt = new Date(Date.now() + ttlMs);

    const reservation = await tx.reservation.create({
      data: { inventoryItemId: item.id, cartId, quantity, expiresAt },
    });

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { reserved: { increment: quantity } },
    });

    return { reservationId: reservation.id, expiresAt };
  });
}

/**
 * Reserves an entire cart's worth of lines in one call. If any line can't
 * be reserved, every reservation already made in this call is rolled back
 * (the whole thing runs in one transaction) — a checkout either holds
 * stock for its full cart or holds none of it, never a partial cart.
 */
export async function reserveCartLines(
  lines: { variantId: string; quantity: number }[],
  cartId: string,
  ttlMs = RESERVATION_TTL_MS
): Promise<{ reservationIds: string[]; expiresAt: Date }> {
  return prisma.$transaction(async (tx) => {
    const expiresAt = new Date(Date.now() + ttlMs);
    const reservationIds: string[] = [];

    for (const line of lines) {
      const locked = await tx.$queryRaw<{ id: string; onHand: number; reserved: number }[]>`
        SELECT "id", "onHand", "reserved"
        FROM "inventory_items"
        WHERE "variantId" = ${line.variantId}
        FOR UPDATE
      `;

      const item = locked[0];
      if (!item) throw new InsufficientStockError(line.variantId, line.quantity, 0);

      await releaseExpiredReservationsLocked(tx, item.id);

      const fresh = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });
      const available = fresh.onHand - fresh.reserved;

      if (available < line.quantity) {
        throw new InsufficientStockError(line.variantId, line.quantity, available);
      }

      const reservation = await tx.reservation.create({
        data: { inventoryItemId: item.id, cartId, quantity: line.quantity, expiresAt },
      });
      reservationIds.push(reservation.id);

      await tx.inventoryItem.update({
        where: { id: item.id },
        data: { reserved: { increment: line.quantity } },
      });
    }

    return { reservationIds, expiresAt };
  });
}

/**
 * Converts held reservations into a real, permanent stock decrement.
 * Called from the payment_intent.succeeded webhook handler, inside the
 * same transaction that marks the order paid — see
 * docs/decisions/0009-webhook-idempotency.md.
 */
export async function commitReservations(tx: Tx, reservationIds: string[]): Promise<void> {
  const reservations = await tx.reservation.findMany({
    where: { id: { in: reservationIds } },
  });

  for (const reservation of reservations) {
    await tx.inventoryItem.update({
      where: { id: reservation.inventoryItemId },
      data: {
        onHand: { decrement: reservation.quantity },
        reserved: { decrement: reservation.quantity },
      },
    });
  }

  await tx.reservation.deleteMany({ where: { id: { in: reservationIds } } });
}

/** Releases reservations without decrementing onHand — used for cancelled/expired/failed checkouts. */
export async function releaseReservations(tx: Tx, reservationIds: string[]): Promise<void> {
  const reservations = await tx.reservation.findMany({
    where: { id: { in: reservationIds } },
  });

  for (const reservation of reservations) {
    await tx.inventoryItem.update({
      where: { id: reservation.inventoryItemId },
      data: { reserved: { decrement: reservation.quantity } },
    });
  }

  await tx.reservation.deleteMany({ where: { id: { in: reservationIds } } });
}
