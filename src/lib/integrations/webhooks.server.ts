import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { markOrderPaidByPaymentIntent, handlePaymentFailure } from "@/lib/orders/orders.server";
import { sendOrderConfirmationEmail } from "@/lib/integrations/email.server";
import { revalidateBestSellers } from "@/lib/validation/revalidate";
import { logger } from "@/lib/shared/logger";

export type WebhookOutcome = "processed" | "duplicate" | "ignored";

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = "P2002";

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
  );
}

/**
 * Processes one Stripe event exactly once, however many times Stripe
 * (or a replay in tests) actually delivers it.
 *
 * `stripe_events.id` is the Stripe event id itself — no surrogate key —
 * with a primary-key constraint doing the uniqueness enforcement. The
 * insert happens as the FIRST statement inside the same transaction
 * that applies the event's side effects (marking an order paid,
 * committing its reservations). Two consequences fall out of that:
 *
 *  1. A duplicate delivery's insert hits the primary-key constraint,
 *     throws, and aborts the transaction before any order mutation runs
 *     — "replay five times -> one order, one stock decrement" holds
 *     because the fourth and fifth replays never reach the mutation at
 *     all, not because the mutation happens to be idempotent on its own.
 *  2. If the mutation itself fails for some unrelated reason, the
 *     transaction rolls back — including the StripeEvent insert — so
 *     Stripe's automatic retry on a non-2xx response can legitimately
 *     try again instead of being told "already handled" for an event
 *     that actually never got applied.
 *
 * The order confirmation email (Phase 4) is sent AFTER this transaction
 * commits, not from inside it — see ADR 0019. That does mean a replayed
 * event that hits the duplicate path never re-sends the email, which is
 * exactly "one order, one email" from the brief: the email only fires
 * on the one call that actually flipped the order to paid.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  let paidOrderId: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });

      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await markOrderPaidByPaymentIntent(tx, paymentIntent.id);
          if (result) {
            paidOrderId = result.orderId;
            logger.info("webhook.payment_intent_succeeded", {
              paymentIntentId: paymentIntent.id,
              orderId: result.orderId,
            });
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await handlePaymentFailure(
            {
              paymentIntentId: paymentIntent.id,
              failureReason: paymentIntent.last_payment_error?.message,
              paymentIntent,
            },
            tx
          );
          logger.info("webhook.payment_intent_failed", {
            paymentIntentId: paymentIntent.id,
          });
          break;
        }
        default:
          // Unhandled event types are accepted (200) but do nothing —
          // Stripe should never see a failure for an event we simply
          // don't act on yet.
          break;
      }
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      logger.info("webhook.duplicate_event_ignored", { eventId: event.id, type: event.type });
      return "duplicate";
    }
    throw error;
  }

  if (paidOrderId) {
    const order = await prisma.order.findUnique({ where: { id: paidOrderId }, include: { items: true } });
    if (order) {
      await sendOrderConfirmationEmail(order);
      revalidateBestSellers();
    } else {
      logger.warn("webhook.order_missing_after_commit", { orderId: paidOrderId });
    }
  }

  return "processed";
}
