import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  getUserWishlist,
  getUserWishlistProductIds,
  addToWishlist,
} from "@/lib/wishlist/wishlist.server";

const addToWishlistSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const [items, productIds] = await Promise.all([
      getUserWishlist(userId),
      getUserWishlistProductIds(userId),
    ]);

    return NextResponse.json({
      items,
      productIds,
      count: productIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load wishlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = addToWishlistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const result = await addToWishlist(userId, parsed.data.productId);
    const [items, productIds] = await Promise.all([
      getUserWishlist(userId),
      getUserWishlistProductIds(userId),
    ]);

    return NextResponse.json({
      success: true,
      productId: result.productId,
      items,
      productIds,
      count: productIds.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add to wishlist";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
