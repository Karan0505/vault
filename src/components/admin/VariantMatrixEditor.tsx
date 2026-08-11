"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { reconcileVariantMatrix, type OptionSelection } from "@/lib/variants";

export interface VariantDraft {
  id?: string;
  sku: string;
  options: OptionSelection;
  priceAmount: number; // integer minor units
  priceCurrency: string;
  compareAtAmount: number | null;
  isEnabled: boolean;
  onHand: number;
  lowStockThreshold: number;
}

interface VariantMatrixEditorProps {
  productSlug: string;
  optionNames: string[];
  optionValues: Record<string, string[]>;
  variants: VariantDraft[];
  onOptionNamesChange: (names: string[]) => void;
  onOptionValuesChange: (values: Record<string, string[]>) => void;
  onVariantsChange: (variants: VariantDraft[]) => void;
}

function suggestSku(productSlug: string, options: OptionSelection, optionNames: string[]): string {
  const parts = optionNames.map((name) => (options[name] ?? "").slice(0, 3).toUpperCase());
  return [productSlug.toUpperCase().slice(0, 8), ...parts].filter(Boolean).join("-");
}

export function VariantMatrixEditor({
  productSlug,
  optionNames,
  optionValues,
  variants,
  onOptionNamesChange,
  onOptionValuesChange,
  onVariantsChange,
}: VariantMatrixEditorProps) {
  const [newDimension, setNewDimension] = useState("");
  const [valueDrafts, setValueDrafts] = useState<Record<string, string>>({});

  function recompute(nextNames: string[], nextValues: Record<string, string[]>) {
    const reconciled = reconcileVariantMatrix(nextNames, nextValues, variants, (options) => ({
      sku: suggestSku(productSlug || "sku", options, nextNames),
      options,
      priceAmount: 0,
      priceCurrency: "USD",
      compareAtAmount: null,
      isEnabled: true,
      onHand: 0,
      lowStockThreshold: 5,
    }));
    onVariantsChange(reconciled);
  }

  function addDimension() {
    const name = newDimension.trim();
    if (!name || optionNames.includes(name) || optionNames.length >= 3) return;
    const nextNames = [...optionNames, name];
    const nextValues = { ...optionValues, [name]: [] };
    onOptionNamesChange(nextNames);
    onOptionValuesChange(nextValues);
    setNewDimension("");
    recompute(nextNames, nextValues);
  }

  function removeDimension(name: string) {
    const nextNames = optionNames.filter((n) => n !== name);
    const nextValues = { ...optionValues };
    delete nextValues[name];
    onOptionNamesChange(nextNames);
    onOptionValuesChange(nextValues);
    recompute(nextNames, nextValues);
  }

  function addValue(dimension: string) {
    const value = (valueDrafts[dimension] ?? "").trim();
    if (!value || (optionValues[dimension] ?? []).includes(value)) return;
    const nextValues = { ...optionValues, [dimension]: [...(optionValues[dimension] ?? []), value] };
    onOptionValuesChange(nextValues);
    setValueDrafts((prev) => ({ ...prev, [dimension]: "" }));
    recompute(optionNames, nextValues);
  }

  function removeValue(dimension: string, value: string) {
    const nextValues = {
      ...optionValues,
      [dimension]: (optionValues[dimension] ?? []).filter((v) => v !== value),
    };
    onOptionValuesChange(nextValues);
    recompute(optionNames, nextValues);
  }

  function updateVariant(index: number, patch: Partial<VariantDraft>) {
    onVariantsChange(variants.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <p className="eyebrow">Option dimensions</p>
        <div className="flex flex-col gap-4">
          {optionNames.map((dimension) => (
            <div key={dimension} className="rounded-xl border border-ink-700 bg-ink-900/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-100">{dimension}</span>
                <button
                  type="button"
                  onClick={() => removeDimension(dimension)}
                  className="text-ink-500 hover:text-signal-red"
                  aria-label={`Remove ${dimension} dimension`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(optionValues[dimension] ?? []).map((value) => (
                  <span
                    key={value}
                    className="flex items-center gap-1.5 rounded-full border border-ink-600 bg-ink-800 px-3 py-1 text-xs text-ink-200"
                  >
                    {value}
                    <button
                      type="button"
                      onClick={() => removeValue(dimension, value)}
                      aria-label={`Remove ${value}`}
                      className="text-ink-500 hover:text-signal-red"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    value={valueDrafts[dimension] ?? ""}
                    onChange={(e) => setValueDrafts((prev) => ({ ...prev, [dimension]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addValue(dimension);
                      }
                    }}
                    placeholder="Add value"
                    className="w-24 rounded-full border border-dashed border-ink-600 bg-transparent px-3 py-1 text-xs text-ink-100 placeholder:text-ink-600 focus:border-brass-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => addValue(dimension)}
                    className="text-brass-400 hover:text-brass-300"
                    aria-label={`Confirm add value to ${dimension}`}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {optionNames.length < 3 && (
          <div className="flex items-center gap-2">
            <input
              value={newDimension}
              onChange={(e) => setNewDimension(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDimension();
                }
              }}
              placeholder="e.g. Size, Colour"
              className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={addDimension}
              className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-2 text-sm text-ink-200 hover:border-brass-400 hover:text-brass-300"
            >
              <Plus size={14} /> Add dimension
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="eyebrow">Variant matrix ({variants.length})</p>
        <div className="overflow-x-auto rounded-xl border border-ink-700">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink-800 bg-ink-900/60 text-xs uppercase tracking-wide text-ink-500">
                <th className="px-4 py-3 font-medium">Combination</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Price (minor units)</th>
                <th className="px-4 py-3 font-medium">On hand</th>
                <th className="px-4 py-3 text-center font-medium uppercase tracking-wider text-ink-400">
                  Enabled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {variants.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                    Add at least one option dimension and value to generate variants.
                  </td>
                </tr>
              )}
              {variants.map((variant, index) => (
                <tr key={variant.id ?? (Object.values(variant.options).join("-") || index)}>
                  <td className="px-4 py-3 font-mono text-xs text-ink-300">
                    {optionNames.map((n) => variant.options[n]).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      value={variant.sku}
                      onChange={(e) => updateVariant(index, { sku: e.target.value })}
                      className="w-40 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-brass-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variant.priceAmount}
                      onChange={(e) => updateVariant(index, { priceAmount: Number(e.target.value) })}
                      className="w-28 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-brass-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={variant.onHand}
                      onChange={(e) => updateVariant(index, { onHand: Number(e.target.value) })}
                      className="w-20 rounded-md border border-ink-700 bg-ink-900 px-2 py-1.5 font-mono text-xs text-ink-100 focus:border-brass-400 focus:outline-none"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={variant.isEnabled}
                      onClick={() => updateVariant(index, { isEnabled: !variant.isEnabled })}
                      title={variant.isEnabled ? "Variant Enabled" : "Variant Disabled"}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brass-400/50 focus:ring-offset-2 focus:ring-offset-ink-950",
                        variant.isEnabled ? "bg-signal-green" : "bg-ink-700 hover:bg-ink-600"
                      )}
                    >
                      <span
                        className={cn(
                          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                          variant.isEnabled ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-ink-600">
          Prices are integer minor units — 4999 means $49.99. Disabled combinations stay in the
          matrix but never appear as selectable on the storefront.
        </p>
      </div>
    </div>
  );
}
