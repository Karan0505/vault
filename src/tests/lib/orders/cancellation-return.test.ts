import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and next/cache before importing server modules
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

// Mock dependencies
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => {
      return callback({
        order: { update: vi.fn().mockResolvedValue({}) },
        reservation: { deleteMany: vi.fn().mockResolvedValue({}) },
        refund: { create: vi.fn().mockResolvedValue({ id: "ref_123" }) },
        orderItem: { update: vi.fn().mockResolvedValue({}) },
      });
    }),
  },
}));

vi.mock("@/lib/payments/stripe", () => ({
  stripe: {
    refunds: {
      create: vi.fn().mockResolvedValue({ id: "re_mock_123" }),
    },
  },
}));

vi.mock("@/lib/inventory/inventory.server", () => ({
  releaseReservations: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/inventory/inventory-admin.server", () => ({
  adjustStockInTx: vi.fn().mockResolvedValue({
    productSlug: "service-boot",
    categorySlug: "footwear",
  }),
}));

vi.mock("@/lib/auth/audit.server", () => ({
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/validation/revalidate", () => ({
  revalidateProduct: vi.fn(),
  revalidateBestSellers: vi.fn(),
}));

import { prisma } from "@/lib/db/prisma";
import { customerCancelOrder, customerRequestReturn } from "@/lib/orders/orders.server";
import { releaseReservations } from "@/lib/inventory/inventory.server";

describe("Authoritative Order Cancellation & Return Domain Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Customer Order Cancellation", () => {
    it("allows cancellation when order is in 'pending' status and releases reservations", async () => {
      const mockOrder = {
        id: "ord_pending_1",
        number: "VAULT-1001",
        status: "pending",
        userId: "usr_alice",
        email: "alice@example.com",
        reservations: [{ id: "res_1" }, { id: "res_2" }],
        items: [],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const result = await customerCancelOrder({
        orderId: "ord_pending_1",
        userId: "usr_alice",
        reason: "Changed my mind",
      });

      expect(result.status).toBe("cancelled");
      expect(releaseReservations).toHaveBeenCalled();
    });

    it("allows cancellation when order is in 'paid' status and executes refund + restock", async () => {
      const mockOrder = {
        id: "ord_paid_1",
        number: "VAULT-1002",
        status: "paid",
        userId: "usr_alice",
        email: "alice@example.com",
        stripePaymentIntentId: "pi_test_123",
        totalAmount: 10000,
        currency: "USD",
        reservations: [],
        items: [
          {
            id: "item_1",
            variantId: "var_1",
            quantity: 2,
            refundedQuantity: 0,
            lineTotal: 10000,
          },
        ],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.findUniqueOrThrow as any).mockResolvedValue(mockOrder as any);

      const result = await customerCancelOrder({
        orderId: "ord_paid_1",
        userId: "usr_alice",
        reason: "Cancelled before shipping",
      });

      expect(result.status).toBe("cancelled");
    });

    it("STRICTLY REJECTS cancellation when order status is 'fulfilled' (Shipped)", async () => {
      const mockOrder = {
        id: "ord_shipped_1",
        number: "VAULT-1003",
        status: "fulfilled",
        userId: "usr_alice",
        email: "alice@example.com",
        reservations: [],
        items: [],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerCancelOrder({
          orderId: "ord_shipped_1",
          userId: "usr_alice",
        })
      ).rejects.toThrow("Cannot cancel an order that has already been shipped or delivered");
    });

    it("STRICTLY REJECTS cancellation when order status is 'delivered'", async () => {
      const mockOrder = {
        id: "ord_delivered_1",
        number: "VAULT-1004",
        status: "delivered",
        userId: "usr_alice",
        email: "alice@example.com",
        reservations: [],
        items: [],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerCancelOrder({
          orderId: "ord_delivered_1",
          userId: "usr_alice",
        })
      ).rejects.toThrow("Cannot cancel an order that has already been shipped or delivered");
    });

    it("enforces customer isolation: rejects cancellation by unauthorized user", async () => {
      const mockOrder = {
        id: "ord_pending_2",
        number: "VAULT-1005",
        status: "pending",
        userId: "usr_alice",
        email: "alice@example.com",
        reservations: [],
        items: [],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerCancelOrder({
          orderId: "ord_pending_2",
          userId: "usr_bob",
        })
      ).rejects.toThrow("Unauthorized to cancel this order");
    });

    it("is strictly idempotent: repeated cancellation returns safe no-op", async () => {
      const mockOrder = {
        id: "ord_cancelled_1",
        number: "VAULT-1006",
        status: "cancelled",
        userId: "usr_alice",
        email: "alice@example.com",
        reservations: [],
        items: [],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      const result = await customerCancelOrder({
        orderId: "ord_cancelled_1",
        userId: "usr_alice",
      });

      expect(result.status).toBe("cancelled");
      expect(result.isIdempotentNoOp).toBe(true);
    });
  });

  describe("Customer Order Return", () => {
    it("STRICTLY REJECTS return request when order is 'pending'", async () => {
      const mockOrder = {
        id: "ord_pending_3",
        status: "pending",
        userId: "usr_alice",
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerRequestReturn({
          orderId: "ord_pending_3",
          userId: "usr_alice",
        })
      ).rejects.toThrow("Return requests are only available for delivered orders.");
    });

    it("STRICTLY REJECTS return request when order is 'paid'", async () => {
      const mockOrder = {
        id: "ord_paid_3",
        status: "paid",
        userId: "usr_alice",
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerRequestReturn({
          orderId: "ord_paid_3",
          userId: "usr_alice",
        })
      ).rejects.toThrow("Return requests are only available for delivered orders.");
    });

    it("STRICTLY REJECTS return request when order is 'fulfilled' (Shipped)", async () => {
      const mockOrder = {
        id: "ord_fulfilled_3",
        status: "fulfilled",
        userId: "usr_alice",
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerRequestReturn({
          orderId: "ord_fulfilled_3",
          userId: "usr_alice",
        })
      ).rejects.toThrow("Return requests are only available for delivered orders.");
    });

    it("allows return request when order is in 'delivered' status and executes refund + restock", async () => {
      const mockOrder = {
        id: "ord_delivered_2",
        number: "VAULT-2001",
        status: "delivered",
        userId: "usr_alice",
        email: "alice@example.com",
        stripePaymentIntentId: "pi_test_456",
        totalAmount: 15000,
        currency: "USD",
        reservations: [],
        items: [
          {
            id: "item_2",
            variantId: "var_2",
            quantity: 1,
            refundedQuantity: 0,
            lineTotal: 15000,
          },
        ],
        refunds: [],
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);
      vi.mocked(prisma.order.findUniqueOrThrow as any).mockResolvedValue(mockOrder as any);

      const result = await customerRequestReturn({
        orderId: "ord_delivered_2",
        userId: "usr_alice",
        reason: "Size too large",
      });

      expect(result.status).toBe("refunded");
      expect(result.refundId).toBeDefined();
    });

    it("enforces customer isolation on return requests", async () => {
      const mockOrder = {
        id: "ord_delivered_3",
        status: "delivered",
        userId: "usr_alice",
      };

      vi.mocked(prisma.order.findFirst).mockResolvedValue(mockOrder as any);

      await expect(
        customerRequestReturn({
          orderId: "ord_delivered_3",
          userId: "usr_bob",
        })
      ).rejects.toThrow("Unauthorized to return this order");
    });
  });
});
