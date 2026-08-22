"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/shared/utils";
import { buildSearchHref, type ParsedSearchState } from "@/lib/search/search-params";
import type { SortOption } from "@/lib/search/search.server";

const SORT_LABEL: Record<SortOption, string> = {
  relevance: "Relevance",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  newest: "Newest",
};

export function SortSelect({ state }: { state: ParsedSearchState }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor="sort" className="text-ink-500">
        Sort
      </label>
      <select
        id="sort"
        defaultValue={state.sort}
        onChange={(e) => {
          window.location.href = buildSearchHref(state, { sort: e.target.value as SortOption });
        }}
        className="rounded-lg border border-ink-600 bg-ink-900 px-3 py-1.5 text-ink-100 focus:border-brass-400 focus:outline-none"
      >
        {(Object.keys(SORT_LABEL) as SortOption[]).map((option) => (
          <option key={option} value={option}>
            {SORT_LABEL[option]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Pagination({ state, totalPages }: { state: ParsedSearchState; totalPages: number }) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - state.page) <= 1
  );

  return (
    <nav className="flex items-center justify-center gap-1.5 pt-4" aria-label="Search results pages">
      <Link
        href={buildSearchHref(state, { page: Math.max(1, state.page - 1) })}
        aria-disabled={state.page === 1}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-ink-700 text-ink-300 transition-colors hover:border-brass-400",
          state.page === 1 && "pointer-events-none opacity-30"
        )}
      >
        <ChevronLeft size={14} />
      </Link>

      {pages.map((page, index) => {
        const previous = pages[index - 1];
        const showEllipsis = previous !== undefined && page - previous > 1;
        return (
          <span key={page} className="flex items-center gap-1.5">
            {showEllipsis && <span className="px-1 text-ink-600">…</span>}
            <Link
              href={buildSearchHref(state, { page })}
              aria-current={page === state.page ? "page" : undefined}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border font-mono text-xs transition-colors",
                page === state.page
                  ? "border-brass-400 bg-brass-400/10 text-brass-300"
                  : "border-ink-700 text-ink-300 hover:border-brass-400"
              )}
            >
              {page}
            </Link>
          </span>
        );
      })}

      <Link
        href={buildSearchHref(state, { page: Math.min(totalPages, state.page + 1) })}
        aria-disabled={state.page === totalPages}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full border border-ink-700 text-ink-300 transition-colors hover:border-brass-400",
          state.page === totalPages && "pointer-events-none opacity-30"
        )}
      >
        <ChevronRight size={14} />
      </Link>
    </nav>
  );
}
