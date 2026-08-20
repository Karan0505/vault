import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import { getOrCreateCart } from "@/lib/cart/cart.server";
import { createCheckoutSession, EmptyCartError, CartLineUnavailableError } from "@/lib/orders/orders.server";
import { InsufficientStockError } from "@/lib/inventory/inventory.server";
import { AddressNotFoundError, type AddressSnapshot } from "@/lib/account/addresses.server";
import { checkoutInputSchema } from "@/lib/validation/validation";

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
      selectedAddressId: parsed.data.selectedAddressId,
      shippingAddress: parsed.data.shippingAddress as AddressSnapshot | undefined,
    });

    return NextResponse.json({ orderId, clientSecret });
  } catch (error) {
    if (error instanceof AddressNotFoundError) {
      return NextResponse.json({ error: "Selected address not found or unauthorized" }, { status: 404 });
    }
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
