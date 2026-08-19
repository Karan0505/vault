import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStaffActor } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { fulfilOrderItems, OverFulfillmentError } from "@/lib/fulfillment.server";
import { fulfilOrderSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

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
  const parsed = fulfilOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await fulfilOrderItems({
      orderId: id,
      actor,
      trackingNumber: parsed.data.trackingNumber,
      carrier: parsed.data.carrier,
      items: parsed.data.items,
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
