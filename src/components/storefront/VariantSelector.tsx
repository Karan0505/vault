"use client";

import { useCallback, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { StockBadge } from "./StockBadge";
import { AddToCartButton } from "./AddToCartButton";
import {
  findVariant,
  getSelectableValues,
  isSelectionComplete,
  type OptionSelection,
  type VariantLike,
} from "@/lib/variants";

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

  const selection: OptionSelection = useMemo(() => {
    const current: OptionSelection = {};
    for (const name of optionNames) {
      const value = searchParams.get(name.toLowerCase());
      if (value) current[name] = value;
    }
    return current;
  }, [optionNames, searchParams]);

  const setValue = useCallback(
    (dimension: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(dimension.toLowerCase(), value);
      router.replace(`${pathname}?${params.toString()}` as Parameters<typeof router.replace>[0], { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const resolvedVariant = isSelectionComplete(optionNames, selection)
    ? findVariant(optionNames, variants, selection)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {optionNames.map((dimension) => {
        const values = optionValues[dimension] ?? [];
        const selectable = getSelectableValues(optionNames, variants, selection, dimension);
        const chosen = selection[dimension];

        return (
          <fieldset key={dimension} className="flex flex-col gap-2.5">
            <legend className="eyebrow">{dimension}</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={dimension}>
              {values.map((value) => {
                const isSelectable = selectable.has(value);
                const isChosen = chosen === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isChosen}
                    disabled={!isSelectable}
                    onClick={() => setValue(dimension, value)}
                    className={cn(
                      "relative rounded-full border px-4 py-2 text-sm transition-all duration-150",
                      isChosen
                        ? "border-brass-400 bg-brass-400/10 text-brass-200"
                        : "border-ink-600 text-ink-200 hover:border-ink-400",
                      !isSelectable &&
                        "cursor-not-allowed border-ink-800 text-ink-600 line-through decoration-ink-600 hover:border-ink-800"
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      <motion.div
        key={resolvedVariant?.id ?? "unresolved"}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="ledger-rule flex items-center justify-between pt-5"
      >
        {resolvedVariant ? (
          <>
            <div className="flex items-baseline gap-3">
              <span className="font-display text-2xl text-ink-50">
                {formatMoney({ amount: resolvedVariant.priceAmount, currency: resolvedVariant.priceCurrency })}
              </span>
              {resolvedVariant.compareAtAmount && resolvedVariant.compareAtAmount > resolvedVariant.priceAmount && (
                <span className="font-mono text-sm text-ink-500 line-through">
                  {formatMoney({ amount: resolvedVariant.compareAtAmount, currency: resolvedVariant.priceCurrency })}
                </span>
              )}
            </div>
            <StockBadge onHand={resolvedVariant.onHand} lowStockThreshold={resolvedVariant.lowStockThreshold} />
          </>
        ) : (
          <p className="text-sm text-ink-500">
            Choose {optionNames.filter((n) => !selection[n]).join(" and ")} to see price and availability.
          </p>
        )}
      </motion.div>

      <AddToCartButton
        variantId={resolvedVariant?.id ?? null}
        disabled={!resolvedVariant || resolvedVariant.onHand <= 0}
      />
    </div>
  );
}
