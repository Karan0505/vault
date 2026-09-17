"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";

export function WishlistCountBadge() {
  const { wishlistCount } = useWishlist();

  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
      className="relative flex items-center gap-1.5 p-2 text-gray-700 dark:text-gray-300 transition-colors hover:text-black dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-ink-800"
    >
      <Heart
        size={18}
        strokeWidth={1.8}
        className={wishlistCount > 0 ? "fill-rose-500 text-rose-500" : ""}
      />
      <span className="hidden sm:inline text-xs font-medium">Wishlist</span>

      {wishlistCount > 0 && (
        <span
          key={wishlistCount}
          className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 font-sans text-[10px] font-bold text-white shadow-xs transition-transform duration-200"
        >
          {wishlistCount}
        </span>
      )}
    </Link>
  );
}
