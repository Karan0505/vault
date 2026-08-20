"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Heart, Minus, Plus } from "lucide-react";
import { AddToCartButton } from "./AddToCartButton";
import { VariantOptionGroup } from "./VariantOptionGroup";
import {
  findVariant,
  getSelectableValues,
  isSelectionComplete,
  type OptionSelection,
  type VariantLike,
} from "@/lib/catalogue/variants";

export interface SelectableVariant extends VariantLike {
  sku: string;
  priceAmount: number;
  priceCurrency: string;
  compareAtAmount: number | null;
  onHand: number;
  lowStockThreshold: number;
}

interface VariantSelectorProps {
  optionNames: string[];
  optionValues: Record<string, string[]>; // display order per dimension
  variants: SelectableVariant[];
}

export function VariantSelector({ optionNames, optionValues, variants }: VariantSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

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

  const explicitColorValues: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of variants) {
      const opts = v.options as Record<string, unknown>;
      const colorVal = (opts["Colour"] ?? opts["Color"] ?? opts["colour"] ?? opts["color"]) as
        | string
        | undefined;
      const explicit = (opts["colorValue"] ??
        opts["hex"] ??
        opts["swatch"] ??
        opts["cssColor"]) as string | undefined;
      if (colorVal && explicit) {
        map[colorVal] = explicit;
      }
    }
    return map;
  }, [variants]);

  const setValue = useCallback(
    (dimension: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(dimension.toLowerCase(), value);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const resolvedVariant = isSelectionComplete(optionNames, selection)
    ? findVariant(optionNames, variants, selection)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Option groups */}
      {optionNames.map((dimension) => {
        const values = optionValues[dimension] ?? [];
        const selectable = getSelectableValues(optionNames, variants, selection, dimension);
        const chosen = selection[dimension];

        return (
          <fieldset key={dimension} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <legend className="font-sans text-xs font-semibold uppercase tracking-wider text-gray-900">
                {dimension}: <span className="font-normal text-gray-600">{chosen ?? "Select"}</span>
              </legend>
            </div>
            <VariantOptionGroup
              dimension={dimension}
              values={values}
              selectable={selectable}
              chosen={chosen}
              explicitColorValues={explicitColorValues}
              onSelect={(value) => setValue(dimension, value)}
            />
          </fieldset>
        );
      })}

      {/* Stock status message */}
      <div className="flex items-center gap-2 text-xs">
        {resolvedVariant ? (
          resolvedVariant.onHand > 0 ? (
            <div className="flex items-center gap-2 font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In stock — Ships in 1-2 business days</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 font-medium text-rose-600">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Currently out of stock</span>
            </div>
          )
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <span className="h-2 w-2 rounded-full bg-gray-400" />
            <span>Select options to check stock</span>
          </div>
        )}
      </div>

      {/* Quantity & CTA buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <div className="flex items-center gap-3">
          {/* Quantity Stepper */}
          <div className="inline-flex items-center rounded-xl border border-gray-200 bg-white p-1 shadow-xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <Minus size={14} />
            </button>
            <span className="w-9 text-center font-mono text-sm font-semibold text-gray-900">
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
        <button
          type="button"
          onClick={() => setIsWishlisted(!isWishlisted)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gray-300 bg-white py-3 text-xs font-semibold text-gray-800 shadow-xs transition-colors hover:bg-gray-50"
        >
          <Heart
            size={16}
            className={isWishlisted ? "fill-rose-500 text-rose-500" : "text-gray-600"}
          />
          <span>{isWishlisted ? "In Your Wishlist" : "Add to Wishlist"}</span>
        </button>
      </div>
    </div>
  );
}
