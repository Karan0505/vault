import "server-only";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { appendAuditLog, type AuditActor } from "@/lib/auth/audit.server";
import { hasPermission } from "@/lib/auth/permissions";
import type { StaffRole } from "@prisma/client";

export interface CreateStaffInput {
  name?: string;
  email: string;
  password?: string;
  role: StaffRole;
}

export interface SanitizedUser {
  id: string;
  name: string | null;
  email: string;
  staffRole: StaffRole | null;
  createdAt: Date;
  orderCount?: number;
  totalSpent?: number;
  addressCount?: number;
}

/**
 * Creates a new staff member with a hashed password and assigned staff role.
 * Never stores or returns plaintext passwords or password hashes.
 */
export async function createStaffUser(
  input: CreateStaffInput,
  actor: AuditActor
): Promise<SanitizedUser> {
  if (!hasPermission(actor.role, "staff:manage")) {
    throw new Error("Forbidden: Only administrators can create staff accounts");
  }

  const { name, email, password, role } = input;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existing) {
    if (existing.staffRole) {
      throw new Error("A staff member with this email already exists");
    }
    // If existing customer account, promote them to staff
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        staffRole: role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        staffRole: true,
        createdAt: true,
      },
    });

    await appendAuditLog(prisma, {
      actor,
      entityType: "User",
      entityId: updated.id,
      action: "update",
      before: { staffRole: null },
      after: { staffRole: role },
    });

    return updated;
  }

  // If password provided, validate and hash
  if (!password) {
    throw new Error("Password is required for new staff account");
  }

  const validation = validatePassword(password);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(", "));
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email: normalizedEmail,
      passwordHash,
      staffRole: role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      createdAt: true,
    },
  });

  await appendAuditLog(prisma, {
    actor,
    entityType: "User",
    entityId: newUser.id,
    action: "create",
    before: null,
    after: { email: normalizedEmail, staffRole: role, name: name ?? null },
  });

  return newUser;
}

/**
 * Updates a user's staff role (Admin-only).
 */
export async function updateStaffRole(params: {
  targetUserId: string;
  newRole: StaffRole | null;
  actor: AuditActor;
}): Promise<SanitizedUser> {
  const { targetUserId, newRole, actor } = params;

  if (!hasPermission(actor.role, "staff:manage")) {
    throw new Error("Forbidden: Only administrators can update staff roles");
  }

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: targetUserId },
  });

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { staffRole: newRole },
    select: {
      id: true,
      name: true,
      email: true,
      staffRole: true,
      createdAt: true,
    },
  });

  await appendAuditLog(prisma, {
    actor,
    entityType: "User",
    entityId: targetUserId,
    action: "update",
    before: { staffRole: user.staffRole },
    after: { staffRole: newRole },
  });

  return updated;
}

/**
 * Returns staff directory and customer directory with order metrics.
 */
export async function getUsersDirectory() {
  const [staffUsers, customerUsers] = await Promise.all([
    prisma.user.findMany({
      where: { staffRole: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        staffRole: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findMany({
      where: { staffRole: null },
      select: {
        id: true,
        name: true,
        email: true,
        staffRole: true,
        createdAt: true,
        orders: {
          select: {
            totalAmount: true,
            status: true,
          },
        },
        addresses: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const customers: SanitizedUser[] = customerUsers.map((cust) => {
    const completedOrders = cust.orders.filter((o) =>
      ["paid", "fulfilled", "delivered"].includes(o.status)
    );
    const totalSpent = completedOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      id: cust.id,
      name: cust.name,
      email: cust.email,
      staffRole: null,
      createdAt: cust.createdAt,
      orderCount: cust.orders.length,
      totalSpent,
      addressCount: cust.addresses.length,
    };
  });

  return {
    staff: staffUsers,
    customers,
  };
}
