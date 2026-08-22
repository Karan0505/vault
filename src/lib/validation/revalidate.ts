import { revalidateTag } from "next/cache";

/**
 * Cache tag scheme for the storefront.
 *
 * Every storefront fetch is tagged with the narrowest tag that describes
 * it, so publishing one product invalidates exactly the pages that show
 * that product — never `revalidatePath("/")`. See
 * docs/decisions/0003-tag-based-isr-revalidation.md.
 */
export const cacheTags = {
  product: (slug: string) => `product:${slug}`,
  category: (slug: string) => `category:${slug}`,
  collection: (slug: string) => `collection:${slug}`,
  productList: () => "product-list", // category/collection index pages that list cards
  bestSellers: () => "best-sellers",
} as const;

/**
 * Call after any order payment, cancellation, or refund mutation that alters
 * net units sold. Invalidates the Best Sellers storefront list.
 */
export function revalidateBestSellers(): void {
  revalidateTag(cacheTags.bestSellers());
  revalidateTag(cacheTags.productList());
}

/**
 * Call after any admin write that changes a product. Invalidates the
 * product's own page, its category page (stock/price shown on the grid),
 * every collection page it belongs to, and the generic listing tag used
 * by index pages — nothing else.
 */
function safeRevalidateTag(tag: string): void {
  try {
    revalidateTag(tag);
  } catch {
    // revalidateTag throws outside of Next.js server request context (e.g. in tests)
  }
}

export function revalidateProduct(params: {
  productSlug: string;
  categorySlug?: string | null;
  collectionSlugs?: readonly string[];
}): void {
  safeRevalidateTag(cacheTags.product(params.productSlug));
  safeRevalidateTag(cacheTags.productList());
  if (params.categorySlug) {
    safeRevalidateTag(cacheTags.category(params.categorySlug));
  }
  for (const slug of params.collectionSlugs ?? []) {
    safeRevalidateTag(cacheTags.collection(slug));
  }
}

export function revalidateCategory(categorySlug: string): void {
  safeRevalidateTag(cacheTags.category(categorySlug));
  safeRevalidateTag(cacheTags.productList());
}

export function revalidateCollection(collectionSlug: string): void {
  safeRevalidateTag(cacheTags.collection(collectionSlug));
  safeRevalidateTag(cacheTags.productList());
}

