import { describe, it, expect } from "vitest";
import {
  getEffectiveRole,
  matchesRoute,
  isSafeInternalUrl,
  isRouteAllowedForRole,
  getRoleRedirectUrl,
  assertRole,
  ForbiddenRoleError,
} from "@/lib/auth/roles";
import { validatePassword, hashPassword, verifyPassword } from "@/lib/auth/password";

describe("RBAC & Role Resolution Domain", () => {
  describe("getEffectiveRole()", () => {
    it("resolves null/undefined staffRole to CUSTOMER", () => {
      expect(getEffectiveRole(null)).toBe("CUSTOMER");
      expect(getEffectiveRole(undefined)).toBe("CUSTOMER");
      expect(getEffectiveRole({ staffRole: null })).toBe("CUSTOMER");
      expect(getEffectiveRole({ staffRole: undefined })).toBe("CUSTOMER");
    });

    it("resolves admin to ADMIN", () => {
      expect(getEffectiveRole({ staffRole: "admin" })).toBe("ADMIN");
      expect(getEffectiveRole({ staffRole: "ADMIN" })).toBe("ADMIN");
    });

    it("resolves fulfilment to FULFILMENT", () => {
      expect(getEffectiveRole({ staffRole: "fulfilment" })).toBe("FULFILMENT");
      expect(getEffectiveRole({ staffRole: "FULFILMENT" })).toBe("FULFILMENT");
    });

    it("resolves support to SUPPORT", () => {
      expect(getEffectiveRole({ staffRole: "support" })).toBe("SUPPORT");
      expect(getEffectiveRole({ staffRole: "SUPPORT" })).toBe("SUPPORT");
    });

    it("resolves unknown or unexpected role values safely to CUSTOMER", () => {
      expect(getEffectiveRole({ staffRole: "superadmin" })).toBe("CUSTOMER");
      expect(getEffectiveRole({ staffRole: "guest" })).toBe("CUSTOMER");
    });
  });

  describe("matchesRoute()", () => {
    it("matches exact route bases", () => {
      expect(matchesRoute("/admin", "/admin")).toBe(true);
      expect(matchesRoute("/account", "/account")).toBe(true);
      expect(matchesRoute("/fulfilment", "/fulfilment")).toBe(true);
      expect(matchesRoute("/support", "/support")).toBe(true);
    });

    it("matches nested child segments", () => {
      expect(matchesRoute("/admin/products", "/admin")).toBe(true);
      expect(matchesRoute("/admin/orders/123", "/admin")).toBe(true);
      expect(matchesRoute("/account/orders", "/account")).toBe(true);
      expect(matchesRoute("/fulfilment/orders", "/fulfilment")).toBe(true);
      expect(matchesRoute("/support/tickets", "/support")).toBe(true);
    });

    it("rejects false-prefix matches (e.g. /administrator for /admin)", () => {
      expect(matchesRoute("/administrator", "/admin")).toBe(false);
      expect(matchesRoute("/admin-panel", "/admin")).toBe(false);
      expect(matchesRoute("/accounts", "/account")).toBe(false);
      expect(matchesRoute("/fulfilments", "/fulfilment")).toBe(false);
      expect(matchesRoute("/supporting", "/support")).toBe(false);
    });

    it("strips query parameters and hashes before matching", () => {
      expect(matchesRoute("/admin?tab=overview", "/admin")).toBe(true);
      expect(matchesRoute("/account#orders", "/account")).toBe(true);
    });
  });

  describe("isSafeInternalUrl()", () => {
    it("accepts valid internal paths", () => {
      expect(isSafeInternalUrl("/account")).toBe(true);
      expect(isSafeInternalUrl("/admin/products")).toBe(true);
      expect(isSafeInternalUrl("/search?q=hoodie")).toBe(true);
    });

    it("rejects external or malicious callback URLs", () => {
      expect(isSafeInternalUrl("https://evil.com")).toBe(false);
      expect(isSafeInternalUrl("http://evil.com")).toBe(false);
      expect(isSafeInternalUrl("//evil.com")).toBe(false);
      expect(isSafeInternalUrl("/\\evil.com")).toBe(false);
      expect(isSafeInternalUrl("javascript:alert(1)")).toBe(false);
      expect(isSafeInternalUrl(null)).toBe(false);
      expect(isSafeInternalUrl("")).toBe(false);
    });
  });

  describe("isRouteAllowedForRole()", () => {
    it("enforces CUSTOMER permissions strictly", () => {
      expect(isRouteAllowedForRole("/account", "CUSTOMER")).toBe(true);
      expect(isRouteAllowedForRole("/account/orders", "CUSTOMER")).toBe(true);
      expect(isRouteAllowedForRole("/admin", "CUSTOMER")).toBe(false);
      expect(isRouteAllowedForRole("/admin/products", "CUSTOMER")).toBe(false);
      expect(isRouteAllowedForRole("/fulfilment", "CUSTOMER")).toBe(false);
      expect(isRouteAllowedForRole("/support", "CUSTOMER")).toBe(false);
    });

    it("enforces ADMIN permissions", () => {
      expect(isRouteAllowedForRole("/admin", "ADMIN")).toBe(true);
      expect(isRouteAllowedForRole("/fulfilment", "ADMIN")).toBe(true);
      expect(isRouteAllowedForRole("/support", "ADMIN")).toBe(true);
    });

    it("enforces FULFILMENT permissions", () => {
      expect(isRouteAllowedForRole("/fulfilment", "FULFILMENT")).toBe(true);
      expect(isRouteAllowedForRole("/admin", "FULFILMENT")).toBe(false);
      expect(isRouteAllowedForRole("/support", "FULFILMENT")).toBe(false);
    });

    it("enforces SUPPORT permissions", () => {
      expect(isRouteAllowedForRole("/support", "SUPPORT")).toBe(true);
      expect(isRouteAllowedForRole("/admin", "SUPPORT")).toBe(false);
      expect(isRouteAllowedForRole("/fulfilment", "SUPPORT")).toBe(false);
    });
  });

  describe("getRoleRedirectUrl() - Safe Role-Aware Redirection", () => {
    it("redirects CUSTOMER to permitted callback or default /account", () => {
      expect(getRoleRedirectUrl("CUSTOMER", "/account")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "/search")).toBe("/search");
      // Blocked privileged callbacks fall back to /account
      expect(getRoleRedirectUrl("CUSTOMER", "/admin")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "/fulfilment")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "/support")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "https://external.com")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", null)).toBe("/account");
    });

    it("redirects ADMIN to default /admin or permitted callback", () => {
      expect(getRoleRedirectUrl("ADMIN", null)).toBe("/admin");
      expect(getRoleRedirectUrl("ADMIN", "/admin/products")).toBe("/admin/products");
    });

    it("redirects FULFILMENT to default /fulfilment or permitted callback", () => {
      expect(getRoleRedirectUrl("FULFILMENT", null)).toBe("/fulfilment");
      expect(getRoleRedirectUrl("FULFILMENT", "/admin")).toBe("/fulfilment"); // blocked
    });

    it("redirects SUPPORT to default /support or permitted callback", () => {
      expect(getRoleRedirectUrl("SUPPORT", null)).toBe("/support");
      expect(getRoleRedirectUrl("SUPPORT", "/admin")).toBe("/support"); // blocked
    });
  });

  describe("assertRole()", () => {
    it("passes when role matches single allowed role", () => {
      expect(() => assertRole("ADMIN", "ADMIN")).not.toThrow();
      expect(() => assertRole("CUSTOMER", "CUSTOMER")).not.toThrow();
    });

    it("passes when role is in allowed array", () => {
      expect(() => assertRole("FULFILMENT", ["FULFILMENT", "ADMIN"])).not.toThrow();
      expect(() => assertRole("ADMIN", ["SUPPORT", "ADMIN"])).not.toThrow();
    });

    it("throws ForbiddenRoleError when role is not permitted", () => {
      expect(() => assertRole("CUSTOMER", "ADMIN")).toThrow(ForbiddenRoleError);
      expect(() => assertRole("SUPPORT", ["FULFILMENT", "ADMIN"])).toThrow(ForbiddenRoleError);
    });
  });
});

describe("Secure Password Authentication & Validation", () => {
  it("validates password strength rules (8+ chars, 1 number, 1 special char)", () => {
    expect(validatePassword("Short1!").isValid).toBe(false); // < 8 chars
    expect(validatePassword("NoNumberSpecial!").isValid).toBe(false); // no digits
    expect(validatePassword("NoSpecial1234").isValid).toBe(false); // no special chars
    expect(validatePassword("SecurePass123!").isValid).toBe(true);
  });

  it("hashes password with bcrypt and outputs valid $2b$ hash", async () => {
    const hash = await hashPassword("VaultPass2026!");
    expect(hash).toBeDefined();
    expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    expect(hash.length).toBeGreaterThan(50);
  });

  it("verifies matching password correctly", async () => {
    const raw = "VaultPass2026!";
    const hash = await hashPassword(raw);

    const isMatch = await verifyPassword(raw, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await verifyPassword("WrongPassword123!", hash);
    expect(isWrongMatch).toBe(false);
  });

  it("handles null/empty password and hashes safely without throwing", async () => {
    expect(await verifyPassword("", "$2b$10$invalidhash")).toBe(false);
    expect(await verifyPassword("Password123!", "")).toBe(false);
  });
});
