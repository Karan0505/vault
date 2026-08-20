"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { WishlistProduct } from "@/lib/wishlist/wishlist.server";

interface WishlistContextType {
  wishlistProductIds: Set<string>;
  wishlistItems: WishlistProduct[];
  wishlistCount: number;
  loading: boolean;
  isWishlisted: (productId: string) => boolean;
  addToWishlist: (productId: string, productData?: Partial<WishlistProduct>) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  toggleWishlist: (productId: string, productData?: Partial<WishlistProduct>) => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextType | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [wishlistProductIds, setWishlistProductIds] = useState<Set<string>>(new Set());
  const [wishlistItems, setWishlistItems] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // In-flight request lock to prevent race conditions on rapid clicks
  const inFlightIds = useRef<Set<string>>(new Set());

  const refreshWishlist = useCallback(async () => {
    try {
      const res = await fetch("/api/wishlist", { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 401) {
          // Guest user: clean empty state
          setWishlistProductIds(new Set());
          setWishlistItems([]);
        }
        return;
      }
      const data = await res.json();
      const ids: string[] = data.productIds || [];
      const items: WishlistProduct[] = data.items || [];
      setWishlistProductIds(new Set(ids));
      setWishlistItems(items);
    } catch {
      // Storefront degrades gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWishlist();
  }, [refreshWishlist]);

  const isWishlisted = useCallback(
    (productId: string) => {
      if (!productId) return false;
      return wishlistProductIds.has(productId);
    },
    [wishlistProductIds]
  );

  const addToWishlist = useCallback(
    async (productId: string, productData?: Partial<WishlistProduct>) => {
      if (!productId || inFlightIds.current.has(productId)) return;
      inFlightIds.current.add(productId);

      // Snapshot previous state for rollback
      const prevIds = new Set(wishlistProductIds);
      const prevItems = [...wishlistItems];

      // Optimistic addition
      const nextIds = new Set(wishlistProductIds);
      nextIds.add(productId);
      setWishlistProductIds(nextIds);

      if (productData && !wishlistItems.some((i) => i.id === productId)) {
        const optimisticItem: WishlistProduct = {
          id: productId,
          slug: productData.slug || "",
          title: productData.title || "Product",
          imageUrl: productData.imageUrl ?? null,
          imageAlt: productData.imageAlt || productData.title || "Product",
          minPriceAmount: productData.minPriceAmount || 0,
          maxPriceAmount: productData.maxPriceAmount || 0,
          currency: productData.currency || "USD",
          totalOnHand: productData.totalOnHand ?? 1,
          categoryName: productData.categoryName,
          colors: productData.colors,
          wishlistedAt: new Date().toISOString(),
        };
        setWishlistItems([optimisticItem, ...wishlistItems]);
      }

      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.status === 401) {
          // Revert and navigate to login
          setWishlistProductIds(prevIds);
          setWishlistItems(prevItems);
          const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
          router.push(redirectUrl);
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || `HTTP ${res.status}: Failed to add product to wishlist`;
          throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg);
        }

        const data = await res.json();
        if (Array.isArray(data.productIds)) {
          setWishlistProductIds(new Set(data.productIds));
        }
        if (Array.isArray(data.items)) {
          setWishlistItems(data.items);
        }
      } catch (err) {
        // Rollback on error
        setWishlistProductIds(prevIds);
        setWishlistItems(prevItems);
        console.error("Wishlist addition failed:", err);
      } finally {
        inFlightIds.current.delete(productId);
      }
    },
    [wishlistProductIds, wishlistItems, pathname, router]
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (!productId || inFlightIds.current.has(productId)) return;
      inFlightIds.current.add(productId);

      // Snapshot previous state for rollback
      const prevIds = new Set(wishlistProductIds);
      const prevItems = [...wishlistItems];

      // Optimistic removal
      const nextIds = new Set(wishlistProductIds);
      nextIds.delete(productId);
      setWishlistProductIds(nextIds);
      setWishlistItems(wishlistItems.filter((i) => i.id !== productId));

      try {
        const res = await fetch(`/api/wishlist/${encodeURIComponent(productId)}`, {
          method: "DELETE",
        });

        if (res.status === 401) {
          setWishlistProductIds(prevIds);
          setWishlistItems(prevItems);
          const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : "/login";
          router.push(redirectUrl);
          return;
        }

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error || `HTTP ${res.status}: Failed to remove product from wishlist`;
          throw new Error(typeof errMsg === "object" ? JSON.stringify(errMsg) : errMsg);
        }

        const data = await res.json();
        if (Array.isArray(data.productIds)) {
          setWishlistProductIds(new Set(data.productIds));
        }
        if (Array.isArray(data.items)) {
          setWishlistItems(data.items);
        }
      } catch (err) {
        // Rollback on error
        setWishlistProductIds(prevIds);
        setWishlistItems(prevItems);
        console.error("Wishlist removal failed:", err);
      } finally {
        inFlightIds.current.delete(productId);
      }
    },
    [wishlistProductIds, wishlistItems, pathname, router]
  );

  const toggleWishlist = useCallback(
    async (productId: string, productData?: Partial<WishlistProduct>) => {
      if (wishlistProductIds.has(productId)) {
        await removeFromWishlist(productId);
      } else {
        await addToWishlist(productId, productData);
      }
    },
    [wishlistProductIds, addToWishlist, removeFromWishlist]
  );

  const value = {
    wishlistProductIds,
    wishlistItems,
    wishlistCount: wishlistProductIds.size,
    loading,
    isWishlisted,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    refreshWishlist,
  };

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
