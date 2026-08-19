import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCategoryWithProducts } from "@/lib/products.server";
import { CatalogBrowser, type CategoryItem, type CatalogProduct } from "@/components/product";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export async function generateStaticParams() {
  try {
    const categories = await prisma.category.findMany({ select: { slug: true } });
    return categories.map((c) => ({ slug: c.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryWithProducts(slug);
  if (!category) return {};
  return {
    title: `${category.name} · VAULT`,
    description: category.description ?? undefined,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const [category, allCategoriesData, allProductsData] = await Promise.all([
    getCategoryWithProducts(slug),
    prisma.category.findMany({
      include: {
        products: { where: { status: "active" }, select: { id: true } },
      },
    }),
    prisma.product.findMany({
      where: { status: "active" },
      include: {
        media: { orderBy: { position: "asc" }, take: 1 },
        variants: { where: { isEnabled: true } },
        category: true,
      },
    }),
  ]);

  if (!category) notFound();

  const categories: CategoryItem[] = allCategoriesData.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c.products.length,
  }));

  const initialProducts: CatalogProduct[] = allProductsData.map((p) => {
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

  return (
    <div className="mx-auto max-w-7xl py-6">
      <CatalogBrowser
        initialProducts={initialProducts}
        categories={categories}
        title={category.name}
      />
    </div>
  );
}
