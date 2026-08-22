import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/auth";
import { getEffectiveRole, type UserRole, ForbiddenRoleError, assertRole } from "@/lib/auth/roles";

export { ForbiddenRoleError, assertRole };

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * Server guard: requires an authenticated session.
 * If unauthenticated in Server Components, redirects to /login?callbackUrl.
 */
export async function requireAuth(options?: { redirectTo?: string }) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    if (options?.redirectTo) {
      redirect(`/login?callbackUrl=${encodeURIComponent(options.redirectTo)}`);
    }
    redirect("/login");
  }
  return session;
}

/**
 * Server guard: requires an authenticated user with one of the specified roles.
 * If unauthorized (wrong role), redirects to /forbidden.
 */
export async function requireRole(allowed: UserRole | UserRole[], options?: { redirectTo?: string }) {
  const session = await requireAuth(options);
  const effectiveRole = session.user.role || getEffectiveRole(session.user);

  const allowedArray = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedArray.includes(effectiveRole)) {
    redirect("/forbidden");
  }

  return { session, role: effectiveRole };
}

/**
 * Server guard: requires an authenticated CUSTOMER user.
 */
export async function requireCustomer(options?: { redirectTo?: string }) {
  return requireRole("CUSTOMER", options);
}
