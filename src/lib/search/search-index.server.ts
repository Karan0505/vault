import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

/**
 * Recomputes one product's `search_vector` from its current title and
 * description. Called from createProduct/updateProduct in
 * products.server.ts, right alongside the tag revalidation that
 * already happens on the same write — one more small, targeted update
 * on the same code path, not a background job or a database trigger.
 *
 * Why not a Postgres GENERATED column or a trigger instead: both would
 * make the index-freshness guarantee live entirely in the database,
 * invisible from the application code that a reviewer is reading to
 * understand what happens on a product write. A trigger in particular
 * is the kind of thing that's easy to forget exists until search
 * results go stale and nobody thinks to look in `pg_trigger`. Doing it
 * here means "when does the search index update" has exactly one
 * answer, in exactly one file, next to the other consequences of a
 * product write. The cost: a write made directly against the database
 * (a manual `UPDATE products`, a future bulk-import script that
 * doesn't go through this module) won't update the index — mitigated
 * by `reindexAllProducts` below for exactly that recovery case.
 */
export async function syncProductSearchVector(
  tx: Prisma.TransactionClient | typeof prisma,
  productId: string
): Promise<void> {
  await tx.$executeRaw`
    UPDATE "products"
    SET "searchVector" = to_tsvector('english', title || ' ' || coalesce(description, ''))
    WHERE id = ${productId}
  `;
}

/** Full reindex — run after a bulk import, a restore from backup, or any write path that bypassed syncProductSearchVector. */
export async function reindexAllProducts(): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE "products"
    SET "searchVector" = to_tsvector('english', title || ' ' || coalesce(description, ''))
  `;
  return result;
}
