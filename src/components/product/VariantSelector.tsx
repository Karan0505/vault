"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Heart, Minus, Plus } from "lucide-react";
import { formatMoney } from "@/lib/payments/money";
import { AddToCartButton } from "./AddToCartButton";
import { useWishlist } from "@/context/WishlistContext";
import type { WishlistProduct } from "@/lib/wishlist/wishlist.server";

export interface SelectableVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  isEnabled: boolean;
  priceAmount: number;
  priceCurrency: string;
  compareAtAmount?: number | null;
  onHand: number;
  lowStockThreshold: number;
}

interface VariantSelectorProps {
  productId?: string;
  product?: Partial<WishlistProduct>;
  optionNames: string[];
  optionValues: Record<string, string[]>;
  variants: SelectableVariant[];
}

type OptionSelection = Record<string, string>;

export function VariantSelector({
  productId,
  product,
  optionNames,
  optionValues,
  variants,
}: VariantSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);

  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = productId ? isWishlisted(productId) : false;

  const selection: OptionSelection = useMemo(() => {
    const current: OptionSelection = {};
    for (const name of optionNames) {
      const rawParam = searchParams.get(name.toLowerCase());
      if (rawParam) {
        const available = optionValues[name] ?? [];
        const matched = available.find(
          (v) => v.trim().toLowerCase() === rawParam.trim().toLowerCase()
        );
        current[name] = matched ?? rawParam;
      }
    }
    return current;
  }, [optionNames, optionValues, searchParams]);

  const resolvedVariant = useMemo(() => {
    return (
      variants.find((v) => {
        if (!v.isEnabled) return false;
        return optionNames.every((dim) => {
          const selected = selection[dim];
          if (!selected) return false;
          const variantVal = v.options[dim];
          return variantVal && variantVal.trim().toLowerCase() === selected.trim().toLowerCase();
        });
      }) ?? null
    );
  }, [variants, optionNames, selection]);

  const setOption = (dimension: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(dimension.toLowerCase(), value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleWishlistClick = async () => {
    if (!productId) return;
    await toggleWishlist(productId, product);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Option selectors */}
      {optionNames.map((name) => {
        const values = optionValues[name] ?? [];
        const currentSelected = selection[name];

        return (
          <div key={name} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-gray-900">
              <span className="capitalize">{name}</span>
              {currentSelected && (
                <span className="text-gray-500 font-normal">{currentSelected}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {values.map((val) => {
                const isSelected = currentSelected?.toLowerCase() === val.toLowerCase();
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setOption(name, val)}
                    className={`flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-black bg-black text-white shadow-xs"
                        : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Stock & pricing status */}
      {resolvedVariant && (
        <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-xs font-medium">
          <span className="text-gray-500 font-mono">SKU: {resolvedVariant.sku}</span>
          {resolvedVariant.onHand <= 0 ? (
            <span className="text-rose-600 font-semibold">Out of Stock</span>
          ) : resolvedVariant.onHand <= resolvedVariant.lowStockThreshold ? (
            <span className="text-amber-600 font-semibold">
              Low Stock — Only {resolvedVariant.onHand} left
            </span>
          ) : (
            <span className="text-emerald-600 font-semibold">In Stock</span>
          )}
        </div>
      )}

      {/* Quantity & CTA buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-3">
          {/* Quantity selector */}
          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center font-mono text-xs font-bold text-gray-900">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={Boolean(resolvedVariant && quantity >= resolvedVariant.onHand)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add to Cart button */}
          <div className="flex-1">
            <AddToCartButton
              variantId={resolvedVariant?.id ?? null}
              disabled={!resolvedVariant || resolvedVariant.onHand <= 0}
            />
          </div>
        </div>

        {/* Add to Wishlist button */}
        {productId && (
          <button
            type="button"
            onClick={handleWishlistClick}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-3 text-xs font-semibold text-gray-800 shadow-xs transition-colors hover:bg-gray-50 cursor-pointer"
          >
            <Heart
              size={16}
              className={wishlisted ? "fill-rose-500 text-rose-500" : "text-gray-600"}
            />
            <span>{wishlisted ? "In Your Wishlist" : "Add to Wishlist"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
