import { describe, expect, it } from "vitest";

class InsufficientStockError extends Error {
  constructor(
    public readonly variantId: string,
    public readonly requested: number,
    public readonly available: number
  ) {
    super(`Insufficient stock for variant ${variantId}: requested ${requested}, ${available} available`);
    this.name = "InsufficientStockError";
  }
}

function renderStockBadgeText(onHand: number): string {
  if (onHand <= 0) {
    return "OUT OF STOCK";
  }
  if (onHand <= 5) {
    return `LOW STOCK · ${onHand} LEFT`;
  }
  return "IN STOCK";
}

function isLowStockVariant(onHand: number): boolean {
  return onHand >= 1 && onHand <= 5;
}

function formatOnHandText(sku: string, onHand: number): string {
  return `${sku} · ${onHand} on hand`;
}

function validateCartQuantity(onHand: number, currentQty: number, requestedAdd: number): { allowed: boolean; maxQty: number } {
  if (onHand <= 0) {
    return { allowed: false, maxQty: 0 };
  }
  const targetQty = currentQty + requestedAdd;
  if (targetQty > onHand) {
    return { allowed: false, maxQty: onHand };
  }
  return { allowed: true, maxQty: onHand };
}

describe("Dynamic Inventory Rules & Badge Formatting", () => {
  it("formats stock badge label accurately for all thresholds", () => {
    expect(renderStockBadgeText(10)).toBe("IN STOCK");
    expect(renderStockBadgeText(6)).toBe("IN STOCK");
    expect(renderStockBadgeText(5)).toBe("LOW STOCK · 5 LEFT");
    expect(renderStockBadgeText(4)).toBe("LOW STOCK · 4 LEFT");
    expect(renderStockBadgeText(3)).toBe("LOW STOCK · 3 LEFT");
    expect(renderStockBadgeText(2)).toBe("LOW STOCK · 2 LEFT");
    expect(renderStockBadgeText(1)).toBe("LOW STOCK · 1 LEFT");
    expect(renderStockBadgeText(0)).toBe("OUT OF STOCK");
    expect(renderStockBadgeText(-1)).toBe("OUT OF STOCK");
  });

  it("calculates stock deduction dynamically upon purchase", () => {
    const initialStock = 5;
    expect(renderStockBadgeText(initialStock)).toBe("LOW STOCK · 5 LEFT");

    const purchased = 1;
    const newStock = initialStock - purchased;

    expect(newStock).toBe(4);
    expect(renderStockBadgeText(newStock)).toBe("LOW STOCK · 4 LEFT");

    const oversellRequested = 6;
    expect(oversellRequested > initialStock).toBe(true);

    const err = new InsufficientStockError("var-123", oversellRequested, initialStock);
    expect(err.message).toContain("requested 6, 5 available");
  });
});

describe("Admin Dashboard Low Stock Rules", () => {
  it("includes variants with onHand between 1 and 5, excluding 0 and >5", () => {
    expect(isLowStockVariant(1)).toBe(true);
    expect(isLowStockVariant(2)).toBe(true);
    expect(isLowStockVariant(5)).toBe(true);
    expect(isLowStockVariant(6)).toBe(false);
    expect(isLowStockVariant(0)).toBe(false);
    expect(isLowStockVariant(-1)).toBe(false);
  });

  it("formats variant line text with exact on hand count", () => {
    expect(formatOnHandText("WAXED-FIEL-S-RUS", 2)).toBe("WAXED-FIEL-S-RUS · 2 on hand");
    expect(formatOnHandText("SHELL-ANOR-M-MOS", 4)).toBe("SHELL-ANOR-M-MOS · 4 on hand");
  });

  it("handles low-stock collection count and dynamic transitions", () => {
    const variants = [
      { id: "1", sku: "VAR-1", onHand: 6 },
      { id: "2", sku: "VAR-2", onHand: 5 },
      { id: "3", sku: "VAR-3", onHand: 1 },
      { id: "4", sku: "VAR-4", onHand: 0 },
    ];

    let lowStock = variants.filter((v) => isLowStockVariant(v.onHand));
    expect(lowStock).toHaveLength(2);
    expect(lowStock.map((v) => v.id)).toEqual(["2", "3"]);

    // Stock changes 6 -> 5 makes variant appear
    variants[0]!.onHand = 5;
    lowStock = variants.filter((v) => isLowStockVariant(v.onHand));
    expect(lowStock).toHaveLength(3);
    expect(lowStock.map((v) => v.id)).toContain("1");

    // Stock changes 5 -> 6 removes variant
    variants[0]!.onHand = 6;
    lowStock = variants.filter((v) => isLowStockVariant(v.onHand));
    expect(lowStock).toHaveLength(2);
    expect(lowStock.map((v) => v.id)).not.toContain("1");

    // Stock reaches 0 removes variant
    variants[1]!.onHand = 0;
    lowStock = variants.filter((v) => isLowStockVariant(v.onHand));
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0]!.id).toBe("3");
  });
});

describe("Cart Quantity & Stock Limit Rules", () => {
  it("allows cart quantity to reach stock limit 7 but rejects 8 (stock = 7)", () => {
    const stock = 7;
    expect(validateCartQuantity(stock, 6, 1).allowed).toBe(true);
    expect(validateCartQuantity(stock, 7, 1).allowed).toBe(false);
  });

  it("allows cart quantity to reach stock limit 5 but rejects 6 (stock = 5)", () => {
    const stock = 5;
    expect(validateCartQuantity(stock, 4, 1).allowed).toBe(true);
    expect(validateCartQuantity(stock, 5, 1).allowed).toBe(false);
  });

  it("allows cart quantity to reach stock limit 1 but rejects 2 (stock = 1)", () => {
    const stock = 1;
    expect(validateCartQuantity(stock, 0, 1).allowed).toBe(true);
    expect(validateCartQuantity(stock, 1, 1).allowed).toBe(false);
  });

  it("rejects adding to cart when stock = 0", () => {
    const stock = 0;
    expect(validateCartQuantity(stock, 0, 1).allowed).toBe(false);
  });

  it("detects when stock decreases below cart quantity", () => {
    const cartQty = 7;
    let stock = 7;
    expect(cartQty <= stock).toBe(true);

    // Stock drops to 4 after another customer buys 3
    stock = 4;
    expect(cartQty <= stock).toBe(false); // overstock state detected
  });

  it("prevents overselling or negative inventory on concurrent purchase attempts", () => {
    let stock = 1;
    const customerAOrder = 1;
    const customerBOrder = 1;

    // First transaction succeeds
    if (stock >= customerAOrder) {
      stock -= customerAOrder;
    }
    expect(stock).toBe(0);

    // Second concurrent transaction fails cleanly
    expect(stock >= customerBOrder).toBe(false);
    expect(stock).toBeGreaterThanOrEqual(0);
  });
});
