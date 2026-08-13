"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Search, X } from "lucide-react";
import { buildSearchHref, type ParsedSearchState } from "@/lib/search-params";

export function SearchBar({ state }: { state: ParsedSearchState }) {
  const router = useRouter();
  const [value, setValue] = useState(state.q ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the input in sync if the URL changes from elsewhere (e.g. the
  // browser back button lands on a different ?q=).
  useEffect(() => {
    setValue(state.q ?? "");
  }, [state.q]);

  function handleChange(next: string) {
    setValue(next);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      router.push(buildSearchHref(state, { q: next || null }) as Route);
    }, 350);
  }

  function clear() {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setValue("");
    router.push(buildSearchHref(state, { q: null }) as Route);
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500" />
      <input
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Search the catalogue…"
        aria-label="Search products"
        className="w-full rounded-full border border-ink-600 bg-ink-900 py-3 pl-11 pr-11 text-sm text-ink-50 placeholder:text-ink-500 focus:border-brass-400 focus:outline-none focus:ring-2 focus:ring-brass-400/20"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          aria-label="Clear search"
          className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-500 hover:text-ink-200"
        >
          <X size={15} />
        </button>
      )}
    </div>
  );
}
