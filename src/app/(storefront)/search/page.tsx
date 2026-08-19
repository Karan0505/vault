import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CatalogBrowser, type CategoryItem, type CatalogProduct } from "@/components/product";

export const metadata: Metadata = { title: "Search & Catalog" };

interface SearchPageProps {
  searchParams: Promise<{ q?: string; category?: string; sort?: string }>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, category } = await searchParams;

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

    return {
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
