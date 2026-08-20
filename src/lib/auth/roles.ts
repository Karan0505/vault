/**
 * Core Role & Route Authority for VAULT.
 *
 * MUST remain dependency-free: NO Prisma, NO Auth.js, NO server-only modules.
 * This guarantees zero circular dependencies and full testability across all environments.
 */

export type UserRole = "CUSTOMER" | "ADMIN" | "FULFILMENT" | "SUPPORT";

export interface UserWithOptionalRole {
  staffRole?: string | null;
}

export class ForbiddenRoleError extends Error {
  constructor(public readonly requiredRoles: UserRole[], public readonly currentRole: UserRole) {
    super(
      `Forbidden: Required role ${requiredRoles.join(" or ")}, but current role is ${currentRole}.`
    );
    this.name = "ForbiddenRoleError";
  }
}

/**
 * Asserts that a user has one of the allowed roles.
 */
export function assertRole(userRole: UserRole, allowed: UserRole | UserRole[]): void {
  const allowedArray = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArray.includes(userRole)) {
    throw new ForbiddenRoleError(allowedArray, userRole);
  }
}

/**
 * Single source of truth for resolving the effective user application role.
 *
 * - staffRole = null / undefined -> CUSTOMER
 * - staffRole = "admin"           -> ADMIN
 * - staffRole = "fulfilment"      -> FULFILMENT
 * - staffRole = "support"         -> SUPPORT
 */
export function getEffectiveRole(user: UserWithOptionalRole | null | undefined): UserRole {
  if (!user || !user.staffRole) {
    return "CUSTOMER";
  }

  const normalized = user.staffRole.toLowerCase().trim();
  switch (normalized) {
    case "admin":
      return "ADMIN";
    case "fulfilment":
      return "FULFILMENT";
    case "support":
      return "SUPPORT";
    default:
      return "CUSTOMER";
  }
}

/**
 * Strict segment-aware route matching to prevent prefix bypasses.
 * e.g. "/admin" and "/admin/products" match "/admin", but "/administrator" does NOT.
 */
export function matchesRoute(path: string, base: string): boolean {
  if (!path || !base) return false;
  const noQuery = path.split("?")[0] ?? "";
  const cleanPath = noQuery.split("#")[0] ?? "";
  if (!cleanPath) return false;
  return cleanPath === base || cleanPath.startsWith(`${base}/`);
}

/**
 * Validates whether a URL is a safe, internal relative path.
 * Rejects external URLs, protocol-relative URLs, javascript:, and invalid schemes.
 */
export function isSafeInternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();

  // Must start with single slash, not double slash (protocol-relative)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return false;
  }

  // Reject malicious pseudo-protocols or control characters
  if (trimmed.includes(":") || trimmed.includes("\0") || trimmed.includes("\r") || trimmed.includes("\n")) {
    return false;
  }

  return true;
}

/**
 * Determines whether a given route path is permissible for a specific user role.
 */
export function isRouteAllowedForRole(path: string, role: UserRole): boolean {
  if (!path) return false;
  const noQuery = path.split("?")[0] ?? "";
  const cleanPath = noQuery.split("#")[0] ?? "";

  if (matchesRoute(cleanPath, "/admin")) {
    return role === "ADMIN";
  }

  if (matchesRoute(cleanPath, "/fulfilment")) {
    return role === "FULFILMENT" || role === "ADMIN";
  }

  if (matchesRoute(cleanPath, "/support")) {
    return role === "SUPPORT" || role === "ADMIN";
  }

  if (matchesRoute(cleanPath, "/account")) {
    return role === "CUSTOMER";
  }

  // General public storefront routes (/products, /cart, /checkout, /search, etc.) are allowed for all
  return true;
}

/**
 * Resolves the safe post-login redirect URL based on the user's trusted effective role.
 * If a safe callbackUrl is provided and permitted for this role, returns it.
 * Otherwise, falls back to the role's default dashboard.
 */
export function getRoleRedirectUrl(role: UserRole, callbackUrl?: string | null): string {
  if (callbackUrl && isSafeInternalUrl(callbackUrl) && isRouteAllowedForRole(callbackUrl, role)) {
    return callbackUrl;
  }

  switch (role) {
    case "ADMIN":
      return "/admin";
    case "FULFILMENT":
      return "/fulfilment";
    case "SUPPORT":
      return "/support";
    case "CUSTOMER":
    default:
      return "/account";
  }
}
