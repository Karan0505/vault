import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { processStripeEvent } from "@/lib/webhooks.server";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn("[webhook-idempotency.test] DATABASE_URL not set — skipping.");
}

function fakeSucceededEvent(id: string, paymentIntentId: string): Stripe.Event {
  return {
    id,
    type: "payment_intent.succeeded",
    data: { object: { id: paymentIntentId } },
  } as unknown as Stripe.Event;
}

describe.skipIf(!hasDb)("Stripe webhook idempotency", () => {
  let variantId: string;
  let productId: string;
  let categoryId: string;
  let inventoryItemId: string;
  let orderId: string;
  let reservationId: string;
  const paymentIntentId = `pi_test_${Date.now()}`;
  const eventId = `evt_test_${Date.now()}`;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const category = await prisma.category.create({
      data: { name: "Webhook Test", slug: `webhook-test-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        title: "Webhook Test Product",
        slug: `webhook-test-product-${suffix}`,
        status: "active",
        categoryId,
        optionNames: [],
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: `WEBHOOK-TEST-${suffix}`,
        options: {},
        priceAmount: 2000,
        priceCurrency: "USD",
        inventoryItem: { create: { onHand: 5, reserved: 1 } },
      },
      include: { inventoryItem: true },
    });
    variantId = variant.id;
    inventoryItemId = variant.inventoryItem!.id;

    const order = await prisma.order.create({
      data: {
        number: `VAULT-WEBHOOK-${suffix}`,
        status: "pending",
        email: "webhook-test@example.com",
        currency: "USD",
        subtotalAmount: 2000,
        totalAmount: 2000,
        stripePaymentIntentId: paymentIntentId,
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
        items: {
          create: [
            {
              variantId,
              titleSnapshot: "Webhook Test Product",
              skuSnapshot: `WEBHOOK-TEST-${suffix}`,
              optionsSnapshot: {},
              unitAmount: 2000,
              quantity: 1,
              lineTotal: 2000,
            },
          ],
        },
      },
    });
    orderId = order.id;

    const reservation = await prisma.reservation.create({
      data: { inventoryItemId, orderId, quantity: 1, expiresAt: new Date(Date.now() + 15 * 60 * 1000) },
    });
    reservationId = reservation.id;
  });

  afterAll(async () => {
    await prisma.reservation.deleteMany({ where: { id: reservationId } }).catch(() => undefined);
    await prisma.order.delete({ where: { id: orderId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    await prisma.stripeEvent.deleteMany({ where: { id: eventId } }).catch(() => undefined);
  });

  it("replaying the same event five times produces one paid order and one stock decrement", async () => {
    const outcomes = [];
    // Sequential, not parallel: Stripe never delivers the same event
    // concurrently with itself, only redundantly over time (retries).
    // The property under test is repeated delivery, not a lock race —
    // that's the oversell test's job.
    for (let i = 0; i < 5; i += 1) {
      outcomes.push(await processStripeEvent(fakeSucceededEvent(eventId, paymentIntentId)));
    }

    expect(outcomes[0]).toBe("processed");
    expect(outcomes.slice(1)).toEqual(["duplicate", "duplicate", "duplicate", "duplicate"]);

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("paid");

    const inventory = await prisma.inventoryItem.findUniqueOrThrow({ where: { id: inventoryItemId } });
    expect(inventory.onHand).toBe(4); // decremented exactly once from 5
    expect(inventory.reserved).toBe(0); // the reservation was committed, not left dangling

    const remainingReservations = await prisma.reservation.count({ where: { orderId } });
    expect(remainingReservations).toBe(0);

    const storedEvents = await prisma.stripeEvent.count({ where: { id: eventId } });
    expect(storedEvents).toBe(1);
  });

  it("the order and reservation existed before any 'success page' request — the webhook never depended on one", async () => {
    // This test's own setup models the case the brief calls out: the
    // order and reservation exist purely because checkout creation
    // writes them synchronously, before Stripe confirms payment or a
    // browser ever redirects anywhere. The webhook above found and paid
    // an order with no success-page request involved at all — proving
    // that path isn't load-bearing for correctness.
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    expect(order.status).toBe("paid");
  });
});
