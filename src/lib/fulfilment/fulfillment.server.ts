import "server-only";
import { prisma } from "@/lib/db/prisma";
import { assertTransition } from "@/lib/orders/orders";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";
import { releaseReservations } from "@/lib/inventory/inventory.server";
import { sendShippingNoticeEmail } from "@/lib/integrations/email.server";

export class OverFulfillmentError extends Error {
  constructor(public readonly orderItemId: string, public readonly requested: number, public readonly remaining: number) {
    super(`Cannot fulfil ${requested} of order item ${orderItemId} — only ${remaining} remain unfulfilled`);
    this.name = "OverFulfillmentError";
  }
}

export interface FulfilRequestItem {
  orderItemId: string;
  quantity: number;
}

/**
 * Records a shipment covering some or all of an order's remaining
 * unfulfilled quantity. A single order can be fulfilled by several
 * calls to this function (partial fulfilment, multiple shipments) —
 * `OrderItem.fulfilledQuantity` accumulates across them, and the
 * order's own status only moves to `fulfilled` once every line is
 * fully covered, checked fresh on every call rather than assumed from
 * this call's own request.
 */
export async function fulfilOrderItems(params: {
  orderId: string;
  actor: AuditActor;
  trackingNumber: string;
  carrier?: string;
  items: FulfilRequestItem[];
}): Promise<{ fulfillmentId: string; orderStatus: string; trackingNumber: string }> {
  const { orderId, actor, trackingNumber, carrier, items } = params;
  if (items.length === 0) throw new Error("At least one item is required to fulfil");

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        items: true,
        fulfillments: { include: { items: true }, orderBy: { createdAt: "desc" } },
      },
    });

    // Idempotency: If the order is already fulfilled and has existing fulfillment, safely return existing state
    if (order.status === "fulfilled" && order.fulfillments.length > 0) {
      const isAlreadyFulfilled = order.items.every((item) => item.fulfilledQuantity >= item.quantity);
      if (isAlreadyFulfilled) {
        return {
          fulfillmentId: order.fulfillments[0]!.id,
          orderStatus: "fulfilled",
          trackingNumber: order.fulfillments[0]!.trackingNumber,
          isIdempotentNoOp: true,
        };
      }
    }

    if (order.status !== "paid") {
      throw new Error(`Cannot fulfil an order in status "${order.status}" — only paid orders can ship`);
    }

    const orderItemsById = new Map(order.items.map((item) => [item.id, item]));

    for (const request of items) {
      const orderItem = orderItemsById.get(request.orderItemId);
      if (!orderItem) throw new Error(`Order item ${request.orderItemId} does not belong to order ${orderId}`);
      const remaining = orderItem.quantity - orderItem.fulfilledQuantity;
      if (request.quantity > remaining) {
        throw new OverFulfillmentError(request.orderItemId, request.quantity, remaining);
      }
    }

    const fulfillment = await tx.fulfillment.create({
      data: {
        orderId,
        trackingNumber,
        carrier,
        items: { create: items.map((i) => ({ orderItemId: i.orderItemId, quantity: i.quantity })) },
      },
    });

    for (const request of items) {
      await tx.orderItem.update({
        where: { id: request.orderItemId },
        data: { fulfilledQuantity: { increment: request.quantity } },
      });
    }

    // Re-read to see whether this shipment completed the order —
    // computed from the line items themselves, not a flag this
    // function sets, so it can never drift from what was actually
    // shipped.
    const refreshedItems = await tx.orderItem.findMany({ where: { orderId } });
    const isFullyFulfilled = refreshedItems.every((item) => item.fulfilledQuantity >= item.quantity);

    let orderStatus: string = order.status;
    if (isFullyFulfilled) {
      assertTransition(order.status, "fulfilled");
      await tx.order.update({ where: { id: orderId }, data: { status: "fulfilled" } });
      orderStatus = "fulfilled";

      await appendAuditLog(tx, {
        actor,
        entityType: "Order",
        entityId: orderId,
        action: "transition",
        before: { status: order.status },
        after: { status: "fulfilled" },
      });
    }

    await appendAuditLog(tx, {
      actor,
      entityType: "Fulfillment",
      entityId: fulfillment.id,
      action: "create",
      after: { orderId, trackingNumber, items: items as any },
    });

    return {
      fulfillmentId: fulfillment.id,
      orderStatus,
      trackingNumber,
      isIdempotentNoOp: false,
      orderForEmail: { id: order.id, number: order.number, email: order.email, currency: order.currency, totalAmount: order.totalAmount, items: order.items },
      shippedItems: items.map((i) => ({
        titleSnapshot: orderItemsById.get(i.orderItemId)?.titleSnapshot ?? "Item",
        quantity: i.quantity,
      })),
      isPartial: !isFullyFulfilled,
    };
  });

  if (!result.isIdempotentNoOp && result.orderForEmail && result.shippedItems) {
    // Sent after commit, never from inside the transaction — see ADR
    // 0019. A slow or failed email can't hold the fulfillment lock open
    // or cause it to roll back.
    await sendShippingNoticeEmail({
      order: result.orderForEmail,
      trackingNumber,
      carrier,
      shippedItems: result.shippedItems,
      isPartial: result.isPartial,
    }).catch(() => undefined);
  }

  return {
    fulfillmentId: result.fulfillmentId,
    orderStatus: result.orderStatus,
    trackingNumber: result.trackingNumber,
  };
}

/**
 * Cancels an order. Restricted to `pending` orders — a `paid` order's
 * reservations were already committed to a real stock decrement (see
 * ADR 0009), so "cancelling" it can't simply release a reservation the
 * way cancelling an unpaid order can. A paid order that needs to be
 * unwound is a refund (see refunds.server.ts), which handles the
 * restock decision explicitly instead of a cancel action silently
 * deciding it either way.
 */
export async function cancelOrder(params: { orderId: string; actor: AuditActor; reason?: string }): Promise<void> {
  const { orderId, actor, reason } = params;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { reservations: true },
    });

    if (order.status !== "pending") {
      throw new Error(
        `Cannot cancel an order in status "${order.status}" — only a pending (unpaid) order can be cancelled directly; a paid order should be refunded instead`
      );
    }

    assertTransition(order.status, "cancelled");
    await tx.order.update({ where: { id: orderId }, data: { status: "cancelled" } });
    await releaseReservations(tx, order.reservations.map((r) => r.id));

    await appendAuditLog(tx, {
      actor,
      entityType: "Order",
      entityId: orderId,
      action: "transition",
      before: { status: "pending" },
      after: { status: "cancelled", reason: reason ?? null },
    });
  });
}

/**
 * Marks an order as delivered. Transitions `fulfilled` -> `delivered`.
 * Atomic within a Prisma transaction, enforces state machine rules via assertTransition,
 * records exactly one transition audit log, and is strictly idempotent with 0 additional
 * writes/logs on repeated calls.
 */
export async function markOrderDelivered(params: {
  orderId: string;
  actor: AuditActor;
}): Promise<{ orderId: string; orderStatus: string; isIdempotentNoOp?: boolean }> {
  const { orderId, actor } = params;

  return await prisma.$transaction(async (tx) => {
    // 1. Single authoritative lookup (throws NotFound if order does not exist)
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    // 2. Idempotency guard: If already delivered, return current state safely without duplicate writes or audit logs
    if (order.status === "delivered") {
      return {
        orderId: order.id,
        orderStatus: "delivered",
        isIdempotentNoOp: true,
      };
    }

    // 3. State machine validation (throws IllegalOrderTransitionError if not in fulfilled status)
    assertTransition(order.status, "delivered");

    // 4. Atomic status update
    await tx.order.update({
      where: { id: orderId },
      data: { status: "delivered" },
    });

    // 5. Exactly ONE audit log entry
    await appendAuditLog(tx, {
      actor,
      entityType: "Order",
      entityId: orderId,
      action: "transition",
      before: { status: order.status },
      after: { status: "delivered" },
    });

    return {
      orderId: order.id,
      orderStatus: "delivered",
      isIdempotentNoOp: false,
    };
  });
}

