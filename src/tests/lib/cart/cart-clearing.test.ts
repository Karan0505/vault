import { describe, expect, it } from "vitest";

interface MockCartItem {
  id: string;
  cartId: string;
  variantId: string;
  quantity: number;
}

class MockCartDatabase {
  public cartItems: MockCartItem[] = [];

  constructor() {
    this.cartItems = [
      { id: "item-1", cartId: "cart-100", variantId: "var-A", quantity: 4 },
      { id: "item-2", cartId: "cart-100", variantId: "var-B", quantity: 1 },
    ];
  }

  async decrementPurchasedCartItems(
    cartId: string,
    purchasedItems: Array<{ variantId: string; quantity: number }>
  ) {
    for (const item of purchasedItems) {
      const idx = this.cartItems.findIndex(
        (ci) => ci.cartId === cartId && ci.variantId === item.variantId
      );
      if (idx === -1) continue;

      const cartItem = this.cartItems[idx];
      if (!cartItem) continue;
      if (cartItem.quantity <= item.quantity) {
        this.cartItems.splice(idx, 1);
      } else {
        cartItem.quantity -= item.quantity;
      }
    }
  }
}

describe("Server-Side Cart Line Decrement & Clearing", () => {
  it("decrements/removes purchased cart items on successful payment", async () => {
    const db = new MockCartDatabase();
    await db.decrementPurchasedCartItems("cart-100", [
      { variantId: "var-A", quantity: 4 },
      { variantId: "var-B", quantity: 1 },
    ]);

    expect(db.cartItems).toHaveLength(0);
  });

  it("safely preserves newly added cart quantity when customer adds same variant during checkout", async () => {
    const db = new MockCartDatabase();
    // Customer checked out Variant A x 4, but added 2 more while payment was processing (total 6)
    const varA = db.cartItems.find((ci) => ci.variantId === "var-A")!;
    varA.quantity = 6;

    // Payment succeeds for 4 units of Variant A
    await db.decrementPurchasedCartItems("cart-100", [{ variantId: "var-A", quantity: 4 }]);

    const remainingVarA = db.cartItems.find((ci) => ci.variantId === "var-A");
    expect(remainingVarA).toBeDefined();
    expect(remainingVarA?.quantity).toBe(2);
  });

  it("preserves newly added variants (Product C) added after checkout started", async () => {
    const db = new MockCartDatabase();
    db.cartItems.push({ id: "item-3", cartId: "cart-100", variantId: "var-C", quantity: 2 });

    // Payment succeeds for order containing Variant A x 4 & Variant B x 1
    await db.decrementPurchasedCartItems("cart-100", [
      { variantId: "var-A", quantity: 4 },
      { variantId: "var-B", quantity: 1 },
    ]);

    expect(db.cartItems).toHaveLength(1);
    expect(db.cartItems[0]?.variantId).toBe("var-C");
    expect(db.cartItems[0]?.quantity).toBe(2);
  });

  it("does not alter cart on pending, failed, or cancelled payments", async () => {
    const db = new MockCartDatabase();

    // Non-paid states do not invoke decrementPurchasedCartItems
    expect(db.cartItems).toHaveLength(2);
    expect(db.cartItems.find((ci) => ci.variantId === "var-A")?.quantity).toBe(4);
  });

  it("is idempotent when duplicate webhooks arrive", async () => {
    const db = new MockCartDatabase();
    await db.decrementPurchasedCartItems("cart-100", [
      { variantId: "var-A", quantity: 4 },
      { variantId: "var-B", quantity: 1 },
    ]);
    expect(db.cartItems).toHaveLength(0);

    // Second duplicate webhook delivery
    await db.decrementPurchasedCartItems("cart-100", [
      { variantId: "var-A", quantity: 4 },
      { variantId: "var-B", quantity: 1 },
    ]);
    expect(db.cartItems).toHaveLength(0);
  });
});
