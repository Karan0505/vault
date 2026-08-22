import { describe, it, expect } from "vitest";
import { computeDiscount, type CartLineForDiscount, type DiscountRules } from "@/lib/checkout/discounts";

const baseRules: DiscountRules = {
  type: "percentage",
  value: 10,
  minimumSpend: null,
  startsAt: null,
  expiresAt: null,
  isActive: true,
};

const lines: CartLineForDiscount[] = [
  { variantId: "a", unitAmount: 1000, quantity: 1 }, // 1000
  { variantId: "b", unitAmount: 2000, quantity: 1 }, // 2000
];
// subtotal = 3000

describe("computeDiscount — eligibility", () => {
  it("rejects an inactive discount", () => {
    const result = computeDiscount(lines, { ...baseRules, isActive: false });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("inactive");
    expect(result.totalDiscount).toBe(0);
  });

  it("rejects a code before its start date", () => {
    const result = computeDiscount(lines, { ...baseRules, startsAt: new Date("2999-01-01") });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("not_started");
  });

  it("rejects an expired code", () => {
    const result = computeDiscount(lines, { ...baseRules, expiresAt: new Date("2000-01-01") });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("expired");
  });

  it("rejects a cart below minimum spend", () => {
    const result = computeDiscount(lines, { ...baseRules, minimumSpend: 5000 });
    expect(result.eligible).toBe(false);
    expect(result.reason).toBe("below_minimum_spend");
  });

  it("accepts a cart at or above minimum spend", () => {
    const result = computeDiscount(lines, { ...baseRules, minimumSpend: 3000 });
    expect(result.eligible).toBe(true);
  });
});

describe("computeDiscount — percentage, distributed proportionally", () => {
  it("computes 10% of a 3000 subtotal as 300, split by each line's share", () => {
    const result = computeDiscount(lines, baseRules);
    expect(result.eligible).toBe(true);
    expect(result.totalDiscount).toBe(300);
    // line a is 1000/3000 = 1/3 of subtotal -> 100; line b is 2000/3000 = 2/3 -> 200
    expect(result.perLineDiscount).toEqual([100, 200]);
    expect(result.perLineDiscount.reduce((sum, d) => sum + d, 0)).toBe(result.totalDiscount);
  });

  it("never loses or invents a cent to rounding, even on an uneven split", () => {
    const unevenLines: CartLineForDiscount[] = [
      { variantId: "a", unitAmount: 333, quantity: 1 },
      { variantId: "b", unitAmount: 333, quantity: 1 },
      { variantId: "c", unitAmount: 334, quantity: 1 },
    ]; // subtotal = 1000
    const result = computeDiscount(unevenLines, { ...baseRules, value: 33 }); // 33% of 1000 = 330
    expect(result.totalDiscount).toBe(330);
    expect(result.perLineDiscount.reduce((sum, d) => sum + d, 0)).toBe(330);
  });
});

describe("computeDiscount — fixed amount", () => {
  it("applies a fixed amount, capped at the subtotal", () => {
    const result = computeDiscount(lines, { ...baseRules, type: "fixed_amount", value: 500 });
    expect(result.totalDiscount).toBe(500);
  });

  it("caps a fixed amount larger than the subtotal instead of going negative", () => {
    const result = computeDiscount(lines, { ...baseRules, type: "fixed_amount", value: 10_000 });
    expect(result.totalDiscount).toBe(3000); // capped at the subtotal, not 10000
  });
});

describe("computeDiscount — free shipping", () => {
  it("has zero item-level discount but flags freeShipping", () => {
    const result = computeDiscount(lines, { ...baseRules, type: "free_shipping" });
    expect(result.eligible).toBe(true);
    expect(result.freeShipping).toBe(true);
    expect(result.totalDiscount).toBe(0);
    expect(result.perLineDiscount).toEqual([0, 0]);
  });
});
