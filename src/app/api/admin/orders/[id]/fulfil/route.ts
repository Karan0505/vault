import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { fulfilOrderItems, OverFulfillmentError } from "@/lib/fulfilment/fulfillment.server";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "orders:fulfil")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  // Fetch the exact order to validate existence and resolve default items/tracking if needed
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, fulfillments: { orderBy: { createdAt: "desc" } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Determine tracking number: use provided, reuse existing if available, or generate standard VAULT-TRK-<suffix>
  const suffix = order.number.replace(/^VAULT-/, "");
  const existingTracking = order.fulfillments[0]?.trackingNumber;
  const trackingNumber =
    typeof body.trackingNumber === "string" && body.trackingNumber.trim().length > 0
      ? body.trackingNumber.trim()
      : existingTracking || `VAULT-TRK-${suffix}`;

  const carrier = typeof body.carrier === "string" && body.carrier.trim().length > 0
    ? body.carrier.trim()
    : "VAULT Express";

  // Determine items to fulfil: use provided or default to all remaining unfulfilled items for this exact order
  let itemsToFulfil: { orderItemId: string; quantity: number }[] = [];

  if (Array.isArray(body.items) && body.items.length > 0) {
    itemsToFulfil = body.items.map((i: any) => ({
      orderItemId: String(i.orderItemId),
      quantity: Number(i.quantity),
    }));
  } else {
    itemsToFulfil = order.items
      .map((item) => ({
        orderItemId: item.id,
        quantity: item.quantity - item.fulfilledQuantity,
      }))
      .filter((i) => i.quantity > 0);
  }

  // If order is already fully fulfilled and has fulfillments, fulfilOrderItems will handle idempotently
  if (itemsToFulfil.length === 0 && order.status === "fulfilled" && order.fulfillments.length > 0) {
    return NextResponse.json({
      fulfillmentId: order.fulfillments[0]!.id,
      orderStatus: "fulfilled",
      trackingNumber: order.fulfillments[0]!.trackingNumber,
    });
  }

  if (itemsToFulfil.length === 0) {
    return NextResponse.json({ error: "No unfulfilled items remain for this order." }, { status: 400 });
  }

  try {
    const result = await fulfilOrderItems({
      orderId: id,
      actor,
      trackingNumber,
      carrier,
      items: itemsToFulfil,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OverFulfillmentError) {
      return NextResponse.json(
        { error: error.message, orderItemId: error.orderItemId, remaining: error.remaining },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message.includes("only paid orders can ship")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error("orders.fulfil_failed", { orderId: id, error: error instanceof Error ? error.message : String(error) });
    Sentry.captureException(error, { extra: { orderId: id, action: "fulfil" } });
    throw error;
  }
}
