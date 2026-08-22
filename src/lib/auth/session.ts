import "server-only";
import { auth } from "@/lib/auth/auth";
import { prisma } from "@/lib/db/prisma";
import type { AuditActor } from "@/lib/auth/audit.server";

/** Customer-side session lookup. Returns null for guest requests — guest checkout is a first-class path, not an error state. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (dbUser) {
      return dbUser.id;
    }

    if (session.user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
        select: { id: true },
      });
      if (userByEmail) {
        return userByEmail.id;
      }
    }
  } catch {
    // Database fallback to raw session id
  }

  return session.user.id;
}

export async function getCurrentUser(): Promise<{ id: string; email?: string | null; name?: string | null } | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  let resolvedId = session.user.id;
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true },
    });

    if (!dbUser && session.user.email) {
      const userByEmail = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase().trim() },
        select: { id: true },
      });
      if (userByEmail) {
        resolvedId = userByEmail.id;
      }
    }
  } catch {
    // ignore
  }

  return {
    id: resolvedId,
    email: session.user.email,
    name: session.user.name,
  };
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
