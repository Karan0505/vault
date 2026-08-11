import { describe, expect, it } from "vitest";
import {
  generateVariantMatrix,
  getSelectableValues,
  findVariant,
  isSelectionComplete,
  reconcileVariantMatrix,
  optionKey,
  type VariantLike,
} from "../variants";

describe("generateVariantMatrix", () => {
  it("produces the full cartesian product in option order", () => {
    const matrix = generateVariantMatrix(["Size", "Colour"], {
      Size: ["S", "M"],
      Colour: ["Red", "Blue"],
    });

    expect(matrix).toEqual([
      { Size: "S", Colour: "Red" },
      { Size: "S", Colour: "Blue" },
      { Size: "M", Colour: "Red" },
      { Size: "M", Colour: "Blue" },
    ]);
  });

  it("returns a single empty combination for a product with no option dimensions", () => {
    expect(generateVariantMatrix([], {})).toEqual([{}]);
  });

  it("handles a single dimension", () => {
    expect(generateVariantMatrix(["Colour"], { Colour: ["Red", "Blue"] })).toEqual([
      { Colour: "Red" },
      { Colour: "Blue" },
    ]);
  });
});

interface TestVariant extends VariantLike {
  sku: string;
}

const optionNames = ["Size", "Colour"];

const variants: TestVariant[] = [
  { id: "1", sku: "A", options: { Size: "S", Colour: "Red" }, isEnabled: true },
  { id: "2", sku: "B", options: { Size: "S", Colour: "Blue" }, isEnabled: true },
  { id: "3", sku: "C", options: { Size: "M", Colour: "Red" }, isEnabled: false }, // exists but disabled
  // Note: no M/Blue variant exists at all.
];

describe("getSelectableValues — the 'disabled, not 404' guarantee", () => {
  it("only offers Colours that resolve to an enabled variant given the chosen Size", () => {
    const selectable = getSelectableValues(optionNames, variants, { Size: "S" }, "Colour");
    expect(selectable).toEqual(new Set(["Red", "Blue"]));
  });

  it("excludes a combination whose only matching variant is disabled", () => {
    const selectable = getSelectableValues(optionNames, variants, { Size: "M" }, "Colour");
    expect(selectable.has("Red")).toBe(false); // M/Red exists but isEnabled: false
    expect(selectable.has("Blue")).toBe(false); // M/Blue was never stocked
  });

  it("with nothing chosen yet, offers every Size that has at least one enabled variant", () => {
    const selectable = getSelectableValues(optionNames, variants, {}, "Size");
    expect(selectable).toEqual(new Set(["S"])); // M only has a disabled variant
  });
});

describe("findVariant", () => {
  it("resolves a complete, valid selection", () => {
    const found = findVariant(optionNames, variants, { Size: "S", Colour: "Blue" });
    expect(found?.id).toBe("2");
  });

  it("returns undefined for a selection that was never stocked", () => {
    expect(findVariant(optionNames, variants, { Size: "M", Colour: "Blue" })).toBeUndefined();
  });

  it("returns undefined for an incomplete selection", () => {
    expect(findVariant(optionNames, variants, { Size: "S" })).toBeUndefined();
  });
});

describe("isSelectionComplete", () => {
  it("is false until every dimension has a value", () => {
    expect(isSelectionComplete(optionNames, { Size: "S" })).toBe(false);
    expect(isSelectionComplete(optionNames, { Size: "S", Colour: "Red" })).toBe(true);
  });
});

describe("optionKey", () => {
  it("is order-independent with respect to the input object's key order", () => {
    const a = optionKey(["Size", "Colour"], { Colour: "Red", Size: "S" });
    const b = optionKey(["Size", "Colour"], { Size: "S", Colour: "Red" });
    expect(a).toBe(b);
  });
});

describe("reconcileVariantMatrix — admin editing option dimensions", () => {
  it("keeps existing variant data for combinations that still exist", () => {
    const existing: TestVariant[] = [
      { id: "1", sku: "KEEP-ME", options: { Size: "S", Colour: "Red" }, isEnabled: true },
    ];

    const result = reconcileVariantMatrix(
      ["Size", "Colour"],
      { Size: ["S"], Colour: ["Red"] },
      existing,
      (options) => ({ id: "", sku: "NEW", options, isEnabled: true })
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.sku).toBe("KEEP-ME");
  });

  it("adds a fresh draft for a newly possible combination", () => {
    const existing: TestVariant[] = [
      { id: "1", sku: "S-RED", options: { Size: "S", Colour: "Red" }, isEnabled: true },
    ];

    const result = reconcileVariantMatrix(
      ["Size", "Colour"],
      { Size: ["S", "M"], Colour: ["Red"] },
      existing,
      (options) => ({ id: "", sku: "DRAFT", options, isEnabled: true })
    );

    expect(result).toHaveLength(2);
    expect(result.find((v) => v.options.Size === "M")?.sku).toBe("DRAFT");
  });

  it("drops a combination whose option value was removed", () => {
    const existing: TestVariant[] = [
      { id: "1", sku: "S-RED", options: { Size: "S", Colour: "Red" }, isEnabled: true },
      { id: "2", sku: "M-RED", options: { Size: "M", Colour: "Red" }, isEnabled: true },
    ];

    const result = reconcileVariantMatrix(
      ["Size", "Colour"],
      { Size: ["S"], Colour: ["Red"] }, // "M" removed
      existing,
      (options) => ({ id: "", sku: "DRAFT", options, isEnabled: true })
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.sku).toBe("S-RED");
  });
});
