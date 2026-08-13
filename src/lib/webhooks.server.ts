import "server-only";
import type Stripe from "stripe";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { markOrderPaidByPaymentIntent, cancelOrderByPaymentIntent, triggerOrderRevalidations } from "@/lib/orders.server";

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
 */
export async function processStripeEvent(event: Stripe.Event): Promise<WebhookOutcome> {
  let revalResult: { orderId: string; productSlugs: string[] } | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });

      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const result = await markOrderPaidByPaymentIntent(tx, paymentIntent.id);
          if (result) {
            revalResult = result;
          }
          break;
        }
        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          await cancelOrderByPaymentIntent(tx, paymentIntent.id);
          break;
        }
        default:
          break;
      }
    });
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return "duplicate";
    }
    throw error;
  }

  const resultData = revalResult as { orderId: string; productSlugs: string[] } | null;
  if (resultData) {
    triggerOrderRevalidations(resultData.orderId, resultData.productSlugs);
  }

  return "processed";
}
