import { NextResponse } from "next/server";
import { getStaffActor } from "@/lib/session";
import { hasPermission } from "@/lib/permissions";
import { listInventory } from "@/lib/inventory-admin.server";

export async function GET(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "inventory:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const lowStockOnly = searchParams.get("lowStockOnly") === "1";

  const items = await listInventory({ lowStockOnly });
  return NextResponse.json({ items });
}
