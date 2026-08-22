import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { toggleDiscountActive, deleteOrArchiveDiscount } from "@/lib/checkout/discounts-admin.server";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "discounts:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }

    const updated = await toggleDiscountActive(id, body.isActive, actor);
    return NextResponse.json({ success: true, discount: updated });
  } catch (error) {
    logger.error("discounts.patch_failed", { discountId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update discount" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "discounts:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const result = await deleteOrArchiveDiscount(id, actor);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    logger.error("discounts.delete_failed", { discountId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete discount" },
      { status: 400 }
    );
  }
}
