import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";
import { hasPermission } from "@/lib/auth/permissions";
import type { DiscountType } from "@prisma/client";

export const createDiscountSchema = z.object({
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(30)
    .regex(/^[A-Z0-9_-]+$/i, "Code must contain only letters, numbers, hyphens, or underscores")
    .transform((v) => v.toUpperCase().trim()),
  type: z.enum(["percentage", "fixed_amount", "free_shipping"] as const),
  value: z.number().int().min(0),
  currency: z.string().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perCustomerLimit: z.number().int().min(1).nullable().optional().default(1),
  minimumSpend: z.number().int().min(0).nullable().optional(),
  startsAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateDiscountInput = z.infer<typeof createDiscountSchema>;

/**
 * Returns all discounts with computed redemption metrics and usage analytics.
 */
export async function getAdminDiscounts() {
  const discounts = await prisma.discount.findMany({
    include: {
      _count: {
        select: {
          redemptions: true,
          orders: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return discounts.map((d) => ({
    id: d.id,
    code: d.code,
    type: d.type,
    value: d.value,
    currency: d.currency,
    usageLimit: d.usageLimit,
    perCustomerLimit: d.perCustomerLimit,
    minimumSpend: d.minimumSpend,
    startsAt: d.startsAt?.toISOString() ?? null,
    expiresAt: d.expiresAt?.toISOString() ?? null,
    isActive: d.isActive,
    redemptionCount: d._count.redemptions,
    orderCount: d._count.orders,
    createdAt: d.createdAt.toISOString(),
  }));
}

/**
 * Creates a new discount code after validation.
 */
export async function createDiscount(input: unknown, actor: AuditActor) {
  if (!hasPermission(actor.role, "discounts:manage")) {
    throw new Error("Forbidden: Missing discounts:manage permission");
  }

  const parsed = createDiscountSchema.parse(input);

  const existing = await prisma.discount.findUnique({
    where: { code: parsed.code },
  });

  if (existing) {
    throw new Error(`Discount code "${parsed.code}" already exists`);
  }

  const created = await prisma.discount.create({
    data: {
      code: parsed.code,
      type: parsed.type as DiscountType,
      value: parsed.value,
      currency: parsed.type === "fixed_amount" ? parsed.currency || "USD" : null,
      usageLimit: parsed.usageLimit ?? null,
      perCustomerLimit: parsed.perCustomerLimit ?? 1,
      minimumSpend: parsed.minimumSpend ?? null,
      startsAt: parsed.startsAt ? new Date(parsed.startsAt) : null,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      isActive: parsed.isActive ?? true,
    },
  });

  await appendAuditLog(prisma, {
    actor,
    entityType: "Discount",
    entityId: created.id,
    action: "create",
    before: null,
    after: { code: created.code, type: created.type, value: created.value },
  });

  return created;
}

/**
 * Toggles a discount's active status.
 */
export async function toggleDiscountActive(discountId: string, isActive: boolean, actor: AuditActor) {
  if (!hasPermission(actor.role, "discounts:manage")) {
    throw new Error("Forbidden: Missing discounts:manage permission");
  }

  const discount = await prisma.discount.findUniqueOrThrow({
    where: { id: discountId },
  });

  const updated = await prisma.discount.update({
    where: { id: discountId },
    data: { isActive },
  });

  await appendAuditLog(prisma, {
    actor,
    entityType: "Discount",
    entityId: discountId,
    action: "update",
    before: { isActive: discount.isActive },
    after: { isActive },
  });

  return updated;
}

/**
 * Safely deletes or archives a discount code.
 * If redemptions or historical orders exist, soft-deactivates (isActive = false) to protect history.
 * If 0 redemptions, permanently deletes.
 */
export async function deleteOrArchiveDiscount(discountId: string, actor: AuditActor) {
  if (!hasPermission(actor.role, "discounts:manage")) {
    throw new Error("Forbidden: Missing discounts:manage permission");
  }

  const discount = await prisma.discount.findUniqueOrThrow({
    where: { id: discountId },
    include: {
      _count: {
        select: {
          redemptions: true,
          orders: true,
        },
      },
    },
  });

  if (discount._count.redemptions > 0 || discount._count.orders > 0) {
    // Soft archive
    const archived = await prisma.discount.update({
      where: { id: discountId },
      data: { isActive: false },
    });

    await appendAuditLog(prisma, {
      actor,
      entityType: "Discount",
      entityId: discountId,
      action: "update",
      before: { isActive: discount.isActive },
      after: { isActive: false, archived: true },
    });

    return { archived: true, deleted: false, discount: archived };
  }

  // Safe permanent delete
  await prisma.discount.delete({
    where: { id: discountId },
  });

  await appendAuditLog(prisma, {
    actor,
    entityType: "Discount",
    entityId: discountId,
    action: "delete",
    before: { code: discount.code },
    after: null,
  });

  return { archived: false, deleted: true };
}
