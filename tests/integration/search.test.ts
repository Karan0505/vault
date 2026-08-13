import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { searchProducts } from "@/lib/search.server";
import { syncProductSearchVector, reindexAllProducts } from "@/lib/search-index.server";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn("[search.test] DATABASE_URL not set — skipping.");
}

describe.skipIf(!hasDb)("hybrid full-text + trigram search", () => {
  let productId: string;
  let categoryId: string;
  let slug: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    slug = `search-test-jacket-${suffix}`;

    const category = await prisma.category.create({
      data: { name: "Search Test", slug: `search-test-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        title: "Waxed Field Jacket",
        description: "A dry-wax cotton shell cut for layering.",
        slug,
        status: "active",
        categoryId,
        optionNames: [],
        variants: {
          create: [
            {
              sku: `SEARCH-TEST-${suffix}`,
              options: {},
              priceAmount: 24500,
              priceCurrency: "USD",
              inventoryItem: { create: { onHand: 5 } },
            },
          ],
        },
      },
    });
    productId = product.id;

    // Search vector isn't populated by the raw prisma.product.create
    // above (that's what syncProductSearchVector is for, normally
    // called from createProduct in products.server.ts) — call it
    // directly here to isolate this test from that code path.
    await syncProductSearchVector(prisma, productId);
  });

  afterAll(async () => {
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("finds the product via exact full-text match", async () => {
    const results = await searchProducts({
      filters: { q: "jacket" },
      sort: "relevance",
      page: 1,
      pageSize: 10,
    });
    expect(results.items.some((item) => item.slug === slug)).toBe(true);
  });

  it("finds the product via a stemmed variant of the word", async () => {
    const results = await searchProducts({
      filters: { q: "jackets" }, // plural — websearch_to_tsquery stems this
      sort: "relevance",
      page: 1,
      pageSize: 10,
    });
    expect(results.items.some((item) => item.slug === slug)).toBe(true);
  });

  it("finds the product via trigram similarity despite a misspelling", async () => {
    const results = await searchProducts({
      filters: { q: "jaket" }, // misspelled — fails websearch_to_tsquery's stemming, caught by similarity()
      sort: "relevance",
      page: 1,
      pageSize: 10,
    });
    expect(results.items.some((item) => item.slug === slug)).toBe(true);
  });

  it("does not match an unrelated query", async () => {
    const results = await searchProducts({
      filters: { q: "xylophone" },
      sort: "relevance",
      page: 1,
      pageSize: 10,
    });
    expect(results.items.some((item) => item.slug === slug)).toBe(false);
  });

  it("reindexAllProducts backfills the search vector for a row that never went through the app write path", async () => {
    // Simulate a row that bypassed syncProductSearchVector entirely —
    // clear its vector directly, confirm it's unreachable, then reindex.
    await prisma.$executeRaw`UPDATE "products" SET "searchVector" = NULL WHERE id = ${productId}`;

    const before = await searchProducts({ filters: { q: "jacket" }, sort: "relevance", page: 1, pageSize: 10 });
    expect(before.items.some((item) => item.slug === slug)).toBe(false);

    await reindexAllProducts();

    const after = await searchProducts({ filters: { q: "jacket" }, sort: "relevance", page: 1, pageSize: 10 });
    expect(after.items.some((item) => item.slug === slug)).toBe(true);
  });
});
