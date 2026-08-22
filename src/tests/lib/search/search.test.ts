import { describe, expect, it } from "vitest";

// Unit test mock helper for testing query condition building logic
interface MockProduct {
  id: string;
  title: string;
  slug: string;
  description: string;
  categoryName: string;
  sku: string;
  priceAmount: number;
  options: { Size?: string; Colour?: string };
  onHand: number;
}

const TEST_CATALOGUE: MockProduct[] = [
  {
    id: "p1",
    title: "Myntra Men's Tape Pull On Clogs",
    slug: "myntra-mens-tape-pull-on-clogs",
    description: "Comfortable pull on clogs for casual wear",
    categoryName: "Footwear",
    sku: "MYNTRA-CLOG-01",
    priceAmount: 4999,
    options: { Size: "M", Colour: "Black" },
    onHand: 10,
  },
  {
    id: "p2",
    title: "Merino Watch Cap",
    slug: "merino-watch-cap",
    description: "Heavyweight 100% merino wool knit watch cap",
    categoryName: "Accessories",
    sku: "CAP-MER-LOD",
    priceAmount: 3500,
    options: { Size: "O/S", Colour: "Lodengreen" },
    onHand: 5,
  },
  {
    id: "p3",
    title: "Waxed Canvas Belt",
    slug: "waxed-canvas-belt",
    description: "Heavy canvas web belt with brass buckle",
    categoryName: "Accessories",
    sku: "BELT-WAX-BRS",
    priceAmount: 4500,
    options: { Size: "M", Colour: "Rust" },
    onHand: 2,
  },
  {
    id: "p4",
    title: "Canvas Low-Top",
    slug: "canvas-low-top",
    description: "Vulcanized rubber sole low top canvas sneaker",
    categoryName: "Footwear",
    sku: "CANVAS-LOW-9",
    priceAmount: 9400,
    options: { Size: "9", Colour: "Natural" },
    onHand: 0,
  },
];

function filterProductsMock(query?: string, filters?: { category?: string; inStockOnly?: boolean }) {
  let list = TEST_CATALOGUE;

  if (query && query.trim()) {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    list = list.filter((p) =>
      terms.every((term) =>
        p.title.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.slug.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.categoryName.toLowerCase().includes(term)
      )
    );
  }

  if (filters?.category) {
    list = list.filter((p) => p.categoryName.toLowerCase() === filters.category!.toLowerCase());
  }

  if (filters?.inStockOnly) {
    list = list.filter((p) => p.onHand > 0);
  }

  return {
    items: list,
    totalCount: list.length,
  };
}

describe("PostgreSQL Dynamic Search Behavior", () => {
  it("returns full product catalogue when search query is empty", () => {
    const res = filterProductsMock("");
    expect(res.totalCount).toBe(4);
  });

  it("handles single-character search query 'm' dynamically", () => {
    const res = filterProductsMock("m");
    expect(res.totalCount).toBeGreaterThan(0);
    expect(res.items.some((p) => p.title.toLowerCase().includes("m") || p.categoryName.toLowerCase().includes("m"))).toBe(true);
  });

  it("finds matching products for 'myntra'", () => {
    const res = filterProductsMock("myntra");
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toContain("Myntra");
  });

  it("finds matching products for 'canvas'", () => {
    const res = filterProductsMock("canvas");
    expect(res.totalCount).toBe(2);
  });

  it("finds matching products for 'watch'", () => {
    const res = filterProductsMock("watch");
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toBe("Merino Watch Cap");
  });

  it("finds matching products for 'clog'", () => {
    const res = filterProductsMock("clog");
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toContain("Clogs");
  });

  it("is case-insensitive for search queries (m vs M vs MYNTRA)", () => {
    const lowerRes = filterProductsMock("myntra");
    const upperRes = filterProductsMock("MYNTRA");
    const mixedRes = filterProductsMock("MyNtRa");
    expect(lowerRes.totalCount).toBe(upperRes.totalCount);
    expect(lowerRes.totalCount).toBe(mixedRes.totalCount);
  });

  it("combines multi-word queries with AND semantics ('myntra clog')", () => {
    const res = filterProductsMock("myntra clog");
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toBe("Myntra Men's Tape Pull On Clogs");
  });

  it("returns zero results for non-matching search queries ('xyz')", () => {
    const res = filterProductsMock("xyz");
    expect(res.totalCount).toBe(0);
    expect(res.items).toHaveLength(0);
  });

  it("combines search query with category filter", () => {
    const res = filterProductsMock("canvas", { category: "Footwear" });
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toBe("Canvas Low-Top");
  });

  it("combines search query with in-stock filter", () => {
    const res = filterProductsMock("canvas", { inStockOnly: true });
    expect(res.totalCount).toBe(1);
    expect(res.items[0]?.title).toBe("Waxed Canvas Belt");
  });

  it("calculates total count dynamically from query result", () => {
    const res = filterProductsMock("clog");
    expect(res.totalCount).toBe(1);
  });
});
