"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

interface VariantOptionGroupProps {
  dimension: string;
  values: string[];
  selectable: Set<string>;
  chosen: string | undefined;
  onSelect: (value: string) => void;
}

/**
 * A proper ARIA radiogroup: only one button is in the Tab order at a
 * time (the chosen value, or the first selectable one if nothing's
 * chosen yet), and arrow keys move both focus and selection between
 * options — matching how a native radio group actually behaves for a
 * keyboard user, not just individually Tab-able buttons that happen to
 * have role="radio" on them.
 */
export function VariantOptionGroup({ dimension, values, selectable, chosen, onSelect }: VariantOptionGroupProps) {
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  function focusAndSelect(value: string) {
    if (chosen === value) {
      buttonRefs.current.get(value)?.focus();
      return;
    }
    onSelect(value);
    buttonRefs.current.get(value)?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, currentValue: string) {
    const selectableValues = values.filter((v) => selectable.has(v));
    if (selectableValues.length === 0) return;

    const currentIndex = selectableValues.indexOf(currentValue);

    let nextIndex: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % selectableValues.length;
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      nextIndex =
        currentIndex === -1
          ? selectableValues.length - 1
          : (currentIndex - 1 + selectableValues.length) % selectableValues.length;
    } else if (e.key === "Home") {
      nextIndex = 0;
    } else if (e.key === "End") {
      nextIndex = selectableValues.length - 1;
    }

    if (nextIndex !== null) {
      e.preventDefault();
      const nextValue = selectableValues[nextIndex];
      if (nextValue) focusAndSelect(nextValue);
    }
  }

  // What's in the Tab order: the chosen value if it's still selectable,
  // otherwise the first selectable value — never more than one button.
  const tabbableValue =
    chosen && selectable.has(chosen) ? chosen : values.find((v) => selectable.has(v));

  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={dimension}>
      {values.map((value) => {
        const isSelectable = selectable.has(value);
        const isChosen = chosen === value;

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
            onKeyDown={(e) => handleKeyDown(e, value)}
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
  );
}
