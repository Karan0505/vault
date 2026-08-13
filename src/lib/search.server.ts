import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Filters, sort, price buckets
// ---------------------------------------------------------------------------

export interface SearchFilters {
  q?: string;
  categorySlug?: string;
  priceBucketId?: string;
  size?: string;
  colour?: string;
  inStockOnly?: boolean;
}

export type SortOption = "relevance" | "price-asc" | "price-desc" | "newest";

export interface SearchParams {
  filters: SearchFilters;
  sort: SortOption;
  page: number;
  pageSize: number;
}

/** Fixed, discrete price buckets rather than a free-form min/max range — keeps the URL, the facet UI, and the facet-count SQL all agreeing on the same partitions. */
export const PRICE_BUCKETS = [
  { id: "0", label: "Under $50", min: 0, max: 4999 },
  { id: "1", label: "$50 – $100", min: 5000, max: 9999 },
  { id: "2", label: "$100 – $200", min: 10000, max: 19999 },
  { id: "3", label: "$200+", min: 20000, max: null },
] as const;

function priceBucketById(id: string) {
  return PRICE_BUCKETS.find((bucket) => bucket.id === id);
}

// ---------------------------------------------------------------------------
// Shared WHERE-fragment builder
//
// Every query in this file — the paginated result set AND every facet
// count — is built from the same fixed join shape and the same filter
// conditions, varying only which filter is excluded. That's what makes
// "the number next to 'Blue' reflects the other filters currently
// applied" true by construction rather than by careful duplication: the
// size facet count is the exact same query as the main search, with
// only the size condition left out.
// ---------------------------------------------------------------------------

export type FilterKey = "category" | "price" | "size" | "colour" | "inStock" | "q";

const JOIN_CLAUSE = Prisma.sql`
  FROM "products" p
  JOIN "product_variants" v ON v."productId" = p.id AND v."isEnabled" = true
  LEFT JOIN "inventory_items" i ON i."variantId" = v.id
  LEFT JOIN "categories" c ON c.id = p."categoryId"
`;

function buildConditions(filters: SearchFilters, exclude: ReadonlySet<FilterKey>): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`p.status = 'active'`];

  if (filters.categorySlug && !exclude.has("category")) {
    conditions.push(Prisma.sql`c.slug = ${filters.categorySlug}`);
  }

  if (filters.priceBucketId && !exclude.has("price")) {
    const bucket = priceBucketById(filters.priceBucketId);
    if (bucket) {
      conditions.push(
        bucket.max === null
          ? Prisma.sql`v."priceAmount" >= ${bucket.min}`
          : Prisma.sql`v."priceAmount" BETWEEN ${bucket.min} AND ${bucket.max}`
      );
    }
  }

  if (filters.size && !exclude.has("size")) {
    conditions.push(Prisma.sql`v.options->>'Size' = ${filters.size}`);
  }

  if (filters.colour && !exclude.has("colour")) {
    conditions.push(Prisma.sql`v.options->>'Colour' = ${filters.colour}`);
  }

  if (filters.inStockOnly && !exclude.has("inStock")) {
    conditions.push(Prisma.sql`(i."onHand" - COALESCE(i.reserved, 0)) > 0`);
  }

  if (filters.q && !exclude.has("q")) {
    const terms = filters.q.trim().split(/\s+/).filter(Boolean);
    if (terms.length > 0) {
      const termConditions = terms.map((term) => {
        const pattern = `%${term}%`;
        return Prisma.sql`(
          p.title ILIKE ${pattern} OR
          p.description ILIKE ${pattern} OR
          p.slug ILIKE ${pattern} OR
          v.sku ILIKE ${pattern} OR
          c.name ILIKE ${pattern}
        )`;
      });
      conditions.push(Prisma.sql`(${Prisma.join(termConditions, " AND ")})`);
    }
  }

  return conditions;
}

function whereClause(conditions: Prisma.Sql[]): Prisma.Sql {
  return Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;
}

// ---------------------------------------------------------------------------
// Main search — paginated, sorted, ranked
// ---------------------------------------------------------------------------

interface SearchRow {
  id: string;
  slug: string;
  title: string;
  minPrice: number;
  maxPrice: number;
  currency: string;
  totalAvailable: number;
}

export interface SearchResultItem {
  slug: string;
  title: string;
  minPriceAmount: number;
  maxPriceAmount: number;
  currency: string;
  totalOnHand: number;
  imageUrl: string | null;
  imageAlt: string;
}

export interface SearchResults {
  items: SearchResultItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function orderByFragment(sort: SortOption, q: string | undefined): Prisma.Sql {
  switch (sort) {
    case "price-asc":
      return Prisma.sql`MIN(v."priceAmount") ASC`;
    case "price-desc":
      return Prisma.sql`MIN(v."priceAmount") DESC`;
    case "newest":
      return Prisma.sql`MAX(p."createdAt") DESC`;
    case "relevance":
    default:
      if (q && q.trim()) {
        const firstTerm = `%${q.trim().split(/\s+/)[0]}%`;
        return Prisma.sql`CASE WHEN p.title ILIKE ${firstTerm} THEN 0 ELSE 1 END, MAX(p."updatedAt") DESC`;
      }
      return Prisma.sql`MAX(p."updatedAt") DESC`;
  }
}

export async function searchProducts(params: SearchParams): Promise<SearchResults> {
  const { filters, sort, page, pageSize } = params;
  const conditions = buildConditions(filters, new Set());
  const where = whereClause(conditions);
  const offset = (page - 1) * pageSize;

  const rows = await prisma.$queryRaw<SearchRow[]>(Prisma.sql`
    SELECT
      p.id,
      p.slug,
      p.title,
      MIN(v."priceAmount")::int AS "minPrice",
      MAX(v."priceAmount")::int AS "maxPrice",
      (array_agg(v."priceCurrency"))[1] AS currency,
      COALESCE(SUM(i."onHand" - COALESCE(i.reserved, 0)), 0)::int AS "totalAvailable"
    ${JOIN_CLAUSE}
    ${where}
    GROUP BY p.id
    ORDER BY ${orderByFragment(sort, filters.q)}
    LIMIT ${pageSize} OFFSET ${offset}
  `);

  const countRows = await prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
    SELECT COUNT(DISTINCT p.id) AS count
    ${JOIN_CLAUSE}
    ${where}
  `);
  const totalCount = Number(countRows[0]?.count ?? 0n);

  // Cover images fetched via the normal Prisma client rather than
  // folded into the grouped raw query above — joining media there
  // would multiply rows per product and break the GROUP BY. Re-sorted
  // to match the ranked order from the raw query, since findMany
  // doesn't preserve `id IN (...)` order.
  const media = rows.length
    ? await prisma.media.findMany({
        where: { productId: { in: rows.map((r) => r.id) } },
        orderBy: { position: "asc" },
      })
    : [];
  const firstImageByProduct = new Map<string, { url: string; alt: string }>();
  for (const item of media) {
    if (item.productId && !firstImageByProduct.has(item.productId)) {
      firstImageByProduct.set(item.productId, { url: item.url, alt: item.alt });
    }
  }

  const items: SearchResultItem[] = rows.map((row) => {
    const image = firstImageByProduct.get(row.id);
    return {
      slug: row.slug,
      title: row.title,
      minPriceAmount: row.minPrice,
      maxPriceAmount: row.maxPrice,
      currency: row.currency,
      totalOnHand: row.totalAvailable,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt || row.title,
    };
  });

  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
  };
}

// ---------------------------------------------------------------------------
// Facets — each dimension excludes its own filter, includes every other
// active filter. Verified by hand against the seed data in
// docs/decisions/0012-facet-counts.md.
// ---------------------------------------------------------------------------

export interface CategoryFacet {
  slug: string;
  name: string;
  count: number;
}

export interface OptionValueFacet {
  value: string;
  count: number;
}

export interface PriceBucketFacet {
  id: string;
  label: string;
  count: number;
}

export interface StockFacet {
  inStockCount: number;
  outOfStockCount: number;
}

export interface Facets {
  categories: CategoryFacet[];
  sizes: OptionValueFacet[];
  colours: OptionValueFacet[];
  priceBuckets: PriceBucketFacet[];
  stock: StockFacet;
}

async function categoryFacet(filters: SearchFilters): Promise<CategoryFacet[]> {
  const where = whereClause([...buildConditions(filters, new Set(["category"])), Prisma.sql`c.id IS NOT NULL`]);
  return prisma.$queryRaw<CategoryFacet[]>(Prisma.sql`
    SELECT c.slug, c.name, COUNT(DISTINCT p.id)::int AS count
    ${JOIN_CLAUSE}
    ${where}
    GROUP BY c.slug, c.name
    ORDER BY count DESC
  `);
}

async function optionValueFacet(filters: SearchFilters, dimension: "Size" | "Colour"): Promise<OptionValueFacet[]> {
  const excludeKey: FilterKey = dimension === "Size" ? "size" : "colour";
  const columnExpr = Prisma.raw(`v.options->>'${dimension}'`);
  const where = whereClause([
    ...buildConditions(filters, new Set([excludeKey])),
    Prisma.sql`${columnExpr} IS NOT NULL`,
  ]);
  return prisma.$queryRaw<OptionValueFacet[]>(Prisma.sql`
    SELECT ${columnExpr} AS value, COUNT(DISTINCT p.id)::int AS count
    ${JOIN_CLAUSE}
    ${where}
    GROUP BY ${columnExpr}
    ORDER BY count DESC
  `);
}

async function priceBucketFacet(filters: SearchFilters): Promise<PriceBucketFacet[]> {
  const where = whereClause(buildConditions(filters, new Set(["price"])));
  const rows = await prisma.$queryRaw<{ bucket: string; count: number }[]>(Prisma.sql`
    SELECT
      CASE
        WHEN v."priceAmount" < 5000 THEN '0'
        WHEN v."priceAmount" < 10000 THEN '1'
        WHEN v."priceAmount" < 20000 THEN '2'
        ELSE '3'
      END AS bucket,
      COUNT(DISTINCT p.id)::int AS count
    ${JOIN_CLAUSE}
    ${where}
    GROUP BY bucket
  `);

  const countByBucket = new Map(rows.map((r) => [r.bucket, r.count]));
  return PRICE_BUCKETS.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    count: countByBucket.get(bucket.id) ?? 0,
  }));
}

async function stockFacet(filters: SearchFilters): Promise<StockFacet> {
  const where = whereClause(buildConditions(filters, new Set(["inStock"])));
  const rows = await prisma.$queryRaw<{ bucket: string; count: number }[]>(Prisma.sql`
    SELECT
      CASE WHEN (i."onHand" - COALESCE(i.reserved, 0)) > 0 THEN 'in' ELSE 'out' END AS bucket,
      COUNT(DISTINCT p.id)::int AS count
    ${JOIN_CLAUSE}
    ${where}
    GROUP BY bucket
  `);

  const countByBucket = new Map(rows.map((r) => [r.bucket, r.count]));
  return {
    inStockCount: countByBucket.get("in") ?? 0,
    outOfStockCount: countByBucket.get("out") ?? 0,
  };
}

export async function getFacets(filters: SearchFilters): Promise<Facets> {
  const [categories, sizes, colours, priceBuckets, stock] = await Promise.all([
    categoryFacet(filters),
    optionValueFacet(filters, "Size"),
    optionValueFacet(filters, "Colour"),
    priceBucketFacet(filters),
    stockFacet(filters),
  ]);

  return { categories, sizes, colours, priceBuckets, stock };
}
