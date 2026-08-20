import { describe, it, expect } from "vitest";
import { parseSearchState, toSearchFilters, buildSearchHref } from "@/lib/search/search-params";

describe("parseSearchState", () => {
  it("defaults sort to relevance and page to 1 when absent", () => {
    const state = parseSearchState({});
    expect(state.sort).toBe("relevance");
    expect(state.page).toBe(1);
    expect(state.inStock).toBe(false);
  });

  it("parses every filter from raw query params", () => {
    const state = parseSearchState({
      q: "jacket",
      category: "outerwear",
      price: "2",
      size: "M",
      colour: "Rust",
      inStock: "1",
      sort: "price-asc",
      page: "3",
    });
    expect(state).toEqual({
      q: "jacket",
      category: "outerwear",
      price: "2",
      size: "M",
      colour: "Rust",
      inStock: true,
      sort: "price-asc",
      page: 3,
    });
  });

  it("rejects an invalid sort value rather than passing it through", () => {
    const state = parseSearchState({ sort: "not-a-real-sort" });
    expect(state.sort).toBe("relevance");
  });

  it("rejects a non-positive or non-integer page", () => {
    expect(parseSearchState({ page: "0" }).page).toBe(1);
    expect(parseSearchState({ page: "-3" }).page).toBe(1);
    expect(parseSearchState({ page: "abc" }).page).toBe(1);
  });

  it("takes the first value when Next.js gives an array for a repeated param", () => {
    const state = parseSearchState({ q: ["first", "second"] });
    expect(state.q).toBe("first");
  });
});

describe("toSearchFilters", () => {
  it("maps parsed state onto the shape searchProducts expects", () => {
    const state = parseSearchState({ category: "outerwear", inStock: "1" });
    const filters = toSearchFilters(state);
    expect(filters.categorySlug).toBe("outerwear");
    expect(filters.inStockOnly).toBe(true);
  });

  it("omits inStockOnly (undefined, not false) when the filter isn't active", () => {
    const filters = toSearchFilters(parseSearchState({}));
    expect(filters.inStockOnly).toBeUndefined();
  });
});

describe("buildSearchHref", () => {
  const baseState = parseSearchState({});

  it("produces a bare /search with no active filters", () => {
    expect(buildSearchHref(baseState, {})).toBe("/search");
  });

  it("adds a filter to the query string", () => {
    expect(buildSearchHref(baseState, { category: "footwear" })).toBe("/search?category=footwear");
  });

  it("clears a filter when passed null", () => {
    const withCategory = parseSearchState({ category: "footwear" });
    expect(buildSearchHref(withCategory, { category: null })).toBe("/search");
  });

  it("resets page to 1 when a filter changes", () => {
    const onPage3 = parseSearchState({ page: "3", category: "footwear" });
    const href = buildSearchHref(onPage3, { colour: "Black" });
    expect(href).not.toContain("page=");
    expect(href).toContain("colour=Black");
    expect(href).toContain("category=footwear"); // untouched filters carry over
  });

  it("preserves the page number when the change IS the page", () => {
    const href = buildSearchHref(baseState, { page: 2 });
    expect(href).toBe("/search?page=2");
  });

  it("omits sort from the URL when it's the default (relevance)", () => {
    const href = buildSearchHref(baseState, { sort: "relevance" });
    expect(href).not.toContain("sort=");
  });

  it("includes sort in the URL for a non-default value", () => {
    const href = buildSearchHref(baseState, { sort: "price-asc" });
    expect(href).toContain("sort=price-asc");
  });
});
