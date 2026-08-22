"use client";

import { useMemo, useRef } from "react";
import { cn } from "@/lib/shared/utils";
import { Check } from "lucide-react";
import { resolveColor } from "@/lib/shared/colors";

interface VariantOptionGroupProps {
  dimension: string;
  values: string[];
  selectable: Set<string>;
  chosen: string | undefined;
  explicitColorValues?: Record<string, string>;
  onSelect: (value: string) => void;
}

export function VariantOptionGroup({
  dimension,
  values,
  selectable,
  chosen,
  explicitColorValues,
  onSelect,
}: VariantOptionGroupProps) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isColor = dimension.toLowerCase() === "colour" || dimension.toLowerCase() === "color";

  // Normalize selectable set and chosen value for robust case-insensitive matching
  const normalizedSelectable = useMemo(() => {
    const set = new Set<string>();
    for (const val of selectable) {
      set.add(val.trim().toLowerCase());
    }
    return set;
  }, [selectable]);

  const chosenNorm = chosen?.trim().toLowerCase();

  function isValueSelectable(val: string): boolean {
    return selectable.has(val) || normalizedSelectable.has(val.trim().toLowerCase());
  }

  function isValueChosen(val: string): boolean {
    return chosen === val || (chosenNorm !== undefined && val.trim().toLowerCase() === chosenNorm);
  }

  function focusAndSelect(value: string) {
    onSelect(value);
    buttonRefs.current.get(value)?.focus();
  }

  const tabbableValue =
    chosen && isValueSelectable(chosen)
      ? chosen
      : values.find((v) => isValueSelectable(v));

  return (
    <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label={dimension}>
      {values.map((value) => {
        const isSelectable = isValueSelectable(value);
        const isChosen = isValueChosen(value);

        if (isColor) {
          const explicit = explicitColorValues?.[value] ?? explicitColorValues?.[value.trim().toLowerCase()];
          const colorInfo = resolveColor(value, explicit);

          return (
            <button
              key={value}
              ref={(el) => {
                if (el) buttonRefs.current.set(value, el);
                else buttonRefs.current.delete(value);
              }}
              type="button"
              role="radio"
              aria-checked={isChosen}
              disabled={!isSelectable}
              tabIndex={value === tabbableValue ? 0 : -1}
              onClick={() => focusAndSelect(value)}
              title={value}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-full border transition-all",
                isChosen
                  ? "ring-2 ring-black ring-offset-2 scale-105 shadow-xs"
                  : "hover:scale-105",
                colorInfo.isLight ? "border-gray-300" : "border-transparent",
                !isSelectable && "opacity-30 cursor-not-allowed"
              )}
              style={{ backgroundColor: colorInfo.bg }}
            >
              {isChosen && (
                <Check
                  size={14}
                  className={colorInfo.isLight ? "text-gray-900 stroke-[2.5]" : "text-white stroke-[2.5]"}
                />
              )}
            </button>
          );
        }

        return (
          <button
            key={value}
            ref={(el) => {
              if (el) buttonRefs.current.set(value, el);
              else buttonRefs.current.delete(value);
            }}
            type="button"
            role="radio"
            aria-checked={isChosen}
            disabled={!isSelectable}
            tabIndex={value === tabbableValue ? 0 : -1}
            onClick={() => focusAndSelect(value)}
            className={cn(
              "flex h-10 min-w-11 items-center justify-center rounded-xl border px-3.5 text-xs font-semibold transition-all duration-150",
              isChosen
                ? "border-black bg-black text-white shadow-xs"
                : "border-gray-200 bg-white text-gray-800 hover:border-gray-400 hover:bg-gray-50",
              !isSelectable &&
                "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 line-through"
            )}
          >
            {value}
          </button>
        );
      })}
    </div>
  );
}
