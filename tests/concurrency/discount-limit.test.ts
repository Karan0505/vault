import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createCheckoutSession } from "@/lib/orders.server";
import { DiscountUsageLimitError } from "@/lib/discounts.server";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn(
    "[discount-limit.test] DATABASE_URL not set — skipping. This test MUST run against a real Postgres in CI."
  );
}

describe.skipIf(!hasDb)("discount usage limit concurrency", () => {
  let categoryId: string;
  let productId: string;
  let variantId: string;
  let userId: string;
  let globalDiscountCode: string;
  let globalDiscountId: string;
  let customerDiscountCode: string;
  let customerDiscountId: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const user = await prisma.user.create({
      data: {
        email: `discount-test-${suffix}@vault.internal`,
        name: "Discount Test User",
      },
    });
    userId = user.id;

    const category = await prisma.category.create({
      data: { name: "Discount Concurrency Test", slug: `discount-conc-test-${suffix}` },
    });
    categoryId = category.id;

    const product = await prisma.product.create({
      data: {
        title: "Discount Test Product",
        slug: `discount-test-product-${suffix}`,
        status: "active",
        categoryId,
        optionNames: [],
      },
    });
    productId = product.id;

    // Seed variant with 100 units onHand so stock is never the bottleneck in parallel checkouts
    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: `DISC-TEST-${suffix}`,
        options: {},
        priceAmount: 5000,
        priceCurrency: "USD",
        inventoryItem: { create: { onHand: 100, reserved: 0 } },
      },
    });
    variantId = variant.id;

    globalDiscountCode = `GLOBAL-${suffix}`;
    const globalDiscount = await prisma.discount.create({
      data: {
        code: globalDiscountCode,
        type: "percentage",
        value: 20,
        usageLimit: 1,
        isActive: true,
      },
    });
    globalDiscountId = globalDiscount.id;

    customerDiscountCode = `CUST-${suffix}`;
    const customerDiscount = await prisma.discount.create({
      data: {
        code: customerDiscountCode,
        type: "fixed_amount",
        value: 1000,
        currency: "USD",
        perCustomerLimit: 1,
        isActive: true,
      },
    });
    customerDiscountId = customerDiscount.id;
  });

  beforeEach(() => {
    // Mock Stripe PaymentIntent creation to avoid external API calls and placeholder key failures in CI
    vi.spyOn(stripe.paymentIntents, "create").mockImplementation(async (params) => {
      const mockId = `pi_mock_${Math.random().toString(36).slice(2)}`;
      return {
        id: mockId,
        client_secret: `${mockId}_secret`,
        amount: params?.amount ?? 5000,
        currency: params?.currency ?? "usd",
        status: "requires_payment_method",
      } as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(async () => {
    const discountIds = [globalDiscountId, customerDiscountId].filter(Boolean);
    if (discountIds.length > 0) {
      await prisma.discountRedemption.deleteMany({
        where: { discountId: { in: discountIds } },
      }).catch(() => undefined);
      await prisma.discount.deleteMany({
        where: { id: { in: discountIds } },
      }).catch(() => undefined);
    }
    if (variantId) {
      await prisma.orderItem.deleteMany({ where: { variantId } }).catch(() => undefined);
      await prisma.reservation.deleteMany({ where: { inventoryItem: { variantId } } }).catch(() => undefined);
      await prisma.order.deleteMany({ where: { items: { some: { variantId } } } }).catch(() => undefined);
    }
    if (productId) {
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined);
    }
    if (categoryId) {
      await prisma.category.delete({ where: { id: categoryId } }).catch(() => undefined);
    }
    if (userId) {
      await prisma.user.delete({ where: { id: userId } }).catch(() => undefined);
    }
  });

  it("lets exactly one of ten concurrent checkouts redeem a discount code with usageLimit: 1", async () => {
    // Provision 10 separate carts (1 unit of variant each) to prevent cart-level inventory locking serialization
    const carts = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const cart = await prisma.cart.create({ data: {} });
        await prisma.cartItem.create({
          data: { cartId: cart.id, variantId, quantity: 1 },
        });
        return cart;
      })
    );

    // Fire 10 parallel checkouts simultaneously using the same usageLimit: 1 code
    const attempts = carts.map((cart) =>
      createCheckoutSession({
        cartId: cart.id,
        userId: null,
        email: "shopper@example.com",
        discountCode: globalDiscountCode,
      })
    );

    const results = await Promise.allSettled(attempts);

    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createCheckoutSession>>> =>
        r.status === "fulfilled"
    );
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);

    // Assert every failure is specifically a DiscountUsageLimitError
    for (const failure of failed) {
      expect(failure.reason).toBeInstanceOf(DiscountUsageLimitError);
    }

    // Verify DB state: exactly 1 redemption record created for the discount
    const redemptionsCount = await prisma.discountRedemption.count({
      where: { discountId: globalDiscountId },
    });
    expect(redemptionsCount).toBe(1);

    // Clean up created carts and orders
    const succeededOrderId = succeeded[0]?.value.orderId;
    if (succeededOrderId) {
      await prisma.order.delete({ where: { id: succeededOrderId } }).catch(() => undefined);
    }
    await prisma.cart.deleteMany({ where: { id: { in: carts.map((c) => c.id) } } }).catch(() => undefined);
  });

  it("lets exactly one of ten concurrent checkouts from the same user redeem a perCustomerLimit: 1 code", async () => {
    // Provision 10 separate carts for the same user
    const carts = await Promise.all(
      Array.from({ length: 10 }, async () => {
        const cart = await prisma.cart.create({ data: { userId } });
        await prisma.cartItem.create({
          data: { cartId: cart.id, variantId, quantity: 1 },
        });
        return cart;
      })
    );

    // Fire 10 parallel checkouts from the same userId using the perCustomerLimit: 1 code
    const attempts = carts.map((cart) =>
      createCheckoutSession({
        cartId: cart.id,
        userId,
        email: "user@example.com",
        discountCode: customerDiscountCode,
      })
    );

    const results = await Promise.allSettled(attempts);

    const succeeded = results.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof createCheckoutSession>>> =>
        r.status === "fulfilled"
    );
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(9);

    for (const failure of failed) {
      expect(failure.reason).toBeInstanceOf(DiscountUsageLimitError);
    }

    const redemptionsCount = await prisma.discountRedemption.count({
      where: { discountId: customerDiscountId, userId },
    });
    expect(redemptionsCount).toBe(1);

    const succeededOrderId = succeeded[0]?.value.orderId;
    if (succeededOrderId) {
      await prisma.order.delete({ where: { id: succeededOrderId } }).catch(() => undefined);
    }
    await prisma.cart.deleteMany({ where: { id: { in: carts.map((c) => c.id) } } }).catch(() => undefined);
  });
});
