import { PrismaClient } from "@prisma/client";
import { generateVariantMatrix } from "../src/lib/variants";

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = (seed: string) => `https://images.unsplash.com/${seed}?w=1200&q=80`;
const FLAT_SHIPPING_SEED = 599; // mirrors FLAT_SHIPPING_AMOUNT in lib/orders.server.ts

async function main() {
  console.log("Seeding staff users…");
  await prisma.user.createMany({
    data: [
      { email: "admin@vault.internal", name: "Ada (Admin)", staffRole: "admin" },
      { email: "fulfilment@vault.internal", name: "Femi (Fulfilment)", staffRole: "fulfilment" },
      { email: "support@vault.internal", name: "Sam (Support)", staffRole: "support" },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding categories…");
  const outerwear = await prisma.category.upsert({
    where: { slug: "outerwear" },
    update: {},
    create: {
      name: "Outerwear",
      slug: "outerwear",
      description: "Jackets and coats built for weather, not just for looking like it.",
      position: 0,
    },
  });

  const footwear = await prisma.category.upsert({
    where: { slug: "footwear" },
    update: {},
    create: {
      name: "Footwear",
      slug: "footwear",
      description: "Boots and shoes, resoled rather than replaced.",
      position: 1,
    },
  });

  const accessories = await prisma.category.upsert({
    where: { slug: "accessories" },
    update: {},
    create: {
      name: "Accessories",
      slug: "accessories",
      description: "The small things that make the rest of the kit work.",
      position: 2,
    },
  });

  console.log("Seeding products…");

  const productSeeds = [
    {
      title: "Waxed Field Jacket",
      slug: "waxed-field-jacket",
      description:
        "A dry-wax cotton shell cut for layering, with a corduroy collar and brass hardware throughout.",
      categoryId: outerwear.id,
      optionNames: ["Size", "Colour"],
      optionValues: { Size: ["S", "M", "L", "XL"], Colour: ["Loden", "Rust", "Ink"] },
      basePriceAmount: 24500,
      images: [PLACEHOLDER_IMAGE("photo-1551028719-00167b16eac5"), PLACEHOLDER_IMAGE("photo-1521572163474-6864f9cf17ab")],
    },
    {
      title: "Shell Anorak",
      slug: "shell-anorak",
      description: "Lightweight, packable, and cut long enough to actually keep the rain out.",
      categoryId: outerwear.id,
      optionNames: ["Size", "Colour"],
      optionValues: { Size: ["S", "M", "L"], Colour: ["Moss", "Charcoal"] },
      basePriceAmount: 18800,
      images: [PLACEHOLDER_IMAGE("photo-1544022613-e87ca75a784a")],
    },
    {
      title: "Service Boot",
      slug: "service-boot",
      description: "Goodyear-welted, full-grain leather, built to be resoled for decades.",
      categoryId: footwear.id,
      optionNames: ["Size", "Colour"],
      optionValues: { Size: ["8", "9", "10", "11", "12"], Colour: ["Chestnut", "Black"] },
      basePriceAmount: 29500,
      images: [PLACEHOLDER_IMAGE("photo-1520639888713-7851133b1ed0")],
    },
    {
      title: "Canvas Low-Top",
      slug: "canvas-low-top",
      description: "A plain-toe canvas trainer with a vulcanised sole.",
      categoryId: footwear.id,
      optionNames: ["Size", "Colour"],
      optionValues: { Size: ["7", "8", "9", "10", "11"], Colour: ["White", "Black", "Navy"] },
      basePriceAmount: 8900,
      images: [PLACEHOLDER_IMAGE("photo-1549298916-b41d501d3772")],
    },
    {
      title: "Waxed Canvas Belt",
      slug: "waxed-canvas-belt",
      description: "Solid brass buckle, waxed canvas body, leather-backed for structure.",
      categoryId: accessories.id,
      optionNames: ["Size"],
      optionValues: { Size: ["S/M", "L/XL"] },
      basePriceAmount: 5400,
      images: [PLACEHOLDER_IMAGE("photo-1553062407-98eeb64c6a62")],
    },
    {
      title: "Merino Watch Cap",
      slug: "merino-watch-cap",
      description: "Fine-gauge merino, single dimension — one size, three colourways.",
      categoryId: accessories.id,
      optionNames: ["Colour"],
      optionValues: { Colour: ["Charcoal", "Oat", "Rust"] },
      basePriceAmount: 4200,
      images: [PLACEHOLDER_IMAGE("photo-1576871337622-98d48d1cf531")],
    },
  ];

  for (const seed of productSeeds) {
    const combinations = generateVariantMatrix(seed.optionNames, seed.optionValues as Record<string, readonly string[]>);

    const product = await prisma.product.upsert({
      where: { slug: seed.slug },
      update: {},
      create: {
        title: seed.title,
        slug: seed.slug,
        description: seed.description,
        status: "active",
        categoryId: seed.categoryId,
        optionNames: seed.optionNames,
        media: {
          create: seed.images.map((url, position) => ({ url, alt: seed.title, position })),
        },
      },
    });

    for (const [index, options] of combinations.entries()) {
      const skuSuffix = Object.values(options)
        .map((v) => v.slice(0, 3).toUpperCase())
        .join("-");
      const sku = `${seed.slug.toUpperCase().slice(0, 10)}-${skuSuffix}`;
      // Small deterministic variance so the storefront doesn't show one flat price everywhere.
      const priceAmount = seed.basePriceAmount + (index % 3) * 500;
      // Distribute a bit of low-stock and out-of-stock across the catalogue for demo.
      const onHand = index === 0 ? 0 : index === 1 ? 3 : 15;

      await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          options,
          priceAmount,
          priceCurrency: "USD",
          isEnabled: true,
          position: index,
          inventoryItem: {
            create: { onHand, lowStockThreshold: 5 },
          },
        },
      });
    }
  }

  console.log("Seeding discount codes…");
  await prisma.discount.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      usageLimit: null,
      perCustomerLimit: 1,
      minimumSpend: null,
      isActive: true,
    },
  });
  await prisma.discount.upsert({
    where: { code: "FREESHIP" },
    update: {},
    create: {
      code: "FREESHIP",
      type: "free_shipping",
      value: 0,
      usageLimit: 100,
      perCustomerLimit: null,
      minimumSpend: 10000,
      isActive: true,
    },
  });

  console.log("Seeding sample completed orders (for recommendations)…");

  const seededProducts = await prisma.product.findMany({
    where: { slug: { in: productSeeds.map((p) => p.slug) } },
    include: { variants: { orderBy: { position: "asc" }, take: 1 } },
  });
  const firstVariantByProduct = new Map(
    seededProducts
      .map((p) => {
        const firstVariant = p.variants[0];
        return firstVariant ? ([p.slug, firstVariant] as const) : null;
      })
      .filter((entry): entry is readonly [string, (typeof seededProducts)[0]["variants"][0]] => entry !== null)
  );

  const orderPairings: { slugs: string[]; email: string }[] = [
    { slugs: ["waxed-field-jacket", "service-boot"], email: "customer1@example.com" },
    { slugs: ["waxed-field-jacket", "merino-watch-cap"], email: "customer2@example.com" },
    { slugs: ["waxed-field-jacket", "service-boot", "merino-watch-cap"], email: "customer3@example.com" },
    { slugs: ["shell-anorak", "canvas-low-top"], email: "customer4@example.com" },
    { slugs: ["shell-anorak", "waxed-canvas-belt"], email: "customer5@example.com" },
    { slugs: ["service-boot", "waxed-canvas-belt"], email: "customer6@example.com" },
  ];

  for (const [index, pairing] of orderPairings.entries()) {
    const variants = pairing.slugs
      .map((slug) => firstVariantByProduct.get(slug))
      .filter((v): v is NonNullable<typeof v> => typeof v === "object" && v !== null);
    if (variants.length === 0) continue;

    const subtotal = variants.reduce((sum, v) => sum + v.priceAmount, 0);

    await prisma.order.upsert({
      where: { number: `VAULT-SEED-${index + 1}` },
      update: {},
      create: {
        number: `VAULT-SEED-${index + 1}`,
        status: "delivered",
        email: pairing.email,
        currency: "USD",
        subtotalAmount: subtotal,
        totalAmount: subtotal + FLAT_SHIPPING_SEED,
        shippingAmount: FLAT_SHIPPING_SEED,
        reservationExpiresAt: new Date(),
        items: {
          create: variants.map((v) => ({
            variantId: v.id,
            titleSnapshot: v.sku,
            skuSnapshot: v.sku,
            optionsSnapshot: v.options as object,
            unitAmount: v.priceAmount,
            quantity: 1,
            lineTotal: v.priceAmount,
          })),
        },
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
