import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only before any server-only imports
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    order: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    refund: {
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      count: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/catalogue/best-sellers.server", () => ({
  getBestSellingProducts: vi.fn().mockResolvedValue([
    {
      productId: "prod_1",
      title: "Waxed Canvas Jacket",
      slug: "waxed-canvas-jacket",
      categoryName: "Jackets",
      netRevenue: 125000,
      totalUnitsSold: 5,
      variantCount: 1,
    },
  ]),
}));

import { prisma } from "@/lib/db/prisma";
import { getAuthoritativeDashboardData } from "@/lib/admin/dashboard.server";

describe("Authoritative Admin Dashboard Aggregations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates net revenue by subtracting refunds from gross sales without double-counting", async () => {
    // Gross paid orders = $500.00 (50000 cents)
    (prisma.order.aggregate as any).mockResolvedValue({
      _sum: { totalAmount: 50000 },
    });

    // Partial refunds on completed orders = $50.00 (5000 cents)
    (prisma.refund.aggregate as any).mockResolvedValue({
      _sum: { amount: 5000 },
    });

    (prisma.order.count as any).mockResolvedValue(5);
    (prisma.user.count as any).mockResolvedValue(12);
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.refund.findMany as any).mockResolvedValue([]);
    (prisma.inventoryItem.findMany as any).mockResolvedValue([
      { onHand: 25 },
      { onHand: 5 },
      { onHand: 0 },
    ]);

    const data = await getAuthoritativeDashboardData(7);

    // Net Revenue = $500 - $50 = $450.00 (45000 cents)
    expect(data.totalRevenueRaw).toBe(45000);
    expect(data.totalRevenue).toBe("$450.00");

    // Zero-Safe AOV = $450 / 5 = $90.00 (9000 cents)
    expect(data.avgOrderValue).toBe("$90.00");
    expect(data.orderCount).toBe(5);
    expect(data.newCustomers).toBe(12);

    // Inventory counts
    expect(data.inventory.inStock).toBe(1);
    expect(data.inventory.lowStock).toBe(1);
    expect(data.inventory.outOfStock).toBe(1);
  });

  it("handles zero completed orders safely without NaN or Infinity", async () => {
    (prisma.order.aggregate as any).mockResolvedValue({
      _sum: { totalAmount: null },
    });
    (prisma.refund.aggregate as any).mockResolvedValue({
      _sum: { amount: null },
    });
    (prisma.order.count as any).mockResolvedValue(0);
    (prisma.user.count as any).mockResolvedValue(0);
    (prisma.order.findMany as any).mockResolvedValue([]);
    (prisma.refund.findMany as any).mockResolvedValue([]);
    (prisma.inventoryItem.findMany as any).mockResolvedValue([]);

    const data = await getAuthoritativeDashboardData(7);

    expect(data.totalRevenueRaw).toBe(0);
    expect(data.totalRevenue).toBe("$0.00");
    expect(data.avgOrderValue).toBe("$0.00");
    expect(data.orderCount).toBe(0);
  });
});
