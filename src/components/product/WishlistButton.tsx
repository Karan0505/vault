"use client";

import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import type { WishlistProduct } from "@/lib/wishlist/wishlist.server";

interface WishlistButtonProps {
  productId: string;
  product?: Partial<WishlistProduct>;
  className?: string;
  iconSize?: number;
}

export function WishlistButton({
  productId,
  product,
  className = "absolute top-3 right-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-gray-600 backdrop-blur-xs transition-all hover:bg-white hover:text-rose-600 shadow-xs",
  iconSize = 14,
}: WishlistButtonProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(productId);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleWishlist(productId, product);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={`group/btn cursor-pointer ${className}`}
    >
      <Heart
        size={iconSize}
        className={`transition-transform duration-200 ${
          wishlisted
            ? "fill-rose-500 text-rose-500 scale-110"
            : "text-gray-600 group-hover/btn:text-rose-600"
        }`}
      />
    </button>
  );
}
