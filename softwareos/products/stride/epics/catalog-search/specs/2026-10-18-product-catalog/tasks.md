# Tasks — Product Catalog

> Epic: catalog-search
> Spec: 2026-10-18-product-catalog
> Branch: feat/catalog-search/product-catalog

## Gate

- [x] T1 (demo branch: api-foundation, auth-api-migration and catalog-foundation (through T17; QA pending) are on feat/accounts-auth/auth-api-demo; built there) Check that accounts-auth `api-foundation` and `auth-api-migration` are merged into `develop`. Also check that catalog-foundation is merged, including:
  - the Category/Product/ProductVariant migration
  - `packages/shared/src/catalog/`: `categorySlugSchema`, `runTypeSchema`, `genderSchema`, the label maps and the barrel
  - `apps/api/src/catalog/catalog-data.ts` and `loadCatalog`
  - `apps/api/prisma/seed.ts`
  - the CI "Seed database" step

  Then create `feat/catalog-search/product-catalog` from the latest `develop`. Stop if any of these is still only on its feature branch (AC1, AC13).

## Tests first (TDD)

- [x] T2 Write failing Vitest tables in packages/shared/src/catalog/query.test.ts, starting with `// covers AC2, AC3, AC7, T2`.
  - **Slug maps:** `road`/`trail`/`race-day` ↔ `ROAD`/`TRAIL`/`RACE_DAY` and `men`/`women`/`unisex` ↔ `MEN`/`WOMEN`/`UNISEX` round-trip. The map keys equal the options of foundation's `runTypeSchema`/`genderSchema`.
  - **`catalogQuerySchema` (strict):**
    - `{}` parses to `sort: "featured"` with empty groups.
    - `q` is trimmed, and 101 characters is rejected.
    - A single string and a string array are both accepted for `category`/`run`/`gender`.
    - `min`/`max` coerce from strings such as `"50"`.
    - These each fail with a `fieldErrors` key for that field: `"49.5"`, `"-1"`, `"abc"`, `run=ultra`, `category=socks`, `sort=cheap`.
    - `min=100&max=50` fails with a `max` field error.
  - **`parseCatalogSearchParams` (lenient):**
    - It accepts both a Next `searchParams` object and `URLSearchParams`.
    - It drops unknown or invalid values: it keeps `run=trail` and drops `run=ultra`.
    - It de-dupes repeated values, drops a bad `min`/`max`/`sort`, and drops both prices when `min` > `max`.
    - It never throws, and it returns the same shape as the strict schema.
  - **`catalogQueryToSearchParams`:**
    - It emits only `q, category, run, gender, min, max, sort`, in a fixed order.
    - It omits defaults: `sort=featured`, an empty `q` and empty groups.
    - Repeated values come out in a stable order, so the same query always builds the same string.
    - Parse → build → parse is stable.
  - **Response schemas:** `catalogProductSchema` rejects an item with a missing or extra key. `catalogProductsResponseSchema` requires `facets.category|run|gender` to have a count for every option. (testing skill)
- [x] T3 Write failing apps/api/src/catalog/catalog.service.test.ts, starting with `// covers AC3, AC4, AC5, T3`. Use the fake-db style of apps/api/src/auth/testing/fake-db.ts: a fake `PrismaService` whose `product.findMany` records its args and returns fixture rows.
  - **Where clause:**
    - `q` → `name: { contains, mode: "insensitive" }`
    - each group → `in` with the enum values (`race-day` → `RACE_DAY`; category via `category: { slug: { in } }`)
    - `min`/`max` → `priceCents: { gte: min*100, lte: max*100 }`
    - an empty query → an empty where
  - **orderBy:** `featured` → `[{ featured: "desc" }, { name: "asc" }]`. `price-asc`/`price-desc` sort by priceCents, then name A–Z.
  - **Queries:** the product query has an explicit `select` and `variants: { where: { stock: { gt: 0 } }, take: 1, select: { id: true } }`. The facet query's where holds only `q` and price. Both queries run in one `Promise.all`.
  - **Mapping:**
    - each item has exactly the AC5 keys
    - `category`/`run`/`gender` are URL slugs
    - `soldOut` is true when `variants` is empty
    - `art` is `{ kind, color, accent }`
    - `imageUrl` stays `null`
  - **Facets:** every option appears, zeros included. Each group's counts apply the other groups' filters but not its own; for example, with `run=trail` selected, the `run` counts still show road/race-day. `total === products.length`. (testing skill)
- [x] T4 Write failing apps/api/src/catalog/catalog.controller.test.ts, starting with `// covers AC1, AC2, AC5, T4`. Make real HTTP calls through `createNestApplication` with the fake DB, following account-security.controller.test.ts. Build the app from `AppModule` with `PrismaService` overridden, so the real middleware chain runs.
  - `GET /catalog/products` without `x-stride-proxy-secret` → 401.
  - With the secret and no cookie → 200. The body parses with `catalogProductsResponseSchema`, and no AuthGuard is involved.
  - These each return 400 `{ fieldErrors }` with the right key: `?run=ultra`, `?min=1.5`, `?min=-1`, `?min=100&max=50`, `?sort=cheap`, and a 101-character `q`.
  - Repeated `?category=shoes&category=gear` reaches the service as a 2-value array.
  - The response carries the SecurityHeaders headers. (testing skill)
- [x] T5 Write failing apps/api/src/catalog/catalog.db.test.ts, starting with `// covers AC3, AC4, AC5, T5`. Follow apps/api/src/auth/session.db.test.ts: `describe.skipIf(!process.env.TEST_DATABASE_URL)`, a 60 s timeout, and a `PrismaService` built with `datasourceUrl`. The test only reads from the seeded catalog; it writes nothing.
  - With no params there are 30 products, `total` is 30, and each group's facet counts sum to 30.
  - Each filter alone, and all of them combined (`q=shoe&run=trail&gender=women&category=shoes&min=50&max=150`), match a filter over `catalogData` computed in the test.
  - `q` is case-insensitive (`SHOE` gives the same results as `shoe`) and matches only the name, not the subtitle.
  - Price bounds are inclusive at an exact catalog price.
  - The sorts match AC4, including ties.
  - Thermal Long-Sleeve Top is `soldOut`.
  - Facet counts for a combined query match the exclude-own-group rule. (testing skill)
- [x] T6 Write failing web RTL tests (jsdom) in apps/web/src/features/catalog/format-price.test.ts and apps/web/src/features/catalog/ProductCard.test.tsx, each starting with `// covers AC10, T6`.
  - `formatPriceCents(11000)` → `$110.00`, and `formatPriceCents(450)` → `$4.50`.
  - ProductCard renders the name as an `h3`, the subtitle, the guidance-tag badge and the price.
  - The whole card is one link to `/product/<slug>`.
  - The ProductArt SVG is decorative (`aria-hidden`) and sits inside the 4:5 well.
  - A `soldOut` product shows an `Out of stock` badge, keeps the link and has the dimmed-art class.
  - There is no wishlist button and no add-to-cart button. (testing skill)
- [x] T7 Write failing RTL tests in apps/web/src/features/catalog/ActiveFilterChips.test.tsx (`// covers AC7, AC8, T7`) and apps/web/src/features/catalog/NoResults.test.tsx (`// covers AC11, T7`).
  - **Chips:**
    - one chip per selected value, plus a query chip and a price chip (`$50 – $150`, `$50 – any` or `any – $150`)
    - each chip is a link whose `aria-label` starts with "Remove filter"
    - each chip's href is the canonical URL without that value, built with `catalogQueryToSearchParams`, so `sort` is kept
  - **NoResults:**
    - With a query, it shows `Try a shorter word, or one of these:` and links for `shoe`/`socks`/`tee`. Each link's href is `/catalog?q=<word>` plus the current `sort`, with no filters.
    - Without a query, it shows `Try removing a filter or widening the price range.`
    - It always shows `Clear search & filters` (keeping `sort`) and a "Popular with beginners" grid of the 3 products it receives as a prop. (testing skill)
- [x] T8 Write failing RTL tests in apps/web/src/features/catalog/FilterForm.test.tsx (`// covers AC7, AC8, T8`), and add cases to apps/web/src/components/layout/Header.test.tsx (`// covers AC9, T8`, wiring edit). Mock `next/navigation` as the existing Header test does, and use fake timers.
  - FilterForm is a `<form method="get" action="/catalog">` that contains:
    - fieldsets Run type, Category and Gender, with checkbox `name`s `run`/`category`/`gender`, the URL slug values, and labels showing the facet count
    - Min/Max price number inputs
    - a search input with the placeholder `Search by name, e.g. trail shoe`
  - Ticking a box calls `router.push` with the canonical URL.
  - Typing in search calls `router.replace` once, 300 ms after the last keystroke.
  - `Clear all` pushes a URL that keeps only `sort`.
  - SortSelect offers Featured / Price: low to high / Price: high to low, and pushes `sort` (omitted for Featured).
  - FiltersToggle flips `aria-pressed`, which starts as `true`.
  - Header: the search box is a `form[role=search]` with `method="get"`, `action="/catalog"` and an input named `q`. The mobile search control is a link to `/catalog`. (testing skill)
- [x] T9 (reopened 2026-10-18 by spec change: AC7 no longer promises no-JS; no-JS block removed, catalog e2e 6/6 green) Write failing Playwright apps/web/e2e/catalog.spec.ts, starting with `// covers AC6, AC7, AC11, AC13, T9`. It needs the seeded DB.
  - **Raw HTML:** for `request.get("/catalog")` and `request.get("/catalog?run=trail&gender=women")`, the raw HTML already contains the matching product names and none of the others.
  - **Filter and sort journey:**
    - /catalog shows `Shop all (30)` and a `Home / Shop all` breadcrumb.
    - Click the Trail tile, then tick the Shoes category, and check that the URL and the count update.
    - Search, sort by price low to high, and check that the first card's price is at most the second's.
  - **No results:** search for a nonsense word to reach `Shop all (0)`, then `Clear search & filters` brings back all products.
  - **Reload:** reloading a filtered URL shows the same results, checked boxes, tile state and sort.
  - **Bad params:** `/catalog?run=ultra&min=abc` renders all products with no error.
  - **No JS:** remove the `test.use({ javaScriptEnabled: false })` block; AC7 no longer promises a catalog that works without JS (spec change 2026-10-18). (testing skill)

## API

- [x] T10 Add packages/shared/src/catalog/query.ts with:
  - the URL slug ↔ enum maps for run and gender (this spec owns the URL slugs)
  - a strict `catalogQuerySchema`, which accepts a string or a string array per group, coerces `min`/`max` to non-negative integers, rejects `min` > `max` on `max`, and defaults `sort` to `featured`
  - `parseCatalogSearchParams(searchParams)`
  - `catalogQueryToSearchParams(query)`
  - `catalogProductSchema` and `catalogProductsResponseSchema`
  - the inferred `CatalogQuery`, `CatalogProduct` and `CatalogProductsResponse` types

  Reuse foundation's `categorySlugSchema`/`runTypeSchema`/`genderSchema`, and don't import Prisma. Add `export * from "./query";` to packages/shared/src/catalog/index.ts (wiring edit). T2 goes green.
- [x] T11 Add apps/api/src/catalog/catalog.service.ts with `CatalogService.listProducts(query)`.
  - It runs two `PrismaService` queries in `Promise.all`:
    - the product `findMany`, with the full where, the AC4 orderBy, an explicit select and the `variants` stock probe
    - the facet `findMany`, filtered on q and price only and selecting `category.slug`, `runType` and `gender`
  - It computes the facet counts in memory with the exclude-own-group rule.
  - It maps rows to `CatalogProduct`: enum → URL slug, `soldOut` from the probe, `art` from `artKind`/`artColor`/`artAccent` (AC3, AC4, AC5). T3 goes green.
- [x] T12 Add apps/api/src/catalog/catalog.controller.ts and apps/api/src/catalog/catalog.module.ts.
  - The controller is `@Controller("catalog")` with `@Get("products")` and no guard. It validates `@Query()` with the existing `ZodBodyPipe(catalogQuerySchema)`. A comment notes that the pipe works for any object input, which keeps the 400 `{ fieldErrors }` contract, and that product-detail adds its route here.
  - Register `CatalogModule` in apps/api/src/app.module.ts (wiring edit). The existing SecurityHeaders → ProxySecret → OriginCheck chain applies unchanged (AC1, AC2). T4 and T5 go green.

## Web

- [x] T13 Add these files in apps/web/src/features/catalog/ (AC10). T6 goes green.
  - format-price.ts: `formatPriceCents`, using `Intl.NumberFormat` (en-US, USD).
  - ProductArt.tsx: inline SVG rebuilt from stride-design/design-system/components/ProductArt (index.d.ts, bundle.js). One shape per `ArtKind`, colours from `color`/`accent`, styled with Tailwind and apps/web/src/styles/tokens.css.
  - ProductCard.tsx: the 4:5 art well, Badge/Price styling taken from the design-system bundle.css, and `Out of stock` with dimmed art.
  - ProductGrid.tsx: `grid-cols-[repeat(auto-fill,minmax(280px,1fr))]`, 400px when filters are hidden, and one column at 375px.

  All four are Server Components.
- [x] T14 Add apps/web/src/features/catalog/load-catalog-products.ts. `loadCatalogProducts(query)` calls `apiFetch("/catalog/products?" + catalogQueryToSearchParams(query))` with `cache: "no-store"`, throws on non-200, and parses the body with `catalogProductsResponseSchema`. Follow the loader in apps/web/src/app/account/security/page.tsx.

  Then add apps/web/src/app/catalog/page.tsx with:
  - metadata (`Shop all · Stride`)
  - a static shell holding the `Home / Shop all` breadcrumb and the design's intro copy from Catalog.dc.html
  - `<Suspense fallback={<CatalogSkeleton/>}>` around the async `CatalogResults`, which reads `searchParams` → `parseCatalogSearchParams` → `loadCatalogProducts`

  `CatalogResults` renders apps/web/src/features/catalog/CatalogView.tsx, which contains:
  - the H1 `Shop all (N)` with `aria-live="polite"`
  - the layout, which stacks the filters above the grid at ≤760px
  - the controls and the grid

  `apps/web` imports no Prisma (AC6, AC7, AC13).
- [x] T15 Add apps/web/src/features/catalog/CatalogSkeleton.tsx and apps/web/src/app/catalog/loading.tsx, which reuses it. Follow CatalogLoading.dc.html (AC12):
  - `aria-busy="true"` and a visually hidden `role="status"` reading "Loading products"
  - skeletons for the title, the 3 tiles and a 6-card grid
  - the pulse uses `motion-safe:animate-pulse`, so it's off under `prefers-reduced-motion`
- [x] T16 Add apps/web/src/features/catalog/RunTypeTiles.tsx and apps/web/src/features/catalog/ActiveFilterChips.tsx as Server Components. Each tile and chip is a link built with `catalogQueryToSearchParams`. The Road/Trail/Race day tiles toggle the same `run` values as the sidebar and show their pressed/active state. Chips follow the T7 rules (AC7, AC8). The chips half of T7 goes green.
- [x] T17 Add these Client Components (`"use client"`) in apps/web/src/features/catalog/. Match Catalog.dc.html and MobileCatalog.dc.html, with no mobile drawer (AC7, AC8). The FilterForm half of T8 goes green.
  - FilterForm.tsx: a GET form to `/catalog` that works without JS. With JS, it pushes the canonical URL on change, and search is debounced 300 ms via `router.replace`. It includes `Clear all` and the facet counts on the checkboxes.
  - SortSelect.tsx: sits inside the same form, so it also submits without JS.
  - FiltersToggle.tsx: local `aria-pressed` state. It hides the sidebar and switches the grid to the 400px minimum through a data attribute on the CatalogView wrapper, and does nothing else.
- [x] T18 Add apps/web/src/features/catalog/NoResults.tsx, following CatalogEmpty.dc.html (AC11):
  - the query and no-query copy
  - the `shoe`/`socks`/`tee` suggestion links
  - a `Clear search & filters` link to `/catalog` that keeps `sort`
  - the "Popular with beginners" ProductGrid

  In `CatalogResults`, when `total === 0`, call `loadCatalogProducts({})` once more and pass the first 3 products to NoResults; featured products come first in the default sort. T7 goes green.

## Wiring (wiring edits)

- [x] T19 Edit apps/web/src/components/layout/Header.tsx (AC9). The Header half of T8 goes green.
  - The placeholder `<div role="search">` becomes `<form role="search" method="get" action="/catalog">`, with the input `name="q"` and `maxLength={100}`, and the same styling.
  - The mobile search `<button>` becomes `<Link href="/catalog" aria-label="Search">`.
  - Remove the "Visual placeholder only" comment.
  - Make no other nav changes.

## Docs

- [x] T20 Edit softwareos/products/stride/epics/catalog-search/tech-plan.md:
  - Update the `product-catalog` candidate line to cover:
    - `GET /catalog/products`: public, proxy-secret only, shared `catalogQuerySchema`, facet counts per run type/category/gender
    - /catalog: server-rendered, with search, multi-select filters, price range and sort in URL params, plus no-results and loading states and a catalog-only e2e
    - no wishlist heart or add-to-cart on cards
    - no caching (v1 uses `no-store`, deferred with Vercel)
  - In Risks, mark "cache public catalog reads" as deferred.
- [x] T21 Check softwareos/products/stride/architecture.md. It already lists the catalog module and the `/catalog` route, and describes endpoints only in general terms ("plus the reads pages need"). Edit it only if a public-read exception belongs under the rules. The one candidate line is: `GET /catalog/*` reads are public (no AuthGuard) but still behind the proxy secret. Otherwise leave the file unchanged and record "no change needed" in the PR.

## Verification

- [x] T22 (2026-10-18, rerun after the AC7 spec change: typecheck green; npm test 815/815 with TEST_DATABASE_URL = apps/api/.env DB, 0 skipped; e2e 45/45 on the seeded dev DB, 29 passed + 16 env-skipped without it; covers comments present; `@prisma` grep hits only the ESLint rule test string. Waived (setup mode, user): `prettier --check .` red only on packages/shared/src/account-security/index.ts, an accounts-auth file from 7daebd4) Run the full suites green:
  - `npm run lint` and `npm run typecheck`
  - `npm test` (shared + api + web), with `TEST_DATABASE_URL` set to a seeded DB so T5 and the existing db tests run
  - `npm run test:e2e` locally against a seeded DB: T9 goes green, and every existing e2e spec still passes

  Check that every new test file has its `covers AC<n>, T<n>` comment, and that `grep -r "@prisma" apps/web/src` finds nothing. (testing skill)
- [ ] T23 Run QA against acceptance criteria AC1–AC13 (qa skill).
  - Compare /catalog, the empty state, the loading state, and the 375px and ≤760px layouts against Catalog.dc.html, CatalogEmpty.dc.html, CatalogLoading.dc.html and MobileCatalog.dc.html.
  - Check that the "socks" and "tee" suggestions match product names in catalog-data.ts.
  - Check that the diff touches only the spec's Covers list plus the wiring edits in T10, T12, T19, T20 and T21.

## Spec change 2026-10-21 — remove the catalog run-type tiles

- [x] T24 Remove the run-type tiles from /catalog (AC8, AC12):
  - Delete `<RunTypeTiles>` and its import from apps/web/src/features/catalog/CatalogView.tsx, and delete apps/web/src/features/catalog/RunTypeTiles.tsx.
  - Drop the tile skeletons from apps/web/src/features/catalog/CatalogSkeleton.tsx and update its header comment.
  - `grep -r "RunTypeTiles" apps/web` finds nothing. The home page's `RunTiles` is not touched.
- [x] T25 Update apps/web/e2e/catalog.spec.ts (AC13):
  - Remove the `tiles` helper.
  - The journey applies Trail by ticking the sidebar's Run type checkbox instead of clicking the tile.
  - The reload check no longer looks at tile state.
  - Add a check that /catalog has no run-type tile links. (testing skill)
- [x] T26 (2026-10-21, demo branch: lint + typecheck green; npm test green, 37 DB tests skipped without TEST_DATABASE_URL (web-only change); e2e 54/60 against the demo DB, catalog 6/6 and shopping-journey green; the 6 admin-access failures are this worktree's setup: no apps/api/.env for admin:grant and no built apps/web/public/admin bundle) Run lint, typecheck, `npm test` and `npm run test:e2e` against the seeded DB. The catalog and shopping-journey e2e specs pass. (testing skill)
- [ ] T27 Rerun QA for AC8, AC12 and AC13 and replace qa-report.md (qa skill).

## Spec change 2026-10-24 — slower, 2-letter live search

- [x] T28 Update FilterForm.test.tsx first: debounce at 500 ms, no live search for 1 letter, cutting back to 1 letter drops `q`, Enter still searches 1 letter. (testing skill)
- [x] T29 FilterForm.tsx: `DEBOUNCE_MS = 500`, `MIN_SEARCH_LENGTH = 2`, and skip the navigation when the URL is unchanged, to pass T28.
