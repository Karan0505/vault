import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getProductBySlugForStorefront } from "@/lib/products.server";
import { ImageGallery } from "@/components/storefront/ImageGallery";
import { VariantSelector, type SelectableVariant } from "@/components/storefront/VariantSelector";
import { Badge } from "@/components/ui/Badge";

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

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      <ImageGallery images={images} productTitle={product.title} />

      <div className="flex flex-col gap-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          {product.category && <Badge tone="brass">{product.category.name}</Badge>}
          <h1 className="mt-3 font-display text-4xl italic text-ink-50">{product.title}</h1>
        </div>

        {product.description && (
          <p className="max-w-md text-sm leading-relaxed text-ink-400">{product.description}</p>
        )}

        <Suspense fallback={<div className="skeleton h-40 rounded-xl" />}>
          <VariantSelector
            optionNames={product.optionNames}
            optionValues={optionValues}
            variants={selectableVariants}
          />
        </Suspense>
      </div>
    </div>
  );
}
