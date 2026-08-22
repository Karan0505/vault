import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only before imports
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    discount: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    systemSetting: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/audit.server", () => ({
  appendAuditLog: vi.fn().mockResolvedValue({ id: "audit_1" }),
}));

import { prisma } from "@/lib/db/prisma";
import { deleteOrArchiveDiscount } from "@/lib/checkout/discounts-admin.server";
import { storeSettingsSchema } from "@/lib/settings/settings.server";
import { createStaffUser } from "@/lib/auth/users.server";

describe("Admin Operations, Security & Historical Data Protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Discounts Historical Data Protection", () => {
    it("soft-archives discount (isActive = false) if redemptions exist", async () => {
      (prisma.discount.findUniqueOrThrow as any).mockResolvedValue({
        id: "disc_1",
        code: "SAVE20",
        isActive: true,
        _count: {
          redemptions: 5,
          orders: 5,
        },
      });

      (prisma.discount.update as any).mockResolvedValue({
        id: "disc_1",
        code: "SAVE20",
        isActive: false,
      });

      const result = await deleteOrArchiveDiscount("disc_1", {
        userId: "admin_1",
        email: "admin@vault.com",
        role: "admin",
      });

      expect(result.archived).toBe(true);
      expect(result.deleted).toBe(false);
      expect(prisma.discount.update).toHaveBeenCalledWith({
        where: { id: "disc_1" },
        data: { isActive: false },
      });
      expect(prisma.discount.delete).not.toHaveBeenCalled();
    });

    it("permanently deletes discount only if 0 redemptions and 0 orders exist", async () => {
      (prisma.discount.findUniqueOrThrow as any).mockResolvedValue({
        id: "disc_2",
        code: "UNUSED10",
        isActive: true,
        _count: {
          redemptions: 0,
          orders: 0,
        },
      });

      (prisma.discount.delete as any).mockResolvedValue({
        id: "disc_2",
      });

      const result = await deleteOrArchiveDiscount("disc_2", {
        userId: "admin_1",
        email: "admin@vault.com",
        role: "admin",
      });

      expect(result.archived).toBe(false);
      expect(result.deleted).toBe(true);
      expect(prisma.discount.delete).toHaveBeenCalledWith({
        where: { id: "disc_2" },
      });
    });
  });

  describe("Settings Strict Zod Allowlist", () => {
    it("accepts valid settings adhering to allowlist schema", () => {
      const valid = {
        storeName: "VAULT Luxury",
        contactEmail: "concierge@vault.com",
        currency: "USD",
        timezone: "America/New_York",
        lowStockThreshold: 15,
        reservationTTL: 15,
        freeShippingThreshold: 10000,
        orderConfirmationEmails: true,
        refundEmails: true,
        fulfillmentEmails: true,
      };

      const parsed = storeSettingsSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it("rejects invalid values or out-of-range thresholds", () => {
      const invalid = {
        storeName: "",
        contactEmail: "not-an-email",
        lowStockThreshold: -5,
      };

      const parsed = storeSettingsSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe("Staff Creation Security", () => {
    it("rejects staff creation if actor is not an admin", async () => {
      await expect(
        createStaffUser(
          {
            name: "John Staff",
            email: "john@vault.com",
            password: "Password123!",
            role: "support",
          },
          {
            userId: "user_support",
            email: "support@vault.com",
            role: "support",
          }
        )
      ).rejects.toThrow("Forbidden");
    });
  });
});
