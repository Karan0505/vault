import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { getCartView } from "@/lib/cart/cart.server";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn("[cart-pricing.test] DATABASE_URL not set — skipping.");
}

describe.skipIf(!hasDb)("server-authoritative cart pricing", () => {
  let variantId: string;
  let productId: string;
  let categoryId: string;
  let cartId: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const category = await prisma.category.create({
      data: { name: "Pricing Test", slug: `pricing-test-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        title: "Pricing Test Product",
        slug: `pricing-test-product-${suffix}`,
        status: "active",
        categoryId,
        optionNames: [],
      },
    });
    productId = product.id;

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: `PRICE-TEST-${suffix}`,
        options: {},
        priceAmount: 1000,
        priceCurrency: "USD",
        inventoryItem: { create: { onHand: 10 } },
      },
    });
    variantId = variant.id;

    const cart = await prisma.cart.create({ data: {} });
    cartId = cart.id;
    await prisma.cartItem.create({ data: { cartId, variantId, quantity: 2 } });
  });

  afterAll(async () => {
    await prisma.cart.delete({ where: { id: cartId } }).catch(() => undefined);
    await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
  });

  it("computes the line total from the live variant price, not any stored per-item value", async () => {
    // CartItem has no price column at all — see prisma/schema.prisma.
    // There is nothing here for a tampered client-supplied price to
    // overwrite; the total below is arithmetic, not a stored lookup.
    const view = await getCartView(cartId);
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]?.unitAmount).toBe(1000);
    expect(view.lines[0]?.lineTotal).toBe(2000);
    expect(view.subtotal).toBe(2000);
  });

  it("picks up a price change immediately on the next read, because every read recomputes it", async () => {
    await prisma.productVariant.update({ where: { id: variantId }, data: { priceAmount: 1500 } });

    const view = await getCartView(cartId);
    expect(view.lines[0]?.unitAmount).toBe(1500);
    expect(view.lines[0]?.lineTotal).toBe(3000);
    expect(view.subtotal).toBe(3000);
  });
});
