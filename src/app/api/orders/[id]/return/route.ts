import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";
import { customerRequestReturn } from "@/lib/orders/orders.server";
import { z } from "zod";

const returnSchema = z.object({
  reason: z.string().max(500).optional(),
  items: z
    .array(
      z.object({
        orderItemId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
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
    const parsed = returnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const result = await customerRequestReturn({
      orderId: id,
      userId: session.user.id ?? "",
      email: session.user.email ?? undefined,
      reason: parsed.data.reason,
      items: parsed.data.items,
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: result.status,
      refundId: result.refundId,
      amount: result.amount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process return";
    const status = message.includes("Unauthorized") ? 403 : message.includes("only available for delivered orders") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
