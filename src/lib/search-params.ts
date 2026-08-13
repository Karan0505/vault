import type { SearchFilters, SortOption } from "@/lib/search.server";

export interface ParsedSearchState {
  q?: string;
  category?: string;
  price?: string;
  size?: string;
  colour?: string;
  inStock: boolean;
  sort: SortOption;
  page: number;
}

const SORT_OPTIONS: readonly SortOption[] = ["relevance", "price-asc", "price-desc", "newest"];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Parses Next's raw searchParams object into typed, defaulted state. Every field here round-trips through buildSearchHref below. */
export function parseSearchState(raw: Record<string, string | string[] | undefined>): ParsedSearchState {
  const sortValue = firstValue(raw.sort);
  const pageValue = Number(firstValue(raw.page));

  return {
    q: firstValue(raw.q) || undefined,
    category: firstValue(raw.category) || undefined,
    price: firstValue(raw.price) || undefined,
    size: firstValue(raw.size) || undefined,
    colour: firstValue(raw.colour) || undefined,
    inStock: firstValue(raw.inStock) === "1",
    sort: SORT_OPTIONS.includes(sortValue as SortOption) ? (sortValue as SortOption) : "relevance",
    page: Number.isInteger(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

export function toSearchFilters(state: ParsedSearchState): SearchFilters {
  return {
    q: state.q,
    categorySlug: state.category,
    priceBucketId: state.price,
    size: state.size,
    colour: state.colour,
    inStockOnly: state.inStock || undefined,
  };
}

/**
 * Builds the href for a facet toggle, sort change, or page change,
 * starting from the current state and applying only the given changes.
 * Clicking an already-active facet value passes `null` for it to clear
 * it (toggle off) — callers decide that, this just serializes whatever
 * they pass. Any change other than an explicit `page` change resets
 * pagination to page 1, since the result set underneath page 2 is about
 * to be different.
 */
export function buildSearchHref(
  state: ParsedSearchState,
  changes: Partial<Record<keyof ParsedSearchState, string | number | boolean | null>>
): string {
  const next: Record<string, string> = {};

  const merged = { ...state, ...changes };

  if (merged.q) next.q = String(merged.q);
  if (merged.category) next.category = String(merged.category);
  if (merged.price) next.price = String(merged.price);
  if (merged.size) next.size = String(merged.size);
  if (merged.colour) next.colour = String(merged.colour);
  if (merged.inStock) next.inStock = "1";
  if (merged.sort && merged.sort !== "relevance") next.sort = String(merged.sort);

  const isPageChange = Object.keys(changes).length === 1 && "page" in changes;
  const page = isPageChange ? Number(changes.page) : 1;
  if (page > 1) next.page = String(page);

  const query = new URLSearchParams(next).toString();
  return query ? `/search?${query}` : "/search";
}
