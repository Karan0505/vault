# 0014 — Partial Prerendering for the product page, and what performance work could actually be verified here

## Status
Accepted — Phase 3

## Context
The brief sets concrete mobile Lighthouse targets (LCP < 2.0s, CLS <
0.05, INP < 200ms, Performance ≥ 90, product page First Load JS <
200kB) and asks for the reports to be committed to `docs/perf/`.
Generating real Lighthouse numbers requires running a headless browser
against a built, served instance of the app — this environment has no
browser and no network access to run one. Committing fabricated
numbers to satisfy the letter of that requirement would be worse than
not having them: a wrong performance report is actively misleading to
whoever reads it next, in a way "no report yet" isn't. What follows is
what was actually done — real code changes with a real mechanism —
plus exact, runnable instructions for generating the numbers
themselves. See `docs/perf/README.md` for those instructions.

## Decision — Partial Prerendering on the product page
`src/app/(storefront)/products/[slug]/page.tsx` sets `experimental_ppr
= true`. Everything above the `RecommendationsRail`'s `Suspense`
boundary — the gallery, the variant selector, the JSON-LD — is static
per Phase 1's tag-based ISR (ADR 0003); the recommendations rail is a
real per-request dynamic hole in that otherwise-static shell. This is
the direct extension of the Phase 1 "dynamic stock island" pattern the
brief introduced there, applied to the one new piece of Phase 3 content
that genuinely needs to be request-fresh (recent order data) without
forcing everything around it to be dynamic too.

## Decision — image and bundle discipline
- `next/image` is used throughout with explicit `sizes` (Phase 1) and
  `priority` now applied *conditionally*: the product page's hero image
  had it already; `ProductGrid` now accepts a `priorityCount` prop so
  only the cards actually above the fold (default 4, on the
  category/search grid) mark their image as an LCP candidate — the
  recommendations rail explicitly passes `priorityCount={0}` since it's
  always below the fold. Marking every image `priority` defeats the
  purpose of the hint; marking none of them misses the actual LCP
  element on grid-first pages like `/search`.
- Stripe.js (`@stripe/stripe-js`, `@stripe/react-stripe-js`) is only
  ever imported from `lib/stripe-client.ts` and the checkout components
  — nothing on the product or category page pulls it in, so it isn't in
  their bundle. This was true by construction from how Phase 2 was
  built (checkout is its own route), not a new change, but it's worth
  stating as the reason product-page bundle size doesn't include a
  payments SDK.
- `next.config.mjs` wires in `@next/bundle-analyzer` behind `ANALYZE=true`
  (`npm run analyze`) so bundle composition can actually be inspected —
  see `docs/perf/README.md`.

## What's honestly not done
No Lighthouse run happened against this build, because none could —
see Context. `docs/perf/` contains instructions and the exact commands
to produce `docs/perf/lighthouse-mobile.json` and a bundle analysis
locally or in CI, not fabricated results. Whether the current build
actually clears LCP < 2.0s / CLS < 0.05 / INP < 200ms / Performance ≥
90 / First Load JS < 200kB is genuinely unverified — the PPR and image
work above are reasonable, targeted changes toward those numbers, not
proof of hitting them.

## Consequences
- The next actual step for this phase, before treating its performance
  requirement as done, is running `npm run build && npm run start`
  locally (or in a CI job with a headless Chrome available) and the
  Lighthouse CLI command in `docs/perf/README.md`, then committing the
  resulting JSON/HTML report for real.
- If First Load JS on the product page turns out to be over budget once
  measured, the two most likely contributors are framer-motion (used in
  `ImageGallery` and `VariantSelector`) and the `VariantOptionGroup`
  keyboard-navigation logic — neither is code-split from the main
  bundle currently. `next/dynamic` with `ssr: true` for the gallery
  specifically (it doesn't need to be interactive until hydration
  anyway) would be the first thing to try, and is flagged here rather
  than guessed at blindly, since guessing at a bundle-size fix without
  the analyzer output to confirm it moved the needle would be the same
  category of mistake as fabricating a Lighthouse score.
