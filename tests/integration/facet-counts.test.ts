import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFacets } from "@/lib/search.server";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn("[facet-counts.test] DATABASE_URL not set — skipping.");
}

/**
 * This test reproduces, exactly, the worked example hand-traced in
 * docs/decisions/0012-facet-counts.md: a Colour-only product (three
 * variants, one out of stock) and a Size-only product sharing a
 * category, checking that the Colour facet count changes only when
 * the in-stock filter is toggled — never when the query happens to
 * touch the colour dimension's own filter.
 */
describe.skipIf(!hasDb)("facet counts — automated version of the ADR 0012 hand trace", () => {
  let categoryId: string;
  let categorySlug: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    categorySlug = `facet-test-${suffix}`;

    const category = await prisma.category.create({
      data: { name: "Facet Test Accessories", slug: categorySlug },
    });
    categoryId = category.id;

    const colourProduct = await prisma.product.create({
      data: {
        title: "Facet Test Colour Product",
        slug: `facet-test-colour-${suffix}`,
        status: "active",
        categoryId,
        optionNames: ["Colour"],
        variants: {
          create: [
            {
              sku: `FACET-CHARCOAL-${suffix}`,
              options: { Colour: "Charcoal" },
              priceAmount: 1000,
              priceCurrency: "USD",
              inventoryItem: { create: { onHand: 0 } }, // out of stock
            },
            {
              sku: `FACET-OAT-${suffix}`,
              options: { Colour: "Oat" },
              priceAmount: 1000,
              priceCurrency: "USD",
              inventoryItem: { create: { onHand: 2 } },
            },
            {
              sku: `FACET-RUST-${suffix}`,
              options: { Colour: "Rust" },
              priceAmount: 1000,
              priceCurrency: "USD",
              inventoryItem: { create: { onHand: 4 } },
            },
          ],
        },
      },
    });

    // A second product in the same category with NO Colour dimension —
    // proves the facet's `IS NOT NULL` guard excludes it correctly
    // rather than showing up as a phantom "undefined" colour bucket.
    await prisma.product.create({
      data: {
        title: "Facet Test Size Product",
        slug: `facet-test-size-${suffix}`,
        status: "active",
        categoryId,
        optionNames: ["Size"],
        variants: {
          create: [
            {
              sku: `FACET-SIZE-SM-${suffix}`,
              options: { Size: "S/M" },
              priceAmount: 500,
              priceCurrency: "USD",
              inventoryItem: { create: { onHand: 10 } },
            },
          ],
        },
      },
    });

    void colourProduct;
  });

  afterAll(async () => {
    await prisma.product.deleteMany({ where: { categoryId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("counts all three colours once each with no in-stock filter", async () => {
    const facets = await getFacets({ categorySlug });
    const byValue = Object.fromEntries(facets.colours.map((f) => [f.value, f.count]));

    expect(byValue).toEqual({ Charcoal: 1, Oat: 1, Rust: 1 });
  });

  it("drops the out-of-stock colour when inStockOnly is applied — the exact ADR 0012 trace", async () => {
    const facets = await getFacets({ categorySlug, inStockOnly: true });
    const byValue = Object.fromEntries(facets.colours.map((f) => [f.value, f.count]));

    expect(byValue.Charcoal).toBeUndefined(); // 0 surviving rows — absent, not zero-and-shown
    expect(byValue.Oat).toBe(1);
    expect(byValue.Rust).toBe(1);
  });

  it("never lets the colour facet's own filter suppress its own counts", async () => {
    // Selecting Rust as an active filter must not make Rust's own count
    // collapse to reflect "only Rust matches Rust" — the facet excludes
    // its own dimension precisely to prevent this.
    const facets = await getFacets({ categorySlug, colour: "Rust" });
    const byValue = Object.fromEntries(facets.colours.map((f) => [f.value, f.count]));

    expect(byValue).toEqual({ Charcoal: 1, Oat: 1, Rust: 1 });
  });
});
