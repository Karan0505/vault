import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUserId, getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { syncOrderPaymentStatusWithStripe } from "@/lib/orders/orders.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      userId: true,
      currency: true,
      totalAmount: true,
      fulfillments: {
        select: {
          id: true,
          trackingNumber: true,
          carrier: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Check authorization
  const currentUserId = await getCurrentUserId();
  const staffActor = await getStaffActor();

  const isOwner = Boolean(order.userId && currentUserId && order.userId === currentUserId);
  const isAuthorizedStaff = Boolean(staffActor && hasPermission(staffActor.role, "orders:view"));

  // If order was created by an authenticated user and requester is not the owner or staff, reject
  if (order.userId && !isOwner && !isAuthorizedStaff) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Reconcile with Stripe if order is still pending
  let status = order.status;
  if (status === "pending") {
    status = await syncOrderPaymentStatusWithStripe(order.id);
  }

  const latestFulfillment = order.fulfillments[0] ?? null;

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.number,
    status,
    isPaid: status !== "pending",
    trackingNumber: latestFulfillment?.trackingNumber ?? null,
    carrier: latestFulfillment?.carrier ?? null,
    fulfilledAt: latestFulfillment?.createdAt ?? null,
  });
}
