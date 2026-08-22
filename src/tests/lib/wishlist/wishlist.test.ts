import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("server-only", () => ({}));
import {
  getUserWishlist,
  getUserWishlistProductIds,
  addToWishlist,
  removeFromWishlist,
  isProductWishlisted,
} from "@/lib/wishlist/wishlist.server";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => {
  return {
    prisma: {
      wishlistItem: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        count: vi.fn(),
      },
      product: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    },
  };
});

describe("Wishlist Domain Service & User Isolation Rules", () => {
  const userA = "user_cust_A_111";
  const userB = "user_cust_B_222";
  const product1 = "prod_oxford_shirt_1";
  const product2 = "prod_leather_boots_2";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds an active product to the user's wishlist idempotently", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue({
      id: product1,
    } as any);

    vi.mocked(prisma.wishlistItem.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.wishlistItem.create).mockResolvedValue({
      id: "wish_1",
      userId: userA,
      productId: product1,
      createdAt: new Date(),
    } as any);

    const result = await addToWishlist(userA, product1);

    expect(result).toEqual({ added: true, productId: product1 });
    expect(prisma.product.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: product1 },
          { slug: product1 },
        ],
        status: "active",
      },
      select: { id: true },
    });
    expect(prisma.wishlistItem.create).toHaveBeenCalledWith({
      data: {
        userId: userA,
        productId: product1,
      },
    });
  });

  it("throws error when trying to add a non-existent or inactive product", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null);

    await expect(addToWishlist(userA, "invalid_prod")).rejects.toThrow(
      "Product not found or inactive"
    );
  });

  it("removes a product strictly scoped to the authenticated user (User Isolation)", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: product1 } as any);
    vi.mocked(prisma.wishlistItem.deleteMany).mockResolvedValue({ count: 1 });

    const result = await removeFromWishlist(userA, product1);

    expect(result).toEqual({ removed: true, productId: product1 });
    expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: userA,
        productId: product1,
      },
    });
  });

  it("retrieves only the authenticated user's wishlist product IDs", async () => {
    vi.mocked(prisma.wishlistItem.findMany).mockResolvedValue([
      { productId: product1 },
      { productId: product2 },
    ] as any);

    const productIds = await getUserWishlistProductIds(userA);

    expect(productIds).toEqual([product1, product2]);
    expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith({
      where: { userId: userA },
      select: { productId: true },
    });
  });

  it("retrieves full formatted wishlist products for user", async () => {
    const mockDbItem = {
      id: "wish_item_1",
      userId: userA,
      productId: product1,
      createdAt: new Date("2026-08-20T12:00:00Z"),
      product: {
        id: product1,
        slug: "classic-oxford-shirt",
        title: "Classic Oxford Shirt",
        status: "active",
        category: { name: "Shirts" },
        media: [{ url: "https://images.example.com/shirt.jpg", alt: "Oxford Shirt" }],
        variants: [
          {
            priceAmount: 8500,
            priceCurrency: "USD",
            options: { Color: "White", Size: "M" },
            inventoryItem: { onHand: 15 },
          },
          {
            priceAmount: 9500,
            priceCurrency: "USD",
            options: { Color: "Blue", Size: "L" },
            inventoryItem: { onHand: 10 },
          },
        ],
      },
    };

    vi.mocked(prisma.wishlistItem.findMany).mockResolvedValue([mockDbItem] as any);

    const wishlist = await getUserWishlist(userA);

    expect(wishlist).toHaveLength(1);
    expect(wishlist[0]).toMatchObject({
      id: product1,
      slug: "classic-oxford-shirt",
      title: "Classic Oxford Shirt",
      imageUrl: "https://images.example.com/shirt.jpg",
      imageAlt: "Oxford Shirt",
      minPriceAmount: 8500,
      maxPriceAmount: 9500,
      currency: "USD",
      totalOnHand: 25,
      categoryName: "Shirts",
    });
  });

  it("correctly checks if product is wishlisted", async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: product1 } as any);
    vi.mocked(prisma.wishlistItem.count).mockResolvedValue(1);

    const wishlisted = await isProductWishlisted(userA, product1);
    expect(wishlisted).toBe(true);
    expect(prisma.wishlistItem.count).toHaveBeenCalledWith({
      where: {
        userId: userA,
        productId: product1,
      },
    });

    vi.mocked(prisma.product.findFirst).mockResolvedValue({ id: product2 } as any);
    vi.mocked(prisma.wishlistItem.count).mockResolvedValue(0);
    const notWishlisted = await isProductWishlisted(userA, product2);
    expect(notWishlisted).toBe(false);
  });
});
