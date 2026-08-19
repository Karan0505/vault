/**
 * Dynamic colour resolution utility.
 *
 * Resolves any database colour string into a valid CSS background value
 * and computes WCAG-compatible relative luminance to determine whether
 * high-contrast indicators (like checkmarks) should be light or dark.
 */

// Common standard and fashion shades mapping for visual representation
const NAMED_COLOR_MAP: Record<string, string> = {
  // Standard CSS shades
  black: "#111827",
  white: "#FFFFFF",
  grey: "#6B7280",
  gray: "#6B7280",
  red: "#DC2626",
  green: "#16A34A",
  blue: "#2563EB",
  orange: "#EA580C",
  yellow: "#EAB308",
  purple: "#9333EA",
  pink: "#EC4899",
  brown: "#854D0E",
  navy: "#1E3A8A",
  teal: "#0D9488",
  olive: "#556B2F",
  maroon: "#800000",
  cyan: "#06B6D4",
  magenta: "#D946EF",
  lime: "#84CC16",
  indigo: "#4F46E5",
  violet: "#7C3AED",
  turquoise: "#14B8A6",
  silver: "#CBD5E1",
  gold: "#CA8A04",
  coral: "#F97316",
  beige: "#F5F5DC",
  cream: "#FFFDD0",
  ivory: "#FFFFF0",
  lavender: "#E9D5FF",
  mint: "#A7F3D0",

  // Apparel & catalogue fashion shades
  loden: "#4D7C0F",
  moss: "#3F6212",
  rust: "#B45309",
  oat: "#D6D3D1",
  chestnut: "#78350F",
  ink: "#0F172A",
  charcoal: "#374151",
  khaki: "#BDB76B",
  sand: "#D2B48C",
  taupe: "#8B8589",
  burgundy: "#800020",
  terracotta: "#E2725B",
  browen: "#854D0E", // handles minor typo in seed gracefully
};

export interface ResolvedColor {
  bg: string;
  isLight: boolean;
}

/**
 * Calculates WCAG-compliant relative luminance from an [R, G, B] triple (0-255).
 * Formula:
 *   C_linear = C_srgb <= 0.04045 ? C_srgb / 12.92 : ((C_srgb + 0.055) / 1.055) ^ 2.4
 *   Luminance = 0.2126 * R_lin + 0.7152 * G_lin + 0.0722 * B_lin
 */
export function calculateWcagLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.04045 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.04045 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.04045 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Parses Hex, RGB, RGBA, HSL or named color strings into an [R, G, B] tuple.
 * Returns null if string cannot be parsed as a known RGB/HSL color.
 */
function parseColorToRgb(color: string): [number, number, number] | null {
  const trimmed = color.trim().toLowerCase();

  // 1. Hex: #RGB or #RRGGBB
  if (trimmed.startsWith("#")) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0]! + hex[0]!, 16);
      const g = parseInt(hex[1]! + hex[1]!, 16);
      const b = parseInt(hex[2]! + hex[2]!, 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    } else if (hex.length === 6 || hex.length === 8) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) return [r, g, b];
    }
  }

  // 2. rgb(...) or rgba(...)
  const rgbMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]!, 10);
    const g = parseInt(rgbMatch[2]!, 10);
    const b = parseInt(rgbMatch[3]!, 10);
    return [Math.min(255, r), Math.min(255, g), Math.min(255, b)];
  }

  // 3. hsl(...) or hsla(...)
  const hslMatch = trimmed.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]!, 10) % 360;
    const s = parseInt(hslMatch[2]!, 10) / 100;
    const l = parseInt(hslMatch[3]!, 10) / 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rPrime = 0;
    let gPrime = 0;
    let bPrime = 0;

    if (h < 60) {
      rPrime = c;
      gPrime = x;
    } else if (h < 120) {
      rPrime = x;
      gPrime = c;
    } else if (h < 180) {
      gPrime = c;
      bPrime = x;
    } else if (h < 240) {
      gPrime = x;
      bPrime = c;
    } else if (h < 300) {
      rPrime = x;
      bPrime = c;
    } else {
      rPrime = c;
      bPrime = x;
    }

    return [
      Math.round((rPrime + m) * 255),
      Math.round((gPrime + m) * 255),
      Math.round((bPrime + m) * 255),
    ];
  }

  // 4. Named colors
  if (NAMED_COLOR_MAP[trimmed]) {
    return parseColorToRgb(NAMED_COLOR_MAP[trimmed]!);
  }

  return null;
}

/**
 * Generates a deterministic, visually stable HSL color string and its RGB components
 * for unknown or novelty color names (e.g. "Deep Forest", "Sunset Orange").
 */
function generateDeterministicFallback(name: string): { css: string; rgb: [number, number, number] } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 45 + (Math.abs(hash >> 3) % 25); // 45% - 70%
  const lightness = 35 + (Math.abs(hash >> 6) % 30); // 35% - 65%

  const rgb = parseColorToRgb(`hsl(${hue}, ${saturation}%, ${lightness}%)`) ?? [100, 100, 100];
  return {
    css: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    rgb,
  };
}

/**
 * Resolves a colour string (and optional explicit database colour value)
 * into a valid CSS background style and contrast indicator.
 *
 * Priority:
 * 1. Explicit database value (e.g., hex, swatch, colorValue, cssColor)
 * 2. Standard CSS formats or recognized CSS named colors
 * 3. Deterministic visual fallback for custom/novelty names
 */
export function resolveColor(
  colorInput: string | null | undefined,
  explicitValue?: string | null
): ResolvedColor {
  // 1. Explicit database value
  if (explicitValue && explicitValue.trim()) {
    const explicitTrimmed = explicitValue.trim();
    const rgb = parseColorToRgb(explicitTrimmed);
    const isLight = rgb ? calculateWcagLuminance(rgb[0], rgb[1], rgb[2]) > 0.45 : false;
    return {
      bg: explicitTrimmed,
      isLight,
    };
  }

  const normalized = (colorInput ?? "").trim();
  if (!normalized) {
    return {
      bg: "#E5E7EB",
      isLight: true,
    };
  }

  // 2. Direct CSS parsing (Hex, RGB, HSL, Named colors)
  const rgb = parseColorToRgb(normalized);
  if (rgb) {
    const normalizedKey = normalized.toLowerCase();
    const bg =
      normalized.startsWith("#") ||
      normalized.startsWith("rgb") ||
      normalized.startsWith("hsl")
        ? normalized
        : NAMED_COLOR_MAP[normalizedKey] ?? normalizedKey;

    const isLight = calculateWcagLuminance(rgb[0], rgb[1], rgb[2]) > 0.45;
    return {
      bg,
      isLight,
    };
  }

  // 3. Deterministic visual fallback for custom/novelty names
  const fallback = generateDeterministicFallback(normalized);
  const isLight = calculateWcagLuminance(fallback.rgb[0], fallback.rgb[1], fallback.rgb[2]) > 0.45;

  return {
    bg: fallback.css,
    isLight,
  };
}
