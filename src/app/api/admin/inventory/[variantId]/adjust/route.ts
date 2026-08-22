import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adjustStockStandalone, NegativeStockError, getAdjustmentHistory } from "@/lib/inventory/inventory-admin.server";
import { adjustStockSchema } from "@/lib/validation/validation";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ variantId: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "inventory:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { variantId } = await params;
  const history = await getAdjustmentHistory(variantId);
  return NextResponse.json({ history });
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "inventory:adjust")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { variantId } = await params;
  const parsed = adjustStockSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result = await adjustStockStandalone({
      variantId,
      delta: parsed.data.delta,
      reason: parsed.data.reason,
      note: parsed.data.note,
      actor,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof NegativeStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error("inventory.adjust_failed", { variantId, error: error instanceof Error ? error.message : String(error) });
    Sentry.captureException(error, { extra: { variantId, action: "adjust" } });
    throw error;
  }
}
