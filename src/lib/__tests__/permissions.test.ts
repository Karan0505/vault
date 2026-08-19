import { describe, it, expect } from "vitest";
import { hasPermission, assertPermission, ForbiddenError } from "../permissions";

describe("role permission matrix — the two constraints the brief states explicitly", () => {
  it("support cannot issue refunds", () => {
    expect(hasPermission("support", "refunds:issue")).toBe(false);
  });

  it("fulfilment cannot edit prices (products:write)", () => {
    expect(hasPermission("fulfilment", "products:write")).toBe(false);
  });
});

describe("role permission matrix — the rest of the story built around those two anchors", () => {
  it("only admin can write products/prices", () => {
    expect(hasPermission("admin", "products:write")).toBe(true);
    expect(hasPermission("fulfilment", "products:write")).toBe(false);
    expect(hasPermission("support", "products:write")).toBe(false);
  });

  it("admin and fulfilment can fulfil and refund orders; support cannot", () => {
    for (const role of ["admin", "fulfilment"] as const) {
      expect(hasPermission(role, "orders:fulfil")).toBe(true);
      expect(hasPermission(role, "refunds:issue")).toBe(true);
    }
    expect(hasPermission("support", "orders:fulfil")).toBe(false);
    expect(hasPermission("support", "refunds:issue")).toBe(false);
  });

  it("all three roles can view orders and inventory", () => {
    for (const role of ["admin", "fulfilment", "support"] as const) {
      expect(hasPermission(role, "orders:view")).toBe(true);
      expect(hasPermission(role, "inventory:view")).toBe(true);
    }
  });

  it("all three roles can cancel orders — cancellation touches no money, unlike a refund", () => {
    for (const role of ["admin", "fulfilment", "support"] as const) {
      expect(hasPermission(role, "orders:cancel")).toBe(true);
    }
  });

  it("only admin and fulfilment can adjust inventory; support cannot", () => {
    expect(hasPermission("admin", "inventory:adjust")).toBe(true);
    expect(hasPermission("fulfilment", "inventory:adjust")).toBe(true);
    expect(hasPermission("support", "inventory:adjust")).toBe(false);
  });

  it("only admin can view the audit log", () => {
    expect(hasPermission("admin", "audit-log:view")).toBe(true);
    expect(hasPermission("fulfilment", "audit-log:view")).toBe(false);
    expect(hasPermission("support", "audit-log:view")).toBe(false);
  });

  it("a null role (unauthenticated) has no permissions at all", () => {
    expect(hasPermission(null, "orders:view")).toBe(false);
    expect(hasPermission(null, "products:write")).toBe(false);
  });
});

describe("assertPermission", () => {
  it("throws ForbiddenError naming the missing permission", () => {
    expect(() => assertPermission("support", "refunds:issue")).toThrow(ForbiddenError);
    try {
      assertPermission("support", "refunds:issue");
    } catch (error) {
      expect(error).toBeInstanceOf(ForbiddenError);
      expect((error as ForbiddenError).permission).toBe("refunds:issue");
    }
  });

  it("does not throw when the role has the permission", () => {
    expect(() => assertPermission("admin", "refunds:issue")).not.toThrow();
  });
});
