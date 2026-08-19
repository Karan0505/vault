# 0015 — Accessibility: a real focus trap, not just a visual drawer, and a real radiogroup, not just Tab-able buttons

## Status
Accepted — Phase 3

## Context
The brief names two specific accessibility requirements: "keyboard
navigable variant selector and cart" and "focus management when the
drawer opens and closes." Both point at the same underlying failure
mode — a component that *looks* right and works fine with a mouse, but
was never actually driven with a keyboard to check.

## Decision — cart drawer focus management
Phase 2's cart lived only at `/cart`. Phase 3 adds `CartDrawer`
(`src/components/cart/CartDrawer.tsx`), a slide-over triggered from the
header — and the brief's phrasing ("focus management when the drawer
opens and closes") only makes sense for a drawer, not a page, so this
was the concrete trigger for building one. Three things happen, all
driven by two `useEffect` hooks:

1. **On open**: `document.activeElement` is captured before focus
   moves, and focus is sent to the drawer's close button.
2. **While open**: `Tab` and `Shift+Tab` are intercepted and wrapped at
   the first/last focusable element inside the panel — focus can never
   land on something behind the overlay while it's open.
3. **On close** (Escape, the close button, or the backdrop): focus
   returns to exactly the element that had it before the drawer opened
   — not the top of the page, not nowhere.

`/cart` as a full page still exists and still works — the drawer is an
addition for the common "quick look at the cart" case, not a
replacement for a reachable, linkable cart page.

## Decision — variant selector as a real radiogroup
Phase 1/2's `VariantSelector` used `role="radio"` on a set of plain
`<button>` elements, each independently in the Tab order. That's a
common but real ARIA mistake: a native radio group (and the ARIA
authoring practices for `role="radiogroup"`) uses a **single** tab
stop, with arrow keys moving both focus and selection among the
options. Tabbing through every size and colour individually — as the
old version did — is slower and less predictable for a keyboard user
than the brief's "keyboard navigable" implies.

`VariantOptionGroup` (`src/components/product/VariantOptionGroup.tsx`)
replaces that: only one button per dimension is in the Tab order at a
time (the selected value, or the first *selectable* one — an ARIA
radiogroup ignores disabled/out-of-stock options as if they weren't
there), and `ArrowRight`/`ArrowDown`/`ArrowLeft`/`ArrowUp`/`Home`/`End`
move between the selectable values in that dimension, skipping disabled
ones entirely rather than landing on a value that can't be chosen.


## Consequences
- The focus trap and roving tabindex are both hand-rolled rather than
  pulled from a headless UI library (Radix, Headless UI) — a deliberate
  scope choice to keep the dependency surface small for what's a
  contained, well-understood pattern, not a statement that a library
  version would be wrong. A larger admin console or a design system
  meant to be reused elsewhere would tip that trade the other way.
- "Zero critical axe violations" (the brief's other accessibility
  line) isn't verified here for the same reason Lighthouse isn't in
  ADR 0014 — axe-core needs a real rendered DOM (a browser or jsdom)
  to run against, which this environment doesn't have. The two fixes
  above target the specific, nameable defects a keyboard-only pass
  would actually catch; running `@axe-core/playwright` (or the
  browser extension) against a local `npm run dev` is the next real
  step, the same way a real Lighthouse run is for ADR 0014 — both
  belong in `docs/perf/README.md`'s follow-up list rather than being
  asserted here without having been run.
