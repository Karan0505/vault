import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { ProductCardData } from "@/components/product";

// Only orders that actually completed count as a "purchase" signal —
// a pending order (payment not yet confirmed, or abandoned) says
// nothing about what customers actually buy together.
const COMPLETED_STATUSES = Prisma.sql`('paid', 'fulfilled', 'delivered')`;

interface RecommendationRow {
  id: string;
  slug: string;
  title: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  totalAvailable: number;
}

function toCardData(rows: RecommendationRow[], mediaByProduct: Map<string, { url: string; alt: string }>): ProductCardData[] {
  return rows.map((row) => {
    const image = mediaByProduct.get(row.id);
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt || row.title,
      minPriceAmount: row.minPrice,
      maxPriceAmount: row.maxPrice,
      currency: row.currency,
      totalOnHand: row.totalAvailable,
    };
  });
}

async function attachCoverImages(rows: RecommendationRow[]): Promise<ProductCardData[]> {
  if (rows.length === 0) return [];
  const media = await prisma.media.findMany({
    where: { productId: { in: rows.map((r) => r.id) } },
    orderBy: { position: "asc" },
  });
  const mediaByProduct = new Map<string, { url: string; alt: string }>();
  for (const item of media) {
    if (item.productId && !mediaByProduct.has(item.productId)) {
      mediaByProduct.set(item.productId, { url: item.url, alt: item.alt });
    }
  }
  return toCardData(rows, mediaByProduct);
}

/**
 * "Customers who bought this also bought" — ranked by how many
 * completed orders contained both products together. This is the real
 * signal the brief asks for; there is no `ORDER BY random()` anywhere
 * in this file, including the fallback path below.
 */
async function coPurchasedWith(productId: string, limit: number): Promise<RecommendationRow[]> {
  return prisma.$queryRaw<RecommendationRow[]>(Prisma.sql`
    SELECT
      p2.id,
      p2.slug,
      p2.title,
      MIN(v2."priceAmount")::int AS "minPrice",
      MAX(v2."priceAmount")::int AS "maxPrice",
      (array_agg(v2."priceCurrency"))[1] AS currency,
      COALESCE(SUM(i2."onHand" - COALESCE(i2.reserved, 0)), 0)::int AS "totalAvailable"
    FROM "order_items" oi1
    JOIN "orders" o ON o.id = oi1."orderId" AND o.status IN ${COMPLETED_STATUSES}
    JOIN "order_items" oi2 ON oi2."orderId" = oi1."orderId" AND oi2.id != oi1.id
    JOIN "product_variants" v1 ON v1.id = oi1."variantId"
    JOIN "product_variants" v2 ON v2.id = oi2."variantId"
    JOIN "products" p2 ON p2.id = v2."productId" AND p2.status = 'active'
    LEFT JOIN "inventory_items" i2 ON i2."variantId" = v2.id
    WHERE v1."productId" = ${productId}
      AND v2."productId" != ${productId}
    GROUP BY p2.id, p2.slug, p2.title
    ORDER BY COUNT(DISTINCT oi1."orderId") DESC, p2."updatedAt" DESC
    LIMIT ${limit}
  `);
}

/**
 * Fallback (and the "recommended for you" home-page rail) when
 * co-purchase data is thin — a young or lightly-ordered catalogue
 * won't have much order-pair signal yet. Ranks the same category by
 * completed-order volume instead of falling back to arbitrary order.
 */
async function bestSellersInCategory(
  categoryId: string | null,
  excludeProductIds: readonly string[],
  limit: number
): Promise<RecommendationRow[]> {
  if (!categoryId) return [];
  const excluded = excludeProductIds.length > 0 ? excludeProductIds : ["__none__"];

  return prisma.$queryRaw<RecommendationRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      MIN(v."priceAmount")::int AS "minPrice",
      MAX(v."priceAmount")::int AS "maxPrice",
      (array_agg(v."priceCurrency"))[1] AS currency,
      COALESCE(SUM(i."onHand" - COALESCE(i.reserved, 0)), 0)::int AS "totalAvailable",
      COUNT(DISTINCT oi."orderId") AS "orderCount"
    FROM "products" p
    JOIN "product_variants" v ON v."productId" = p.id AND v."isEnabled" = true
    LEFT JOIN "inventory_items" i ON i."variantId" = v.id
    LEFT JOIN "order_items" oi ON oi."variantId" = v.id
    LEFT JOIN "orders" o ON o.id = oi."orderId" AND o.status IN ${COMPLETED_STATUSES}
    WHERE p."categoryId" = ${categoryId}
      AND p.status = 'active'
      AND p.id NOT IN (${Prisma.join(excluded)})
    GROUP BY p.id, p.slug, p.title
    ORDER BY COUNT(DISTINCT oi."orderId") DESC, p."updatedAt" DESC
    LIMIT ${limit}
  `);
}

export async function getRecommendationsForProduct(
  productId: string,
  categoryId: string | null,
  limit = 4
): Promise<ProductCardData[]> {
  const coPurchased = await coPurchasedWith(productId, limit);

  if (coPurchased.length >= limit) {
    return attachCoverImages(coPurchased);
  }

  const fallback = await bestSellersInCategory(
    categoryId,
    [productId, ...coPurchased.map((r) => r.id)],
    limit - coPurchased.length
  );

  return attachCoverImages([...coPurchased, ...fallback]);
}
