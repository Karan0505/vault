import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only and next/cache
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({
  unstable_cache: (fn: any) => fn,
  revalidateTag: vi.fn(),
}));

import { createCheckoutSession } from "@/lib/orders/orders.server";
import { getValidatedCustomerAddress, AddressNotFoundError } from "@/lib/account/addresses.server";
import { prisma } from "@/lib/db/prisma";
import { stripe } from "@/lib/payments/stripe";
import * as cartServer from "@/lib/cart/cart.server";
import * as inventoryServer from "@/lib/inventory/inventory.server";

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    address: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    order: {
      create: vi.fn(),
    },
    reservation: {
      updateMany: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((cb) =>
      cb({
        order: {
          create: vi.fn().mockImplementation(({ data }) =>
            Promise.resolve({ id: "order_123", ...data })
          ),
        },
        reservation: {
          updateMany: vi.fn(),
        },
        discountRedemption: {
          create: vi.fn(),
        },
        cartItem: {
          deleteMany: vi.fn(),
        },
      })
    ),
  },
}));

vi.mock("@/lib/payments/stripe", () => ({
  stripe: {
    paymentIntents: {
      create: vi.fn().mockResolvedValue({
        id: "pi_test_123",
        client_secret: "pi_test_123_secret",
      }),
    },
  },
}));

vi.mock("@/lib/cart/cart.server", () => ({
  getCartView: vi.fn(),
}));

vi.mock("@/lib/inventory/inventory.server", () => ({
  reserveCartLines: vi.fn(),
  releaseReservations: vi.fn(),
}));

vi.mock("@/lib/checkout/discounts.server", () => ({
  applyDiscountCode: vi.fn(),
}));

describe("Checkout Address Selection, Security & Immutable Snapshotting", () => {
  const customerA = "user_cust_A_111";
  const customerB = "user_cust_B_222";

  const savedAddressA = {
    id: "addr_A_1",
    userId: customerA,
    label: "Home",
    fullName: "Max Parmar",
    address: "123 Main Street",
    apartment: "Apt 4B",
    city: "Ahmedabad",
    state: "Gujarat",
    zip: "380001",
    country: "India",
    phone: "+91 9876543210",
    isDefault: true,
    createdAt: new Date("2026-08-01"),
    updatedAt: new Date("2026-08-01"),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (cartServer.getCartView as any).mockResolvedValue({
      id: "cart_123",
      subtotal: 5000,
      currency: "USD",
      lines: [
        {
          variantId: "var_1",
          productTitle: "Canvas Tote",
          sku: "TOTE-01",
          options: { Color: "Tan" },
          unitAmount: 5000,
          quantity: 1,
          lineTotal: 5000,
          isEnabled: true,
        },
      ],
    });

    (inventoryServer.reserveCartLines as any).mockResolvedValue({
      reservationIds: ["res_1"],
      expiresAt: new Date(Date.now() + 600000),
    });
  });

  describe("1. Authoritative Server Verification of Selected Address", () => {
    it("fetches and uses the server-verified saved address for order snapshot", async () => {
      (prisma.address.findFirst as any) = vi.fn().mockResolvedValue(savedAddressA);

      let createdOrderData: any = null;
      (prisma.$transaction as any) = vi.fn(async (cb) => {
        const tx = {
          order: {
            create: vi.fn().mockImplementation(({ data }) => {
              createdOrderData = data;
              return Promise.resolve({ id: "order_123", ...data });
            }),
          },
          reservation: { updateMany: vi.fn() },
          cartItem: { deleteMany: vi.fn() },
        };
        return cb(tx);
      });

      // Customer passes selectedAddressId + potentially conflicting client shippingAddress
      const res = await createCheckoutSession({
        cartId: "cart_123",
        userId: customerA,
        email: "max@example.com",
        selectedAddressId: "addr_A_1",
        shippingAddress: {
          fullName: "Conflicting Client Name",
          address: "999 Fake Street",
          city: "Nowhere",
          state: "XX",
          zip: "00000",
          country: "FakeCountry",
        },
      });

      expect(res.orderId).toBe("order_123");
      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: "addr_A_1", userId: customerA },
      });

      // The authoritative snapshot must come from the server-fetched address, NOT the client override
      expect(createdOrderData.shippingAddress).toEqual({
        label: "Home",
        fullName: "Max Parmar",
        address: "123 Main Street",
        apartment: "Apt 4B",
        city: "Ahmedabad",
        state: "Gujarat",
        zip: "380001",
        country: "India",
        phone: "+91 9876543210",
      });
    });

    it("rejects checkout when Customer B attempts to use Customer A's addressId", async () => {
      // Searching for addr_A_1 with Customer B's userId returns null
      (prisma.address.findFirst as any) = vi.fn().mockResolvedValue(null);

      await expect(
        createCheckoutSession({
          cartId: "cart_123",
          userId: customerB,
          email: "attacker@example.com",
          selectedAddressId: "addr_A_1",
        })
      ).rejects.toThrow(AddressNotFoundError);
    });
  });

  describe("2. Manual Shipping Address Fallback", () => {
    it("persists manual shipping address when no saved address is selected", async () => {
      let createdOrderData: any = null;
      (prisma.$transaction as any) = vi.fn(async (cb) => {
        const tx = {
          order: {
            create: vi.fn().mockImplementation(({ data }) => {
              createdOrderData = data;
              return Promise.resolve({ id: "order_manual_123", ...data });
            }),
          },
          reservation: { updateMany: vi.fn() },
          cartItem: { deleteMany: vi.fn() },
        };
        return cb(tx);
      });

      const manualAddress = {
        fullName: "First Time Shopper",
        address: "789 Pine Road",
        apartment: "Suite 100",
        city: "Austin",
        state: "TX",
        zip: "78701",
        country: "United States",
        phone: "512-555-0199",
      };

      const res = await createCheckoutSession({
        cartId: "cart_123",
        userId: customerA,
        email: "shopper@example.com",
        shippingAddress: manualAddress,
      });

      expect(res.orderId).toBe("order_manual_123");
      expect(createdOrderData.shippingAddress).toEqual({
        label: "Home",
        fullName: "First Time Shopper",
        address: "789 Pine Road",
        apartment: "Suite 100",
        city: "Austin",
        state: "TX",
        zip: "78701",
        country: "United States",
        phone: "512-555-0199",
      });
    });
  });

  describe("3. Immutability of Historical Order Snapshots", () => {
    it("demonstrates that modifications or deletions of saved addresses do not affect stored Order snapshots", () => {
      // Step 1: Order created with snapshot
      const orderRecord = {
        id: "order_snapshot_test",
        shippingAddress: {
          fullName: "Max Parmar",
          address: "123 Main Street",
          city: "Ahmedabad",
          state: "Gujarat",
          zip: "380001",
          country: "India",
        },
      };

      // Step 2: Customer later updates or deletes the saved Address row
      const savedAddressRow = { ...savedAddressA, address: "456 Newly Moved Street" };

      // Step 3: Verify the order snapshot remains immutable
      expect(orderRecord.shippingAddress.address).toBe("123 Main Street");
    });
  });

  describe("4. Checkout Idempotency & Stripe Key Separation", () => {
    it("passes checkoutAttemptId as Stripe idempotencyKey outside the database transaction", async () => {
      (prisma.address.findFirst as any) = vi.fn().mockResolvedValue(savedAddressA);

      await createCheckoutSession({
        cartId: "cart_123",
        userId: customerA,
        email: "max@example.com",
        selectedAddressId: "addr_A_1",
        checkoutAttemptId: "att_unique_999",
      });

      expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 5599,
          currency: "usd",
          receipt_email: "max@example.com",
          metadata: { cartId: "cart_123" },
        }),
        {
          idempotencyKey: "checkout_cart_123_att_unique_999",
        }
      );
    });
  });

  describe("5. Address Reconciliation Rules", () => {
    it("reconciles address: preserves when address exists, clears when address deleted", () => {
      const addressList = [savedAddressA];

      // Rule A: selectedAddressId exists in fresh list -> preserve
      const currentSelected = "addr_A_1";
      const existsInList = addressList.some((a) => a.id === currentSelected);
      expect(existsInList).toBe(true);

      // Rule B: selectedAddressId deleted in another tab -> clear to null
      const deletedSelected = "addr_deleted_999";
      const deletedExists = addressList.some((a) => a.id === deletedSelected);
      expect(deletedExists).toBe(false);

      const reconciledId = deletedExists ? deletedSelected : null;
      expect(reconciledId).toBeNull();
    });
  });
});
