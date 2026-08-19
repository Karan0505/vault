import "server-only";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { assertTransition, type OrderStatus } from "@/lib/orders";
import { splitEvenly } from "@/lib/money";
import { appendAuditLog, type AuditActor } from "@/lib/audit.server";
import { adjustStockInTx } from "@/lib/inventory-admin.server";
import { revalidateProduct } from "@/lib/revalidate";
import { sendRefundNoticeEmail } from "@/lib/email.server";

export class OverRefundError extends Error {
  constructor(public readonly orderItemId: string, public readonly requested: number, public readonly remaining: number) {
    super(`Cannot refund ${requested} of order item ${orderItemId} — only ${remaining} remain unrefunded`);
    this.name = "OverRefundError";
  }
}

export interface RefundRequestItem {
  orderItemId: string;
  quantity: number;
}

/**
 * Refunds specific line items in specific quantities. The amount for
 * each unit refunded comes from `splitEvenly(orderItem.lineTotal,
 * orderItem.quantity)` — the exact same per-unit share every other
 * unit of that line was allocated, sliced by how many units of that
 * line have already been refunded before this call. That's what makes
 * refunding a line's five units across three separate partial refunds
 * sum to exactly its lineTotal, no more and no less, regardless of how
 * the discount's own remainder cent landed when the order was placed.
 *
 * `restock` is a required, explicit parameter — there is no default
 * and no inference from the refund reason. See
 * docs/decisions/0017-refunds-and-restock.md.
 */
export async function createItemizedRefund(params: {
  orderId: string;
  actor: AuditActor;
  items: RefundRequestItem[];
  reason?: string;
  restock: boolean;
}): Promise<{ refundId: string; amount: number; orderStatus: OrderStatus }> {
  const { orderId, actor, items, reason, restock } = params;
  if (items.length === 0) throw new Error("At least one item is required to refund");

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { items: true, refunds: { include: { items: true } } },
  });

  if (order.status !== "paid" && order.status !== "fulfilled" && order.status !== "delivered") {
    throw new Error(`Cannot refund an order in status "${order.status}"`);
  }
  if (!order.stripePaymentIntentId) {
    throw new Error("Order has no PaymentIntent — nothing was ever charged");
  }

  const orderItemsById = new Map(order.items.map((item) => [item.id, item]));
  let totalRefundAmount = 0;

  for (const request of items) {
    const orderItem = orderItemsById.get(request.orderItemId);
    if (!orderItem) throw new Error(`Order item ${request.orderItemId} does not belong to order ${orderId}`);

    const remaining = orderItem.quantity - orderItem.refundedQuantity;
    if (request.quantity > remaining) {
      throw new OverRefundError(request.orderItemId, request.quantity, remaining);
    }

    const perUnitShares = splitEvenly(orderItem.lineTotal, orderItem.quantity);
    const alreadyRefunded = orderItem.refundedQuantity;
    const sharesForThisRefund = perUnitShares.slice(alreadyRefunded, alreadyRefunded + request.quantity);
    const amount = sharesForThisRefund.reduce((sum, share) => sum + share, 0);

    totalRefundAmount += amount;
  }

  // Stripe call happens outside the transaction — it's the one step
  // here that can't be rolled back, so it must either fully succeed
  // before any database state changes, or fail before any does.
  const stripeRefund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount: totalRefundAmount,
    reason: "requested_by_customer",
  });

  const revalidatedProducts: { slug: string; categorySlug?: string | null }[] = [];

  const result = await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: {
        orderId,
        amount: totalRefundAmount,
        reason,
        stripeRefundId: stripeRefund.id,
        restocked: restock,
        items: {
          create: items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })),
        },
      },
    });

    for (const request of items) {
      await tx.orderItem.update({
        where: { id: request.orderItemId },
        data: { refundedQuantity: { increment: request.quantity } },
      });
    }

    if (restock) {
      for (const request of items) {
        const orderItem = orderItemsById.get(request.orderItemId);
        if (!orderItem) continue;
        // adjustStockInTx takes its own row lock and writes its own
        // audit entry, but runs inside THIS transaction — so if
        // anything later in this block fails, the restock rolls back
        // along with the refund record, instead of being an
        // independently-committed side effect. See the note on
        // adjustStockInTx in inventory-admin.server.ts.
        const adjustment = await adjustStockInTx(tx, {
          variantId: orderItem.variantId,
          delta: request.quantity,
          reason: "returned",
          note: `Restocked from refund ${refund.id}`,
          actor,
        });
        revalidatedProducts.push({ slug: adjustment.productSlug, categorySlug: adjustment.categorySlug });
      }
    }

    const priorRefundedTotal = order.refunds.reduce((sum, r) => sum + r.amount, 0);
    const isFullRefund = priorRefundedTotal + totalRefundAmount >= order.totalAmount;

    let orderStatus: OrderStatus = order.status;
    if (isFullRefund) {
      assertTransition(order.status, "refunded");
      await tx.order.update({ where: { id: orderId }, data: { status: "refunded" } });
      orderStatus = "refunded";
    }

    await appendAuditLog(tx, {
      actor,
      entityType: "Refund",
      entityId: refund.id,
      action: "refund",
      after: { orderId, amount: totalRefundAmount, restock, items: items as any, isFullRefund },
    });


    return { refundId: refund.id, orderStatus };
  });

  for (const product of revalidatedProducts) {
    revalidateProduct({ productSlug: product.slug, categorySlug: product.categorySlug });
  }

  return { refundId: result.refundId, amount: totalRefundAmount, orderStatus: result.orderStatus };
}

/**
 * A goodwill or adjustment refund not tied to specific items — a
 * partial credit, a shipping fee waived after the fact. Always
 * restock: false, because there's nothing itemized to restock; this
 * is the one refund path where that's implicit rather than an
 * explicit parameter, precisely because there's no item list for an
 * explicit choice to apply to.
 */
export async function createGoodwillRefund(params: {
  orderId: string;
  actor: AuditActor;
  amount: number;
  reason: string;
}): Promise<{ refundId: string; amount: number; orderStatus: OrderStatus }> {
  const { orderId, actor, amount, reason } = params;
  if (amount <= 0) throw new Error("amount must be positive");

  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: { refunds: true },
  });

  if (order.status !== "paid" && order.status !== "fulfilled" && order.status !== "delivered") {
    throw new Error(`Cannot refund an order in status "${order.status}"`);
  }
  if (!order.stripePaymentIntentId) {
    throw new Error("Order has no PaymentIntent — nothing was ever charged");
  }

  const priorRefundedTotal = order.refunds.reduce((sum, r) => sum + r.amount, 0);
  if (priorRefundedTotal + amount > order.totalAmount) {
    throw new Error("Refund amount would exceed the order total");
  }

  const stripeRefund = await stripe.refunds.create({
    payment_intent: order.stripePaymentIntentId,
    amount,
    reason: "requested_by_customer",
  });

  const result = await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.create({
      data: { orderId, amount, reason, stripeRefundId: stripeRefund.id, restocked: false },
    });

    const isFullRefund = priorRefundedTotal + amount >= order.totalAmount;
    let orderStatus: OrderStatus = order.status;
    if (isFullRefund) {
      assertTransition(order.status, "refunded");
      await tx.order.update({ where: { id: orderId }, data: { status: "refunded" } });
      orderStatus = "refunded";
    }

    await appendAuditLog(tx, {
      actor,
      entityType: "Refund",
      entityId: refund.id,
      action: "refund",
      after: { orderId, amount, restock: false, goodwill: true, isFullRefund },
    });

    return { refundId: refund.id, orderStatus };
  });

  return { refundId: result.refundId, amount, orderStatus: result.orderStatus };
}
