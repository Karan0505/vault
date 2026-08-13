"use client";

import { useCallback, useMemo, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";
import { StockBadge } from "./StockBadge";
import { AddToCartButton } from "./AddToCartButton";
import { VariantOptionGroup } from "./VariantOptionGroup";
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
  const [, startTransition] = useTransition();

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
      const paramKey = dimension.toLowerCase();
      const currentValue = searchParams.get(paramKey);
      if (currentValue === value) return; // Guard: No-op if already selected

      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, value);
      const targetUrl = `${pathname}?${params.toString()}`;

      startTransition(() => {
        router.replace(targetUrl as Route, { scroll: false });
      });
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
            <VariantOptionGroup
              dimension={dimension}
              values={values}
              selectable={selectable}
              chosen={chosen}
              onSelect={(value) => setValue(dimension, value)}
            />
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
