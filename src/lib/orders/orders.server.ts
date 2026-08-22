import "server-only";
import type Stripe from "stripe";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/payments/stripe";
import { getCartView } from "@/lib/cart/cart.server";
import { reserveCartLines, releaseReservations, commitReservations, InsufficientStockError } from "@/lib/inventory/inventory.server";
import { applyDiscountCode, verifyAndLockDiscount } from "@/lib/checkout/discounts.server";
import { assertTransition, type OrderStatus } from "@/lib/orders/orders";
import { splitProportionally } from "@/lib/payments/money";
import { sendOrderConfirmationEmail } from "@/lib/integrations/email.server";
import { logger } from "@/lib/shared/logger";
import { getValidatedCustomerAddress, type AddressSnapshot } from "@/lib/account/addresses.server";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";
import { createItemizedRefund } from "@/lib/orders/refunds.server";

/** Flat placeholder shipping rate — a real rates engine (carrier rates, free thresholds) is Phase 3+/stretch scope, not this phase's problem. */
const FLAT_SHIPPING_AMOUNT = 599;

export class EmptyCartError extends Error {
  constructor() {
    super("Cart is empty");
    this.name = "EmptyCartError";
  }
}

export class CartLineUnavailableError extends Error {
  constructor(public readonly variantId: string) {
    super(`Variant ${variantId} is no longer available`);
    this.name = "CartLineUnavailableError";
  }
}

function generateOrderNumber(): string {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `VAULT-${suffix}`;
}

/**
 * Turns a cart into a pending order with real, held inventory and a live
 * Stripe PaymentIntent. Every amount here is computed from what's in the
 * database at this instant — nothing from the request body reaches
 * Stripe. If reservation fails partway (someone else took the last
 * unit), nothing is left half-created: reserveCartLines is one
 * transaction, and if it throws, no order or PaymentIntent is created at
 * all.
 */
export async function createCheckoutSession(params: {
  cartId: string;
  userId: string | null;
  email: string;
  discountCode?: string;
  selectedAddressId?: string;
  checkoutAttemptId?: string;
  shippingAddress?: AddressSnapshot;
}): Promise<{ orderId: string; clientSecret: string }> {
  const cart = await getCartView(params.cartId);
  if (cart.lines.length === 0) throw new EmptyCartError();

  for (const line of cart.lines) {
    if (!line.isEnabled) throw new CartLineUnavailableError(line.variantId);
  }

  // Address Snapshot Resolution:
  // If selectedAddressId is provided, server re-verifies ownership and fetches
  // authoritative saved address. Client-supplied shippingAddress never overrides it.
  let shippingAddressSnapshot: AddressSnapshot | null = null;

  if (params.selectedAddressId) {
    if (!params.userId) {
      throw new Error("Authentication required to use saved address");
    }
    shippingAddressSnapshot = await getValidatedCustomerAddress(
      params.userId,
      params.selectedAddressId
    );
  } else if (params.shippingAddress) {
    shippingAddressSnapshot = {
      label: params.shippingAddress.label ?? "Home",
      fullName: params.shippingAddress.fullName,
      address: params.shippingAddress.address,
      apartment: params.shippingAddress.apartment,
      city: params.shippingAddress.city,
      state: params.shippingAddress.state,
      zip: params.shippingAddress.zip,
      country: params.shippingAddress.country ?? "United States",
      phone: params.shippingAddress.phone,
    };
  }

  const currency = cart.currency ?? "USD";

  let discountId: string | null = null;
  let discountAmount = 0;
  let freeShipping = false;
  let perLineDiscount: number[] = cart.lines.map(() => 0);

  if (params.discountCode) {
    const { discountId: id, result } = await applyDiscountCode(
      params.discountCode,
      cart.lines.map((l) => ({ variantId: l.variantId, unitAmount: l.unitAmount, quantity: l.quantity })),
      params.userId
    );
    if (result.eligible) {
      discountId = id;
      discountAmount = result.totalDiscount;
      freeShipping = result.freeShipping;
      perLineDiscount = result.perLineDiscount;
    }
  }

  const shippingAmount = freeShipping ? 0 : FLAT_SHIPPING_AMOUNT;
  const taxAmount = 0; // out of scope this phase — see README
  const totalAmount = cart.subtotal - discountAmount + shippingAmount + taxAmount;

  // Reserve stock for the whole cart atomically before we talk to Stripe
  const { reservationIds, expiresAt } = await reserveCartLines(
    cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    params.cartId
  );

  try {
    // External Stripe network call outside Prisma transaction with canonical idempotency key
    const stripeIdempotencyKey = params.checkoutAttemptId
      ? `checkout_${params.cartId}_${params.checkoutAttemptId}`
      : `checkout_${params.cartId}_${Date.now()}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: totalAmount,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: params.email,
        metadata: { cartId: params.cartId },
      },
      {
        idempotencyKey: stripeIdempotencyKey,
      }
    );

    const order = await prisma.$transaction(async (tx) => {
      if (discountId) {
        await verifyAndLockDiscount(tx, discountId, params.userId);
      }

      const created = await tx.order.create({
        data: {
          number: generateOrderNumber(),
          status: "pending",
          userId: params.userId,
          email: params.email,
          currency,
          subtotalAmount: cart.subtotal,
          discountAmount,
          shippingAmount,
          taxAmount,
          totalAmount,
          shippingAddress: (shippingAddressSnapshot as unknown as Prisma.InputJsonValue) ?? undefined,
          discountId,
          stripePaymentIntentId: paymentIntent.id,
          reservationExpiresAt: expiresAt,
          items: {
            create: cart.lines.map((line, index) => ({
              variantId: line.variantId,
              titleSnapshot: line.productTitle,
              skuSnapshot: line.sku,
              optionsSnapshot: line.options,
              unitAmount: line.unitAmount,
              quantity: line.quantity,
              lineTotal: line.lineTotal - (perLineDiscount[index] ?? 0),
            })),
          },
        },
      });

      await tx.reservation.updateMany({
        where: { id: { in: reservationIds } },
        data: { orderId: created.id, cartId: null },
      });

      if (discountId) {
        await tx.discountRedemption.create({
          data: { discountId, userId: params.userId, orderId: created.id },
        });
      }

      // Clear the purchased items from the active checkout cart
      await tx.cartItem.deleteMany({
        where: { cartId: params.cartId },
      });

      return created;
    }, { maxWait: 15000, timeout: 30000 });

    if (!paymentIntent.client_secret) {
      throw new Error("Stripe did not return a client secret");
    }

    return { orderId: order.id, clientSecret: paymentIntent.client_secret };
  } catch (error) {
    // Reservation succeeded but something downstream failed (Stripe call,
    // order write) — release the hold rather than leaving stock reserved
    // against a checkout that never got a PaymentIntent or order row.
    await prisma.$transaction((tx) => releaseReservations(tx, reservationIds));
    throw error;
  }
}

/**
 * Marks an order paid and converts its held reservations into a real
 * stock decrement, inside one transaction. Called only from the webhook
 * handler after idempotency has already been established — see
 * webhooks.server.ts and docs/decisions/0009-webhook-idempotency.md.
 * Safe to no-op if the order is already past `pending` (e.g. a
 * near-simultaneous duplicate delivery that raced past the StripeEvent
 * guard some other way) rather than throwing on a redundant call.
 *
 * Returns the paid order's id when this call is what actually
 * transitioned it (or null on a no-op) — the caller sends the order
 * confirmation email using that id *after* this transaction commits,
 * never from inside it. See ADR 0019.
 */
export async function markOrderPaidByPaymentIntent(
  tx: Prisma.TransactionClient,
  paymentIntentId: string
): Promise<{ orderId: string } | null> {
  const order = await tx.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { reservations: true, items: true },
  });

  if (!order) return null; // PaymentIntent not tied to an order we know about — nothing to do
  if (order.status !== "pending") return null; // already processed, e.g. a duplicate that slipped past StripeEvent some other way

  assertTransition(order.status, "paid");

  await tx.order.update({ where: { id: order.id }, data: { status: "paid" } });
  await commitReservations(
    tx,
    order.reservations.map((r) => r.id)
  );

  // Clear any corresponding items from user's cart
  if (order.userId) {
    const userCart = await tx.cart.findFirst({
      where: { userId: order.userId },
      include: { items: true },
    });
    if (userCart) {
      for (const item of order.items) {
        const cartItem = userCart.items.find((ci) => ci.variantId === item.variantId);
        if (cartItem) {
          if (cartItem.quantity <= item.quantity) {
            await tx.cartItem.delete({ where: { id: cartItem.id } });
          } else {
            await tx.cartItem.update({
              where: { id: cartItem.id },
              data: { quantity: cartItem.quantity - item.quantity },
            });
          }
        }
      }
    }
  }

  return { orderId: order.id };
}

/** Marks an order cancelled and releases (not commits) its reservations — used for payment_intent.payment_failed and explicit cancellation. */
export async function cancelOrderByPaymentIntent(
  tx: Prisma.TransactionClient,
  paymentIntentId: string
): Promise<void> {
  const order = await tx.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { reservations: true },
  });

  if (!order) return;
  if (order.status !== "pending") return;

  assertTransition(order.status, "cancelled");

  await tx.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
  await releaseReservations(
    tx,
    order.reservations.map((r) => r.id)
  );
}

/**
 * Authoritatively queries Stripe for the current PaymentIntent status
 * and reconciles the local database if Stripe has already confirmed success/cancellation.
 */
export async function syncOrderPaymentStatusWithStripe(orderId: string): Promise<OrderStatus> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, stripePaymentIntentId: true },
  });

  if (!order) return "pending";
  if (order.status !== "pending" || !order.stripePaymentIntentId) {
    return order.status;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
    if (paymentIntent.status === "succeeded") {
      let paidId: string | null = null;
      await prisma.$transaction(async (tx) => {
        const result = await markOrderPaidByPaymentIntent(tx, paymentIntent.id);
        if (result) paidId = result.orderId;
      });

      if (paidId) {
        const fullOrder = await prisma.order.findUnique({ where: { id: paidId }, include: { items: true } });
        if (fullOrder) {
          await sendOrderConfirmationEmail(fullOrder);
        }
      }
      return "paid";
    } else if (paymentIntent.status === "canceled") {
      await prisma.$transaction(async (tx) => {
        await cancelOrderByPaymentIntent(tx, paymentIntent.id);
      });
      return "cancelled";
    }
  } catch (error) {
    logger.warn("stripe.reconcile_status_failed", { orderId, error });
  }

  return order.status;
}

/**
 * Cancels an order requested by the customer.
 * Enforces pre-shipment rule: allowed ONLY when status is "pending" or "paid".
 * Strictly rejects when status is "fulfilled" (Shipped) or "delivered".
 */
export async function customerCancelOrder(params: {
  orderId: string;
  userId: string;
  email?: string;
  reason?: string;
}): Promise<{ orderId: string; status: OrderStatus; isIdempotentNoOp?: boolean }> {
  const { orderId, userId, email, reason } = params;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: {
      items: true,
      reservations: true,
      refunds: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const isOwner = order.userId === userId || (order.email && email && order.email.toLowerCase() === email.toLowerCase() && !order.userId);
  if (!isOwner) {
    throw new Error("Unauthorized to cancel this order");
  }

  // Idempotency: If already cancelled, return cleanly without duplicate operations
  if (order.status === "cancelled") {
    return { orderId: order.id, status: "cancelled", isIdempotentNoOp: true };
  }

  if (order.status === "fulfilled" || order.status === "delivered") {
    throw new Error("Cannot cancel an order that has already been shipped or delivered. You may request a return once delivered.");
  }

  if (order.status === "refunded") {
    throw new Error("Cannot cancel an order that has already been refunded.");
  }

  if (order.status === "pending") {
    assertTransition("pending", "cancelled");
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
      await releaseReservations(
        tx,
        order.reservations.map((r) => r.id)
      );
      await appendAuditLog(tx, {
        actor: { userId, email: email ?? order.email ?? "", role: null },
        entityType: "Order",
        entityId: order.id,
        action: "transition",
        before: { status: "pending" },
        after: { status: "cancelled", reason: reason ?? "Customer cancellation" },
      });
    });
    return { orderId: order.id, status: "cancelled" };
  }

  if (order.status === "paid") {
    const unrefundedItems = order.items
      .filter((item) => item.quantity - item.refundedQuantity > 0)
      .map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity - item.refundedQuantity,
      }));

    if (unrefundedItems.length > 0) {
      await createItemizedRefund({
        orderId: order.id,
        actor: { userId, email: email ?? order.email ?? "", role: null },
        items: unrefundedItems,
        reason: reason ?? "Customer cancellation before shipment",
        restock: true,
        targetStatus: "cancelled",
      });
    } else {
      assertTransition(order.status, "cancelled");
      await prisma.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
    }

    return { orderId: order.id, status: "cancelled" };
  }

  throw new Error(`Cannot cancel order with status "${order.status}"`);
}

/**
 * Requests a return for a delivered order.
 * Strictly enforced: allowed ONLY when status is "delivered".
 * Automatically processes itemized refund & restocks returned items.
 */
export async function customerRequestReturn(params: {
  orderId: string;
  userId: string;
  email?: string;
  reason?: string;
  items?: { orderItemId: string; quantity: number }[];
}): Promise<{ orderId: string; status: OrderStatus; refundId: string; amount: number }> {
  const { orderId, userId, email, reason, items } = params;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: {
      items: true,
      refunds: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  const isOwner = order.userId === userId || (order.email && email && order.email.toLowerCase() === email.toLowerCase() && !order.userId);
  if (!isOwner) {
    throw new Error("Unauthorized to return this order");
  }

  if (order.status !== "delivered") {
    throw new Error("Return requests are only available for delivered orders.");
  }

  const unrefundedItems = order.items
    .filter((item) => item.quantity - item.refundedQuantity > 0)
    .map((item) => ({
      orderItemId: item.id,
      quantity: item.quantity - item.refundedQuantity,
    }));

  const targetItems = items && items.length > 0 ? items : unrefundedItems;
  if (targetItems.length === 0) {
    throw new Error("All items in this order have already been returned or refunded.");
  }

  const refundResult = await createItemizedRefund({
    orderId: order.id,
    actor: { userId, email: email ?? order.email ?? "", role: null },
    items: targetItems,
    reason: reason ?? "Customer return request",
    restock: true,
    targetStatus: "refunded",
  });

  return {
    orderId: order.id,
    status: refundResult.orderStatus,
    refundId: refundResult.refundId,
    amount: refundResult.amount,
  };
}

/**
 * Case A: Handles genuine uncaptured payment failures triggered by Stripe webhooks
 * or frontend payment failure callbacks.
 * Authoritatively verifies with Stripe that no funds were captured.
 * Inside a single atomic transaction: records first-write-wins failure tracking,
 * transitions order status to "failed", releases reservations, and writes audit log.
 * Never attempts a refund.
 */
export async function handlePaymentFailure(
  params: {
    paymentIntentId: string;
    failureReason?: string;
    failureDetectedAt?: Date;
    paymentIntent?: Stripe.PaymentIntent;
  },
  txParam?: Prisma.TransactionClient
): Promise<{ orderId?: string; status?: OrderStatus; refundRequired: boolean; isIdempotentNoOp?: boolean } | null> {
  const { paymentIntentId, failureReason, failureDetectedAt } = params;

  let paymentIntent = params.paymentIntent;
  if (!paymentIntent) {
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      logger.error("stripe.retrieve_payment_intent_failed", { paymentIntentId, error });
      throw error;
    }
  }

  const db = txParam ?? prisma;
  const order = await db.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: {
      reservations: true,
      refunds: true,
    },
  });

  if (!order) {
    logger.warn("orders.failure_order_not_found", { paymentIntentId });
    return null;
  }

  // If Stripe reports funds were actually captured, DO NOT execute uncaptured flow or blind workflow recovery
  if (paymentIntent.amount_received > 0) {
    logger.warn("orders.unexpected_capture_on_payment_failed", {
      orderId: order.id,
      paymentIntentId,
      amountReceived: paymentIntent.amount_received,
    });
    return {
      orderId: order.id,
      status: order.status,
      refundRequired: true,
    };
  }

  // Idempotency check: if order is already failed and reservations released
  if ((order.status as OrderStatus) === "failed") {
    return {
      orderId: order.id,
      status: "failed",
      refundRequired: false,
      isIdempotentNoOp: true,
    };
  }

  // Validate state transition
  assertTransition(order.status as OrderStatus, "failed");

  const orderWithFailure = order as typeof order & { failureDetectedAt?: Date | null; failureReason?: string | null };
  const detectedAt = orderWithFailure.failureDetectedAt ?? failureDetectedAt ?? new Date();
  const reason = orderWithFailure.failureReason ?? failureReason ?? "Payment processing failed before capture";

  const executeUpdate = async (tx: Prisma.TransactionClient) => {
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "failed" as any,
        failureDetectedAt: detectedAt,
        failureReason: reason,
      } as any,
    });

    if (order.reservations.length > 0) {
      await releaseReservations(
        tx,
        order.reservations.map((r) => r.id)
      );
    }

    await appendAuditLog(tx, {
      actor: { userId: order.userId ?? "system", email: order.email, role: null },
      entityType: "Order",
      entityId: order.id,
      action: "transition",
      before: { status: order.status },
      after: {
        status: "failed",
        refundRequired: false,
        failureDetectedAt: detectedAt.toISOString(),
        failureReason: reason,
      },
    });
  };

  if (txParam) {
    await executeUpdate(txParam);
  } else {
    await prisma.$transaction(executeUpdate);
  }

  return {
    orderId: order.id,
    status: "failed",
    refundRequired: false,
  };
}

/**
 * Case B: Handles captured payment + internal VAULT workflow/fulfillment fatal failures.
 * Authoritatively verifies captured funds in Stripe.
 * First-write-wins records failureDetectedAt and failureReason.
 * Transitions order from recoverable state to "failed".
 * Idempotently initiates refund using verified createItemizedRefund contract with deterministic key.
 * Measures target SLA (<= 5 minutes). If SLA is breached, logs breach but NEVER cancels/aborts refund.
 */
export async function handleCapturedWorkflowFailure(params: {
  orderId: string;
  failureReason?: string;
  failureDetectedAt?: Date;
  actor?: AuditActor;
}): Promise<{
  orderId: string;
  status: OrderStatus;
  refundId: string;
  amount: number;
  elapsedMs: number;
  slaCompliant: boolean;
  isIdempotentNoOp?: boolean;
}> {
  const { orderId, failureReason, failureDetectedAt, actor } = params;

  const order = await prisma.order.findFirst({
    where: { OR: [{ id: orderId }, { number: orderId }] },
    include: {
      items: true,
      refunds: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (!order.stripePaymentIntentId) {
    throw new Error("Order has no associated Stripe PaymentIntent");
  }

  // Authoritatively check Stripe capture status
  const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);
  if (paymentIntent.amount_received === 0) {
    throw new Error("Cannot execute captured-workflow recovery for uncaptured PaymentIntent");
  }

  const orderWithFailure = order as typeof order & { failureDetectedAt?: Date | null; failureReason?: string | null };
  const detectedAt = orderWithFailure.failureDetectedAt ?? failureDetectedAt ?? new Date();
  const reason = orderWithFailure.failureReason ?? failureReason ?? "Internal workflow processing failure post-capture";

  // If order is not failed yet, validate transition and update status + failure metadata
  if ((order.status as OrderStatus) !== "failed") {
    assertTransition(order.status as OrderStatus, "failed");
    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "failed" as any,
        failureDetectedAt: detectedAt,
        failureReason: reason,
      } as any,
    });
  } else if (!orderWithFailure.failureDetectedAt || !orderWithFailure.failureReason) {
    await prisma.order.update({
      where: { id: order.id },
      data: {
        failureDetectedAt: detectedAt,
        failureReason: reason,
      } as any,
    });
  }

  // Check remaining unrefunded items
  const unrefundedItems = order.items
    .filter((item) => item.quantity - item.refundedQuantity > 0)
    .map((item) => ({
      orderItemId: item.id,
      quantity: item.quantity - item.refundedQuantity,
    }));

  if (unrefundedItems.length === 0) {
    const existingRefund = order.refunds[0];
    return {
      orderId: order.id,
      status: "failed",
      refundId: existingRefund?.id ?? "",
      amount: existingRefund?.amount ?? 0,
      elapsedMs: 0,
      slaCompliant: true,
      isIdempotentNoOp: true,
    };
  }

  const effectiveActor: AuditActor = actor ?? {
    userId: order.userId ?? "system",
    email: order.email,
    role: null,
  };

  const refundResult = await createItemizedRefund({
    orderId: order.id,
    actor: effectiveActor,
    items: unrefundedItems,
    reason: `Automatic recovery: ${reason}`,
    restock: true,
    targetStatus: "failed",
  });

  const initiatedAt = new Date();
  const elapsedMs = initiatedAt.getTime() - detectedAt.getTime();
  const slaCompliant = elapsedMs <= 300000;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      refundInitiatedAt: initiatedAt,
    } as any,
  });

  await prisma.$transaction(async (tx) => {
    await appendAuditLog(tx, {
      actor: effectiveActor,
      entityType: "Order",
      entityId: order.id,
      action: "refund",
      after: {
        status: "failed",
        refundRequired: true,
        refundId: refundResult.refundId,
        refundAmount: refundResult.amount,
        failureDetectedAt: detectedAt.toISOString(),
        refundInitiatedAt: initiatedAt.toISOString(),
        elapsedMs,
        slaCompliant,
        slaBreached: !slaCompliant,
      },
    });
  });

  return {
    orderId: order.id,
    status: "failed",
    refundId: refundResult.refundId,
    amount: refundResult.amount,
    elapsedMs,
    slaCompliant,
  };
}

export { InsufficientStockError, splitProportionally, releaseReservations };

