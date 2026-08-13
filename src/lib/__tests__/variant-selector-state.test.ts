import { describe, expect, it } from "vitest";

function buildNextOptionParams(
  currentSearchParams: Record<string, string>,
  dimension: string,
  newValue: string
): { targetUrl: string; isNoOp: boolean } {
  const paramKey = dimension.toLowerCase();
  const currentValue = currentSearchParams[paramKey];

  if (currentValue === newValue) {
    return { targetUrl: "", isNoOp: true };
  }

  const params = new URLSearchParams(currentSearchParams);
  params.set(paramKey, newValue);
  return {
    targetUrl: `/products/canvas-low-top?${params.toString()}`,
    isNoOp: false,
  };
}

describe("Single-Navigation Variant Selection State Logic", () => {
  it("generates correct URL when selecting Size 7 for the first time", () => {
    const res = buildNextOptionParams({}, "Size", "7");
    expect(res.isNoOp).toBe(false);
    expect(res.targetUrl).toBe("/products/canvas-low-top?size=7");
  });

  it("preserves active Size when selecting Colour Black", () => {
    const res = buildNextOptionParams({ size: "7" }, "Colour", "Black");
    expect(res.isNoOp).toBe(false);
    expect(res.targetUrl).toBe("/products/canvas-low-top?size=7&colour=Black");
  });

  it("preserves active Colour when changing Size from 7 to 8", () => {
    const res = buildNextOptionParams({ size: "7", colour: "Black" }, "Size", "8");
    expect(res.isNoOp).toBe(false);
    expect(res.targetUrl).toBe("/products/canvas-low-top?size=8&colour=Black");
  });

  it("detects no-op when user clicks already selected Size 7", () => {
    const res = buildNextOptionParams({ size: "7" }, "Size", "7");
    expect(res.isNoOp).toBe(true);
    expect(res.targetUrl).toBe("");
  });

  it("detects no-op when user clicks already selected Colour Black", () => {
    const res = buildNextOptionParams({ size: "7", colour: "Black" }, "Colour", "Black");
    expect(res.isNoOp).toBe(true);
    expect(res.targetUrl).toBe("");
  });
});
