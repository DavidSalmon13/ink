# Product Catalog

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/product-catalog
> Covers: /catalog, apps/web/src/app/catalog/**, apps/web/src/features/catalog/**, apps/api/src/catalog/catalog.*, packages/shared/src/catalog/query*.ts, apps/web/e2e/catalog.spec.ts

## Overview

The second catalog-search spec. It delivers the /catalog page: a server-rendered grid of all products with search by name, multi-select filters (run type, category, gender), a min/max price range and price sort. All of that state lives in URL params, so results are shareable and survive a refresh. It also covers the no-results and loading states. It adds the first catalog read endpoint, `GET /catalog/products`, and the ProductCard and ProductArt components that product-detail and home-page will reuse.

Depends on:
- catalog-foundation: models, shared enums and size sets, catalog data and seed
- accounts-auth `api-foundation`: `apiFetch` and the proxy-secret middleware

The epic's Playwright journey e2e stays in home-page; this spec adds a catalog-only e2e.

Serves the brief's success criteria:
- /catalog is server-rendered.
- Every filter and the sort work alone and combined, and are reflected in the URL.
- The no-results and loading states match the design handoff (`stride-design/pages/CatalogEmpty.dc.html`, `CatalogLoading.dc.html`).
- Prices are stored as cents and shown as USD.

Covers note: catalog-foundation's `apps/api/src/catalog/**` and `packages/shared/src/catalog/**` globs also match this spec's files. That overlap was reviewed in the pre-flight check and dismissed: foundation owns the data layer and explicitly hands the endpoints to this spec (see references.md).

## Goals & User Stories

- As a shopper, I see every product in a grid, with its art, name, subtitle, guidance tag and USD price, so I can scan the range quickly.
- As a shopper, I can search by name from the catalog or the header, so I find something I've heard of.
- As a shopper, I can filter by run type, category, gender and price range and combine those filters. I can see how many products each option would show and sort by price, so I only see what fits me.
- As a shopper, I see which filters are active and can remove one, or clear them all, in one click.
- As a shopper, when nothing matches I get a clear way out: clear everything, try a suggestion, or browse products popular with beginners.
- As a shopper, a filtered URL I share or refresh shows the same results.

## Acceptance Criteria

1. AC1: `GET /catalog/products` is public (no AuthGuard). Like every route, it still requires the proxy secret, so a request without it gets 401. With no params it returns the first page of products (12 by default), and the response matches the shared `catalogProductsResponseSchema`: `{ products, total, page, pageSize, totalPages, facets }`, where `total` counts all matching products. Paging (`page`, `pageSize`) is defined by [2026-10-23-catalog-pagination](../2026-10-23-catalog-pagination/spec.md).
2. AC2: The shared `catalogQuerySchema` validates these query params:
   - `q`: trimmed, at most 100 characters
   - `category` (shoes | apparel | gear), `run` (road | trail | race-day) and `gender` (men | women | unisex): each one repeatable, for multi-select
   - `min` and `max`: whole USD dollars, ≥ 0
   - `sort`: featured | price-asc | price-desc, default featured

   The endpoint returns 400 `{ fieldErrors }` for an unknown value, a non-integer price, a `q` over 100 characters, or `min` > `max` (reported as a `max` error).
3. AC3: Filtering rules:
   - `q` matches the product name only, as a case-insensitive substring.
   - Values within a group are OR'd, and the groups are AND'd together.
   - `min`/`max` are inclusive on `priceCents` (`min*100 ≤ priceCents ≤ max*100`).
   - Every filter works alone and combined with all the others.
4. AC4: Sorting:
   - `featured` puts featured products first, then sorts by name A–Z.
   - `price-asc`/`price-desc` sort by `priceCents`, breaking ties by name A–Z.
5. AC5: Each product item has exactly these fields:
   - `slug`, `name`, `subtitle`, `category`, `run`, `gender`, `priceCents`, `beginnerTag`, `isNew`
   - `soldOut`: true when no variant has stock > 0
   - `art { kind, color, accent }`
   - `imageUrl` (nullable)

   `category`, `run` and `gender` are URL slugs (`race-day`, `women`), the same values the query uses. `facets` gives a count for every option of `category`, `run` and `gender`, zeros included. Each group's counts apply `q`, the price range and the *other* groups' filters, but not the group's own filter.
6. AC6: /catalog is server-rendered. The first HTML response for `/catalog`, and for a filtered URL such as `/catalog?run=trail&gender=women`, already contains the matching product names. The page shows:
   - a `Home / Shop all` breadcrumb
   - an H1 `Shop all (N)` with `aria-live="polite"`, where N is the result count
   - the design's intro copy
7. AC7: URL state:
   - Every control writes canonical params (`q`, `category`, `run`, `gender`, `min`, `max`, `sort`), leaving defaults out.
   - A refreshed or shared URL renders the same results and the same control states.
   - Invalid or unknown params in the page URL are ignored rather than failing the page. A `min` greater than `max` drops both.
8. AC8: Controls match `stride-design/pages/Catalog.dc.html`, except that the page has no run-type tiles: the sidebar's Run type fieldset is the only run-type control.
   - **Search box:** placeholder `Search by name, e.g. trail shoe`.
   - **Filters sidebar:** fieldsets in the order Run type, Category, Gender, with checkboxes showing facet counts; Min/Max price inputs; a `Clear all` that resets search, filters and price but keeps the sort.
   - **Active-filter chips:** one per value, a price chip (`$min – $max`, `$min – any` or `any – $max`) and a query chip, each with `aria-label="Remove filter …"`.
   - **Show/Hide filters toggle:** has `aria-pressed`; filters are shown by default.
   - **Sort select:** Featured / Price: low to high / Price: high to low.
   - **Mobile:** at ≤760px the filters stack above the grid.
9. AC9: The header search box (a wiring edit to `Header.tsx`) submits to `/catalog?q=…`. The mobile search icon links to `/catalog`.
10. AC10: ProductCard follows the design:
    - ProductArt in a 4:5 well, then the guidance-tag badge, the name (h3), the subtitle, and the price formatted as USD (`$110.00`).
    - A sold-out product shows an `Out of stock` badge with dimmed art and stays clickable.
    - The whole card links to `/product/[slug]`.
    - No wishlist heart and no add-to-cart button.

    The grid is an auto-fill grid with a 280px minimum column (400px when filters are hidden). It collapses to one column at 375px.
11. AC11: The no-results state matches `CatalogEmpty.dc.html`:
    - The H1 reads `Shop all (0)`.
    - With a query, the copy is `Try a shorter word, or one of these:` with suggestion links "shoe", "socks" and "tee". Each link sets `q`, resets the filters and keeps the sort.
    - Without a query, the copy is `Try removing a filter or widening the price range.`
    - A `Clear search & filters` button resets search and filters and keeps the sort.
    - A "Popular with beginners" grid shows the first 3 featured products.
12. AC12: The loading state matches `CatalogLoading.dc.html`:
    - `aria-busy="true"` and a visually hidden `role="status"` "Loading products"
    - skeletons for the title and a 6-card grid (the design's tile skeletons are dropped with the tiles)
    - the pulse animation is disabled under `prefers-reduced-motion`
13. AC13: A Playwright test, `apps/web/e2e/catalog.spec.ts`, runs against the seeded database. It:
    - loads /catalog with all products
    - applies a run-type filter and a category filter
    - searches, then sorts by price
    - reaches the no-results state and clears it
    - reloads a filtered URL

    `apps/web` imports no Prisma. All existing API, web, shared and e2e tests still pass.

## Technical Approach

- **Shared (`packages/shared/src/catalog/query.ts`, exported through foundation's catalog barrel as a wiring edit):**
  - URL slug ↔ enum maps (`race-day` ↔ `RACE_DAY`). Foundation leaves the URL slugs to this spec.
  - A strict `catalogQuerySchema`, so the API returns 400.
  - `parseCatalogSearchParams(searchParams)`, which is lenient for the page: it drops invalid values and de-dupes, and it never throws.
  - `catalogQueryToSearchParams(query)`, which builds canonical URLs for the chips, links and form.
  - `catalogProductSchema` and `catalogProductsResponseSchema`.

  Naming follows `account-security`/`auth` (`…Schema`, `…Response`).
- **API (`apps/api/src/catalog/`):**
  - `catalog.module.ts`: the controller and service, registered in `app.module.ts` (wiring edit).
  - `catalog.controller.ts`: `@Get("products")` with no guard. It validates `@Query()` with the existing `ZodBodyPipe` (`auth/zod-body.pipe.ts`), which works on any object, with a comment saying why. product-detail will add its route to this controller.
  - `catalog.service.ts`: two `PrismaService` queries in `Promise.all`:
    1. A `findMany` with the full `where` (name `contains` with `mode: "insensitive"`, `in` per group, a `priceCents` range) and the `orderBy` from AC4. It uses an explicit `select`, and `variants: { where: { stock: { gt: 0 } }, take: 1, select: { id } }` to derive `soldOut`.
    2. A facet `findMany` with only `q` and the price range, selecting `category.slug`, `runType` and `gender` (~30 rows). Counts are computed in memory with the exclude-own-group rule.

    It maps rows to the shared item shape.
- **Web (`apps/web/src/app/catalog/` and `apps/web/src/features/catalog/`):**
  - **Page:** `page.tsx` has `metadata` and a static shell, with the results inside `<Suspense fallback={<CatalogSkeleton/>}>`. The Suspense is needed because `cacheComponents` is on and `apiFetch` reads `headers()`.
  - **No JS (2026-10-18):** the results, filters and chips load inside `<Suspense>`, which cacheComponents requires because `apiFetch` reads the request headers. React reveals streamed content with an inline script, so without JS the page stays on its loading state. The product names are still in the raw HTML (AC6), and FilterForm stays a real `<form method="get">`, but v1 doesn't promise a catalog that works without JS.
  - **Data loading:** the async `CatalogResults` reads `searchParams`, runs `parseCatalogSearchParams` and calls `loadCatalogProducts(query)`. That function calls `apiFetch("/catalog/products?…", { cache: "no-store" })`, throws on non-200, and parses the result with the shared schema. This follows the `account-security/page.tsx` pattern. When the result is empty, `CatalogResults` makes one more `loadCatalogProducts({})` call for the 3 featured products and passes them to NoResults.
  - **Loading state:** `loading.tsx` reuses `CatalogSkeleton`.
  - **Server Components:** `CatalogView`, `ActiveFilterChips` (links built by `catalogQueryToSearchParams`), `ProductGrid`, `ProductCard`, `ProductArt` (rebuilt as inline SVG from `stride-design/design-system/components/ProductArt`, using Tailwind and the tokens), `NoResults` and `CatalogSkeleton`.
  - **Client Components:** these only update the URL or hold UI state.
    - `FilterForm`: `<form method="get" action="/catalog">`. With JS, it pushes the canonical URL on change, and search is debounced 500 ms using `router.replace`. A live search needs at least 2 letters: a shorter one counts as no search (cutting the box back to 1 letter drops `q`), and pressing Enter still searches any length. A debounced URL that matches the current page isn't navigated to again.
    - `SortSelect`.
    - `FiltersToggle`: local state.
  - **Price formatting:** `formatPriceCents` uses `Intl.NumberFormat("en-US", { style: "currency", currency: "USD" })`.
- **Header:** a wiring edit to `apps/web/src/components/layout/Header.tsx`. The placeholder `div role="search"` becomes `<form role="search" method="get" action="/catalog">`, and the mobile search icon becomes a link to `/catalog`.
- **Tests:**
  - shared `query.test.ts`
  - API `catalog.service.test.ts` (fake-db style, after `auth/testing/fake-db.ts`)
  - `catalog.controller.test.ts`: real HTTP via `createNestApplication`, covering the 400s, the 401 without the secret, and the response shape
  - `catalog.db.test.ts`: against the seeded `TEST_DATABASE_URL`
  - web RTL tests for ProductCard, ActiveFilterChips, NoResults, FilterForm and the Header search form
  - Playwright `catalog.spec.ts`

  Every test file starts with a `// covers AC…, T…` comment.

## Out of Scope

- `/product/[slug]`: the card links there, but the page lands in product-detail.
- The home page and the landing → catalog → filter → detail journey e2e (home-page).
- Wishlist heart and add-to-cart on cards (account-wishlist, cart-checkout). ProductCard gets no placeholder button.
- Caching public catalog reads, a risk listed in the tech plan. It's deferred with the Vercel work; v1 uses `no-store`.
- Pagination (owned by [2026-10-23-catalog-pagination](../2026-10-23-catalog-pagination/spec.md) since 2026-10-23), full-text search, searching anything other than the name, and a mobile filter drawer (the design stacks the filters instead).
- Generic error pages for an API failure (launch-polish owns error and not-found states).
- Header nav changes beyond wiring search: the nav links stay as app-foundation built them.
- A catalog that works without JavaScript (see Technical Approach, No JS).
- Run-type quick-pick tiles on /catalog (removed 2026-10-21). The sidebar's Run type fieldset is the only run-type filter, and home-page's "Shop by run" tiles are the quick-pick way in.

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md):
  - Pages are server-rendered by default, with small Client Components.
  - The web never imports Prisma.
  - Server Components call the API through `apiFetch`.
  - Both sides use the shared Zod schemas.
  - Tests use Vitest, RTL and Playwright.
- [global/auth-security](../../../../../../standards/global/auth-security.md): the public GET still passes the proxy-secret middleware, and GET never changes state. There is no AuthGuard, because the data is public.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch, commits and PR

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-18 | david-schwartzman | change | AC7 drops the no-JS GET-form/links bullet; the no-JS case leaves the e2e — Under cacheComponents the results must stream inside <Suspense>; React reveals streamed content with an inline script, so without JS the catalog stays on its loading state (T22 e2e, 2026-10-18) | — |
| 2026-10-21 | david-schwartzman | change | AC8 drops the run-type tiles, and the sidebar's Run type fieldset is the only run-type control; AC12 drops the tile skeletons; Technical Approach and Out of Scope updated — managers said showing run type twice (tiles on top and the sidebar) is too much; home-page's "Shop by run" tiles stay as the quick-pick way in | — |
| 2026-10-23 | david-schwartzman | change | AC1: with no params returns the first page (12 by default), response adds page/pageSize/totalPages and total counts all matches; Out of Scope points pagination at 2026-10-23-catalog-pagination — consistency check on the new catalog-pagination spec | — |
| 2026-10-24 | david-schwartzman | change | FilterForm search: debounce 300 ms → 500 ms, live search needs at least 2 letters (Enter searches any length), and an unchanged URL isn't navigated to again — fewer API round trips while typing; a 1-letter search matches nearly everything | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
