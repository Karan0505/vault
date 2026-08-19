import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart } from "@/lib/cart.server";
import { createCheckoutSession, EmptyCartError, CartLineUnavailableError } from "@/lib/orders.server";
import { InsufficientStockError } from "@/lib/inventory.server";
import { checkoutInputSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = checkoutInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required to checkout" }, { status: 401 });
  }

  const cart = await getOrCreateCart(userId);

  try {
    const { orderId, clientSecret } = await createCheckoutSession({
      cartId: cart.id,
      userId,
      email: parsed.data.email,
      discountCode: parsed.data.discountCode,
    });

    return NextResponse.json({ orderId, clientSecret });
  } catch (error) {
    if (error instanceof EmptyCartError) {
      return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
    }
    if (error instanceof CartLineUnavailableError) {
      return NextResponse.json(
        { error: "One of the items in your cart is no longer available", variantId: error.variantId },
        { status: 409 }
      );
    }
    if (error instanceof InsufficientStockError) {
      // The exact "clean, specific error" the brief asks for — which
      // variant, how many were wanted, how many are actually available.
      return NextResponse.json(
        {
          error: "Not enough stock for one of the items in your cart",
          variantId: error.variantId,
          requested: error.requested,
          available: error.available,
        },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : "Couldn't create checkout session";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
