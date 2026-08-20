"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Trash2, ArrowRight, ExternalLink } from "lucide-react";
import { useWishlist } from "@/context/WishlistContext";
import { formatMoney } from "@/lib/payments/money";

export function WishlistView() {
  const { wishlistItems, loading, removeFromWishlist, refreshWishlist } = useWishlist();

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="h-72 rounded-2xl border border-gray-100 bg-gray-50/50 p-4 animate-pulse" />
        ))}
      </div>
    );
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center shadow-xs">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500">
          <Heart size={28} className="stroke-[1.5]" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-gray-900">Your Wishlist is Empty</h3>
        <p className="mt-1 text-xs text-gray-500 max-w-sm mx-auto">
          Explore the VAULT catalogue and click the heart icon on any item you love to save it here for later.
        </p>
        <div className="mt-6">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-gray-800 transition-colors"
          >
            <span>Discover Products</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs text-gray-500">
          {wishlistItems.length} {wishlistItems.length === 1 ? "saved item" : "saved items"}
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        {wishlistItems.map((item) => {
          const priceLabel = formatMoney({
            amount: item.minPriceAmount,
            currency: item.currency,
          });

          return (
            <div
              key={item.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-gray-200/80 bg-white p-3 shadow-2xs transition-all duration-300 hover:border-gray-300 hover:shadow-md"
            >
              <div>
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => removeFromWishlist(item.id)}
                  aria-label={`Remove ${item.title} from wishlist`}
                  className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 backdrop-blur-xs transition-all hover:bg-rose-50 hover:text-rose-600 shadow-xs cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>

                {/* Product Image */}
                <Link
                  href={`/products/${item.slug}`}
                  className="relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-gray-50"
                >
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    />
                  ) : (
                    <div className="h-full w-full bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}

                  {item.totalOnHand <= 0 && (
                    <div className="absolute top-2 left-2 rounded-full bg-black/80 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-xs">
                      Sold out
                    </div>
                  )}
                </Link>

                {/* Product Info */}
                <div className="mt-3 flex flex-col gap-1">
                  {item.categoryName && (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-gray-400">
                      {item.categoryName}
                    </span>
                  )}
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-sans text-xs font-semibold text-gray-900 hover:underline line-clamp-1"
                  >
                    {item.title}
                  </Link>
                  <span className="font-sans text-xs font-bold text-gray-900 mt-0.5">
                    {priceLabel}
                  </span>
                </div>
              </div>

              {/* View / Buy Action */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <Link
                  href={`/products/${item.slug}`}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-xs font-semibold text-gray-900 hover:bg-black hover:text-white transition-colors"
                >
                  <span>View Product</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
