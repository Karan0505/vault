import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getUsersDirectory, createStaffUser } from "@/lib/auth/users.server";
import { logger } from "@/lib/shared/logger";

export async function GET() {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "staff:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const directory = await getUsersDirectory();
    return NextResponse.json(directory);
  } catch (error) {
    logger.error("users.fetch_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Failed to fetch user directory" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "staff:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const newUser = await createStaffUser(body, actor);
    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error) {
    logger.error("users.create_staff_failed", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create staff member" },
      { status: 400 }
    );
  }
}
