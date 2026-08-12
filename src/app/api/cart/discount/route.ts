import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart, getCartView } from "@/lib/cart.server";
import { applyDiscountCode, DiscountNotFoundError, DiscountUsageLimitError } from "@/lib/discounts.server";
import { applyDiscountSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = applyDiscountSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);
  const view = await getCartView(cart.id);

  try {
    const { result } = await applyDiscountCode(
      parsed.data.code,
      view.lines.map((l) => ({ variantId: l.variantId, unitAmount: l.unitAmount, quantity: l.quantity })),
      userId
    );

    if (!result.eligible) {
      return NextResponse.json({ eligible: false, reason: result.reason }, { status: 200 });
    }

    return NextResponse.json({
      eligible: true,
      totalDiscount: result.totalDiscount,
      freeShipping: result.freeShipping,
    });
  } catch (error) {
    if (error instanceof DiscountNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    if (error instanceof DiscountUsageLimitError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
}
