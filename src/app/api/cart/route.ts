import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { getOrCreateCart, addCartItem, getCartView } from "@/lib/cart.server";
import { addCartItemSchema } from "@/lib/validation";

import { InsufficientStockError } from "@/lib/inventory.server";

export async function GET() {
  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);
  const view = await getCartView(cart.id);
  return NextResponse.json({ cart: view });
}

export async function POST(request: Request) {
  const parsed = addCartItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const userId = await getCurrentUserId();
  const cart = await getOrCreateCart(userId);

  try {
    await addCartItem(cart.id, parsed.data.variantId, parsed.data.quantity);
  } catch (error) {
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: "Insufficient stock" }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes("Foreign key")) {
      return NextResponse.json({ error: "That variant no longer exists" }, { status: 404 });
    }
    throw error;
  }

  const view = await getCartView(cart.id);
  return NextResponse.json({ cart: view }, { status: 201 });
}
