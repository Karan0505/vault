# 0011 — Search: Postgres full-text + pg_trgm, not a dedicated search service

## Status
Accepted — Phase 3

## Context
The brief offers a choice: "Postgres FTS plus pg_trgm, or Typesense or
Meilisearch," and asks for the choice to be defended. The catalogue
this phase's requirements describe (500+ products, 2000+ variants) is
squarely within what Postgres full-text search handles well — the
tradeoff isn't "Postgres can't do this," it's what a second service
costs versus what it buys.

**What a dedicated search service (Typesense/Meilisearch) would add:**
better out-of-the-box typo tolerance and relevance tuning, sub-10ms
query latency at much larger catalogue sizes, and a purpose-built
faceting API. **What it costs:** a second stateful service to deploy,
monitor, and keep in sync with Postgres — every product write now has
two possible failure modes (the Postgres write succeeds, the index
push fails, and the storefront silently shows a stale or missing
product in search) instead of one, and the sync mechanism itself
(webhook, CDC, or a queue) is new infrastructure this project doesn't
otherwise have a reason to run.

## Decision
Search runs entirely in the existing Postgres database:

- **Full-text matching**: `to_tsvector('english', title || ' ' ||
  description)` stored in `Product.searchVector` (a `tsvector` column,
  GIN-indexed), queried with `websearch_to_tsquery` and ranked with
  `ts_rank`. This handles stemming ("jackets" matches "Jacket") and
  multi-word relevance ranking natively.
- **Typo tolerance**: `pg_trgm`'s `similarity()` function against
  `title`, as a fallback matched with `OR` alongside the full-text
  condition — see `buildConditions` in `src/lib/search.server.ts`. A
  query that fails `websearch_to_tsquery` outright (misspelled past
  what stemming forgives) still matches through trigram similarity.
- **Facets**: plain `GROUP BY` queries against the same tables — no
  separate faceting engine needed, since Postgres is already the
  source of truth for price, stock, and options.

## Consequences
- There is exactly one system of record for the catalogue and exactly
  one system that answers search queries. A product write and a search
  index update are never two operations that can disagree — see
  `syncProductSearchVector` in `src/lib/search-index.server.ts`, called
  in the same transaction as the product write itself.
- The typo tolerance here is real but more modest than a dedicated
  engine's: `similarity()` catches near-misses on individual words
  (`jaket` → `Jacket`) but doesn't do phonetic matching or learned
  relevance ranking. For a catalogue at this scale, that's a reasonable
  trade — see the honest limitation noted in ADR 0012 as well.
- If the catalogue grows enough that Postgres search latency becomes a
  real problem (order of magnitude beyond what GIN indexes handle
  comfortably — tens of thousands of products with heavy concurrent
  search traffic), migrating to Typesense/Meilisearch later is a
  bounded, isolated change: `search.server.ts` is the only file that
  would need to change, since every caller (the `/search` page, facet
  sidebar) only knows about `searchProducts()` and `getFacets()`, not
  how they're implemented.
- No new service in the deployment — one less thing to keep running,
  monitor, and pay for, which matters more at this project's actual
  scale than the marginal search-quality improvement would.
