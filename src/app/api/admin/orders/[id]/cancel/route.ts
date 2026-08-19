import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStaffActor } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { cancelOrder } from "@/lib/fulfillment.server";
import { cancelOrderSchema } from "@/lib/validation";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "orders:cancel")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = cancelOrderSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    await cancelOrder({ orderId: id, actor, reason: parsed.data.reason });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message.includes("only a pending")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error("orders.cancel_failed", { orderId: id, error: error instanceof Error ? error.message : String(error) });
    Sentry.captureException(error, { extra: { orderId: id, action: "cancel" } });
    throw error;
  }
}
