import { PrismaClient } from "@prisma/client";
import { generateVariantMatrix } from "../src/lib/variants";

const prisma = new PrismaClient();

const PLACEHOLDER_IMAGE = (seed: string) => `https://images.unsplash.com/${seed}?w=1200&q=80`;

async function main() {
  console.log("Seeding staff users…");
  const staffUsers = [
    { email: "admin@vault.internal", name: "Ada (Admin)", staffRole: "admin" as const, password: "adminpassword" },
    { email: "fulfilment@vault.internal", name: "Femi (Fulfilment)", staffRole: "fulfilment" as const, password: "fulfilmentpassword" },
    { email: "support@vault.internal", name: "Sam (Support)", staffRole: "support" as const, password: "supportpassword" },
  ];
  for (const u of staffUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { password: u.password, staffRole: u.staffRole, name: u.name },
      create: u,
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

  type ProductSeed = {
    title: string;
    slug: string;
    description: string;
    categoryId: string;
    optionNames: string[];
    optionValues: Record<string, readonly string[]>;
    basePriceAmount: number;
    images: string[];
  };

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
      const onHand = [0, 2, 4, 12, 20][index % 5] ?? 10;

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
