import { describe, expect, it } from "vitest";
import { getRoleRedirectUrl, isSafeInternalUrl, isRouteAllowedForRole } from "../roles";

describe("Checkout Authentication Guard & Redirect Authority", () => {
  describe("Post-Login Redirect Resolution for Checkout", () => {
    it("preserves /checkout destination for customer role upon successful login", () => {
      const destination = getRoleRedirectUrl("CUSTOMER", "/checkout");
      expect(destination).toBe("/checkout");
    });

    it("preserves /checkout destination with query parameters (e.g. discount codes)", () => {
      const destination = getRoleRedirectUrl("CUSTOMER", "/checkout?discount=VAULT20");
      expect(destination).toBe("/checkout?discount=VAULT20");
    });

    it("allows customer role on checkout routes", () => {
      expect(isRouteAllowedForRole("/checkout", "CUSTOMER")).toBe(true);
      expect(isRouteAllowedForRole("/checkout/success", "CUSTOMER")).toBe(true);
    });

    it("rejects unsafe or external open redirects and falls back to /account for customer", () => {
      expect(getRoleRedirectUrl("CUSTOMER", "https://malicious.com")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "//malicious.com")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "/\\malicious.com")).toBe("/account");
      expect(getRoleRedirectUrl("CUSTOMER", "javascript:alert(1)")).toBe("/account");
    });
  });

  describe("URL Safety Validation for Auth Redirects", () => {
    it("recognizes safe internal relative paths", () => {
      expect(isSafeInternalUrl("/checkout")).toBe(true);
      expect(isSafeInternalUrl("/checkout?discount=SAVE10")).toBe(true);
      expect(isSafeInternalUrl("/account")).toBe(true);
      expect(isSafeInternalUrl("/cart")).toBe(true);
    });

    it("rejects malicious, protocol-relative, or cross-domain URLs", () => {
      expect(isSafeInternalUrl("http://evil.com")).toBe(false);
      expect(isSafeInternalUrl("https://evil.com")).toBe(false);
      expect(isSafeInternalUrl("//evil.com")).toBe(false);
      expect(isSafeInternalUrl("")).toBe(false);
      expect(isSafeInternalUrl(null)).toBe(false);
      expect(isSafeInternalUrl(undefined)).toBe(false);
    });
  });
});
