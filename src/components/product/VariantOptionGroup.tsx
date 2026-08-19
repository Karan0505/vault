"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface VariantOptionGroupProps {
  dimension: string;
  values: string[];
  selectable: Set<string>;
  chosen: string | undefined;
  onSelect: (value: string) => void;
}

const COLOR_MAP: Record<string, string> = {
  Black: "#111827",
  Cream: "#F5F5DC",
  Olive: "#556B2F",
  Brown: "#8B4513",
  White: "#FFFFFF",
  Navy: "#1E3A8A",
  Charcoal: "#374151",
  Moss: "#3F6212",
  Loden: "#4D7C0F",
  Rust: "#B45309",
  Oat: "#D6D3D1",
  Chestnut: "#78350F",
  Ink: "#0F172A",
};

export function VariantOptionGroup({
  dimension,
  values,
  selectable,
  chosen,
  onSelect,
}: VariantOptionGroupProps) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isColor = dimension.toLowerCase() === "colour" || dimension.toLowerCase() === "color";

  function focusAndSelect(value: string) {
    onSelect(value);
    buttonRefs.current.get(value)?.focus();
  }

  const tabbableValue =
    chosen && selectable.has(chosen) ? chosen : values.find((v) => selectable.has(v));

  return (
    <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label={dimension}>
      {values.map((value) => {
        const isSelectable = selectable.has(value);
        const isChosen = chosen === value;
        const colorHex = COLOR_MAP[value];

        if (isColor && colorHex) {
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
                  ? "ring-2 ring-black ring-offset-2 scale-105"
                  : "border-gray-300 hover:scale-105",
                !isSelectable && "opacity-30 cursor-not-allowed"
              )}
              style={{ backgroundColor: colorHex }}
            >
              {isChosen && (
                <Check
                  size={14}
                  className={value === "White" || value === "Cream" || value === "Oat" ? "text-black" : "text-white"}
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
