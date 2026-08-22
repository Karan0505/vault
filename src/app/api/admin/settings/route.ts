import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getStoreSettings, updateStoreSettings } from "@/lib/settings/settings.server";
import { getStripeHealthStatus } from "@/lib/integrations/stripe-status.server";
import { logger } from "@/lib/shared/logger";

export async function GET() {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const [settings, stripeStatus] = await Promise.all([
      getStoreSettings(),
      getStripeHealthStatus(),
    ]);

    return NextResponse.json({
      settings,
      stripeStatus,
    });
  } catch (error) {
    logger.error("settings.fetch_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "settings:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const updated = await updateStoreSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (error) {
    logger.error("settings.update_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update settings" },
      { status: 400 }
    );
  }
}
