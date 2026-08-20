import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import type { OrderStatus } from "@prisma/client";

const VALID_STATUSES: readonly OrderStatus[] = ["pending", "paid", "fulfilled", "delivered", "cancelled", "refunded"];

export async function GET(request: Request) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(actor.role, "orders:view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q")?.trim();
  const take = Math.min(Number(searchParams.get("take") ?? 25), 100);
  const cursor = searchParams.get("cursor");

  const orders = await prisma.order.findMany({
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: {
      ...(status && VALID_STATUSES.includes(status as OrderStatus) ? { status: status as OrderStatus } : {}),
      ...(q
        ? {
            OR: [
              { number: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { items: { select: { id: true } } },
  });

  const nextCursor = orders.length === take ? orders[orders.length - 1]?.id ?? null : null;

  return NextResponse.json({ orders, nextCursor });
}
