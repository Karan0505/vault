import "server-only";
import { prisma } from "@/lib/db/prisma";
import { computeDiscount, type CartLineForDiscount, type DiscountResult } from "@/lib/checkout/discounts";

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
 * convenience (fail fast in the cart); the authoritative enforcement is
 * the unique constraint on DiscountRedemption.orderId plus a recount
 * inside the order-creation transaction in orders.server.ts, so a race
 * between two checkouts redeeming the last use of a limited code still
 * can't over-redeem it.
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
