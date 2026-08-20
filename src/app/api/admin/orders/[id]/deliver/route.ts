import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { markOrderDelivered } from "@/lib/fulfilment/fulfillment.server";
import { IllegalOrderTransitionError } from "@/lib/orders/orders";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "orders:fulfil")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const result = await markOrderDelivered({ orderId: id, actor });
    return NextResponse.json(result);
  } catch (error) {
    if (
      (error && typeof error === "object" && "code" in error && error.code === "P2025") ||
      (error instanceof Error && error.name === "NotFoundError")
    ) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (error instanceof IllegalOrderTransitionError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    logger.error("orders.deliver_failed", { orderId: id, error: error instanceof Error ? error.message : String(error) });
    Sentry.captureException(error, { extra: { orderId: id, action: "deliver" } });
    throw error;
  }
}
