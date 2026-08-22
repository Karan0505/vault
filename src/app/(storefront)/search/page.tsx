import type { Metadata } from "next";
import { prisma } from "@/lib/db/prisma";
import { CatalogBrowser, type CategoryItem, type CatalogProduct } from "@/components/product";

export const metadata: Metadata = { title: "Search & Catalog" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}

function extractStringOption(options: unknown, keys: string[]): string | undefined {
  if (!options || typeof options !== "object" || Array.isArray(options)) return undefined;
  const record = options as Record<string, unknown>;
  for (const key of keys) {
    const val = record[key];
    if (typeof val === "string" && val.trim().length > 0) {
      return val.trim();
    }
  }
  return undefined;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q } = await searchParams;

  const [categoriesData, productsData] = await Promise.all([
    prisma.category.findMany({
      include: {
        products: {
          where: { status: "active" },
          select: { id: true },
        },
      },
    }),
    prisma.product.findMany({
      where: {
        status: "active",
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
                { slug: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        media: { orderBy: { position: "asc" }, take: 1 },
        variants: { where: { isEnabled: true } },
        category: true,
      },
    }),
  ]);

  const categories: CategoryItem[] = categoriesData.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c.products.length,
  }));

  const initialProducts: CatalogProduct[] = productsData.map((p) => {
    const prices = p.variants.map((v) => v.priceAmount);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;

    const variants = p.variants.map((v) => ({
      size: extractStringOption(v.options, ["Size", "size"]),
      color: extractStringOption(v.options, ["Color", "Colour", "color", "colour"]),
    }));

    const sizes = Array.from(
      new Set(variants.map((v) => v.size).filter((s): s is string => Boolean(s)))
    );
    const colors = Array.from(
      new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))
    );

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      minPriceAmount: minPrice,
      maxPriceAmount: maxPrice,
      currency: p.variants[0]?.priceCurrency ?? "USD",
      imageUrl: p.media[0]?.url ?? null,
      imageAlt: p.media[0]?.alt ?? p.title,
      totalOnHand: 10,
      categorySlug: p.category?.slug,
      categoryName: p.category?.name,
      sizes,
      colors,
      variants,
    };
  });

  const pageTitle = q ? `Search results for “${q}”` : "Clothing";

  return (
    <div className="mx-auto max-w-7xl py-6">
      <CatalogBrowser
        initialProducts={initialProducts}
        categories={categories}
        title={pageTitle}
      />
    </div>
  );
}
