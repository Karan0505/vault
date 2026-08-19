import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vault.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where: { status: "active" },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);

    return [
      { url: siteUrl, changeFrequency: "daily", priority: 1 },
      { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.5 },
      ...categories.map((category) => ({
        url: `${siteUrl}/categories/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.8,
      })),
      ...products.map((product) => ({
        url: `${siteUrl}/products/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return [
      { url: siteUrl, changeFrequency: "daily", priority: 1 },
      { url: `${siteUrl}/search`, changeFrequency: "daily", priority: 0.5 },
    ];
  }
}
