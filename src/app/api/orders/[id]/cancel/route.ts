import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { customerCancelOrder } from "@/lib/orders/orders.server";
import { z } from "zod";

const cancelSchema = z.object({
  reason: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id && !session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const result = await customerCancelOrder({
      orderId: id,
      userId: session.user.id ?? "",
      email: session.user.email ?? undefined,
      reason: parsed.data.reason,
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      isIdempotentNoOp: result.isIdempotentNoOp,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel order";
    // Conflict error when order cannot be cancelled because it's shipped, delivered, or unauthorized
    const status = message.includes("Unauthorized") ? 403 : message.includes("Cannot cancel") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
