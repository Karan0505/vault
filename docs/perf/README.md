# Performance reports

This folder is where the brief's required deliverables go: mobile
Lighthouse reports, a bundle analysis, and the search query plan. As of
this commit, **none of the actual report files exist yet** — generating
them requires a headless browser and a running instance of the app,
neither of which is available in the environment this project was
built in. See ADR 0014 for the full reasoning; this file is the
runnable instructions to actually produce them.

## 1. Mobile Lighthouse report

```bash
npm run build
npm run start &            # serves the production build on :3000
npx lighthouse http://localhost:3000 \
  --preset=perf \
  --form-factor=mobile \
  --screenEmulation.mobile \
  --throttling-method=simulate \
  --output=json --output=html \
  --output-path=docs/perf/lighthouse-home
```

Repeat with `http://localhost:3000/products/waxed-field-jacket` (the
seeded product page — this is the one the First Load JS budget in the
brief is actually about) and
`http://localhost:3000/search?q=jacket` for the search/facets page,
saving each to its own `--output-path`. Commit the resulting
`.json`/`.html` files here. The targets to check the output against:

| Metric | Target |
|---|---|
| LCP | < 2.0s |
| CLS | < 0.05 |
| INP | < 200ms |
| Performance score | ≥ 90 |

## 2. Bundle analysis

```bash
npm run analyze
```

This runs `next build` with `@next/bundle-analyzer` enabled (wired into
`next.config.mjs` behind `ANALYZE=true`) and opens an interactive
treemap of what's actually in each route's JS bundle. Screenshot or
export it into `docs/perf/bundle-analysis/` and note the product page's
First Load JS number specifically — the brief's budget is 200kB for
that route. If it's over, ADR 0014 names the two most likely
contributors (framer-motion in the gallery/selector, the keyboard-nav
logic) as the first things to try code-splitting with `next/dynamic`.

## 3. Search query plan

```bash
psql "$DATABASE_URL" -c "
EXPLAIN ANALYZE
SELECT p.id, p.slug, p.title, MIN(v.\"priceAmount\")
FROM products p
JOIN product_variants v ON v.\"productId\" = p.id AND v.\"isEnabled\" = true
LEFT JOIN inventory_items i ON i.\"variantId\" = v.id
LEFT JOIN categories c ON c.id = p.\"categoryId\"
WHERE p.status = 'active'
  AND (p.\"searchVector\" @@ websearch_to_tsquery('english', 'jacket')
       OR similarity(p.title, 'jacket') > 0.25)
GROUP BY p.id
ORDER BY MAX(p.\"updatedAt\") DESC
LIMIT 12;
" > docs/perf/search-query-plan.txt
```

Confirm the plan actually uses the GIN index on `searchVector`
(`Bitmap Index Scan on products_searchVector_idx` or similar in the
output) rather than a sequential scan — that's the concrete thing this
file exists to verify, per ADR 0011.

## Once generated

Commit the actual output files from all three steps into this folder,
replacing this README's role as a placeholder with real numbers a
reviewer can check against the targets above.
