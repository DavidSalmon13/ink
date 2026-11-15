# Catalog & Search — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

Server Components render Home, Catalog and Product detail, reading from the NestJS API's catalog endpoints (`apps/api`, server-to-server via `API_URL`). Catalog state (search query, filters, sort, price range) lives in URL search params. The page passes those params to the API, which runs one Prisma query, so results are server-rendered and shareable. Small Client Components only update the URL (search box, filter controls) or hold local UI state (size selector). This epic creates the Prisma schema and seed script for Category, Product and ProductVariant. Products render from ProductArt data (`artKind`/`artColor`/`artAccent`) rather than images in /public; `imageUrl` is nullable, and real photos are uploaded later from the CMS to Vercel Blob (cms `product-images`, 2026-10-19), with ProductArt as the fallback. Add-to-cart and wishlist buttons are placed on the pages but wired up in later epics.

## Architecture Impact

Builds on the app base created by Accounts & Auth (`app-foundation`: scaffold, CI, Prisma + Neon, shared client, shared layout/header; `api-foundation`: the NestJS API that now owns Prisma):

- An API catalog module and a migration (in `apps/api`) adding models Category, Product, ProductVariant (size + stock). Product holds run type, gender, beginner tag, price in cents and slug.
- Seed script for the catalog. Catalog content lives in its own shared data module (`apps/api/src/catalog/catalog-data.ts`), separate from the seed logic. The seed imports it, and so does Launch & Polish's production catalog load, so the two can't drift apart.
- Routes `/`, `/catalog`, `/product/[slug]`, plus catalog links in the shared header.
- No new external services.

## Risks & Unknowns

- Schema for filters: run type/gender as enums vs. tags. This decides query shape, so settle it in the first spec.
- Product data and images: need ~30 real-looking products. Resolved for images: the seed uses ProductArt, and photos are uploaded later from the CMS to Vercel Blob (cms `product-images`), so licensed images don't block the seed.
- Combined filters + search + sort in one Prisma query: keep it simple (case-insensitive contains) and don't add full-text search.
- Neon and API cold starts may slow the first SSR load (page → API → database is now two hops). Check on a Vercel preview; cache public catalog reads. Deferred with the Vercel work: v1 reads the catalog with `no-store`.
- Depends on accounts-auth `api-foundation` (the NestJS API, monorepo and `/api` rewrite) — the backend moved to a separate NestJS service on 2026-10-13 (`../../architecture.md`).
- Size model: half sizes for shoes vs. XS–XL vs. one size. Make sure ProductVariant handles all three cleanly.
- Spike: none needed (the Prisma + Neon + Vercel preview smoke test runs in Accounts & Auth's `app-foundation`).

## Candidate Specs

- `catalog-foundation` — Prisma schema (Category/Product/ProductVariant + RunType/Gender/ArtKind enums, CHECK constraints), shared sizes/enums in `@stride/shared`, `apps/api/src/catalog/catalog-data.ts` + idempotent `loadCatalog`, and a guarded preview/CI seed
- `product-catalog` — `GET /catalog/products` (public, proxy-secret only, shared `catalogQuerySchema`, facet counts per run type/category/gender) and a server-rendered /catalog with search, multi-select filters, price range and sort in URL params, plus no-results and loading states and a catalog-only e2e. Cards have no wishlist heart or add-to-cart. No caching: v1 uses `no-store` (deferred with Vercel)
- `product-detail` — server-rendered /product/[slug] with a single ProductArt instead of images (`imageUrl` unused), the guidance tag, a native-radio size selector, per-size stock ("Only n left" at ≤ 3) and a fully sold-out state. A route-scoped not-found page returns a real 404: the proxy checks the slug format, then existence via the API, and on a miss serves the rendered not-found HTML with status 404 (`notFound()` alone streams a 200 under `cacheComponents`). `GET /catalog/products/:slug` is public, behind the proxy secret only. No add-to-cart or wishlist; `ProductPurchasePanel`'s `actions(selectedSize)` is the slot for cart-checkout and account-wishlist
- `home-page` — server-rendered `/` with the hero, static bands, a featured rail and shop-by-run / shop-by-category tiles. No new endpoint: the featured rail's tabs use `GET /catalog/products?sort=featured`, plus `category=` for Shoes/Apparel/Gear (first 3 each, all fetched on the server). The tiles are static links into `/catalog?run=` and `?category=`, with no counts. If the API fails, the rail falls back to a "Browse the full range in the catalog" link and the rest of the page still renders. Lands the Playwright journey e2e (landing → catalog → filter → product detail), which runs in GitHub Actions CI against the seeded Postgres
- `shoe-finder` (added 2026-10-21, demo, shaped, `specs/2026-10-21-shoe-finder`) — a "Stride Shoe Guide" chat launcher on `/` and `/catalog` asks 5 multiple-choice questions and shows 3 shoe picks with a reason and a size suggestion. The browser reads the existing `GET /api/catalog/products` (no API change); the answers filter the shoes in `features/shoe-finder/recommend.ts` and the top 3 in featured order are shown. LLM ranking is future work
- `catalog-pagination` (added 2026-10-23, shaped, `specs/2026-10-23-catalog-pagination`) — page-number pagination for `GET /catalog/products` and /catalog: 12 per page, an optional `pageSize` ≤ 100 for internal callers (home rail and no-results ask for 3, home picks and the shoe finder for 100), a real total via `count`, a `slug` tiebreaker on every sort, and Previous / numbered / Next links that keep the other URL params. Changing a filter or the sort goes back to page 1
