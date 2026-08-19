import type { ProductCardData } from "@/components/product";

interface VariantForCard {
  priceAmount: number;
  priceCurrency: string;
  inventoryItem: { onHand: number } | null;
}

interface MediaForCard {
  url: string;
  alt: string;
}

interface ProductForCard {
  slug: string;
  title: string;
  media: MediaForCard[];
  variants: VariantForCard[];
}

export function toProductCardData(product: ProductForCard): ProductCardData {
  const prices = product.variants.map((v) => v.priceAmount);
  const currency = product.variants[0]?.priceCurrency ?? "USD";
  const totalOnHand = product.variants.reduce((sum, v) => sum + (v.inventoryItem?.onHand ?? 0), 0);
  const firstImage = product.media[0];

  return {
    slug: product.slug,
    title: product.title,
    imageUrl: firstImage?.url ?? null,
    imageAlt: firstImage?.alt || product.title,
    minPriceAmount: prices.length ? Math.min(...prices) : 0,
    maxPriceAmount: prices.length ? Math.max(...prices) : 0,
    currency,
    totalOnHand,
  };
}
