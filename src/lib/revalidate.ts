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
} as const;

/**
 * Call after any admin write that changes a product. Invalidates the
 * product's own page, its category page (stock/price shown on the grid),
 * every collection page it belongs to, and the generic listing tag used
 * by index pages — nothing else.
 */
export function revalidateProduct(params: {
  productSlug: string;
  categorySlug?: string | null;
  collectionSlugs?: readonly string[];
}): void {
  revalidateTag(cacheTags.product(params.productSlug));
  revalidateTag(cacheTags.productList());
  if (params.categorySlug) {
    revalidateTag(cacheTags.category(params.categorySlug));
  }
  for (const slug of params.collectionSlugs ?? []) {
    revalidateTag(cacheTags.collection(slug));
  }
}

export function revalidateCategory(categorySlug: string): void {
  revalidateTag(cacheTags.category(categorySlug));
  revalidateTag(cacheTags.productList());
}

export function revalidateCollection(collectionSlug: string): void {
  revalidateTag(cacheTags.collection(collectionSlug));
  revalidateTag(cacheTags.productList());
}
