import { describe, it, expect } from "vitest";
import {
  matchesVariantSize,
  matchesVariantColor,
  type CatalogProduct,
} from "../CatalogBrowser";

describe("Catalog Size & Color Variant-Aware Filtering", () => {
  const sampleProducts: CatalogProduct[] = [
    {
      id: "prod-1",
      slug: "product-1-tshirt",
      title: "Classic Heavyweight Tee",
      minPriceAmount: 4500,
      maxPriceAmount: 4500,
      currency: "USD",
      imageUrl: null,
      imageAlt: "Classic Heavyweight Tee",
      totalOnHand: 10,
      categorySlug: "clothing",
      categoryName: "Clothing",
      sizes: ["S", "M", "L"],
      colors: ["Black", "White"],
      variants: [
        { size: "S", color: "Black" },
        { size: "M", color: "Black" },
        { size: "L", color: "White" },
      ],
    },
    {
      id: "prod-2",
      slug: "product-2-hoodie",
      title: "Loopback Fleece Hoodie",
      minPriceAmount: 12000,
      maxPriceAmount: 12000,
      currency: "USD",
      imageUrl: null,
      imageAlt: "Loopback Fleece Hoodie",
      totalOnHand: 5,
      categorySlug: "clothing",
      categoryName: "Clothing",
      sizes: ["M", "XL"],
      colors: ["Navy", "Rust"],
      variants: [
        { size: "M", color: "Navy" },
        { size: "XL", color: "Rust" },
      ],
    },
    {
      id: "prod-3",
      slug: "product-3-belt",
      title: "Waxed Canvas Belt",
      minPriceAmount: 5400,
      maxPriceAmount: 5400,
      currency: "USD",
      imageUrl: null,
      imageAlt: "Waxed Canvas Belt",
      totalOnHand: 8,
      categorySlug: "accessories",
      categoryName: "Accessories",
      sizes: ["S/M", "L/XL"],
      colors: ["Charcoal"],
      variants: [
        { size: "S/M", color: "Charcoal" },
        { size: "L/XL", color: "Charcoal" },
      ],
    },
    {
      id: "prod-4",
      slug: "product-4-no-variants",
      title: "Archived Product Without Variants",
      minPriceAmount: 3000,
      maxPriceAmount: 3000,
      currency: "USD",
      imageUrl: null,
      imageAlt: "Archived Product",
      totalOnHand: 0,
      categorySlug: "clothing",
      categoryName: "Clothing",
      sizes: [],
      colors: [],
      variants: [],
    },
    {
      id: "prod-5",
      slug: "product-5-cross-test",
      title: "Split Variant Product",
      minPriceAmount: 8000,
      maxPriceAmount: 8000,
      currency: "USD",
      imageUrl: null,
      imageAlt: "Split Variant Product",
      totalOnHand: 6,
      categorySlug: "clothing",
      categoryName: "Clothing",
      sizes: ["S", "M"],
      colors: ["Black", "Red"],
      variants: [
        { size: "S", color: "Black" },
        { size: "M", color: "Red" },
      ],
    },
  ];

  // Helper simulating CatalogBrowser's exact useMemo variant filtering logic
  function filterCatalog(
    products: CatalogProduct[],
    selectedSizes: string[],
    selectedColors: string[],
    selectedCategory = "all"
  ): CatalogProduct[] {
    let result = [...products];

    if (selectedCategory !== "all") {
      result = result.filter(
        (p) =>
          p.categorySlug === selectedCategory ||
          p.categoryName?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (selectedSizes.length > 0 && selectedColors.length > 0) {
      result = result.filter((p) =>
        (p.variants ?? []).some(
          (v) =>
            matchesVariantSize(v.size, selectedSizes) &&
            matchesVariantColor(v.color, selectedColors)
        )
      );
    } else if (selectedSizes.length > 0) {
      result = result.filter((p) =>
        (p.variants ?? []).some((v) => matchesVariantSize(v.size, selectedSizes))
      );
    } else if (selectedColors.length > 0) {
      result = result.filter((p) =>
        (p.variants ?? []).some((v) => matchesVariantColor(v.color, selectedColors))
      );
    }

    return result;
  }

  describe("1. Helper Function Semantics", () => {
    it("matches variant size exactly and case-insensitively", () => {
      expect(matchesVariantSize("M", ["M"])).toBe(true);
      expect(matchesVariantSize("m", ["M"])).toBe(true);
      expect(matchesVariantSize("XL", ["XL"])).toBe(true);
      expect(matchesVariantSize("S", ["M", "L"])).toBe(false);
    });

    it("matches composite sizes correctly (e.g. S/M contains S and M)", () => {
      expect(matchesVariantSize("S/M", ["S"])).toBe(true);
      expect(matchesVariantSize("S/M", ["M"])).toBe(true);
      expect(matchesVariantSize("S/M", ["L"])).toBe(false);
      expect(matchesVariantSize("L/XL", ["XL"])).toBe(true);
    });

    it("returns false for undefined or empty variant sizes", () => {
      expect(matchesVariantSize(undefined, ["M"])).toBe(false);
      expect(matchesVariantSize("", ["M"])).toBe(false);
      expect(matchesVariantSize("M", [])).toBe(false);
    });

    it("matches variant color case-insensitively", () => {
      expect(matchesVariantColor("Black", ["Black"])).toBe(true);
      expect(matchesVariantColor("black", ["Black"])).toBe(true);
      expect(matchesVariantColor("BLACK", ["Black"])).toBe(true);
      expect(matchesVariantColor("Navy", ["Black", "Navy"])).toBe(true);
      expect(matchesVariantColor("Rust", ["Black", "White"])).toBe(false);
    });

    it("returns false for undefined or empty variant colors", () => {
      expect(matchesVariantColor(undefined, ["Black"])).toBe(false);
      expect(matchesVariantColor("", ["Black"])).toBe(false);
      expect(matchesVariantColor("Black", [])).toBe(false);
    });
  });

  describe("2. Catalog Filtering Scenarios", () => {
    it("1. No Filters: returns all products", () => {
      const result = filterCatalog(sampleProducts, [], []);
      expect(result.length).toBe(sampleProducts.length);
    });

    it("2. Product Without Variants: does not match size or color filters", () => {
      const sizeResult = filterCatalog(sampleProducts, ["M"], []);
      expect(sizeResult.some((p) => p.slug === "product-4-no-variants")).toBe(false);

      const colorResult = filterCatalog(sampleProducts, [], ["Black"]);
      expect(colorResult.some((p) => p.slug === "product-4-no-variants")).toBe(false);
    });

    it("3. Size Filter: filters to products with an actual matching size variant", () => {
      const result = filterCatalog(sampleProducts, ["XL"], []);
      // Product 2 has XL, Product 3 has L/XL composite
      const slugs = result.map((p) => p.slug);
      expect(slugs).toContain("product-2-hoodie");
      expect(slugs).toContain("product-3-belt");
      expect(slugs).not.toContain("product-1-tshirt");
    });

    it("4. Multiple Sizes (OR within group): returns products with M OR XL", () => {
      const result = filterCatalog(sampleProducts, ["M", "XL"], []);
      const slugs = result.map((p) => p.slug);
      expect(slugs).toContain("product-1-tshirt"); // has M
      expect(slugs).toContain("product-2-hoodie"); // has M, XL
      expect(slugs).toContain("product-3-belt");   // has S/M, L/XL
      expect(slugs).toContain("product-5-cross-test"); // has M
      expect(slugs).not.toContain("product-4-no-variants");
    });

    it("5. Color Filter: filters to products with an actual matching color variant", () => {
      const result = filterCatalog(sampleProducts, [], ["Navy"]);
      const slugs = result.map((p) => p.slug);
      expect(slugs).toEqual(["product-2-hoodie"]);
    });

    it("6. Multiple Colors (OR within group): returns products with Black OR Rust", () => {
      const result = filterCatalog(sampleProducts, [], ["Black", "Rust"]);
      const slugs = result.map((p) => p.slug);
      expect(slugs).toContain("product-1-tshirt");
      expect(slugs).toContain("product-2-hoodie");
      expect(slugs).toContain("product-5-cross-test");
      expect(slugs).not.toContain("product-3-belt");
    });

    it("7. Combined Size + Color (AND across groups): matches only actual available variant combinations", () => {
      // Product 1 has [S+Black, M+Black, L+White]
      // Product 2 has [M+Navy, XL+Rust]
      const result = filterCatalog(sampleProducts, ["M"], ["Black"]);
      const slugs = result.map((p) => p.slug);
      expect(slugs).toEqual(["product-1-tshirt"]);
    });

    it("8. Mandatory Cross-Variant Combination Test: rejects product when Size and Color only exist on different variants", () => {
      // Product 5 has [S + Black, M + Red]
      // Filtering for S + Red MUST NOT match product 5
      const result = filterCatalog(sampleProducts, ["S"], ["Red"]);
      const slugs = result.map((p) => p.slug);
      expect(slugs).not.toContain("product-5-cross-test");

      // But S + Black DOES match
      const matchSBlack = filterCatalog(sampleProducts, ["S"], ["Black"]);
      expect(matchSBlack.map((p) => p.slug)).toContain("product-5-cross-test");

      // And M + Red DOES match
      const matchMRed = filterCatalog(sampleProducts, ["M"], ["Red"]);
      expect(matchMRed.map((p) => p.slug)).toContain("product-5-cross-test");
    });

    it("9. Composite Size Filtering: matches composite sizes when combined with color", () => {
      // Product 3 has [S/M + Charcoal, L/XL + Charcoal]
      const result = filterCatalog(sampleProducts, ["S"], ["Charcoal"]);
      const slugs = result.map((p) => p.slug);
      expect(slugs).toEqual(["product-3-belt"]);
    });

    it("10. Reset: restores all products when filters are cleared", () => {
      const filtered = filterCatalog(sampleProducts, ["M"], ["Black"]);
      expect(filtered.length).toBe(1);

      const reset = filterCatalog(sampleProducts, [], []);
      expect(reset.length).toBe(sampleProducts.length);
    });

    it("11. Preserves Category Filter: integrates category constraint with size/color filters", () => {
      const result = filterCatalog(sampleProducts, ["S"], ["Charcoal"], "accessories");
      expect(result.length).toBe(1);
      expect(result[0]?.slug).toBe("product-3-belt");

      const emptyResult = filterCatalog(sampleProducts, ["S"], ["Charcoal"], "clothing");
      expect(emptyResult.length).toBe(0);
    });
  });
});
