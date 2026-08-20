import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getAdminDiscounts, createDiscount } from "@/lib/checkout/discounts-admin.server";
import { logger } from "@/lib/shared/logger";

export async function GET() {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "discounts:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const discounts = await getAdminDiscounts();
    return NextResponse.json({ discounts });
  } catch (error) {
    logger.error("discounts.fetch_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch discounts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "discounts:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const created = await createDiscount(body, actor);
    return NextResponse.json({ success: true, discount: created }, { status: 201 });
  } catch (error) {
    logger.error("discounts.create_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create discount" },
      { status: 400 }
    );
  }
}
