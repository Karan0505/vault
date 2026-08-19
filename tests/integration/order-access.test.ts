import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { verifyOrderAccess } from "@/lib/auth";
import { randomBytes } from "node:crypto";

const hasDb = Boolean(process.env.DATABASE_URL);
if (!hasDb) {
  // eslint-disable-next-line no-console
  console.warn("[order-access.test] DATABASE_URL not set — skipping.");
}

describe.skipIf(!hasDb)("guest token order isolation and access control", () => {
  let customerAId: string;
  let customerBId: string;
  let staffAdminId: string;
  let staffSupportId: string;
  let staffFulfilmentId: string;

  let guestOrderId: string;
  let guestToken: string = "";

  let customerAOrderId: string;
  let customerBOrderId: string;

  beforeAll(async () => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    // Create test users
    const customerA = await prisma.user.create({
      data: { email: `cust-a-${suffix}@example.com` },
    });
    customerAId = customerA.id;

    const customerB = await prisma.user.create({
      data: { email: `cust-b-${suffix}@example.com` },
    });
    customerBId = customerB.id;

    const adminUser = await prisma.user.create({
      data: { email: `admin-${suffix}@example.com`, staffRole: "admin" },
    });
    staffAdminId = adminUser.id;

    const supportUser = await prisma.user.create({
      data: { email: `support-${suffix}@example.com`, staffRole: "support" },
    });
    staffSupportId = supportUser.id;

    const fulfilmentUser = await prisma.user.create({
      data: { email: `fulfilment-${suffix}@example.com`, staffRole: "fulfilment" },
    });
    staffFulfilmentId = fulfilmentUser.id;

    // Create guest order
    const guestOrder = await prisma.order.create({
      data: {
        number: `TEST-GUEST-${suffix}`,
        email: `guest-${suffix}@example.com`,
        currency: "USD",
        subtotalAmount: 2000,
        totalAmount: 2599,
        shippingAmount: 599,
        reservationExpiresAt: new Date(Date.now() + 600000),
      },
    });
    guestOrderId = guestOrder.id;

    // Create customer A order
    const custAOrder = await prisma.order.create({
      data: {
        number: `TEST-CUSTA-${suffix}`,
        userId: customerAId,
        email: customerA.email,
        currency: "USD",
        subtotalAmount: 3000,
        totalAmount: 3599,
        shippingAmount: 599,
        reservationExpiresAt: new Date(Date.now() + 600000),
      },
    });
    customerAOrderId = custAOrder.id;

    // Create customer B order
    const custBOrder = await prisma.order.create({
      data: {
        number: `TEST-CUSTB-${suffix}`,
        userId: customerBId,
        email: customerB.email,
        currency: "USD",
        subtotalAmount: 4000,
        totalAmount: 4599,
        shippingAmount: 599,
        reservationExpiresAt: new Date(Date.now() + 600000),
      },
    });
    customerBOrderId = custBOrder.id;
  });

  afterAll(async () => {
    await prisma.order.deleteMany({
      where: { id: { in: [guestOrderId, customerAOrderId, customerBOrderId] } },
    }).catch(() => undefined);

    await prisma.user.deleteMany({
      where: { id: { in: [customerAId, customerBId, staffAdminId, staffSupportId, staffFulfilmentId] } },
    }).catch(() => undefined);
  });

  it("rejects guest order access when accessed without a token", async () => {
    const order = await prisma.order.findUnique({ where: { id: guestOrderId } });
    expect(order).not.toBeNull();

    const canAccess = verifyOrderAccess(order!, null, null);
    expect(canAccess).toBe(false);
  });

  it("rejects guest order access when accessed with an invalid/mismatched token", async () => {
    const order = await prisma.order.findUnique({ where: { id: guestOrderId } });
    expect(order).not.toBeNull();

    const badToken = randomBytes(32).toString("hex");
    const canAccess = verifyOrderAccess(order!, null, badToken);
    expect(canAccess).toBe(false);
  });

  it("grants guest order access when provided the exact matching guestToken", async () => {
    const order = await prisma.order.findUnique({ where: { id: guestOrderId } });
    expect(order).not.toBeNull();

    const canAccess = verifyOrderAccess(order!, null, guestToken);
    expect(canAccess).toBe(true);
  });

  it("rejects a customer trying to read another customer's order without a session match", async () => {
    const orderB = await prisma.order.findUnique({ where: { id: customerBOrderId } });
    expect(orderB).not.toBeNull();

    // Customer A attempting to read Customer B's order
    const sessionCustomerA = {
      user: { id: customerAId, email: "cust-a@example.com", staffRole: null },
    };

    const canAccess = verifyOrderAccess(orderB!, sessionCustomerA, null);
    expect(canAccess).toBe(false);
  });

  it("grants a registered customer access to their own order", async () => {
    const orderA = await prisma.order.findUnique({ where: { id: customerAOrderId } });
    expect(orderA).not.toBeNull();

    const sessionCustomerA = {
      user: { id: customerAId, email: "cust-a@example.com", staffRole: null },
    };

    const canAccess = verifyOrderAccess(orderA!, sessionCustomerA, null);
    expect(canAccess).toBe(true);
  });

  it("grants staff members (admin, support, fulfilment) access to any order", async () => {
    const guestOrder = (await prisma.order.findUnique({ where: { id: guestOrderId } }))!;
    const custBOrder = (await prisma.order.findUnique({ where: { id: customerBOrderId } }))!;

    const sessionAdmin = { user: { id: staffAdminId, email: "admin@example.com", staffRole: "admin" as const } };
    const sessionSupport = { user: { id: staffSupportId, email: "support@example.com", staffRole: "support" as const } };
    const sessionFulfilment = { user: { id: staffFulfilmentId, email: "fulfilment@example.com", staffRole: "fulfilment" as const } };

    // Admin can read guest and customer order
    expect(verifyOrderAccess(guestOrder, sessionAdmin, null)).toBe(true);
    expect(verifyOrderAccess(custBOrder, sessionAdmin, null)).toBe(true);

    // Support can read guest and customer order
    expect(verifyOrderAccess(guestOrder, sessionSupport, null)).toBe(true);
    expect(verifyOrderAccess(custBOrder, sessionSupport, null)).toBe(true);

    // Fulfilment can read guest and customer order
    expect(verifyOrderAccess(guestOrder, sessionFulfilment, null)).toBe(true);
    expect(verifyOrderAccess(custBOrder, sessionFulfilment, null)).toBe(true);
  });
});
