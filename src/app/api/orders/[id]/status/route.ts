import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyAndUpdateOrderStatus } from "@/lib/orders.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Order ID required" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, userId: true, email: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const session = await auth();
  const currentUserId = session?.user?.id;
  const isStaff = Boolean(session?.user?.staffRole);

  if (order.userId && order.userId !== currentUserId && !isStaff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const result = await verifyAndUpdateOrderStatus(id);
    return NextResponse.json({
      id: result.id,
      status: result.status,
      isPaid: result.status !== "pending" && result.status !== "cancelled",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
