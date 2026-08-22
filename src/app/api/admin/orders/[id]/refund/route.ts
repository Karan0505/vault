import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db/prisma";
import { getStaffActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { createItemizedRefund, createGoodwillRefund, OverRefundError } from "@/lib/orders/refunds.server";
import { refundInputSchema } from "@/lib/validation/validation";
import { sendRefundNoticeEmail } from "@/lib/integrations/email.server";
import { logger } from "@/lib/shared/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await getStaffActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // This is the check the brief states explicitly: support cannot issue refunds.
  if (!hasPermission(actor.role, "refunds:issue")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = refundInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const result =
      parsed.data.kind === "itemized"
        ? await createItemizedRefund({
            orderId: id,
            actor,
            items: parsed.data.items,
            reason: parsed.data.reason,
            restock: parsed.data.restock,
          })
        : await createGoodwillRefund({
            orderId: id,
            actor,
            amount: parsed.data.amount,
            reason: parsed.data.reason,
          });

    // Sent after the refund transaction commits, never from inside it —
    // see ADR 0019.
    const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (order) {
      await sendRefundNoticeEmail({
        order,
        amount: result.amount,
        isFullRefund: result.orderStatus === "refunded",
        reason: parsed.data.reason,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof OverRefundError) {
      return NextResponse.json(
        { error: error.message, orderItemId: error.orderItemId, remaining: error.remaining },
        { status: 409 }
      );
    }
    if (error instanceof Error && (error.message.includes("Cannot refund") || error.message.includes("exceed"))) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    logger.error("orders.refund_failed", { orderId: id, error: error instanceof Error ? error.message : String(error) });
    Sentry.captureException(error, { extra: { orderId: id, action: "refund" } });
    throw error;
  }
}
