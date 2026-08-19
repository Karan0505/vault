import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStaffActor } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "audit-log:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");
  const take = Math.min(Number(searchParams.get("take") ?? 50), 200);
  const cursor = searchParams.get("cursor");

  const entries = await prisma.auditLogEntry.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const nextCursor = entries.length === take ? entries[entries.length - 1]?.id ?? null : null;

  return NextResponse.json({ entries, nextCursor });
}
