interface ProductJsonLdProps {
  name: string;
  description: string | null;
  slug: string;
  images: string[];
  sku: string;
  priceAmount: number;
  priceCurrency: string;
  availability: "InStock" | "OutOfStock";
  categoryName?: string;
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vault.example.com";

export function ProductJsonLd({
  name,
  description,
  slug,
  images,
  sku,
  priceAmount,
  priceCurrency,
  availability,
  categoryName,
}: ProductJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: description ?? undefined,
    image: images,
    sku,
    category: categoryName,
    url: `${siteUrl}/products/${slug}`,
    offers: {
      "@type": "Offer",
      url: `${siteUrl}/products/${slug}`,
      priceCurrency,
      price: (priceAmount / 100).toFixed(2),
      availability: `https://schema.org/${availability}`,
    },
  };

  return (
    // eslint-disable-next-line react/no-danger -- structured data has to be inlined as raw JSON for crawlers to read it
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
  );
}
