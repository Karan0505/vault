import { describe, expect, it } from "vitest";

type OrderStatus = "pending" | "paid" | "fulfilled" | "delivered" | "cancelled" | "refunded";

interface MockOrder {
  id: string;
  status: OrderStatus;
  stripePaymentIntentId: string;
  reservations: Array<{ id: string; inventoryItemId: string; quantity: number }>;
}

interface MockInventory {
  id: string;
  onHand: number;
  reserved: number;
}

class MockDatabase {
  public stripeEvents = new Set<string>();
  public orders = new Map<string, MockOrder>();
  public inventory = new Map<string, MockInventory>();
  public reservationCommitsCount = 0;

  constructor() {
    this.inventory.set("inv-1", { id: "inv-1", onHand: 10, reserved: 2 });
    this.orders.set("ord-1", {
      id: "ord-1",
      status: "pending",
      stripePaymentIntentId: "pi_test_123",
      reservations: [{ id: "res-1", inventoryItemId: "inv-1", quantity: 2 }],
    });
  }

  async processWebhookEvent(eventId: string, eventType: string, paymentIntentId: string) {
    if (this.stripeEvents.has(eventId)) {
      return "duplicate";
    }
    this.stripeEvents.add(eventId);

    if (eventType === "payment_intent.succeeded") {
      return this.markPaid(paymentIntentId);
    } else if (eventType === "payment_intent.payment_failed") {
      return this.markCancelled(paymentIntentId);
    }
    return "ignored";
  }

  async markPaid(paymentIntentId: string) {
    const order = Array.from(this.orders.values()).find(
      (o) => o.stripePaymentIntentId === paymentIntentId
    );
    if (!order || order.status !== "pending") return null;

    order.status = "paid";
    for (const r of order.reservations) {
      const item = this.inventory.get(r.inventoryItemId);
      if (item) {
        item.onHand -= r.quantity;
        item.reserved -= r.quantity;
      }
    }
    this.reservationCommitsCount++;
    return { orderId: order.id };
  }

  async markCancelled(paymentIntentId: string) {
    const order = Array.from(this.orders.values()).find(
      (o) => o.stripePaymentIntentId === paymentIntentId
    );
    if (!order || order.status !== "pending") return null;

    order.status = "cancelled";
    for (const r of order.reservations) {
      const item = this.inventory.get(r.inventoryItemId);
      if (item) {
        item.reserved -= r.quantity;
      }
    }
    return { orderId: order.id };
  }
}

describe("Stripe Webhook Idempotency & Payment Status Synchronization", () => {
  it("processes payment_intent.succeeded event and transitions pending -> paid", async () => {
    const db = new MockDatabase();
    const res = await db.processWebhookEvent("evt_1", "payment_intent.succeeded", "pi_test_123");

    expect(res).toEqual({ orderId: "ord-1" });
    expect(db.orders.get("ord-1")?.status).toBe("paid");
    expect(db.inventory.get("inv-1")?.onHand).toBe(8);
    expect(db.inventory.get("inv-1")?.reserved).toBe(0);
    expect(db.reservationCommitsCount).toBe(1);
  });

  it("handles duplicate webhook delivery idempotently without double stock decrement", async () => {
    const db = new MockDatabase();
    await db.processWebhookEvent("evt_1", "payment_intent.succeeded", "pi_test_123");

    const duplicateRes = await db.processWebhookEvent("evt_1", "payment_intent.succeeded", "pi_test_123");
    expect(duplicateRes).toBe("duplicate");

    expect(db.inventory.get("inv-1")?.onHand).toBe(8);
    expect(db.reservationCommitsCount).toBe(1);
  });

  it("transitions pending -> cancelled on payment_intent.payment_failed event", async () => {
    const db = new MockDatabase();
    const res = await db.processWebhookEvent("evt_failed", "payment_intent.payment_failed", "pi_test_123");

    expect(res).toEqual({ orderId: "ord-1" });
    expect(db.orders.get("ord-1")?.status).toBe("cancelled");
    expect(db.inventory.get("inv-1")?.onHand).toBe(10);
    expect(db.inventory.get("inv-1")?.reserved).toBe(0);
  });

  it("prevents double inventory decrement during race conditions between Webhook and Status API", async () => {
    const db = new MockDatabase();

    const webhookPromise = db.processWebhookEvent("evt_race_1", "payment_intent.succeeded", "pi_test_123");
    const statusApiPromise = db.markPaid("pi_test_123");

    await Promise.all([webhookPromise, statusApiPromise]);

    expect(db.orders.get("ord-1")?.status).toBe("paid");
    expect(db.inventory.get("inv-1")?.onHand).toBe(8);
    expect(db.reservationCommitsCount).toBe(1);
  });
});
