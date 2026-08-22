import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and next-auth modules before importing server-only modules
vi.mock("server-only", () => ({}));

vi.mock("next-auth", () => ({
  default: () => ({
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: () => ({}),
}));

vi.mock("@/lib/integrations/email.server", () => ({
  sendShippingNoticeEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/auth/audit.server", () => ({
  appendAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { hasPermission } from "@/lib/auth/permissions";
import { canTransition, assertTransition, IllegalOrderTransitionError, ORDER_STATUS_LABEL } from "@/lib/orders/orders";
import { verifyOrderAccess } from "@/lib/auth/auth";
import { fulfilOrderItems, markOrderDelivered, OverFulfillmentError } from "@/lib/fulfilment/fulfillment.server";
import { appendAuditLog } from "@/lib/auth/audit.server";
import { prisma } from "@/lib/db/prisma";

describe("Fulfilment Synchronization Workflow", () => {
  describe("1. Staff Authorization & RBAC Checks", () => {
    it("denies fulfilment permission to Customers (null role)", () => {
      expect(hasPermission(null, "orders:fulfil")).toBe(false);
    });

    it("denies fulfilment permission to Support staff", () => {
      expect(hasPermission("support", "orders:fulfil")).toBe(false);
    });

    it("grants fulfilment permission to Fulfilment staff", () => {
      expect(hasPermission("fulfilment", "orders:fulfil")).toBe(true);
    });

    it("grants fulfilment permission to Admin staff", () => {
      expect(hasPermission("admin", "orders:fulfil")).toBe(true);
    });
  });

  describe("2. Payment State & Transition Validation", () => {
    it("allows transition from paid to fulfilled", () => {
      expect(canTransition("paid", "fulfilled")).toBe(true);
    });

    it("rejects transition to fulfilled from pending, cancelled, or refunded", () => {
      expect(canTransition("pending", "fulfilled")).toBe(false);
      expect(canTransition("cancelled", "fulfilled")).toBe(false);
      expect(canTransition("refunded", "fulfilled")).toBe(false);

      expect(() => assertTransition("pending", "fulfilled")).toThrow(IllegalOrderTransitionError);
      expect(() => assertTransition("cancelled", "fulfilled")).toThrow(IllegalOrderTransitionError);
    });

    it("preserves authoritative status label mapping", () => {
      expect(ORDER_STATUS_LABEL["fulfilled"]).toBe("Fulfilled");
      expect(ORDER_STATUS_LABEL["paid"]).toBe("Paid");
    });
  });

  describe("3. Customer Data Isolation", () => {
    const orderA = { id: "order-a", userId: "cust-user-a" };
    const orderB = { id: "order-b", userId: "cust-user-b" };

    const sessionCustA = { user: { id: "cust-user-a", email: "a@example.com", staffRole: null } };
    const sessionCustB = { user: { id: "cust-user-b", email: "b@example.com", staffRole: null } };
    const sessionAdmin = { user: { id: "staff-admin", email: "admin@example.com", staffRole: "admin" as const } };
    const sessionFulfilment = { user: { id: "staff-fulfil", email: "fulfil@example.com", staffRole: "fulfilment" as const } };

    it("grants Customer A access to Order A", () => {
      expect(verifyOrderAccess(orderA, sessionCustA, null)).toBe(true);
    });

    it("rejects Customer B trying to access Order A", () => {
      expect(verifyOrderAccess(orderA, sessionCustB, null)).toBe(false);
    });

    it("rejects Customer A trying to access Order B", () => {
      expect(verifyOrderAccess(orderB, sessionCustA, null)).toBe(false);
    });

    it("grants staff members access to any customer order", () => {
      expect(verifyOrderAccess(orderA, sessionAdmin, null)).toBe(true);
      expect(verifyOrderAccess(orderA, sessionFulfilment, null)).toBe(true);
      expect(verifyOrderAccess(orderB, sessionAdmin, null)).toBe(true);
    });
  });

  describe("4. Fulfilment Service Domain Logic & Idempotency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("fulfils unfulfilled items, assigns tracking, and transitions order status to fulfilled", async () => {
      const mockOrder = {
        id: "test-order-1",
        number: "VAULT-447579",
        status: "paid",
        email: "customer@example.com",
        currency: "USD",
        totalAmount: 5000,
        items: [
          { id: "item-1", quantity: 2, fulfilledQuantity: 0, titleSnapshot: "Premium T-Shirt" },
        ],
        fulfillments: [],
      };

      const mockFulfillment = {
        id: "ful-123",
        orderId: "test-order-1",
        trackingNumber: "VAULT-TRK-447579",
        carrier: "VAULT Express",
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(mockOrder),
          update: vi.fn().mockResolvedValue({ ...mockOrder, status: "fulfilled" }),
        },
        orderItem: {
          update: vi.fn().mockResolvedValue({ id: "item-1", fulfilledQuantity: 2 }),
          findMany: vi.fn().mockResolvedValue([{ id: "item-1", quantity: 2, fulfilledQuantity: 2 }]),
        },
        fulfillment: {
          create: vi.fn().mockResolvedValue(mockFulfillment),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const result = await fulfilOrderItems({
        orderId: "test-order-1",
        actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
        trackingNumber: "VAULT-TRK-447579",
        carrier: "VAULT Express",
        items: [{ orderItemId: "item-1", quantity: 2 }],
      });

      expect(result.fulfillmentId).toBe("ful-123");
      expect(result.orderStatus).toBe("fulfilled");
      expect(result.trackingNumber).toBe("VAULT-TRK-447579");
      expect(txMock.order.update).toHaveBeenCalledWith({
        where: { id: "test-order-1" },
        data: { status: "fulfilled" },
      });
      expect(txMock.fulfillment.create).toHaveBeenCalledWith({
        data: {
          orderId: "test-order-1",
          trackingNumber: "VAULT-TRK-447579",
          carrier: "VAULT Express",
          items: { create: [{ orderItemId: "item-1", quantity: 2 }] },
        },
      });
    });

    it("guarantees idempotency on double-click / duplicate fulfillment calls", async () => {
      const alreadyFulfilledOrder = {
        id: "test-order-1",
        number: "VAULT-447579",
        status: "fulfilled",
        email: "customer@example.com",
        currency: "USD",
        totalAmount: 5000,
        items: [
          { id: "item-1", quantity: 2, fulfilledQuantity: 2, titleSnapshot: "Premium T-Shirt" },
        ],
        fulfillments: [
          {
            id: "ful-existing-1",
            trackingNumber: "VAULT-TRK-447579",
            carrier: "VAULT Express",
          },
        ],
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(alreadyFulfilledOrder),
          update: vi.fn(),
        },
        orderItem: {
          update: vi.fn(),
          findMany: vi.fn(),
        },
        fulfillment: {
          create: vi.fn(),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const result = await fulfilOrderItems({
        orderId: "test-order-1",
        actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
        trackingNumber: "VAULT-TRK-447579",
        carrier: "VAULT Express",
        items: [{ orderItemId: "item-1", quantity: 2 }],
      });

      expect(result.fulfillmentId).toBe("ful-existing-1");
      expect(result.orderStatus).toBe("fulfilled");
      expect(result.trackingNumber).toBe("VAULT-TRK-447579");
      // No duplicate creation or update performed
      expect(txMock.fulfillment.create).not.toHaveBeenCalled();
      expect(txMock.order.update).not.toHaveBeenCalled();
      expect(txMock.orderItem.update).not.toHaveBeenCalled();
    });

    it("rejects fulfillment if order is unpaid (status = pending)", async () => {
      const pendingOrder = {
        id: "test-order-pending",
        number: "VAULT-111111",
        status: "pending",
        items: [{ id: "item-1", quantity: 1, fulfilledQuantity: 0 }],
        fulfillments: [],
      };

      const txMock = {
        order: { findUniqueOrThrow: vi.fn().mockResolvedValue(pendingOrder) },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      await expect(
        fulfilOrderItems({
          orderId: "test-order-pending",
          actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
          trackingNumber: "VAULT-TRK-111111",
          items: [{ orderItemId: "item-1", quantity: 1 }],
        })
      ).rejects.toThrow('Cannot fulfil an order in status "pending" — only paid orders can ship');
    });

    it("rejects over-fulfillment if requested quantity exceeds remaining unfulfilled", async () => {
      const paidOrder = {
        id: "test-order-over",
        number: "VAULT-222222",
        status: "paid",
        items: [{ id: "item-1", quantity: 2, fulfilledQuantity: 1 }],
        fulfillments: [],
      };

      const txMock = {
        order: { findUniqueOrThrow: vi.fn().mockResolvedValue(paidOrder) },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      await expect(
        fulfilOrderItems({
          orderId: "test-order-over",
          actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
          trackingNumber: "VAULT-TRK-222222",
          items: [{ orderItemId: "item-1", quantity: 2 }], // only 1 remains
        })
      ).rejects.toThrow(OverFulfillmentError);
    });
  });

  describe("5. Mark Delivered Workflow & Strict Idempotency", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("performs single order lookup and transitions fulfilled order to delivered with exactly 1 audit log", async () => {
      const fulfilledOrder = {
        id: "test-order-ship",
        number: "VAULT-333333",
        status: "fulfilled",
        email: "customer@example.com",
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(fulfilledOrder),
          update: vi.fn().mockResolvedValue({ ...fulfilledOrder, status: "delivered" }),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const result = await markOrderDelivered({
        orderId: "test-order-ship",
        actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
      });

      expect(result.orderId).toBe("test-order-ship");
      expect(result.orderStatus).toBe("delivered");
      expect(result.isIdempotentNoOp).toBe(false);

      // Verify single lookup
      expect(txMock.order.findUniqueOrThrow).toHaveBeenCalledTimes(1);
      expect(txMock.order.findUniqueOrThrow).toHaveBeenCalledWith({ where: { id: "test-order-ship" } });

      // Verify update
      expect(txMock.order.update).toHaveBeenCalledWith({
        where: { id: "test-order-ship" },
        data: { status: "delivered" },
      });

      // Verify audit log creation
      expect(appendAuditLog).toHaveBeenCalledTimes(1);
      expect(appendAuditLog).toHaveBeenCalledWith(txMock, {
        actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
        entityType: "Order",
        entityId: "test-order-ship",
        action: "transition",
        before: { status: "fulfilled" },
        after: { status: "delivered" },
      });
    });

    it("safely handles repeated/idempotent delivery calls with 0 database writes and 0 new audit logs", async () => {
      const alreadyDeliveredOrder = {
        id: "test-order-deliv",
        number: "VAULT-333333",
        status: "delivered",
        email: "customer@example.com",
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(alreadyDeliveredOrder),
          update: vi.fn(),
        },
      };

      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      const result = await markOrderDelivered({
        orderId: "test-order-deliv",
        actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
      });

      expect(result.orderId).toBe("test-order-deliv");
      expect(result.orderStatus).toBe("delivered");
      expect(result.isIdempotentNoOp).toBe(true);

      // Verify single lookup
      expect(txMock.order.findUniqueOrThrow).toHaveBeenCalledTimes(1);

      // Verify NO database updates and NO audit logs created on 2nd call
      expect(txMock.order.update).not.toHaveBeenCalled();
      expect(appendAuditLog).not.toHaveBeenCalled();
    });

    it("rejects transition to delivered if order is only in paid status", async () => {
      const paidOrder = {
        id: "test-order-paid-only",
        number: "VAULT-444444",
        status: "paid",
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(paidOrder),
        },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      await expect(
        markOrderDelivered({
          orderId: "test-order-paid-only",
          actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
        })
      ).rejects.toThrow(IllegalOrderTransitionError);
    });

    it("rejects transition to delivered if order is pending or cancelled", async () => {
      const pendingOrder = {
        id: "test-order-pending-only",
        number: "VAULT-555555",
        status: "pending",
      };

      const txMock = {
        order: {
          findUniqueOrThrow: vi.fn().mockResolvedValue(pendingOrder),
        },
      };
      vi.spyOn(prisma, "$transaction").mockImplementation(async (cb: any) => cb(txMock));

      await expect(
        markOrderDelivered({
          orderId: "test-order-pending-only",
          actor: { userId: "admin-1", email: "admin@example.com", role: "admin" },
        })
      ).rejects.toThrow(IllegalOrderTransitionError);
    });
  });
});
