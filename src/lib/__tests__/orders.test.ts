import { describe, it, expect } from "vitest";
import { canTransition, assertTransition, isTerminal, IllegalOrderTransitionError } from "../orders";

describe("order state machine", () => {
  it("allows the happy path: pending -> paid -> fulfilled -> delivered", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("paid", "fulfilled")).toBe(true);
    expect(canTransition("fulfilled", "delivered")).toBe(true);
  });

  it("allows cancellation only while pending", () => {
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("paid", "cancelled")).toBe(true);
    expect(canTransition("fulfilled", "cancelled")).toBe(false);
    expect(canTransition("delivered", "cancelled")).toBe(false);
  });

  it("allows refund from paid, fulfilled, or delivered — but not from pending", () => {
    expect(canTransition("paid", "refunded")).toBe(true);
    expect(canTransition("fulfilled", "refunded")).toBe(true);
    expect(canTransition("delivered", "refunded")).toBe(true);
    expect(canTransition("pending", "refunded")).toBe(false);
  });

  it("rejects going backwards — paid can never return to pending", () => {
    expect(canTransition("paid", "pending")).toBe(false);
  });

  it("rejects skipping a stage — pending straight to fulfilled", () => {
    expect(canTransition("pending", "fulfilled")).toBe(false);
  });

  it("throws IllegalOrderTransitionError with the offending states, not a generic error", () => {
    expect(() => assertTransition("delivered", "pending")).toThrow(IllegalOrderTransitionError);
    try {
      assertTransition("delivered", "pending");
    } catch (error) {
      expect(error).toBeInstanceOf(IllegalOrderTransitionError);
      const illegal = error as IllegalOrderTransitionError;
      expect(illegal.from).toBe("delivered");
      expect(illegal.to).toBe("pending");
    }
  });

  it("treats cancelled and refunded as terminal — nothing transitions out of them", () => {
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("refunded")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("paid")).toBe(false);
  });
});
