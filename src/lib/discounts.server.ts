import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeDiscount, type CartLineForDiscount, type DiscountResult } from "@/lib/discounts";

export class DiscountNotFoundError extends Error {
  constructor(code: string) {
    super(`No active discount found for code "${code}"`);
    this.name = "DiscountNotFoundError";
  }
}

export class DiscountUsageLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DiscountUsageLimitError";
  }
}

/**
 * Resolves a discount code against a cart, checking both the pure rules
 * (computeDiscount) and the redemption counts that live in the database
 * — total usage limit and per-customer limit. This check is a UX
 * convenience (fail fast in the cart); authoritative enforcement happens
 * inside the order-creation transaction in orders.server.ts via pessimistic
 * row locking (SELECT ... FOR UPDATE on the Discount row and re-count),
 * so a race between concurrent checkouts redeeming the last use of a
 * limited code can never over-redeem it.
 */
export async function applyDiscountCode(
  code: string,
  lines: CartLineForDiscount[],
  userId: string | null
): Promise<{ discountId: string; result: DiscountResult }> {
  const discount = await prisma.discount.findUnique({ where: { code } });
  if (!discount || !discount.isActive) throw new DiscountNotFoundError(code);

  if (discount.usageLimit !== null) {
    const totalRedemptions = await prisma.discountRedemption.count({
      where: { discountId: discount.id },
    });
    if (totalRedemptions >= discount.usageLimit) {
      throw new DiscountUsageLimitError(`Code "${code}" has reached its usage limit`);
    }
  }

  if (userId && discount.perCustomerLimit !== null) {
    const customerRedemptions = await prisma.discountRedemption.count({
      where: { discountId: discount.id, userId },
    });
    if (customerRedemptions >= discount.perCustomerLimit) {
      throw new DiscountUsageLimitError(`Code "${code}" has already been used on this account`);
    }
  }

  const result = computeDiscount(lines, {
    type: discount.type,
    value: discount.value,
    minimumSpend: discount.minimumSpend,
    startsAt: discount.startsAt,
    expiresAt: discount.expiresAt,
    isActive: discount.isActive,
  });

  return { discountId: discount.id, result };
}

/**
 * Authoritative, row-locked discount usage limit check executed inside the
 * order creation transaction (orders.server.ts).
 *
 * Acquires a row lock on the target Discount via SELECT ... FOR UPDATE, then
 * re-checks both total usageLimit and perCustomerLimit under the lock.
 * If either limit is reached or exceeded, throws DiscountUsageLimitError,
 * aborting the transaction before any DiscountRedemption or Order is committed.
 */
export async function verifyAndLockDiscount(
  tx: Prisma.TransactionClient,
  discountId: string,
  userId: string | null
): Promise<void> {
  const [locked] = await tx.$queryRaw<
    Array<{ id: string; code: string; usageLimit: number | null; perCustomerLimit: number | null }>
  >`SELECT id, code, "usageLimit", "perCustomerLimit" FROM discounts WHERE id = ${discountId} FOR UPDATE`;

  if (!locked) return;

  if (locked.usageLimit !== null) {
    const totalRedemptions = await tx.discountRedemption.count({
      where: { discountId },
    });
    if (totalRedemptions >= locked.usageLimit) {
      throw new DiscountUsageLimitError(`Code "${locked.code}" has reached its usage limit`);
    }
  }

  if (userId && locked.perCustomerLimit !== null) {
    const customerRedemptions = await tx.discountRedemption.count({
      where: { discountId, userId },
    });
    if (customerRedemptions >= locked.perCustomerLimit) {
      throw new DiscountUsageLimitError(`Code "${locked.code}" has already been used on this account`);
    }
  }
}
