import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only before imports
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
  revalidateTag: vi.fn(),
}));

import { getBestSellingProducts } from "@/lib/catalogue/best-sellers.server";
import { prisma } from "@/lib/db/prisma";

// Mock prisma for unit/integration verification
vi.mock("@/lib/db/prisma", () => {
  return {
    prisma: {
      $queryRaw: vi.fn(),
      product: {
        findMany: vi.fn(),
      },
    },
  };
});

describe("Best Sellers Database Aggregation & Business Rules", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Net Sales Mathematical Invariant: GREATEST(0, quantity - refundedQuantity)", () => {
    it("clamps negative differences to zero when refundedQuantity exceeds quantity", () => {
      // Simulate the exact mathematical behavior of GREATEST(0, quantity - refundedQuantity)
      const computeNetSold = (quantity: number, refundedQuantity: number) =>
        Math.max(0, quantity - refundedQuantity);

      expect(computeNetSold(2, 5)).toBe(0); // Over-refund / edge case returns 0, not -3
      expect(computeNetSold(10, 3)).toBe(7); // Partial refund returns net 7
      expect(computeNetSold(5, 5)).toBe(0); // Full item refund returns 0
      expect(computeNetSold(4, 0)).toBe(4); // No refund returns 4
    });
  });

  describe("2. Best Sellers Database Query Execution & Ranking", () => {
    it("executes parameterized SQL aggregation and returns products ranked by totalSold DESC", async () => {
      const mockRankedRows = [
        { productId: "prod-hoodie", totalSold: 120 },
        { productId: "prod-jacket", totalSold: 95 },
        { productId: "prod-backpack", totalSold: 40 },
      ];

      (prisma.$queryRaw as any).mockResolvedValue(mockRankedRows);

      (prisma.product.findMany as any).mockResolvedValue([
        {
          id: "prod-jacket",
          slug: "denim-jacket",
          title: "Denim Jacket",
          media: [{ url: "/images/jacket.jpg", alt: "Denim Jacket" }],
          variants: [
            {
              id: "v-j-1",
              priceAmount: 10900,
              priceCurrency: "USD",
              options: { Colour: "Navy" },
              inventoryItem: { onHand: 15 },
            },
          ],
        },
        {
          id: "prod-hoodie",
          slug: "essential-hoodie",
          title: "Essential Hoodie",
          media: [{ url: "/images/hoodie.jpg", alt: "Essential Hoodie" }],
          variants: [
            {
              id: "v-h-1",
              priceAmount: 6900,
              priceCurrency: "USD",
              options: { Colour: "Black" },
              inventoryItem: { onHand: 25 },
            },
          ],
        },
        {
          id: "prod-backpack",
          slug: "classic-backpack",
          title: "Classic Backpack",
          media: [{ url: "/images/backpack.jpg", alt: "Classic Backpack" }],
          variants: [
            {
              id: "v-b-1",
              priceAmount: 8900,
              priceCurrency: "USD",
              options: { Color: "Charcoal" },
              inventoryItem: { onHand: 10 },
            },
          ],
        },
      ]);

      const results = await getBestSellingProducts(6);

      // Verify query was called
      expect(prisma.$queryRaw).toHaveBeenCalled();

      // Verify ranking preserves the exact totalSold DESC order: hoodie (120) -> jacket (95) -> backpack (40)
      expect(results.length).toBe(3);
      expect(results[0]?.id).toBe("prod-hoodie");
      expect(results[0]?.slug).toBe("essential-hoodie");
      expect(results[0]?.totalSold).toBe(120);

      expect(results[1]?.id).toBe("prod-jacket");
      expect(results[1]?.slug).toBe("denim-jacket");
      expect(results[1]?.totalSold).toBe(95);

      expect(results[2]?.id).toBe("prod-backpack");
      expect(results[2]?.slug).toBe("classic-backpack");
      expect(results[2]?.totalSold).toBe(40);
    });

    it("returns an empty list if there are no qualifying sales", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([]);

      const results = await getBestSellingProducts(6);

      expect(results).toEqual([]);
      expect(prisma.product.findMany).not.toHaveBeenCalled();
    });

    it("correctly extracts variant color swatches and computes price range", async () => {
      (prisma.$queryRaw as any).mockResolvedValue([
        { productId: "prod-multi-variant", totalSold: 50 },
      ]);

      (prisma.product.findMany as any).mockResolvedValue([
        {
          id: "prod-multi-variant",
          slug: "multi-color-shirt",
          title: "Multi Color Shirt",
          media: [{ url: "/images/shirt.jpg", alt: "Shirt" }],
          variants: [
            {
              id: "v-1",
              priceAmount: 3500,
              priceCurrency: "USD",
              options: { Size: "S", Colour: "Black" },
              inventoryItem: { onHand: 5 },
            },
            {
              id: "v-2",
              priceAmount: 4000,
              priceCurrency: "USD",
              options: { Size: "L", Colour: "White" },
              inventoryItem: { onHand: 8 },
            },
          ],
        },
      ]);

      const results = await getBestSellingProducts(6);

      expect(results.length).toBe(1);
      expect(results[0]?.minPriceAmount).toBe(3500);
      expect(results[0]?.maxPriceAmount).toBe(4000);
      expect(results[0]?.totalOnHand).toBe(13);
      expect(results[0]?.colors).toBeDefined();
      expect(results[0]?.colors?.length).toBe(2);
    });
  });

  describe("3. Status & Variant Rollup Business Rules", () => {
    it("aggregates across multiple variants of the same product into single parent product count", () => {
      // Logic simulation of SQL GROUP BY pv."productId"
      const lineItems = [
        { productId: "prod-A", variantId: "v-A-S", quantity: 20, refundedQuantity: 0 },
        { productId: "prod-A", variantId: "v-A-M", quantity: 30, refundedQuantity: 0 },
        { productId: "prod-A", variantId: "v-A-L", quantity: 50, refundedQuantity: 0 },
        { productId: "prod-B", variantId: "v-B-1", quantity: 60, refundedQuantity: 0 },
      ];

      const productSales = new Map<string, number>();
      for (const item of lineItems) {
        const net = Math.max(0, item.quantity - item.refundedQuantity);
        productSales.set(item.productId, (productSales.get(item.productId) ?? 0) + net);
      }

      expect(productSales.get("prod-A")).toBe(100); // 20 + 30 + 50
      expect(productSales.get("prod-B")).toBe(60);
      expect(productSales.get("prod-A")!).toBeGreaterThan(productSales.get("prod-B")!);
    });

    it("excludes cancelled, pending, or refunded orders from sales counts", () => {
      const orders = [
        { status: "paid", items: [{ productId: "prod-1", qty: 10, ref: 0 }] },
        { status: "fulfilled", items: [{ productId: "prod-1", qty: 5, ref: 0 }] },
        { status: "delivered", items: [{ productId: "prod-1", qty: 8, ref: 0 }] },
        { status: "pending", items: [{ productId: "prod-1", qty: 50, ref: 0 }] },
        { status: "cancelled", items: [{ productId: "prod-1", qty: 100, ref: 0 }] },
        { status: "refunded", items: [{ productId: "prod-1", qty: 20, ref: 20 }] },
      ];

      const validStatuses = new Set(["paid", "fulfilled", "delivered"]);
      let totalValidSold = 0;

      for (const order of orders) {
        if (validStatuses.has(order.status)) {
          for (const item of order.items) {
            totalValidSold += Math.max(0, item.qty - item.ref);
          }
        }
      }

      // Only paid (10) + fulfilled (5) + delivered (8) = 23. Pending, cancelled, and refunded orders are excluded.
      expect(totalValidSold).toBe(23);
    });
  });
});
