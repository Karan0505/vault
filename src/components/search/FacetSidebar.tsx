import Link from "next/link";
import { cn } from "@/lib/shared/utils";
import { buildSearchHref, type ParsedSearchState } from "@/lib/search/search-params";
import type { Facets } from "@/lib/search/search.server";

function FacetRow({
  label,
  count,
  active,
  href,
}: {
  label: string;
  count: number;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        active ? "bg-brass-400/10 text-brass-300" : "text-ink-300 hover:bg-ink-800/60 hover:text-ink-100",
        count === 0 && !active && "pointer-events-none text-ink-700"
      )}
      aria-current={active}
    >
      <span>{label}</span>
      <span className="font-mono text-xs text-ink-500">{count}</span>
    </Link>
  );
}

export function FacetSidebar({ state, facets }: { state: ParsedSearchState; facets: Facets }) {
  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="eyebrow mb-2">Category</legend>
        <div className="flex flex-col gap-0.5">
          {facets.categories.map((facet) => (
            <FacetRow
              key={facet.slug}
              label={facet.name}
              count={facet.count}
              active={state.category === facet.slug}
              href={buildSearchHref(state, { category: state.category === facet.slug ? null : facet.slug })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2">Price</legend>
        <div className="flex flex-col gap-0.5">
          {facets.priceBuckets.map((bucket) => (
            <FacetRow
              key={bucket.id}
              label={bucket.label}
              count={bucket.count}
              active={state.price === bucket.id}
              href={buildSearchHref(state, { price: state.price === bucket.id ? null : bucket.id })}
            />
          ))}
        </div>
      </fieldset>

      {facets.sizes.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-2">Size</legend>
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((facet) => (
              <Link
                key={facet.value}
                href={buildSearchHref(state, { size: state.size === facet.value ? null : facet.value })}
                aria-current={state.size === facet.value}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  state.size === facet.value
                    ? "border-brass-400 bg-brass-400/10 text-brass-300"
                    : "border-ink-700 text-ink-300 hover:border-ink-500",
                  facet.count === 0 && state.size !== facet.value && "pointer-events-none opacity-30"
                )}
              >
                {facet.value} <span className="text-ink-600">({facet.count})</span>
              </Link>
            ))}
          </div>
        </fieldset>
      )}

      {facets.colours.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-2">Colour</legend>
          <div className="flex flex-wrap gap-1.5">
            {facets.colours.map((facet) => (
              <Link
                key={facet.value}
                href={buildSearchHref(state, { colour: state.colour === facet.value ? null : facet.value })}
                aria-current={state.colour === facet.value}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition-colors",
                  state.colour === facet.value
                    ? "border-brass-400 bg-brass-400/10 text-brass-300"
                    : "border-ink-700 text-ink-300 hover:border-ink-500",
                  facet.count === 0 && state.colour !== facet.value && "pointer-events-none opacity-30"
                )}
              >
                {facet.value} <span className="text-ink-600">({facet.count})</span>
              </Link>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-2">Availability</legend>
        <FacetRow
          label="In stock only"
          count={facets.stock.inStockCount}
          active={state.inStock}
          href={buildSearchHref(state, { inStock: state.inStock ? null : true })}
        />
      </fieldset>

      {(state.category || state.price || state.size || state.colour || state.inStock) && (
        <Link href="/search" className="text-xs text-ink-500 underline-offset-4 hover:text-brass-300 hover:underline">
          Clear all filters
        </Link>
      )}
    </div>
  );
}
