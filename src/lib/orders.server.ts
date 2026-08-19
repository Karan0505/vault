import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCartView } from "@/lib/cart.server";
import { reserveCartLines, releaseReservations, commitReservations, InsufficientStockError } from "@/lib/inventory.server";
import { applyDiscountCode } from "@/lib/discounts.server";
import { assertTransition, type OrderStatus } from "@/lib/orders";
import { splitProportionally } from "@/lib/money";
import { sendOrderConfirmationEmail } from "@/lib/email.server";
import { logger } from "@/lib/logger";

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
}): Promise<{ orderId: string; clientSecret: string }> {
  const cart = await getCartView(params.cartId);
  if (cart.lines.length === 0) throw new EmptyCartError();

  for (const line of cart.lines) {
    if (!line.isEnabled) throw new CartLineUnavailableError(line.variantId);
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

  // Reserve stock for the whole cart atomically before we ever talk to
  // Stripe or create an order row — a checkout that can't be fulfilled
  // never gets a PaymentIntent.
  const { reservationIds, expiresAt } = await reserveCartLines(
    cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
    params.cartId
  );

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      receipt_email: params.email,
      metadata: { cartId: params.cartId },
    });

    const order = await prisma.$transaction(async (tx) => {
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
    });

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

export { InsufficientStockError, splitProportionally };
