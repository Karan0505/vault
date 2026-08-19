import { describe, expect, it } from "vitest";
import { resolveColor, calculateWcagLuminance } from "../colors";

describe("resolveColor — Dynamic Database-Driven Colour Resolution", () => {
  describe("Priority 1: Explicit Database Colour Values", () => {
    it("uses explicit hex value over color name string", () => {
      const res = resolveColor("Loden", "#4B5320");
      expect(res.bg).toBe("#4B5320");
      expect(res.isLight).toBe(false);
    });

    it("uses explicit light hex value and computes light contrast", () => {
      const res = resolveColor("Custom Light", "#FFFDD0");
      expect(res.bg).toBe("#FFFDD0");
      expect(res.isLight).toBe(true);
    });
  });

  describe("Priority 2: Standard CSS Formats & Named Shades", () => {
    it("resolves standard CSS names correctly", () => {
      const black = resolveColor("Black");
      expect(black.isLight).toBe(false);

      const white = resolveColor("White");
      expect(white.isLight).toBe(true);

      const red = resolveColor("Red");
      expect(red.bg).toBe("#DC2626");

      const blue = resolveColor("Blue");
      expect(blue.bg).toBe("#2563EB");

      const orange = resolveColor("Orange");
      expect(orange.bg).toBe("#EA580C");

      const yellow = resolveColor("Yellow");
      expect(yellow.isLight).toBe(true);

      const green = resolveColor("Green");
      expect(green.bg).toBe("#16A34A");

      const purple = resolveColor("Purple");
      expect(purple.isLight).toBe(false);

      const navy = resolveColor("Navy");
      expect(navy.isLight).toBe(false);
    });

    it("resolves catalog/fashion shades correctly", () => {
      const loden = resolveColor("Loden");
      expect(loden.bg).toBe("#4D7C0F");

      const rust = resolveColor("Rust");
      expect(rust.bg).toBe("#B45309");

      const oat = resolveColor("Oat");
      expect(oat.isLight).toBe(true);

      const charcoal = resolveColor("Charcoal");
      expect(charcoal.isLight).toBe(false);
    });

    it("resolves direct CSS hex codes", () => {
      const hex = resolveColor("#FF5733");
      expect(hex.bg).toBe("#FF5733");

      const shortHex = resolveColor("#fff");
      expect(shortHex.bg).toBe("#fff");
      expect(shortHex.isLight).toBe(true);
    });

    it("resolves direct CSS rgb/rgba values", () => {
      const rgb = resolveColor("rgb(255, 87, 51)");
      expect(rgb.bg).toBe("rgb(255, 87, 51)");

      const rgba = resolveColor("rgba(0, 0, 0, 0.8)");
      expect(rgba.bg).toBe("rgba(0, 0, 0, 0.8)");
      expect(rgba.isLight).toBe(false);
    });

    it("resolves direct CSS hsl/hsla values", () => {
      const hsl = resolveColor("hsl(12, 100%, 60%)");
      expect(hsl.bg).toBe("hsl(12, 100%, 60%)");
    });
  });

  describe("Normalization & Whitespace Handling", () => {
    it("handles lowercase, uppercase, and mixed case identically", () => {
      const c1 = resolveColor("BLACK");
      const c2 = resolveColor("black");
      const c3 = resolveColor("Black");

      expect(c1.bg).toBe(c2.bg);
      expect(c2.bg).toBe(c3.bg);
      expect(c1.isLight).toBe(c3.isLight);
    });

    it("trims surrounding whitespace", () => {
      const trimmed = resolveColor("  Black  ");
      const direct = resolveColor("Black");

      expect(trimmed.bg).toBe(direct.bg);
      expect(trimmed.isLight).toBe(direct.isLight);
    });

    it("handles empty or null inputs gracefully without crashing", () => {
      const empty = resolveColor("");
      expect(empty.bg).toBeTruthy();
      expect(empty.isLight).toBe(true);

      const nullish = resolveColor(null);
      expect(nullish.bg).toBeTruthy();
    });
  });

  describe("Priority 3: Deterministic Fallback for Custom/Novelty Names", () => {
    it("produces a deterministic, valid HSL string for unknown color names", () => {
      const fb1 = resolveColor("Deep Forest");
      const fb2 = resolveColor("Deep Forest");

      expect(fb1.bg.startsWith("hsl(")).toBe(true);
      expect(fb1.bg).toBe(fb2.bg);
      expect(typeof fb1.isLight).toBe("boolean");

      const sunset = resolveColor("Sunset Orange");
      expect(sunset.bg.startsWith("hsl(")).toBe(true);

      const spaceGrey = resolveColor("Space Grey");
      expect(spaceGrey.bg.startsWith("hsl(")).toBe(true);
    });
  });

  describe("WCAG Relative Luminance Calculation", () => {
    it("accurately calculates luminance for white (1) and black (0)", () => {
      expect(calculateWcagLuminance(255, 255, 255)).toBeCloseTo(1.0, 2);
      expect(calculateWcagLuminance(0, 0, 0)).toBeCloseTo(0.0, 2);
    });

    it("determines light colors (luminance > 0.45)", () => {
      expect(calculateWcagLuminance(255, 255, 255)).toBeGreaterThan(0.45);
      expect(calculateWcagLuminance(255, 253, 208)).toBeGreaterThan(0.45); // cream
      expect(calculateWcagLuminance(234, 179, 8)).toBeGreaterThan(0.45); // yellow
    });

    it("determines dark colors (luminance <= 0.45)", () => {
      expect(calculateWcagLuminance(17, 24, 39)).toBeLessThan(0.45); // black
      expect(calculateWcagLuminance(30, 58, 138)).toBeLessThan(0.45); // navy
      expect(calculateWcagLuminance(147, 51, 234)).toBeLessThan(0.45); // purple
    });
  });
});
