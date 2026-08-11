# VAULT — Phase 1: catalogue and data model

A production-shaped commerce catalogue and its ops console. This is
Phase 1 of four — storefront browse/product pages plus admin CRUD for
products, variants, categories, and media. Cart, checkout, search, and
fulfilment are later phases; see `docs/decisions/` for what's
deliberately deferred and why.

## Stack

Next.js 15 (App Router), TypeScript (`strict`, `noUncheckedIndexedAccess`,
no `any` in `src/`), Postgres + Prisma, Tailwind, Framer Motion,
Auth.js v5 (staff-role gating), UploadThing (product media), Zod
(input validation), Vitest.

## What's here

```
src/
  app/
    (storefront)/            public storefront — home, category, product pages
    admin/
      sign-in/               staff sign-in, outside the auth gate
      (protected)/           everything behind requireStaff() — dashboard,
                              products, categories, collections
    api/
      admin/                 product + category CRUD, staff-only
      auth/                  Auth.js route handler
      upload/                UploadThing route handler
      revalidate/             signed generic tag-revalidation endpoint
  components/
    ui/                      small design-system primitives (Button, Input, ...)
    storefront/               ProductCard, ProductGrid, VariantSelector, ImageGallery, ...
    admin/                    ProductForm, VariantMatrixEditor, ImageUploader, ...
  lib/
    variants.ts               the option-matrix logic — generation, selectability,
                               reconciliation. Pure functions, unit tested.
    money.ts                  integer-minor-unit money helpers. Pure functions, unit tested.
    revalidate.ts              the tag scheme + revalidateProduct/Category/Collection
    products.server.ts         tagged reads + transactional writes for products
    auth.ts                    Auth.js v5 config, staff-role gating
    validation.ts               Zod schemas for admin input
prisma/
  schema.prisma                Product, ProductVariant, InventoryItem, Category,
                                Collection, Media, PriceList, User
  seed.ts                      3 categories, 6 products, full variant matrices
docs/
  decisions/                   ADRs — read these for the "why", not just the "what"
```

## Running it locally

```bash
cp .env.example .env        # fill in DATABASE_URL at minimum
npm install
npm run db:generate
npm run db:migrate          # creates the schema
npm run db:seed             # 3 categories, 6 products, real variant matrices, 3 staff users
npm run dev
```

Storefront: `http://localhost:3000`
Ops console: `http://localhost:3000/admin` — sign in with
`admin@vault.internal` (no password in this phase; see ADR 0004 for
why customer auth and real staff credentials are Phase 2 scope).

Staff seed accounts: `admin@vault.internal`, `fulfilment@vault.internal`,
`support@vault.internal`. Only `admin` can create or edit products and
categories in Phase 1 — `fulfilment`/`support` can view the console but
writes are rejected server-side (`403`), not just hidden behind a
disabled button.

Product media requires an UploadThing token (`UPLOADTHING_TOKEN`) to
actually upload; without one the uploader will render but uploads will
fail — the storefront and product pages still work fine against seeded
Unsplash placeholder URLs.

## Tests

```bash
npm run test        # vitest — variant matrix + money logic
npm run typecheck   # tsc --noEmit, strict
```

The two hard problems this phase actually has — generating a correct
variant matrix and never letting a shopper select their way into a
combination that doesn't exist — are pure functions in
`src/lib/variants.ts`, unit tested in
`src/lib/__tests__/variants.test.ts` with no database or browser
needed. Money handling (`src/lib/money.ts`) is tested the same way,
including the largest-remainder split that later phases' discount and
refund math will lean on.

## Done-criteria check (from the brief)

- **"Editing a price in admin updates the storefront within seconds
  with no redeploy and without busting unrelated pages"** — verify by
  editing a variant's price in `/admin/products/<id>/edit`, saving,
  and reloading the product page. `revalidateProduct()` invalidates
  exactly `product:<slug>`, the owning `category:<slug>`, and the
  generic `product-list` tag — see ADR 0003. A second, unrelated
  product's cached page is untouched.
- **"Variant selection is URL-addressable and shareable"** — the
  product page selector writes the current selection into query params
  (`?size=m&colour=indigo`); copy the URL and it reopens on the same
  variant.
- **"A product with size crossed with colour should generate the right
  variant matrix, and impossible combinations should be disabled in
  the UI rather than 404ing after selection"** — `generateVariantMatrix`
  + `getSelectableValues`, exercised by both the admin matrix editor
  and the storefront selector; see ADR 0005.

## What's deliberately not here yet

Cart, checkout, payments, discounts, search, and fulfilment are Phases
2–4. `InventoryItem.reserved` and `.version` columns exist in the
schema now so Phase 2's reservation system doesn't need a migration to
add them later, but nothing writes to them yet.
