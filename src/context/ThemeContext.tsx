"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "vault_theme";

function getSystemPreference(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage access error (e.g. private browsing or sandboxed iframe)
  }
  return "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");
  const isMountedRef = useRef(false);

  // Initialize from storage / DOM state on mount without desync or flashing
  useEffect(() => {
    isMountedRef.current = true;
    const initialTheme = getStoredTheme();
    const systemDark = getSystemPreference();
    const isDark =
      initialTheme === "dark" || (initialTheme === "system" && systemDark);

    setThemeState(initialTheme);
    setResolvedTheme(isDark ? "dark" : "light");

    // Ensure documentElement has consistent class
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const applyTheme = useCallback((newTheme: Theme) => {
    const systemDark = getSystemPreference();
    const isDark =
      newTheme === "dark" || (newTheme === "system" && systemDark);
    const resolved: ResolvedTheme = isDark ? "dark" : "light";

    setThemeState(newTheme);
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle("dark", isDark);

    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Gracefully handle storage errors
    }
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      if (newTheme !== "light" && newTheme !== "dark" && newTheme !== "system") {
        newTheme = "system";
      }
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  // Listen for OS theme changes only while theme === "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (e: MediaQueryListEvent) => {
      const isDark = e.matches;
      setResolvedTheme(isDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", isDark);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [theme]);

  // Two-state deterministic toggle based on currently resolved theme
  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = resolvedTheme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
  }, [resolvedTheme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
