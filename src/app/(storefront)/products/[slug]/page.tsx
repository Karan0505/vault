import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Star, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProductBySlugForStorefront } from "@/lib/products.server";
import {
  ImageGallery,
  VariantSelector,
  type SelectableVariant,
  ProductJsonLd,
  RecommendationsRail,
  RecommendationsRailSkeleton,
} from "@/components/product";
import { formatMoney } from "@/lib/money";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = true;

export async function generateStaticParams() {
  const products = await prisma.product.findMany({
    where: { status: "active" },
    select: { slug: true },
  });
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlugForStorefront(slug);
  if (!product) return {};

  const cheapest = [...product.variants].sort((a, b) => a.priceAmount - b.priceAmount)[0];

  return {
    title: product.title,
    description: product.description ?? undefined,
    alternates: {
      canonical: `/products/${slug}`,
    },
    openGraph: {
      title: product.title,
      description: product.description ?? undefined,
      images: product.media[0] ? [product.media[0].url] : undefined,
    },
    other: cheapest
      ? { "product:price:amount": String(cheapest.priceAmount / 100), "product:price:currency": cheapest.priceCurrency }
      : undefined,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProductBySlugForStorefront(slug);
  if (!product) notFound();

  const optionValues: Record<string, string[]> = {};
  for (const name of product.optionNames) {
    const values = new Set<string>();
    for (const variant of product.variants) {
      const options = variant.options as Record<string, string>;
      const value = options[name];
      if (value) values.add(value);
    }
    optionValues[name] = Array.from(values);
  }

  const selectableVariants: SelectableVariant[] = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    options: v.options as Record<string, string>,
    isEnabled: v.isEnabled,
    priceAmount: v.priceAmount,
    priceCurrency: v.priceCurrency,
    compareAtAmount: v.compareAtAmount,
    onHand: v.inventoryItem?.onHand ?? 0,
    lowStockThreshold: v.inventoryItem?.lowStockThreshold ?? 5,
  }));

  const images = product.media.map((m) => ({ url: m.url, alt: m.alt }));
  const cheapestForSchema = [...product.variants].sort((a, b) => a.priceAmount - b.priceAmount)[0];
  const totalOnHand = product.variants.reduce((sum, v) => sum + (v.inventoryItem?.onHand ?? 0), 0);

  const priceLabel = cheapestForSchema
    ? formatMoney({ amount: cheapestForSchema.priceAmount, currency: cheapestForSchema.priceCurrency })
    : "";

  return (
    <div className="flex flex-col gap-16">
      {cheapestForSchema && (
        <ProductJsonLd
          name={product.title}
          description={product.description}
          slug={product.slug}
          images={images.map((i) => i.url)}
          sku={cheapestForSchema.sku}
          priceAmount={cheapestForSchema.priceAmount}
          priceCurrency={cheapestForSchema.priceCurrency}
          availability={totalOnHand > 0 ? "InStock" : "OutOfStock"}
          categoryName={product.category?.name}
        />
      )}

      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-gray-500">
        <Link href="/" className="hover:text-black transition-colors">
          Home
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <Link
          href={product.category ? `/categories/${product.category.slug}` : "/"}
          className="hover:text-black transition-colors"
        >
          {product.category?.name ?? "Clothing"}
        </Link>
        <ChevronRight size={12} className="text-gray-400" />
        <span className="font-medium text-gray-900">{product.title}</span>
      </nav>

      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        {/* Left: Gallery */}
        <div className="lg:col-span-7">
          <ImageGallery images={images} productTitle={product.title} />
        </div>

        {/* Right: Product Details & Purchase Form */}
        <div className="flex flex-col gap-6 lg:col-span-5 lg:sticky lg:top-24 lg:self-start">
          <div>
            <h1 className="font-sans text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              {product.title}
            </h1>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-sans text-2xl font-bold text-gray-900">
                {priceLabel}
              </span>
              {/* Reviews Stars */}
              <div className="flex items-center gap-1.5">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} className="fill-amber-400" />
                  ))}
                </div>
                <span className="font-sans text-xs font-semibold text-gray-500">(128)</span>
              </div>
            </div>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
          )}

          <div className="h-px bg-gray-200" />

          <Suspense fallback={<div className="skeleton h-48 rounded-2xl" />}>
            <VariantSelector
              optionNames={product.optionNames}
              optionValues={optionValues}
              variants={selectableVariants}
            />
          </Suspense>
        </div>
      </div>

      <Suspense fallback={<RecommendationsRailSkeleton />}>
        <RecommendationsRail productId={product.id} categoryId={product.categoryId} />
      </Suspense>
    </div>
  );
}
