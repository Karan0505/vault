import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/session";
import {
  removeFromWishlist,
  getUserWishlist,
  getUserWishlistProductIds,
} from "@/lib/wishlist/wishlist.server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { productId } = await params;
  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  try {
    const result = await removeFromWishlist(userId, productId);
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
    const message = error instanceof Error ? error.message : "Failed to remove from wishlist";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
