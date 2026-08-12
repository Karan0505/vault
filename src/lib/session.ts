import "server-only";
import { auth } from "@/lib/auth";

/** Customer-side session lookup. Returns null for guest requests — guest checkout is a first-class path, not an error state. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
