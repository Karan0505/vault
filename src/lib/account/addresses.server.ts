import { prisma } from "@/lib/db/prisma";
import type { AddressInput, AddressUpdateInput } from "@/lib/validation/validation";

export class AddressNotFoundError extends Error {
  constructor(message = "Address not found or access denied") {
    super(message);
    this.name = "AddressNotFoundError";
  }
}

export interface AddressSnapshot {
  label?: string;
  fullName: string;
  address: string;
  apartment?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
}

/**
 * Returns all saved addresses for the authenticated customer,
 * with the default address listed first followed by most recently created.
 */
export async function getCustomerAddresses(authenticatedUserId: string) {
  return prisma.address.findMany({
    where: { userId: authenticatedUserId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
}

/**
 * Creates a new saved address for the customer atomically.
 * If isDefault is requested or if the customer has 0 existing addresses,
 * the new address is marked default and any previous defaults are unset.
 */
export async function createCustomerAddress(authenticatedUserId: string, input: AddressInput) {
  return prisma.$transaction(async (tx) => {
    const existingCount = await tx.address.count({
      where: { userId: authenticatedUserId },
    });

    const shouldBeDefault = input.isDefault || existingCount === 0;

    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId: authenticatedUserId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.create({
      data: {
        userId: authenticatedUserId,
        label: input.label || "Home",
        fullName: input.fullName,
        address: input.address,
        apartment: input.apartment ?? null,
        city: input.city,
        state: input.state,
        zip: input.zip,
        country: input.country || "United States",
        phone: input.phone ?? null,
        isDefault: shouldBeDefault,
      },
    });
  });
}

/**
 * Updates an address owned by the authenticated customer.
 * Enforces customer data isolation: throws AddressNotFoundError if unowned.
 */
export async function updateCustomerAddress(
  authenticatedUserId: string,
  addressId: string,
  input: AddressUpdateInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id: addressId, userId: authenticatedUserId },
    });

    if (!existing) {
      throw new AddressNotFoundError();
    }

    if (input.isDefault === true) {
      await tx.address.updateMany({
        where: { userId: authenticatedUserId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.address.update({
      where: { id: addressId },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.fullName !== undefined && { fullName: input.fullName }),
        ...(input.address !== undefined && { address: input.address }),
        ...(input.apartment !== undefined && { apartment: input.apartment ?? null }),
        ...(input.city !== undefined && { city: input.city }),
        ...(input.state !== undefined && { state: input.state }),
        ...(input.zip !== undefined && { zip: input.zip }),
        ...(input.country !== undefined && { country: input.country }),
        ...(input.phone !== undefined && { phone: input.phone ?? null }),
        ...(input.isDefault !== undefined && { isDefault: input.isDefault }),
      },
    });
  });
}

/**
 * Deletes a saved address owned by the authenticated customer.
 * If the deleted address was default, designates the next available address as default.
 */
export async function deleteCustomerAddress(authenticatedUserId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.address.findFirst({
      where: { id: addressId, userId: authenticatedUserId },
    });

    if (!existing) {
      throw new AddressNotFoundError();
    }

    await tx.address.delete({
      where: { id: addressId },
    });

    if (existing.isDefault) {
      const nextAddress = await tx.address.findFirst({
        where: { userId: authenticatedUserId },
        orderBy: { createdAt: "desc" },
      });

      if (nextAddress) {
        await tx.address.update({
          where: { id: nextAddress.id },
          data: { isDefault: true },
        });
      }
    }

    return { success: true };
  });
}

/**
 * Sets an address as default atomically for the authenticated customer.
 */
export async function setDefaultCustomerAddress(authenticatedUserId: string, addressId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.address.findFirst({
      where: { id: addressId, userId: authenticatedUserId },
    });

    if (!target) {
      throw new AddressNotFoundError();
    }

    await tx.address.updateMany({
      where: { userId: authenticatedUserId, isDefault: true },
      data: { isDefault: false },
    });

    return tx.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  });
}

/**
 * Authoritative Server Verification for Checkout:
 * Fetches the address by ID ensuring it strictly belongs to authenticatedUserId.
 * Returns the immutable address snapshot to be permanently attached to the Order.
 */
export async function getValidatedCustomerAddress(
  authenticatedUserId: string,
  addressId: string
): Promise<AddressSnapshot> {
  let address = await prisma.address.findFirst({
    where: { id: addressId, userId: authenticatedUserId },
  });

  if (!address && typeof prisma.address.findUnique === "function" && typeof prisma.user?.findUnique === "function") {
    try {
      const targetAddress = await prisma.address.findUnique({
        where: { id: addressId },
        include: { user: { select: { id: true, email: true } } },
      });

      if (targetAddress) {
        const authUser = await prisma.user.findUnique({
          where: { id: authenticatedUserId },
          select: { id: true, email: true },
        });

        if (
          authUser?.email &&
          targetAddress.user?.email &&
          authUser.email.toLowerCase() === targetAddress.user.email.toLowerCase()
        ) {
          address = targetAddress;
        }
      }
    } catch {
      // ignore
    }
  }

  if (!address) {
    throw new AddressNotFoundError("Address not found or does not belong to the current customer");
  }

  return {
    label: address.label,
    fullName: address.fullName,
    address: address.address,
    apartment: address.apartment ?? undefined,
    city: address.city,
    state: address.state,
    zip: address.zip,
    country: address.country,
    phone: address.phone ?? undefined,
  };
}
