import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { ProductForm, type ProductFormValue } from "@/components/admin/ProductForm";
import type { VariantDraft } from "@/components/admin/VariantMatrixEditor";

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params;

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        media: { orderBy: { position: "asc" } },
        variants: { include: { inventoryItem: true }, orderBy: { position: "asc" } },
      },
    }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  const optionValues: Record<string, string[]> = {};
  for (const name of product.optionNames) {
    const values = new Set<string>();
    for (const variant of product.variants) {
      const value = (variant.options as Record<string, string>)[name];
      if (value) values.add(value);
    }
    optionValues[name] = Array.from(values);
  }

  const variants: VariantDraft[] = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    options: v.options as Record<string, string>,
    priceAmount: v.priceAmount,
    priceCurrency: v.priceCurrency,
    compareAtAmount: v.compareAtAmount,
    isEnabled: v.isEnabled,
    onHand: v.inventoryItem?.onHand ?? 0,
    lowStockThreshold: v.inventoryItem?.lowStockThreshold ?? 5,
  }));

  const initialValue: ProductFormValue = {
    id: product.id,
    title: product.title,
    slug: product.slug,
    description: product.description ?? "",
    status: product.status,
    categoryId: product.categoryId,
    optionNames: product.optionNames,
    optionValues,
    variants,
    media: product.media.map((m) => ({ url: m.url, alt: m.alt })),
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="eyebrow">Catalogue</p>
        <h1 className="mt-2 font-display text-3xl text-ink-50">{product.title}</h1>
      </div>
      <ProductForm categories={categories} initialValue={initialValue} />
    </div>
  );
}
