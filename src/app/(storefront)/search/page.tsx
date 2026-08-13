import type { Metadata } from "next";
import { searchProducts, getFacets } from "@/lib/search.server";
import { parseSearchState, toSearchFilters } from "@/lib/search-params";
import { SearchBar } from "@/components/search/SearchBar";
import { FacetSidebar } from "@/components/search/FacetSidebar";
import { SortSelect, Pagination } from "@/components/search/SortControls";
import { ProductGrid } from "@/components/storefront/ProductGrid";

export const metadata: Metadata = { title: "Search" };

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const PAGE_SIZE = 12;

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const raw = await searchParams;
  const state = parseSearchState(raw);
  const filters = toSearchFilters(state);

  const [results, facets] = await Promise.all([
    searchProducts({ filters, sort: state.sort, page: state.page, pageSize: PAGE_SIZE }),
    getFacets(filters),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="max-w-xl">
        <p className="eyebrow">Search</p>
        <h1 className="mt-2 font-display text-3xl italic text-ink-50">
          {state.q ? `Results for “${state.q}”` : "Browse everything"}
        </h1>
        <div className="mt-5">
          <SearchBar state={state} />
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside className="hidden lg:block">
          <FacetSidebar state={state} facets={facets} />
        </aside>

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">
              {results.totalCount} {results.totalCount === 1 ? "result" : "results"}
            </p>
            <SortSelect state={state} />
          </div>

          {/* Facets collapse into the main column on small screens rather than a hidden drawer — keeps every filter keyboard- and screen-reader-reachable without extra interaction. */}
          <details className="rounded-xl border border-ink-800 p-4 lg:hidden">
            <summary className="cursor-pointer text-sm text-ink-300">Filters</summary>
            <div className="mt-4">
              <FacetSidebar state={state} facets={facets} />
            </div>
          </details>

          <ProductGrid products={results.items} />
          <Pagination state={state} totalPages={results.totalPages} />
        </div>
      </div>
    </div>
  );
}
