import "server-only";
import { auth } from "@/lib/auth";
import type { AuditActor } from "@/lib/audit.server";

/** Customer-side session lookup. Returns null for guest requests — guest checkout is a first-class path, not an error state. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * Staff-side session lookup for admin API routes. Returns null for
 * anyone without a session at all; a signed-in customer with no
 * staffRole still gets an actor back (role: null) so route handlers can
 * make their own permission decision via hasPermission() — this
 * function only resolves *who*, not *what they're allowed to do*.
 */
export async function getStaffActor(): Promise<AuditActor | null> {
  const session = await auth();
  if (!session?.user?.id || !session?.user?.email) return null;
  return { userId: session.user.id, email: session.user.email, role: session.user.staffRole ?? null };
}
