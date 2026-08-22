import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { updateStaffRole } from "@/lib/auth/users.server";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "staff:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await request.json();
    const updated = await updateStaffRole({
      targetUserId: id,
      newRole: body.role ?? null,
      actor,
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    logger.error("users.role_patch_failed", { targetUserId: id, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update staff role" },
      { status: 400 }
    );
  }
}
