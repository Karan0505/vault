import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  getValidatedCustomerAddress,
  AddressNotFoundError,
} from "@/lib/account/addresses.server";
import { prisma } from "@/lib/db/prisma";

vi.mock("@/lib/db/prisma", () => {
  return {
    prisma: {
      address: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findFirstOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      $transaction: vi.fn((callback) =>
        callback({
          address: {
            findMany: vi.fn(),
            findFirst: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            updateMany: vi.fn(),
            delete: vi.fn(),
            count: vi.fn(),
          },
        })
      ),
    },
  };
});

describe("Customer Saved Address Management & Security Rules", () => {
  const customerA = "user_cust_A_111";
  const customerB = "user_cust_B_222";

  const addressA1 = {
    id: "addr_1",
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

  const addressA2 = {
    id: "addr_2",
    userId: customerA,
    label: "Work",
    fullName: "Max Parmar",
    address: "Tech Park, Floor 3",
    apartment: null,
    city: "Ahmedabad",
    state: "Gujarat",
    zip: "380015",
    country: "India",
    phone: null,
    isDefault: false,
    createdAt: new Date("2026-08-02"),
    updatedAt: new Date("2026-08-02"),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Customer Data Isolation & Retrieval", () => {
    it("retrieves only the authenticated customer's own addresses", async () => {
      const mockFindMany = vi.fn().mockResolvedValue([addressA1, addressA2]);
      (prisma.address.findMany as any) = mockFindMany;

      const result = await getCustomerAddresses(customerA);

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: customerA },
        orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
      });
      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe(customerA);
    });
  });

  describe("2. Creating Saved Addresses & Automatic Default Behavior", () => {
    it("automatically sets first address as default when customer has 0 addresses", async () => {
      const mockTx = {
        address: {
          count: vi.fn().mockResolvedValue(0),
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "new_1", ...data })),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      const input = {
        label: "Home",
        fullName: "Max Parmar",
        address: "123 Main Street",
        city: "Ahmedabad",
        state: "Gujarat",
        zip: "380001",
        country: "India",
        isDefault: false, // User didn't check default, but has 0 addresses
      };

      const created = await createCustomerAddress(customerA, input);

      expect(mockTx.address.count).toHaveBeenCalledWith({ where: { userId: customerA } });
      expect(mockTx.address.updateMany).toHaveBeenCalledWith({
        where: { userId: customerA, isDefault: true },
        data: { isDefault: false },
      });
      expect(created.isDefault).toBe(true);
    });

    it("does not overwrite default when creating a non-default address if customer already has addresses", async () => {
      const mockTx = {
        address: {
          count: vi.fn().mockResolvedValue(1),
          updateMany: vi.fn(),
          create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: "new_2", ...data })),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      const input = {
        label: "Work",
        fullName: "Max Parmar",
        address: "456 Work Avenue",
        city: "Ahmedabad",
        state: "Gujarat",
        zip: "380015",
        country: "India",
        isDefault: false,
      };

      const created = await createCustomerAddress(customerA, input);

      expect(mockTx.address.updateMany).not.toHaveBeenCalled();
      expect(created.isDefault).toBe(false);
    });
  });

  describe("3. Customer Isolation & Security Checks on Mutations", () => {
    it("prevents Customer B from updating Customer A's address (Throws AddressNotFoundError)", async () => {
      const mockTx = {
        address: {
          findFirst: vi.fn().mockResolvedValue(null), // Querying where id = addr_1 AND userId = customerB returns null
          update: vi.fn(),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      await expect(
        updateCustomerAddress(customerB, "addr_1", { fullName: "Hacker" })
      ).rejects.toThrow(AddressNotFoundError);

      expect(mockTx.address.findFirst).toHaveBeenCalledWith({
        where: { id: "addr_1", userId: customerB },
      });
      expect(mockTx.address.update).not.toHaveBeenCalled();
    });

    it("prevents Customer B from deleting Customer A's address", async () => {
      const mockTx = {
        address: {
          findFirst: vi.fn().mockResolvedValue(null),
          delete: vi.fn(),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      await expect(deleteCustomerAddress(customerB, "addr_1")).rejects.toThrow(
        AddressNotFoundError
      );
      expect(mockTx.address.delete).not.toHaveBeenCalled();
    });

    it("prevents Customer B from setting Customer A's address as default", async () => {
      const mockTx = {
        address: {
          findFirst: vi.fn().mockResolvedValue(null),
          updateMany: vi.fn(),
          update: vi.fn(),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      await expect(setDefaultCustomerAddress(customerB, "addr_1")).rejects.toThrow(
        AddressNotFoundError
      );
    });
  });

  describe("4. Atomic Single Default Invariant", () => {
    it("atomically unsets other defaults when setting a new default address", async () => {
      const mockTx = {
        address: {
          findFirst: vi.fn().mockResolvedValue(addressA2),
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          update: vi.fn().mockResolvedValue({ ...addressA2, isDefault: true }),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      const updated = await setDefaultCustomerAddress(customerA, "addr_2");

      expect(mockTx.address.updateMany).toHaveBeenCalledWith({
        where: { userId: customerA, isDefault: true },
        data: { isDefault: false },
      });
      expect(mockTx.address.update).toHaveBeenCalledWith({
        where: { id: "addr_2" },
        data: { isDefault: true },
      });
      expect(updated.isDefault).toBe(true);
    });

    it("promotes the next available address to default when the current default address is deleted", async () => {
      const mockTx = {
        address: {
          findFirst: vi
            .fn()
            .mockResolvedValueOnce(addressA1) // address to delete (isDefault: true)
            .mockResolvedValueOnce(addressA2), // next address candidate
          delete: vi.fn().mockResolvedValue(addressA1),
          update: vi.fn().mockResolvedValue({ ...addressA2, isDefault: true }),
        },
      };
      (prisma.$transaction as any) = vi.fn((cb) => cb(mockTx));

      await deleteCustomerAddress(customerA, "addr_1");

      expect(mockTx.address.delete).toHaveBeenCalledWith({ where: { id: "addr_1" } });
      expect(mockTx.address.update).toHaveBeenCalledWith({
        where: { id: addressA2.id },
        data: { isDefault: true },
      });
    });
  });

  describe("5. Server-Side Address Validation for Order Creation", () => {
    it("returns clean authoritative snapshot when authenticated user owns the address", async () => {
      (prisma.address.findFirst as any) = vi.fn().mockResolvedValue(addressA1);

      const snapshot = await getValidatedCustomerAddress(customerA, "addr_1");

      expect(prisma.address.findFirst).toHaveBeenCalledWith({
        where: { id: "addr_1", userId: customerA },
      });
      expect(snapshot).toEqual({
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

    it("throws AddressNotFoundError if customer tries to validate another user's address for checkout", async () => {
      (prisma.address.findFirst as any) = vi.fn().mockResolvedValue(null);

      await expect(getValidatedCustomerAddress(customerB, "addr_1")).rejects.toThrow(
        AddressNotFoundError
      );
    });
  });
});
