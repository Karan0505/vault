import { describe, expect, it } from "vitest";
import { formatMoney, addMoney, splitEvenly, assertIntegerMinorUnits } from "@/lib/payments/money";

describe("assertIntegerMinorUnits", () => {
  it("rejects a float — this is the guard that keeps 49.99 out of the amount column", () => {
    expect(() => assertIntegerMinorUnits(49.99)).toThrow();
  });

  it("rejects a negative amount", () => {
    expect(() => assertIntegerMinorUnits(-100)).toThrow();
  });

  it("accepts a valid integer", () => {
    expect(() => assertIntegerMinorUnits(4999)).not.toThrow();
  });
});

describe("formatMoney", () => {
  it("formats USD cents as dollars", () => {
    expect(formatMoney({ amount: 4999, currency: "USD" })).toBe("$49.99");
  });

  it("formats a zero-decimal currency without cents", () => {
    expect(formatMoney({ amount: 1500, currency: "JPY" })).toBe("¥1,500");
  });
});

describe("addMoney", () => {
  it("adds two amounts of the same currency", () => {
    expect(addMoney({ amount: 100, currency: "USD" }, { amount: 250, currency: "USD" })).toEqual({
      amount: 350,
      currency: "USD",
    });
  });

  it("throws on a currency mismatch rather than silently combining", () => {
    expect(() => addMoney({ amount: 100, currency: "USD" }, { amount: 100, currency: "EUR" })).toThrow();
  });
});

describe("splitEvenly — the discount/refund remainder-cent problem", () => {
  it("splits a clean multiple with no remainder", () => {
    expect(splitEvenly(300, 3)).toEqual([100, 100, 100]);
  });

  it("distributes the remainder deterministically, largest-remainder-first, and sums back exactly", () => {
    const parts = splitEvenly(100, 3); // 33.33 each — one part must absorb the extra cent
    expect(parts.reduce((sum, p) => sum + p, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });

  it("throws for a non-positive part count", () => {
    expect(() => splitEvenly(100, 0)).toThrow();
  });
});
