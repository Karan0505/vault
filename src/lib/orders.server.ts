import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { getCartView, decrementPurchasedCartItems } from "@/lib/cart.server";
import { reserveCartLines, releaseReservations, commitReservations, InsufficientStockError } from "@/lib/inventory.server";
import { applyDiscountCode, DiscountNotFoundError, DiscountUsageLimitError } from "@/lib/discounts.server";
import { assertTransition } from "@/lib/orders";
import { splitProportionally } from "@/lib/money";

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
      if (discountId) {
        const [lockedDiscount] = await tx.$queryRaw<
          Array<{ usageLimit: number | null; perCustomerLimit: number | null; isActive: boolean }>
        >`SELECT "usageLimit", "perCustomerLimit", "isActive" FROM "discounts" WHERE id = ${discountId} FOR UPDATE`;

        if (!lockedDiscount || !lockedDiscount.isActive) {
          throw new DiscountNotFoundError(params.discountCode ?? "");
        }

        if (lockedDiscount.usageLimit !== null) {
          const totalCount = await tx.discountRedemption.count({
            where: { discountId },
          });
          if (totalCount >= lockedDiscount.usageLimit) {
            throw new DiscountUsageLimitError(`Code "${params.discountCode}" has reached its usage limit`);
          }
        }

        if (params.userId && lockedDiscount.perCustomerLimit !== null) {
          const userCount = await tx.discountRedemption.count({
            where: { discountId, userId: params.userId },
          });
          if (userCount >= lockedDiscount.perCustomerLimit) {
            throw new DiscountUsageLimitError(`Code "${params.discountCode}" has already been used on this account`);
          }
        }
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
 */
import { revalidateTag, revalidatePath } from "next/cache";
import { revalidateProduct } from "@/lib/revalidate";
import type { OrderStatus } from "@/lib/orders";

export function triggerOrderRevalidations(orderId: string, productSlugs: string[]) {
  for (const slug of productSlugs) {
    revalidateProduct({ productSlug: slug });
  }
  try {
    revalidatePath("/checkout/success");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/admin");
  } catch (e) {
    // Ignore cache revalidation errors outside request context
  }
}

export async function markOrderPaidByPaymentIntent(
  tx: Prisma.TransactionClient,
  paymentIntentId: string
): Promise<{ orderId: string; productSlugs: string[] } | null> {
  const order = await tx.order.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { reservations: true, items: { include: { variant: { include: { product: true } } } } },
  });

  if (!order) return null; // PaymentIntent not tied to an order we know about — nothing to do
  if (order.status !== "pending") return null; // already processed, e.g. a duplicate that slipped past StripeEvent some other way

  assertTransition(order.status, "paid");

  await tx.order.update({ where: { id: order.id }, data: { status: "paid" } });
  await commitReservations(
    tx,
    order.reservations.map((r) => r.id)
  );

  let cartId: string | null = null;
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    cartId = pi.metadata?.cartId ?? null;
  } catch {
    // If Stripe API call fails or mock test environment, fallback to userId
  }

  const purchasedItems = order.items.map((i) => ({
    variantId: i.variantId,
    quantity: i.quantity,
  }));

  await decrementPurchasedCartItems(tx, cartId, order.userId, purchasedItems);

  const productSlugs = order.items
    .map((item) => item.variant?.product?.slug)
    .filter((slug): slug is string => Boolean(slug));

  // Transactional email (order confirmation) is Phase 4 scope (Resend +
  // React Email). Logged here so the seam is visible and testable now.
  console.log(`[order ${order.number}] paid — confirmation email would send to ${order.email}`);

  return { orderId: order.id, productSlugs };
}

export async function verifyAndUpdateOrderStatus(orderId: string): Promise<{ id: string; status: OrderStatus }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, stripePaymentIntentId: true },
  });

  if (!order) throw new Error("Order not found");
  if (order.status !== "pending" || !order.stripePaymentIntentId) {
    return { id: order.id, status: order.status };
  }

  // Retrieve PaymentIntent from Stripe server-side only when DB status is still pending
  const paymentIntent = await stripe.paymentIntents.retrieve(order.stripePaymentIntentId);

    if (paymentIntent.status === "succeeded") {
      let revalResult: { orderId: string; productSlugs: string[] } | null = null;
      try {
        await prisma.$transaction(async (tx) => {
          const res = await markOrderPaidByPaymentIntent(tx, paymentIntent.id);
          if (res) revalResult = res;
        });
      } catch (err) {
        // Race condition handled safely: if another transaction marked it paid concurrently
      }

      const resultData = revalResult as { orderId: string; productSlugs: string[] } | null;
      if (resultData) {
        triggerOrderRevalidations(resultData.orderId, resultData.productSlugs);
      }

    const updated = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
    return { id: order.id, status: updated?.status ?? "paid" };
  }

  return { id: order.id, status: order.status };
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

export { InsufficientStockError, splitProportionally };
