import "server-only";
import { prisma } from "@/lib/db/prisma";
import { resolveColor } from "@/lib/shared/colors";

export interface WishlistProduct {
  id: string;
  slug: string;
  title: string;
  imageUrl: string | null;
  imageAlt: string;
  minPriceAmount: number;
  maxPriceAmount: number;
  currency: string;
  totalOnHand: number;
  categoryName?: string;
  colors?: string[];
  wishlistedAt: string;
}

/**
 * Extracts unique variant colors for product preview swatches.
 */
function extractColors(variants: Array<{ options: unknown }>): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];

  for (const v of variants) {
    if (!v.options || typeof v.options !== "object" || Array.isArray(v.options)) continue;
    const opts = v.options as Record<string, unknown>;
    for (const key of Object.keys(opts)) {
      if (key.toLowerCase() === "colour" || key.toLowerCase() === "color") {
        const val = opts[key];
        if (typeof val === "string" && val.trim()) {
          const name = val.trim();
          if (!seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase());
            colors.push(resolveColor(name).bg);
          }
        }
      }
    }
  }

  return colors;
}

/**
 * Returns all wishlisted products for the authenticated user, ordered newest first.
 */
export async function getUserWishlist(userId: string): Promise<WishlistProduct[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    include: {
      product: {
        include: {
          category: { select: { name: true } },
          media: {
            orderBy: { position: "asc" },
            take: 1,
          },
          variants: {
            where: { isEnabled: true },
            orderBy: { priceAmount: "asc" },
            include: {
              inventoryItem: { select: { onHand: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return items
    .filter((item) => item.product && item.product.status === "active")
    .map((item) => {
      const p = item.product;
      const prices = p.variants.map((v) => v.priceAmount);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const totalOnHand = p.variants.reduce(
        (sum, v) => sum + (v.inventoryItem?.onHand ?? 0),
        0
      );

      return {
        id: p.id,
        slug: p.slug,
        title: p.title,
        imageUrl: p.media[0]?.url ?? null,
        imageAlt: p.media[0]?.alt || p.title,
        minPriceAmount: minPrice,
        maxPriceAmount: maxPrice,
        currency: p.variants[0]?.priceCurrency ?? "USD",
        totalOnHand,
        categoryName: p.category?.name,
        colors: extractColors(p.variants),
        wishlistedAt: item.createdAt.toISOString(),
      };
    });
}

/**
 * Returns array of wishlisted product IDs for fast O(1) membership check.
 */
export async function getUserWishlistProductIds(userId: string): Promise<string[]> {
  const items = await prisma.wishlistItem.findMany({
    where: { userId },
    select: { productId: true },
  });

  return items.map((i) => i.productId);
}

/**
 * Adds a product to the user's wishlist idempotently.
 * Accepts either product ID or slug and saves the canonical product ID.
 * Enforces compound unique constraint (userId, productId).
 */
export async function addToWishlist(
  userId: string,
  productIdOrSlug: string
): Promise<{ added: boolean; productId: string }> {
  // Verify product exists and is active (supports ID or slug)
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: productIdOrSlug },
        { slug: productIdOrSlug },
      ],
      status: "active",
    },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found or inactive");
  }

  const canonicalProductId = product.id;

  const existing = await prisma.wishlistItem.findFirst({
    where: {
      userId,
      productId: canonicalProductId,
    },
  });

  if (!existing) {
    try {
      await prisma.wishlistItem.create({
        data: {
          userId,
          productId: canonicalProductId,
        },
      });
    } catch (err: unknown) {
      // If concurrent request already inserted, duplicate constraint is safe
      const errStr = err instanceof Error ? err.message : String(err);
      if (!errStr.toLowerCase().includes("unique constraint") && !errStr.toLowerCase().includes("duplicate")) {
        throw err;
      }
    }
  }

  return { added: true, productId: canonicalProductId };
}

/**
 * Removes a product from the user's wishlist strictly isolated to the authenticated user.
 * Accepts either product ID or slug.
 */
export async function removeFromWishlist(
  userId: string,
  productIdOrSlug: string
): Promise<{ removed: boolean; productId: string }> {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: productIdOrSlug },
        { slug: productIdOrSlug },
      ],
    },
    select: { id: true },
  });

  const canonicalProductId = product?.id || productIdOrSlug;

  await prisma.wishlistItem.deleteMany({
    where: {
      userId,
      productId: canonicalProductId,
    },
  });

  return { removed: true, productId: canonicalProductId };
}

/**
 * Checks if a specific product is wishlisted by the user.
 */
export async function isProductWishlisted(
  userId: string,
  productIdOrSlug: string
): Promise<boolean> {
  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: productIdOrSlug },
        { slug: productIdOrSlug },
      ],
    },
    select: { id: true },
  });

  const canonicalProductId = product?.id || productIdOrSlug;

  const count = await prisma.wishlistItem.count({
    where: {
      userId,
      productId: canonicalProductId,
    },
  });

  return count > 0;
}
