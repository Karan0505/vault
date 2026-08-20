import type { StaffRole } from "@prisma/client";

/**
 * Every distinct staff-gated action in the system, named as
 * `resource:action`. Adding a new gated action means adding it here
 * first — the alternative (an ad hoc `role === "admin" || role ===
 * "fulfilment"` check inline at each call site) is exactly how a
 * permission check silently drifts between two routes that were
 * supposed to agree.
 */
export type Permission =
  | "products:write" // create/edit/delete products, categories, and — critically — prices
  | "orders:view"
  | "orders:fulfil" // mark fulfilled, add tracking, partial fulfilment
  | "orders:cancel"
  | "refunds:issue"
  | "inventory:view"
  | "inventory:adjust"
  | "audit-log:view";

/**
 * The full matrix. Two cells are pinned directly by the brief:
 * support has no `refunds:issue`, fulfilment has no `products:write`.
 * The rest is filled in with a coherent story around those two
 * anchors — see docs/decisions/0016-role-permission-matrix.md for the
 * reasoning behind every other cell, not just the two given ones.
 */
const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<Permission>> = {
  admin: new Set<Permission>([
    "products:write",
    "orders:view",
    "orders:fulfil",
    "orders:cancel",
    "refunds:issue",
    "inventory:view",
    "inventory:adjust",
    "audit-log:view",
  ]),
  fulfilment: new Set<Permission>([
    "orders:view",
    "orders:fulfil",
    "orders:cancel",
    "refunds:issue",
    "inventory:view",
    "inventory:adjust",
  ]),
  support: new Set<Permission>(["orders:view", "orders:cancel", "inventory:view"]),
};

export function hasPermission(role: StaffRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].has(permission);
}

/** Throws if the role lacks the permission — for API routes that want a one-line guard rather than an if/return pair. */
export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function assertPermission(role: StaffRole | null, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new ForbiddenError(permission);
  }
}
