import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateVariantMatrix } from "../src/lib/variants";

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = (seed: string) => `https://images.unsplash.com/${seed}?w=1200&q=80`;
const FLAT_SHIPPING_SEED = 599; // mirrors FLAT_SHIPPING_AMOUNT in lib/orders.server.ts

async function main() {
  console.log("Seeding staff users…");
  // Default staff password satisfies length >= 8, number, and special character requirements
  const defaultPasswordHash = await bcrypt.hash("AdminPassword123!", 10);

  const staffUsers = [
    { email: "admin@vault.internal", name: "Ada (Admin)", staffRole: "admin" as const },
    { email: "fulfilment@vault.internal", name: "Femi (Fulfilment)", staffRole: "fulfilment" as const },
    { email: "support@vault.internal", name: "Sam (Support)", staffRole: "support" as const },
  ];

  for (const staff of staffUsers) {
    await prisma.user.upsert({
      where: { email: staff.email },
      update: {
        passwordHash: defaultPasswordHash,
        staffRole: staff.staffRole,
      },
      create: {
        email: staff.email,
        name: staff.name,
        staffRole: staff.staffRole,
        passwordHash: defaultPasswordHash,
      },
    });
  }

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

  interface ProductSeed {
    title: string;
    slug: string;
    description: string;
    categoryId: string;
    optionNames: string[];
    optionValues: Record<string, readonly string[]>;
    basePriceAmount: number;
    images: string[];
  }

  const productSeeds: ProductSeed[] = [
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
    const combinations = generateVariantMatrix(seed.optionNames, seed.optionValues);

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
          create: seed.images.map((url, position) => ({
            url,
            alt: `${seed.title} view ${position + 1}`,
            position,
          })),
        },
      },
    });

    for (const [vIndex, combo] of combinations.entries()) {
      const skuParts = [
        seed.slug.toUpperCase().slice(0, 10),
        combo.Size ? (combo.Size as string).toUpperCase().replaceAll("/", "-") : null,
        combo.Colour ? (combo.Colour as string).toUpperCase().slice(0, 3) : null,
      ].filter(Boolean);
      const sku = skuParts.join("-");

      await prisma.productVariant.upsert({
        where: { sku },
        update: {},
        create: {
          productId: product.id,
          sku,
          options: combo as any,
          priceAmount: seed.basePriceAmount,
          position: vIndex,
          inventoryItem: {
            create: {
              onHand: Math.floor(Math.random() * 10) + 1,
              lowStockThreshold: 5,
            },
          },
        },
      });
    }
  }

  console.log("Seeding discount codes…");
  await prisma.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: {
      code: "WELCOME10",
      type: "percentage",
      value: 10,
      usageLimit: 1000,
      perCustomerLimit: 1,
      minimumSpend: null,
      isActive: true,
    },
  });
  await prisma.discountCode.upsert({
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
  type VariantType = (typeof seededProducts)[number]["variants"][number];
  const firstVariantByProduct = new Map<string, VariantType>();
  for (const p of seededProducts) {
    if (p.variants[0]) {
      firstVariantByProduct.set(p.slug, p.variants[0]);
    }
  }

  const orderPairings: { slugs: string[]; email: string }[] = [
    { slugs: ["waxed-field-jacket", "service-boot"], email: "customer1@example.com" },
    { slugs: ["waxed-field-jacket", "merino-watch-cap"], email: "customer2@example.com" },
    { slugs: ["waxed-field-jacket", "service-boot", "merino-watch-cap"], email: "customer3@example.com" },
    { slugs: ["shell-anorak", "canvas-low-top"], email: "customer4@example.com" },
    { slugs: ["shell-anorak", "waxed-canvas-belt"], email: "customer5@example.com" },
    { slugs: ["service-boot", "waxed-canvas-belt"], email: "customer6@example.com" },
  ];

  for (const [index, pairing] of orderPairings.entries()) {
    const variants: VariantType[] = pairing.slugs
      .map((slug) => firstVariantByProduct.get(slug))
      .filter((v): v is VariantType => Boolean(v));
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
