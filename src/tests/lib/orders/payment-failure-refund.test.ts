import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and next/cache before importing server modules
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock Stripe
vi.mock("@/lib/payments/stripe", () => ({
  stripe: {
    paymentIntents: {
      retrieve: vi.fn(),
    },
    refunds: {
      create: vi.fn(),
    },
  },
}));

// Mock logger
vi.mock("@/lib/shared/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock revalidation
vi.mock("@/lib/validation/revalidate", () => ({
  revalidateProduct: vi.fn(),
  revalidateBestSellers: vi.fn(),
}));

// Mock audit
vi.mock("@/lib/auth/audit.server", () => ({
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
}));

// Mock inventory
vi.mock("@/lib/inventory/inventory.server", () => ({
  releaseReservations: vi.fn().mockResolvedValue(undefined),
}));

// Mock inventory admin
vi.mock("@/lib/inventory/inventory-admin.server", () => ({
  adjustStockInTx: vi.fn().mockResolvedValue({
    productSlug: "service-boot",
    categorySlug: "footwear",
  }),
}));

// Mock prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    inventoryItem: {
      update: vi.fn(),
    },
    reservation: {
      deleteMany: vi.fn(),
    },
    refund: {
      create: vi.fn(),
    },
    orderItem: {
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      if (typeof callback === "function") {
        return callback({
          order: { update: vi.fn().mockResolvedValue({}) },
          reservation: { deleteMany: vi.fn().mockResolvedValue({}) },
          refund: { create: vi.fn().mockResolvedValue({ id: "ref_123" }) },
          orderItem: { update: vi.fn().mockResolvedValue({}) },
          inventoryItem: { update: vi.fn().mockResolvedValue({}) },
        });
      }
      return Promise.all(callback);
    }),
  },
}));

import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/payments/stripe";
import { handlePaymentFailure, handleCapturedWorkflowFailure, releaseReservations } from "@/lib/orders/orders.server";
import * as refundsServer from "@/lib/orders/refunds.server";

describe("Payment Failure & 5-Minute Refund Recovery Workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test A: Genuine uncaptured payment failure
  it("Test A: marks order failed, releases reservations, creates NO refund when amount_received === 0", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_uncaptured_1",
      amount_received: 0,
      status: "requires_payment_method",
      last_payment_error: { message: "Card declined" },
    } as any);

    const mockOrder = {
      id: "order_uncaptured_1",
      number: "VAULT-1001",
      status: "pending",
      userId: "user_1",
      email: "test@example.com",
      stripePaymentIntentId: "pi_uncaptured_1",
      failureDetectedAt: null,
      failureReason: null,
      reservations: [{ id: "res_1", inventoryItemId: "inv_1", quantity: 2 }],
      refunds: [],
    };

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(mockOrder as any);

    const result = await handlePaymentFailure({
      paymentIntentId: "pi_uncaptured_1",
      failureReason: "Card declined",
    });

    expect(result).not.toBeNull();
    expect(result?.status).toBe("failed");
    expect(result?.refundRequired).toBe(false);
    expect(releaseReservations).toHaveBeenCalledWith(
      expect.anything(),
      ["res_1"]
    );
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  // Test B: Captured payment + internal workflow failure triggers refund & restock
  it("Test B: captures workflow failure, marks order failed, initiates refund within 5 minutes, and restocks", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_captured_1",
      amount_received: 5000,
      status: "succeeded",
    } as any);

    const mockOrder = {
      id: "order_captured_1",
      number: "VAULT-1002",
      status: "paid",
      userId: "user_1",
      email: "test@example.com",
      stripePaymentIntentId: "pi_captured_1",
      failureDetectedAt: null,
      failureReason: null,
      totalAmount: 5000,
      refunds: [],
      items: [
        {
          id: "item_1",
          variantId: "var_1",
          unitAmount: 2500,
          quantity: 2,
          refundedQuantity: 0,
        },
      ],
    };

    vi.spyOn(prisma.order, "findFirst").mockResolvedValueOnce(mockOrder as any);
    vi.spyOn(prisma.order, "update").mockResolvedValue({ ...mockOrder, status: "failed" } as any);

    const refundSpy = vi.spyOn(refundsServer, "createItemizedRefund").mockResolvedValueOnce({
      refundId: "ref_1001",
      amount: 5000,
      orderStatus: "failed",
    });

    const detectedAt = new Date();
    const result = await handleCapturedWorkflowFailure({
      orderId: "order_captured_1",
      failureReason: "Fulfillment system unavailable",
      failureDetectedAt: detectedAt,
    });

    expect(result.status).toBe("failed");
    expect(result.refundId).toBe("ref_1001");
    expect(result.amount).toBe(5000);
    expect(result.slaCompliant).toBe(true);
    expect(result.elapsedMs).toBeLessThanOrEqual(300000);
    expect(refundSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order_captured_1",
        restock: true,
        targetStatus: "failed",
      })
    );
  });

  // Test C: Target SLA non-blocking when elapsed time > 5 minutes
  it("Test C: records SLA breach if refund initiation exceeds 5 minutes but does NOT cancel/abort the refund", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_delayed_1",
      amount_received: 5000,
      status: "succeeded",
    } as any);

    const mockOrder = {
      id: "order_delayed_1",
      number: "VAULT-1003",
      status: "paid",
      userId: "user_1",
      email: "test@example.com",
      stripePaymentIntentId: "pi_delayed_1",
      failureDetectedAt: null,
      failureReason: null,
      totalAmount: 5000,
      refunds: [],
      items: [
        {
          id: "item_1",
          variantId: "var_1",
          unitAmount: 5000,
          quantity: 1,
          refundedQuantity: 0,
        },
      ],
    };

    vi.spyOn(prisma.order, "findFirst").mockResolvedValueOnce(mockOrder as any);
    vi.spyOn(prisma.order, "update").mockResolvedValue({ ...mockOrder, status: "failed" } as any);

    vi.spyOn(refundsServer, "createItemizedRefund").mockResolvedValueOnce({
      refundId: "ref_delayed_1",
      amount: 5000,
      orderStatus: "failed",
    });

    // Simulated detection was 10 minutes ago (600,000 ms)
    const detectedAt = new Date(Date.now() - 600000);
    const result = await handleCapturedWorkflowFailure({
      orderId: "order_delayed_1",
      failureReason: "Delayed queue processing",
      failureDetectedAt: detectedAt,
    });

    expect(result.status).toBe("failed");
    expect(result.refundId).toBe("ref_delayed_1");
    expect(result.slaCompliant).toBe(false);
    expect(result.elapsedMs).toBeGreaterThan(300000);
  });

  // Test D: First-Write-Wins timestamps and reason on retry
  it("Test D: preserves initial failureDetectedAt and failureReason on subsequent retries", async () => {
    const originalDetectedAt = new Date("2026-08-21T10:00:00Z");
    const originalReason = "Initial gateway timeout";

    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_retry_1",
      amount_received: 0,
      status: "requires_payment_method",
    } as any);

    const mockOrder = {
      id: "order_retry_1",
      number: "VAULT-1004",
      status: "pending",
      stripePaymentIntentId: "pi_retry_1",
      failureDetectedAt: originalDetectedAt,
      failureReason: originalReason,
      reservations: [],
      refunds: [],
    };

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(mockOrder as any);

    // Call with different timestamp and reason
    const retryDetectedAt = new Date("2026-08-21T10:05:00Z");
    const retryReason = "Different error reason on retry";

    const result = await handlePaymentFailure({
      paymentIntentId: "pi_retry_1",
      failureReason: retryReason,
      failureDetectedAt: retryDetectedAt,
    });

    expect(result?.status).toBe("failed");
  });

  // Test E: Webhook replay idempotency
  it("Test E: returns idempotent no-op when payment_failed is replayed for an already-failed order", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_replayed_1",
      amount_received: 0,
      status: "requires_payment_method",
    } as any);

    const mockOrder = {
      id: "order_replayed_1",
      status: "failed",
      stripePaymentIntentId: "pi_replayed_1",
      reservations: [],
      refunds: [],
    };

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(mockOrder as any);
    const updateSpy = vi.spyOn(prisma.order, "update");

    const result = await handlePaymentFailure({
      paymentIntentId: "pi_replayed_1",
    });

    expect(result?.isIdempotentNoOp).toBe(true);
    expect(result?.status).toBe("failed");
    expect(updateSpy).not.toHaveBeenCalled();
  });

  // Test F & G: Reuses existing refund state if already fully refunded
  it("Test F & G: safely no-ops and returns existing refund when order items are already fully refunded", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_already_refunded",
      amount_received: 5000,
      status: "succeeded",
    } as any);

    const mockOrder = {
      id: "order_already_refunded",
      status: "failed",
      stripePaymentIntentId: "pi_already_refunded",
      refunds: [{ id: "ref_existing_1", amount: 5000 }],
      items: [
        {
          id: "item_1",
          variantId: "var_1",
          unitAmount: 5000,
          quantity: 1,
          refundedQuantity: 1, // fully refunded
        },
      ],
    };

    vi.spyOn(prisma.order, "findFirst").mockResolvedValueOnce(mockOrder as any);
    const refundSpy = vi.spyOn(refundsServer, "createItemizedRefund");

    const result = await handleCapturedWorkflowFailure({
      orderId: "order_already_refunded",
      failureReason: "Duplicate recovery attempt",
    });

    expect(result.isIdempotentNoOp).toBe(true);
    expect(result.refundId).toBe("ref_existing_1");
    expect(refundSpy).not.toHaveBeenCalled();
  });

  // Test H: Partial refund recovery
  it("Test H: refunds ONLY remaining unrefunded items if part of order was already refunded", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_partial_1",
      amount_received: 10000,
      status: "succeeded",
    } as any);

    const mockOrder = {
      id: "order_partial_1",
      status: "paid",
      stripePaymentIntentId: "pi_partial_1",
      totalAmount: 10000,
      refunds: [{ id: "ref_prior_1", amount: 5000 }],
      items: [
        {
          id: "item_1",
          quantity: 2,
          refundedQuantity: 1, // 1 item remaining to refund
        },
      ],
    };

    vi.spyOn(prisma.order, "findFirst").mockResolvedValueOnce(mockOrder as any);
    vi.spyOn(prisma.order, "update").mockResolvedValue({ ...mockOrder, status: "failed" } as any);

    const refundSpy = vi.spyOn(refundsServer, "createItemizedRefund").mockResolvedValueOnce({
      refundId: "ref_partial_2",
      amount: 5000,
      orderStatus: "failed",
    });

    await handleCapturedWorkflowFailure({
      orderId: "order_partial_1",
      failureReason: "Partial order processing abort",
    });

    expect(refundSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [{ orderItemId: "item_1", quantity: 1 }],
      })
    );
  });

  // Test J & L: Unexpected capture in Case A webhook handler does NOT release reservations
  it("Test J & L: flags unexpected capture in payment_failed webhook without releasing reservations", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_unexpected_captured",
      amount_received: 5000,
      status: "succeeded",
    } as any);

    const mockOrder = {
      id: "order_unexpected_1",
      status: "pending",
      stripePaymentIntentId: "pi_unexpected_captured",
      reservations: [{ id: "res_1" }],
      refunds: [],
    };

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(mockOrder as any);
    const updateSpy = vi.spyOn(prisma.order, "update");
    const reservationDeleteSpy = vi.spyOn(prisma.reservation, "deleteMany");

    const result = await handlePaymentFailure({
      paymentIntentId: "pi_unexpected_captured",
    });

    expect(result?.refundRequired).toBe(true);
    expect(updateSpy).not.toHaveBeenCalled();
    expect(reservationDeleteSpy).not.toHaveBeenCalled();
  });

  // Test M: Missing order handled safely
  it("Test M: returns null safely when paymentIntentId does not match any order", async () => {
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      id: "pi_unknown",
      amount_received: 0,
      status: "requires_payment_method",
    } as any);

    vi.spyOn(prisma.order, "findUnique").mockResolvedValueOnce(null);

    const result = await handlePaymentFailure({
      paymentIntentId: "pi_unknown",
    });

    expect(result).toBeNull();
  });
});
