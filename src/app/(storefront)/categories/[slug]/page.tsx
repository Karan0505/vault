import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCategoryWithProducts } from "@/lib/products.server";
import { toProductCardData } from "@/lib/catalogue-view";
import { CategoryHero } from "@/components/storefront/CategoryHero";
import { ProductGrid } from "@/components/storefront/ProductGrid";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

// ISR: this page is static at build time for every known category and
// re-rendered on demand only when revalidateProduct()/revalidateCategory()
// invalidate its tag from an admin write — never on a fixed timer alone.
export const dynamicParams = true;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({ select: { slug: true } });
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryWithProducts(slug);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description ?? undefined,
    alternates: { canonical: `/categories/${slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategoryWithProducts(slug);
  if (!category) notFound();

  const products = category.products.map(toProductCardData);

  return (
    <div className="flex flex-col gap-10">
      <CategoryHero name={category.name} description={category.description} count={products.length} />
      <ProductGrid products={products} />
    </div>
  );
}
