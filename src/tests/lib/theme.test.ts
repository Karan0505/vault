import { describe, it, expect } from "vitest";

const STORAGE_KEY = "vault_theme";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

function parseStoredTheme(raw: string | null): Theme {
  if (raw === "light" || raw === "dark" || raw === "system") {
    return raw;
  }
  return "system";
}

function resolveTheme(theme: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (theme === "dark") return "dark";
  if (theme === "light") return "light";
  return systemPrefersDark ? "dark" : "light";
}

function getNextToggleTheme(currentResolvedTheme: ResolvedTheme): Theme {
  return currentResolvedTheme === "dark" ? "light" : "dark";
}

describe("Dark Mode Architecture & Theme Persistence Logic", () => {
  it("uses the canonical storage key 'vault_theme'", () => {
    expect(STORAGE_KEY).toBe("vault_theme");
  });

  describe("parseStoredTheme", () => {
    it("parses valid stored themes accurately", () => {
      expect(parseStoredTheme("light")).toBe("light");
      expect(parseStoredTheme("dark")).toBe("dark");
      expect(parseStoredTheme("system")).toBe("system");
    });

    it("falls back to 'system' when localStorage value is null or empty", () => {
      expect(parseStoredTheme(null)).toBe("system");
      expect(parseStoredTheme("")).toBe("system");
    });

    it("falls back to 'system' when stored value is invalid/corrupted", () => {
      expect(parseStoredTheme("auto")).toBe("system");
      expect(parseStoredTheme("DARK")).toBe("system");
      expect(parseStoredTheme("random_string")).toBe("system");
    });
  });

  describe("resolveTheme", () => {
    it("resolves explicit 'dark' theme regardless of OS preference", () => {
      expect(resolveTheme("dark", false)).toBe("dark");
      expect(resolveTheme("dark", true)).toBe("dark");
    });

    it("resolves explicit 'light' theme regardless of OS preference", () => {
      expect(resolveTheme("light", false)).toBe("light");
      expect(resolveTheme("light", true)).toBe("light");
    });

    it("resolves 'system' theme according to OS preference", () => {
      expect(resolveTheme("system", false)).toBe("light");
      expect(resolveTheme("system", true)).toBe("dark");
    });
  });

  describe("getNextToggleTheme", () => {
    it("toggles from dark to light", () => {
      expect(getNextToggleTheme("dark")).toBe("light");
    });

    it("toggles from light to dark", () => {
      expect(getNextToggleTheme("light")).toBe("dark");
    });
  });
});
