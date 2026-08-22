import "server-only";
import { unstable_cache as cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { optionKey } from "@/lib/catalogue/variants";
import type { ProductInput } from "@/lib/validation/validation";
import { revalidateProduct, cacheTags } from "@/lib/validation/revalidate";
import { syncProductSearchVector } from "@/lib/search/search-index.server";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";

export class DuplicateVariantError extends Error {
  constructor(public readonly key: string) {
    super(`Duplicate variant option combination: ${key}`);
    this.name = "DuplicateVariantError";
  }
}

/** Every variant's `options` keys must exactly match the product's optionNames, and no two variants may share a combination. */
function assertVariantsMatchOptions(input: ProductInput): void {
  const seen = new Set<string>();
  for (const variant of input.variants) {
    const keys = Object.keys(variant.options).sort();
    const expected = [...input.optionNames].sort();
    const matches =
      keys.length === expected.length && keys.every((k, i) => k === expected[i]);
    if (!matches) {
      throw new Error(
        `Variant "${variant.sku}" options (${keys.join(", ")}) do not match product option dimensions (${expected.join(", ")})`
      );
    }
    const key = optionKey(input.optionNames, variant.options);
    if (seen.has(key)) throw new DuplicateVariantError(key);
    seen.add(key);
  }
}

export async function createProduct(input: ProductInput, actor: AuditActor) {
  assertVariantsMatchOptions(input);

  const category = input.categoryId
    ? await prisma.category.findUnique({ where: { id: input.categoryId } })
    : null;

  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        status: input.status,
        categoryId: input.categoryId ?? null,
        optionNames: input.optionNames,
      },
    });

    for (const variant of input.variants) {
      await tx.productVariant.create({
        data: {
          productId: created.id,
          sku: variant.sku,
          options: variant.options,
          priceAmount: variant.priceAmount,
          priceCurrency: variant.priceCurrency,
          compareAtAmount: variant.compareAtAmount ?? null,
          isEnabled: variant.isEnabled,
          inventoryItem: {
            create: {
              onHand: variant.onHand,
              lowStockThreshold: variant.lowStockThreshold,
            },
          },
        },
      });
    }

    for (const [position, item] of input.media.entries()) {
      await tx.media.create({
        data: { productId: created.id, url: item.url, alt: item.alt, position },
      });
    }

    await syncProductSearchVector(tx, created.id);

    await appendAuditLog(tx, {
      actor,
      entityType: "Product",
      entityId: created.id,
      action: "create",
      after: {
        title: input.title,
        slug: input.slug,
        status: input.status,
        variants: input.variants.map((v) => ({ sku: v.sku, priceAmount: v.priceAmount, onHand: v.onHand })),
      },
    });

    return created;
  });

  revalidateProduct({ productSlug: product.slug, categorySlug: category?.slug });
  return product;
}

export async function updateProduct(productId: string, input: ProductInput, actor: AuditActor) {
  assertVariantsMatchOptions(input);

  const existing = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { category: true, variants: true },
  });

  const category = input.categoryId
    ? await prisma.category.findUnique({ where: { id: input.categoryId } })
    : null;

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: productId },
      data: {
        title: input.title,
        slug: input.slug,
        description: input.description ?? null,
        status: input.status,
        categoryId: input.categoryId ?? null,
        optionNames: input.optionNames,
      },
    });

    const incomingIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id as string));
    const toDelete = existing.variants.filter((v) => !incomingIds.has(v.id));
    if (toDelete.length > 0) {
      await tx.productVariant.deleteMany({ where: { id: { in: toDelete.map((v) => v.id) } } });
    }

    for (const variant of input.variants) {
      if (variant.id) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: {
            sku: variant.sku,
            options: variant.options,
            priceAmount: variant.priceAmount,
            priceCurrency: variant.priceCurrency,
            compareAtAmount: variant.compareAtAmount ?? null,
            isEnabled: variant.isEnabled,
            inventoryItem: {
              upsert: {
                create: {
                  onHand: variant.onHand,
                  lowStockThreshold: variant.lowStockThreshold,
                },
                update: {
                  onHand: variant.onHand,
                  lowStockThreshold: variant.lowStockThreshold,
                },
              },
            },
          },
        });
      } else {
        await tx.productVariant.create({
          data: {
            productId,
            sku: variant.sku,
            options: variant.options,
            priceAmount: variant.priceAmount,
            priceCurrency: variant.priceCurrency,
            compareAtAmount: variant.compareAtAmount ?? null,
            isEnabled: variant.isEnabled,
            inventoryItem: {
              create: {
                onHand: variant.onHand,
                lowStockThreshold: variant.lowStockThreshold,
              },
            },
          },
        });
      }
    }

    await tx.media.deleteMany({ where: { productId } });
    for (const [position, item] of input.media.entries()) {
      await tx.media.create({
        data: { productId, url: item.url, alt: item.alt, position },
      });
    }

    await syncProductSearchVector(tx, productId);

    await appendAuditLog(tx, {
      actor,
      entityType: "Product",
      entityId: productId,
      action: "update",
      before: {
        title: existing.title,
        slug: existing.slug,
        status: existing.status,
        variants: existing.variants.map((v) => ({ sku: v.sku, priceAmount: v.priceAmount })),
      },
      after: {
        title: input.title,
        slug: input.slug,
        status: input.status,
        variants: input.variants.map((v) => ({ sku: v.sku, priceAmount: v.priceAmount })),
      },
    });
  });

  // Invalidate both the old and new slug/category — a slug or category
  // change must not leave a stale cached page behind under the old key.
  revalidateProduct({ productSlug: existing.slug, categorySlug: existing.category?.slug });
  if (existing.slug !== input.slug) {
    revalidateProduct({ productSlug: input.slug, categorySlug: category?.slug });
  }
}

export async function deleteProduct(productId: string, actor: AuditActor) {
  const existing = await prisma.product.findUniqueOrThrow({
    where: { id: productId },
    include: { category: true },
  });

  await prisma.$transaction(async (tx) => {
    await tx.product.delete({ where: { id: productId } });
    await appendAuditLog(tx, {
      actor,
      entityType: "Product",
      entityId: productId,
      action: "delete",
      before: { title: existing.title, slug: existing.slug, status: existing.status },
    });
  });

  revalidateProduct({ productSlug: existing.slug, categorySlug: existing.category?.slug });
}

/**
 * Tagged read for the storefront product page. Prisma calls aren't
 * covered by Next's fetch cache, so this is wrapped in unstable_cache
 * and tagged with product:<slug> — that's the exact tag
 * revalidateProduct() invalidates on publish, and nothing else.
 */
export function getProductBySlugForStorefront(slug: string) {
  return cache(
    async () =>
      prisma.product.findFirst({
        where: { slug, status: "active" },
        include: {
          media: { orderBy: { position: "asc" } },
          variants: {
            where: { isEnabled: true },
            include: { inventoryItem: true },
            orderBy: { position: "asc" },
          },
          category: true,
        },
      }),
    [`product-by-slug:${slug}`],
    { tags: [cacheTags.product(slug), cacheTags.productList()], revalidate: 3600 }
  )();
}

/**
 * Tagged read for a category's listing page. Tagged with category:<slug>
 * (published from that category) plus the generic product-list tag, so
 * a price edit on any listed product still busts this page.
 */
export function getCategoryWithProducts(slug: string) {
  return cache(
    async () =>
      prisma.category.findUnique({
        where: { slug },
        include: {
          products: {
            where: { status: "active" },
            include: {
              media: { orderBy: { position: "asc" }, take: 1 },
              variants: {
                where: { isEnabled: true },
                orderBy: { priceAmount: "asc" },
                include: { inventoryItem: true },
              },
            },
            orderBy: { updatedAt: "desc" },
          },
        },
      }),
    [`category-with-products:${slug}`],
    { tags: [cacheTags.category(slug), cacheTags.productList()], revalidate: 3600 }
  )();
}

export { cacheTags };
