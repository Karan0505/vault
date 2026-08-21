import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getConfiguredNotificationLeaseSeconds,
  getSenderAddress,
  claimNotificationForDispatch,
  markNotificationSent,
  markNotificationFailed,
  dispatchOrderEmail,
  sendOrderConfirmationEmail,
  sendShippingNoticeEmail,
  sendRefundNoticeEmail,
} from "@/lib/integrations/email.server";
import { prisma } from "@/lib/db/prisma";

// Mock server-only
vi.mock("server-only", () => ({}));

// Mock logger
vi.mock("@/lib/shared/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock Resend
const mockSend = vi.fn().mockResolvedValue({ id: "msg_123" });
vi.mock("resend", () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: mockSend,
      },
    })),
  };
});

describe("Transactional Email Notification System", () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.EMAIL_NOTIFICATION_LEASE_SECONDS = "600";
    process.env.RESEND_API_KEY = "test_key";
    process.env.EMAIL_FROM = "VAULT <orders@vault.luxury>";
    mockSend.mockClear();

    // Clean up test notification records if any
    try {
      await prisma.notificationRecord.deleteMany({
        where: { id: { startsWith: "vault_email_test_" } },
      });
    } catch {
      // ignore
    }
  });

  afterEach(async () => {
    process.env = originalEnv;
    try {
      await prisma.notificationRecord.deleteMany({
        where: { id: { startsWith: "vault_email_test_" } },
      });
    } catch {
      // ignore
    }
  });

  describe("Configuration & Lease Resolver", () => {
    it("resolves valid positive integer lease seconds from environment", () => {
      process.env.EMAIL_NOTIFICATION_LEASE_SECONDS = "300";
      expect(getConfiguredNotificationLeaseSeconds()).toBe(300);
    });

    it("fails fast if EMAIL_NOTIFICATION_LEASE_SECONDS is missing", () => {
      delete process.env.EMAIL_NOTIFICATION_LEASE_SECONDS;
      expect(() => getConfiguredNotificationLeaseSeconds()).toThrow(
        /No valid notification lease configuration is available/
      );
    });

    it("fails fast if EMAIL_NOTIFICATION_LEASE_SECONDS is not a positive integer", () => {
      process.env.EMAIL_NOTIFICATION_LEASE_SECONDS = "-10";
      expect(() => getConfiguredNotificationLeaseSeconds()).toThrow(
        /must be a positive integer/
      );

      process.env.EMAIL_NOTIFICATION_LEASE_SECONDS = "abc";
      expect(() => getConfiguredNotificationLeaseSeconds()).toThrow(
        /must be a positive integer/
      );
    });

    it("enforces strict sender validation in production", () => {
      (process.env as any).NODE_ENV = "production";
      process.env.EMAIL_FROM = "";
      expect(getSenderAddress()).toBeNull();

      process.env.EMAIL_FROM = "orders@vault.luxury";
      expect(getSenderAddress()).toBe("orders@vault.luxury");
    });
  });

  describe("Atomic Claim, Stale Recovery & Concurrency", () => {
    it("concurrent workers attempting the same notification result in exactly one successful notification claim/lease acquisition and one logical notification record", async () => {
      const notifId = "vault_email_test_concurrent_order";
      const orderId = "order_conc_123";

      // Simulate 5 workers concurrently trying to claim the exact same logical notification
      const results = await Promise.all([
        claimNotificationForDispatch({ id: notifId, orderId, kind: "paid", recipient: "customer@example.com" }),
        claimNotificationForDispatch({ id: notifId, orderId, kind: "paid", recipient: "customer@example.com" }),
        claimNotificationForDispatch({ id: notifId, orderId, kind: "paid", recipient: "customer@example.com" }),
        claimNotificationForDispatch({ id: notifId, orderId, kind: "paid", recipient: "customer@example.com" }),
        claimNotificationForDispatch({ id: notifId, orderId, kind: "paid", recipient: "customer@example.com" }),
      ]);

      const successfulClaims = results.filter((r) => r === true);
      expect(successfulClaims.length).toBe(1);

      // Verify exactly one record exists in database
      const count = await prisma.notificationRecord.count({
        where: { id: notifId },
      });
      expect(count).toBe(1);
    });

    it("recovers stale dispatching notifications after configured lease expires", async () => {
      const notifId = "vault_email_test_stale_order";
      const orderId = "order_stale_123";

      // Create a stale notification record that crashed 15 minutes ago (lease is 600s = 10m)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
      await prisma.notificationRecord.create({
        data: {
          id: notifId,
          orderId,
          kind: "paid",
          recipient: "customer@example.com",
          status: "dispatching",
          attempts: 1,
          lastAttemptAt: fifteenMinutesAgo,
        },
      });

      // Now a retry worker claims it
      const reclaimed = await claimNotificationForDispatch({
        id: notifId,
        orderId,
        kind: "paid",
        recipient: "customer@example.com",
      });

      expect(reclaimed).toBe(true);

      const record = await prisma.notificationRecord.findUnique({
        where: { id: notifId },
      });
      expect(record?.attempts).toBe(2);
      expect(record?.status).toBe("dispatching");
    });
  });

  describe("Lifecycle Email Dispatchers", () => {
    it("Test 1: Paid Order -> sendOrderConfirmationEmail executes post-commit", async () => {
      const order = {
        id: "test_order_conf_1",
        number: "VAULT-100099",
        email: "buyer@example.com",
        currency: "USD",
        totalAmount: 15000,
        items: [{ titleSnapshot: "Gold Chronograph", quantity: 1, lineTotal: 15000 }],
      };

      await sendOrderConfirmationEmail(order);

      const record = await prisma.notificationRecord.findUnique({
        where: { id: `vault_email_${order.id}_paid` },
      });

      expect(record).toBeDefined();
      expect(record?.status).toBe("sent");
      expect(record?.kind).toBe("paid");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("Test 2: Shipped Order -> sendShippingNoticeEmail executes post-commit", async () => {
      const order = {
        id: "test_order_ship_1",
        number: "VAULT-100100",
        email: "buyer@example.com",
        currency: "USD",
        totalAmount: 15000,
        items: [{ titleSnapshot: "Gold Chronograph", quantity: 1, lineTotal: 15000 }],
      };

      await sendShippingNoticeEmail({
        order,
        fulfillmentId: "ful_abc_1",
        trackingNumber: "TRACK123456",
        carrier: "FedEx Luxury",
        shippedItems: [{ titleSnapshot: "Gold Chronograph", quantity: 1 }],
        isPartial: false,
      });

      const record = await prisma.notificationRecord.findUnique({
        where: { id: `vault_email_${order.id}_fulfillment_ful_abc_1` },
      });

      expect(record).toBeDefined();
      expect(record?.status).toBe("sent");
      expect(record?.kind).toBe("fulfillment");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("Test 3: Standard Refund -> sendRefundNoticeEmail executes post-commit", async () => {
      const order = {
        id: "test_order_ref_1",
        number: "VAULT-100101",
        email: "buyer@example.com",
        currency: "USD",
        totalAmount: 15000,
        items: [{ titleSnapshot: "Gold Chronograph", quantity: 1, lineTotal: 15000 }],
      };

      await sendRefundNoticeEmail({
        order,
        refundId: "ref_xyz_1",
        amount: 15000,
        isFullRefund: true,
        reason: "Customer return accepted",
      });

      const record = await prisma.notificationRecord.findUnique({
        where: { id: `vault_email_${order.id}_refund_ref_xyz_1` },
      });

      expect(record).toBeDefined();
      expect(record?.status).toBe("sent");
      expect(record?.kind).toBe("refund");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it("Test 4: Post-commit non-blocking safety on provider error", async () => {
      mockSend.mockRejectedValueOnce(new Error("Resend rate limit exceeded"));

      const order = {
        id: "test_order_err_1",
        number: "VAULT-100102",
        email: "buyer@example.com",
        currency: "USD",
        totalAmount: 15000,
        items: [{ titleSnapshot: "Gold Chronograph", quantity: 1, lineTotal: 15000 }],
      };

      // Must not throw
      await expect(sendOrderConfirmationEmail(order)).resolves.not.toThrow();

      const record = await prisma.notificationRecord.findUnique({
        where: { id: `vault_email_${order.id}_paid` },
      });

      expect(record?.status).toBe("failed");
      expect(record?.lastError).toContain("Resend rate limit exceeded");
    });
  });
});
