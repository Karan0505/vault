"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR hydration mismatch and layout shift by rendering stable placeholder button
  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        title="Toggle theme (Light / Dark)"
        disabled
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-transparent text-gray-400 opacity-60 dark:border-ink-800"
      >
        <span className="h-4 w-4" />
      </button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={`Current: ${isDark ? "Dark" : "Light"} mode. Click to toggle.`}
      className="group relative flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white/50 text-gray-700 backdrop-blur-xs transition-colors duration-150 hover:border-gray-300 hover:bg-gray-100 hover:text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:border-ink-800 dark:bg-ink-900/50 dark:text-gray-300 dark:hover:border-ink-700 dark:hover:bg-ink-800 dark:hover:text-white dark:focus-visible:ring-white"
    >
      {isDark ? (
        <Sun
          size={16}
          aria-hidden="true"
          className="transition-transform duration-200 motion-reduce:transition-none group-hover:rotate-45"
        />
      ) : (
        <Moon
          size={16}
          aria-hidden="true"
          className="transition-transform duration-200 motion-reduce:transition-none group-hover:-rotate-12"
        />
      )}
    </button>
  );
}
