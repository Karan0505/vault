import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart, updateCartItemQuantity, removeCartItem, getCartView } from "@/lib/cart.server";
import { updateCartItemSchema } from "@/lib/validation";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { itemId } = await params;
  const parsed = updateCartItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);

  await updateCartItemQuantity(cart.id, itemId, parsed.data.quantity);

  const view = await getCartView(cart.id);
  return NextResponse.json({ cart: view });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { itemId } = await params;
  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);

  await removeCartItem(cart.id, itemId);

  const view = await getCartView(cart.id);
  return NextResponse.json({ cart: view });
}
