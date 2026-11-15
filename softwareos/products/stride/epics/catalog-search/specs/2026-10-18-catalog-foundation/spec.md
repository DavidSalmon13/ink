# Catalog Foundation

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/catalog-foundation
> Covers: apps/api/prisma/migrations/*_catalog/**, apps/api/src/catalog/**, apps/api/prisma/seed.ts, packages/shared/src/catalog/**

## Overview

The first catalog-search spec. It adds the catalog data layer that every later spec reads:
- the Category, Product and ProductVariant models and their migration
- shared size rules and enums
- one catalog data file holding the 30 products from the design handoff
- an idempotent loader, and the seed that fills previews and CI with them

It has no API routes and no pages. product-catalog and product-detail add their own GET endpoints, and home-page adds the home page.

Images: the brief says "images from /public". Instead, products carry ProductArt data (`artKind`, `artColor`, `artAccent`), which the design handoff (`stride-design/design-system/components/ProductArt`) uses until real photos land. `imageUrl` is nullable, so photos can replace the art later without a migration.

Depends on accounts-auth `api-foundation` (`apps/api`, Prisma in the API, CI migrate step, `apps/api/vercel.json`).

## Goals & User Stories

- As a shopper, I see a hand-picked catalog of 30 real-looking products, split evenly across Shoes, Apparel and Gear and covering every run type and gender, so every filter has something to show.
- As a shopper, each product has a price in USD, a plain-language guidance tag and a description, and stock per size, so later pages can show what's available.
- As a developer, every preview and CI run starts with the same catalog, and a typo in the data fails a test instead of reaching a page.

## Acceptance Criteria

1. AC1: An additive migration (`*_catalog`) creates `Category`, `Product` and `ProductVariant`, plus the enums `RunType` (ROAD, TRAIL, RACE_DAY), `Gender` (MEN, WOMEN, UNISEX) and `ArtKind` (shoe, tee, longsleeve, jacket, shorts, cap, socks, vest, belt). `prisma migrate deploy` succeeds on an empty database and on one with the auth tables, and it changes no existing table.
2. AC2: `Product` has:
   - unique `slug`, `name`, `subtitle`, `description` and an optional `techNote`
   - `categoryId`, `runType`, `gender`
   - `priceCents` (Int; a database CHECK requires > 0) and `beginnerTag`
   - `featured` and `isNew` (Boolean, default false)
   - `artKind`, `artColor` and `artAccent` (hex)
   - an optional `imageUrl`, and timestamps

   It is indexed on `categoryId`, `runType`, `gender` and `priceCents`. `Category` has a unique `slug`, a `name` and a `sortOrder`.
3. AC3: `ProductVariant` has `productId`, `size` (a label: "US 9", "M", "One size"), `sortOrder` and `stock` (Int, default 0; a database CHECK requires ≥ 0), and it is unique on (`productId`, `size`). Deleting a product deletes its variants.
4. AC4: `@stride/shared` exports from `src/catalog/`:
   - the size sets: shoes are US 6–13 including half sizes (15 sizes), apparel is XS, S, M, L, XL, and gear is "One size"
   - `sizesForCategory(slug)`
   - Zod enums and display labels for category, run type and gender, matching the database enums
5. AC5: `apps/api/src/catalog/catalog-data.ts` holds the design's 30 products: 10 Shoes, 10 Apparel and 10 Gear, with the design's names, subtitles, run types, genders, prices, tags and art colours. Each product has a plain-language description and an optional tech note. A unit test asserts that:
   - slugs are unique and URL-safe
   - prices are positive integer cents
   - each product's sizes match its category's size set
   - colours are valid hex
   - every run type and gender appears
   - at least 4 products are featured
   - at least one product is fully sold out
   - at least one in-stock product has a sold-out size
6. AC6: `loadCatalog(prisma)` in `apps/api/src/catalog/` upserts categories and products by slug, and variants by (product, size), in one transaction. Running it twice leaves the same rows and counts. It never deletes products or variants, because later carts and orders will reference them.
7. AC7: `prisma db seed` runs `apps/api/prisma/seed.ts`, which calls `loadCatalog`. When `VERCEL_ENV=production` it exits non-zero with a clear message and writes nothing.
8. AC8: Previews and CI start seeded:
   - On Preview only, the API's Vercel build runs the seed after `prisma migrate deploy`.
   - CI runs it after its migrate step.
   - A test against `TEST_DATABASE_URL` sees 30 products after seeding.
9. AC9: No API route, page or web code changes. Every existing API, web and shared test still passes.

## Technical Approach

- **Schema:** the three models and three enums go into `apps/api/prisma/schema.prisma` (a wiring edit to api-foundation's file). `prisma migrate dev --name catalog` creates the migration, then the CHECK constraints for `priceCents > 0` and `stock >= 0` are added to `migration.sql` by hand, because Prisma can't express them. The cart-checkout stock transaction also relies on that CHECK.
- **Shared:** `packages/shared/src/catalog/` holds `sizes.ts` (the size sets and `sizesForCategory`) and `enums.ts` (Zod enums with labels), re-exported from `index.ts`. The URL slugs for filters are product-catalog's decision, not this spec's.
- **Data:** `apps/api/src/catalog/catalog-data.ts` exports a typed `CatalogEntry[]` and the categories. Keeping it under `src/` means it's type-checked and the API's Vitest config already picks up its tests. Each product's variants list `{ size, stock }` in size order.
- **Loader:** `apps/api/src/catalog/load-catalog.ts` exports `loadCatalog(prisma)`, which does the upserts in one `$transaction`. Launch & Polish's production catalog load will reuse it.
- **Seed:** `apps/api/prisma/seed.ts` is a thin entry point. It checks `VERCEL_ENV`, connects with `PrismaClient`, calls `loadCatalog` and disconnects. `apps/api/package.json` gets `"prisma": { "seed": "tsx prisma/seed.ts" }`, with `tsx` added as an exact-pinned devDependency.
- **Previews:** `apps/api/vercel.json`'s build command appends `&& if [ "$VERCEL_ENV" = "preview" ]; then prisma db seed; fi` after migrate. CI (`ci.yml`) adds `npx prisma db seed` in `apps/api` after the migrate step.
- **Tests:**
  - `catalog-data.test.ts`: data invariants
  - `sizes.test.ts` and `enums.test.ts` in shared
  - `load-catalog.test.ts`: a fake Prisma client, checking the calls and idempotence
  - `load-catalog.db.test.ts`: run twice on `TEST_DATABASE_URL`; check the counts and that a negative stock is rejected by the CHECK
  - `seed-guard.test.ts`: refuses production

## Out of Scope

- Catalog API endpoints and response schemas (product-catalog, product-detail)
- Pages, the ProductArt and ProductCard components, header links (product-catalog, product-detail, home-page)
- Real product photos, and an admin page or CMS (post-v1 per the roadmap)
- Colour variants (out of v1 per the mission)
- The production catalog load step and its stock policy (launch-polish). It reuses `loadCatalog`.
- Deleting or renaming products through the loader, and full-text search

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md): Prisma 6 in `apps/api`, one shared catalog data file, previews seeded after migrate, a seed that refuses production, expand → contract migrations, shared Zod
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch, commits and PR

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
