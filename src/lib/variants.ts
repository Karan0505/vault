/**
 * Variant option matrix.
 *
 * A product declares an ordered list of option dimensions, e.g.
 * ["Size", "Colour"]. Each variant stores one point in that matrix as
 * a JSON object: { Size: "M", Colour: "Indigo" }.
 *
 * Two responsibilities live here:
 *  1. Generate the full cartesian matrix from a product's option values,
 *     so admin can see every possible combination when creating variants.
 *  2. Given the variants that actually exist (and which are enabled),
 *     tell the storefront selector which option *values* are still
 *     choosable for the options not yet picked — so a shopper can never
 *     select their way into a combination that doesn't exist. That's
 *     "disabled in the UI, not a 404 after selection."
 */

export type OptionSelection = Record<string, string>;

export interface VariantLike {
  id: string;
  options: OptionSelection;
  isEnabled: boolean;
}

/** Canonical, order-independent string key for an option selection. Used for O(1) variant lookup. */
export function optionKey(optionNames: readonly string[], options: OptionSelection): string {
  return optionNames.map((name) => `${name}=${options[name] ?? ""}`).join("|");
}

/** Cartesian product of option values, in optionNames order. Pure — no I/O. */
export function generateVariantMatrix(
  optionNames: readonly string[],
  optionValues: Record<string, readonly string[]>
): OptionSelection[] {
  if (optionNames.length === 0) return [{}];

  let combinations: OptionSelection[] = [{}];

  for (const name of optionNames) {
    const values = optionValues[name] ?? [];
    const next: OptionSelection[] = [];
    for (const combo of combinations) {
      for (const value of values) {
        next.push({ ...combo, [name]: value });
      }
    }
    combinations = next;
  }

  return combinations;
}

/** Builds a lookup from canonical option key -> variant, for O(1) "does this exact combination exist" checks. */
export function buildVariantLookup<T extends VariantLike>(
  optionNames: readonly string[],
  variants: readonly T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const variant of variants) {
    map.set(optionKey(optionNames, variant.options), variant);
  }
  return map;
}

/**
 * For a given partial selection and a single option dimension still to be
 * decided, returns which values of that dimension lead to at least one
 * *enabled, existing* variant — holding the rest of the current selection
 * fixed. The storefront disables every other value in that dimension's
 * control.
 *
 * This is what keeps "Size M / Colour Indigo" selectable while "Size M /
 * Colour Chartreuse" (never stocked) is greyed out before the shopper
 * clicks it, rather than discovered via a dead product page.
 */
export function getSelectableValues<T extends VariantLike>(
  optionNames: readonly string[],
  variants: readonly T[],
  currentSelection: OptionSelection,
  dimension: string
): Set<string> {
  const selectable = new Set<string>();

  for (const variant of variants) {
    if (!variant.isEnabled) continue;

    let matchesRestOfSelection = true;
    for (const name of optionNames) {
      if (name === dimension) continue;
      const chosen = currentSelection[name];
      if (chosen !== undefined && variant.options[name] !== chosen) {
        matchesRestOfSelection = false;
        break;
      }
    }

    if (matchesRestOfSelection) {
      const value = variant.options[dimension];
      if (value !== undefined) selectable.add(value);
    }
  }

  return selectable;
}

/** Finds the single variant (if any) that exactly matches a *complete* selection. */
export function findVariant<T extends VariantLike>(
  optionNames: readonly string[],
  variants: readonly T[],
  selection: OptionSelection
): T | undefined {
  if (optionNames.some((name) => selection[name] === undefined)) return undefined;
  const lookup = buildVariantLookup(optionNames, variants);
  return lookup.get(optionKey(optionNames, selection));
}

/** True once every option dimension has a chosen value. */
export function isSelectionComplete(
  optionNames: readonly string[],
  selection: OptionSelection
): boolean {
  return optionNames.every((name) => selection[name] !== undefined);
}

/**
 * Recomputes the full option matrix and reconciles it against variants
 * that already exist in the admin form. A combination that still exists
 * keeps its id/SKU/price/stock; a newly possible combination is added
 * as a fresh draft; a combination that's no longer possible (an option
 * value got removed) is dropped. Order follows generateVariantMatrix,
 * so the UI's row order stays stable as dimensions are edited.
 */
export function reconcileVariantMatrix<T extends VariantLike>(
  optionNames: readonly string[],
  optionValues: Record<string, readonly string[]>,
  existing: readonly T[],
  makeDraft: (options: OptionSelection) => T
): T[] {
  const matrix = generateVariantMatrix(optionNames, optionValues);
  const existingByKey = buildVariantLookup(optionNames, existing);

  return matrix.map((options) => {
    const key = optionKey(optionNames, options);
    const match = existingByKey.get(key);
    return match ?? makeDraft(options);
  });
}
