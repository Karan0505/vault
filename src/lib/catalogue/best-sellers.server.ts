import "server-only";
import { unstable_cache as cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { resolveColor } from "@/lib/shared/colors";
import { cacheTags } from "@/lib/validation/revalidate";
import type { ProductCardData } from "@/components/product/ProductCard";

export interface BestSellerProduct extends ProductCardData {
  id: string;
  totalSold: number;
}

interface BestSellerRow {
  productId: string;
  totalSold: number;
}

/**
 * Extracts distinct CSS color codes from variant options JSON.
 */
function extractVariantColors(variants: Array<{ options: unknown }>): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];

  for (const variant of variants) {
    if (!variant.options || typeof variant.options !== "object" || Array.isArray(variant.options)) {
      continue;
    }
    const opts = variant.options as Record<string, unknown>;
    for (const key of Object.keys(opts)) {
      if (key.toLowerCase() === "colour" || key.toLowerCase() === "color") {
        const val = opts[key];
        if (typeof val === "string" && val.trim() !== "") {
          const colorName = val.trim();
          if (!seen.has(colorName.toLowerCase())) {
            seen.add(colorName.toLowerCase());
            const resolved = resolveColor(colorName);
            colors.push(resolved.bg);
          }
        }
      }
    }
  }

  return colors;
}

/**
 * Tagged read for Best Sellers storefront section.
 * Queries PostgreSQL directly for completed order sales volume, aggregates variants,
 * subtracts refunds using GREATEST(0, quantity - refundedQuantity), and returns ranked active products.
 */
export function getBestSellingProducts(limit = 6): Promise<BestSellerProduct[]> {
  return cache(
    async () => {
      try {
        // Step 1: Execute parameterized SQL aggregation for ranked product IDs
        const rankedRows = await prisma.$queryRaw<BestSellerRow[]>(Prisma.sql`
          SELECT 
            pv."productId",
            SUM(
              GREATEST(
                0,
                oi."quantity" - COALESCE(oi."refundedQuantity", 0)
              )
            )::int AS "totalSold"
          FROM "order_items" oi
          JOIN "orders" o ON oi."orderId" = o."id"
          JOIN "product_variants" pv ON oi."variantId" = pv."id"
          JOIN "products" p ON pv."productId" = p."id"
          WHERE o."status"::text IN ('paid', 'fulfilled', 'delivered')
            AND p."status"::text = 'active'
          GROUP BY pv."productId"
          HAVING SUM(
            GREATEST(
              0,
              oi."quantity" - COALESCE(oi."refundedQuantity", 0)
            )
          ) > 0
          ORDER BY "totalSold" DESC, MIN(p."createdAt") ASC, pv."productId" ASC
          LIMIT ${limit};
        `);

        if (!rankedRows || rankedRows.length === 0) {
          return [];
        }

        const productIds = rankedRows.map((r) => r.productId);
        const salesMap = new Map<string, number>(rankedRows.map((r) => [r.productId, r.totalSold]));

        // Step 2: Batch fetch full entity details for the ranked product IDs
        const products = await prisma.product.findMany({
          where: {
            id: { in: productIds },
            status: "active",
          },
          include: {
            media: {
              orderBy: { position: "asc" },
              take: 1,
            },
            variants: {
              where: { isEnabled: true },
              orderBy: { priceAmount: "asc" },
              include: { inventoryItem: true },
            },
          },
        });

        const productMap = new Map(products.map((p) => [p.id, p]));

        // Preserve exact ranking order from Step 1 aggregation
        const results: BestSellerProduct[] = [];

        for (const id of productIds) {
          const product = productMap.get(id);
          if (!product || product.variants.length === 0) continue;

          const prices = product.variants.map((v) => v.priceAmount);
          const minPriceAmount = Math.min(...prices);
          const maxPriceAmount = Math.max(...prices);
          const currency = product.variants[0]?.priceCurrency ?? "USD";
          const totalOnHand = product.variants.reduce(
            (sum, v) => sum + (v.inventoryItem?.onHand ?? 0),
            0
          );
          const colors = extractVariantColors(product.variants);

          results.push({
            id: product.id,
            slug: product.slug,
            title: product.title,
            imageUrl: product.media[0]?.url ?? null,
            imageAlt: product.media[0]?.alt || product.title,
            minPriceAmount,
            maxPriceAmount,
            currency,
            totalOnHand,
            colors: colors.length > 0 ? colors : undefined,
            totalSold: salesMap.get(product.id) ?? 0,
          });
        }

        return results;
      } catch (error) {
        console.error("Failed to fetch best selling products:", error);
        return [];
      }
    },
    [`best-selling-products:${limit}`],
    {
      tags: [cacheTags.bestSellers(), cacheTags.productList()],
      revalidate: 3600,
    }
  )();
}
