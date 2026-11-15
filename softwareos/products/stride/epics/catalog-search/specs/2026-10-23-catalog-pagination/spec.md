# Catalog Pagination

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/catalog-pagination
> Covers: packages/shared/src/catalog/query.ts, apps/api/src/catalog/catalog.service.ts, apps/web/src/app/catalog/page.tsx, apps/web/src/features/catalog/CatalogView.tsx, apps/web/src/features/catalog/Pagination.tsx, apps/web/src/features/catalog/pagination-items.ts, apps/web/e2e/catalog-pagination.spec.ts

## Overview

Adds page-number pagination to `GET /catalog/products` and /catalog. A request now returns one page of products (12 by default) plus the real total, instead of every match. The database, the API → web hop, zod parsing, the rendered HTML and the shopper's image downloads then stay the same size however big the catalog gets. /catalog gets Previous / numbered / Next links under the grid, and the page lives in the URL (`?page=2`), so pages stay server-rendered, shareable and refreshable.

This changes a contract set by product-catalog: its AC1 ("with no params it returns all products") becomes "returns the first page", and its Out of Scope listed pagination. product-catalog's Changelog points here. The mission describes the catalog as "a grid of all products". That still holds, 12 per page. With ~30 seeded products the catalog shows 3 pages. The point is to be ready for a growing range; the speed gain at today's size is small.

Callers that need more than one page say so with `pageSize` (≤ 100):
- the home featured rail and the no-results "Popular with beginners" grid ask for 3
- home picks and the shoe finder ask for 100, so their in-memory selection behaves as before

Serves the brief's success criteria: /catalog stays server-rendered with the page's products in the first HTML, and every filter and sort still works and lives in the URL, now together with `page`.

Depends on product-catalog (the endpoint, shared query, CatalogView) and sale-pricing (`effectivePriceCents` sort).

## Goals & User Stories

- As a shopper, I see a page of 12 products and can step to the next or previous page, or jump to a page number, so a big range never turns into one endless scroll.
- As a shopper, the heading still tells me how many products match in total, not just how many are on this page.
- As a shopper, a link to page 2 that I share or refresh shows the same products.
- As a shopper, when I change a filter, the search, the price or the sort, I start again from page 1 instead of landing on an empty page.
- As a shopper, an out-of-date link to a page that no longer exists gives me a way back instead of an empty grid.

## Acceptance Criteria

1. AC1: The shared `catalogQuerySchema` adds two params:
   - `page`: whole number ≥ 1, default 1
   - `pageSize`: whole number 1–100, default 12 (`CATALOG_PAGE_SIZE`, `CATALOG_PAGE_SIZE_MAX` exported)

   A blank value counts as absent. `GET /catalog/products` returns 400 `{ fieldErrors }` for `page=0`, `page=abc`, `page=1.5`, `pageSize=0` and `pageSize=101`.
2. AC2: `catalogProductsResponseSchema` becomes `{ products, total, page, pageSize, totalPages, facets }`:
   - `products`: at most `pageSize` items, starting at `(page − 1) × pageSize` in the sort order
   - `total`: the count of **all** matching products, not the page length
   - `totalPages`: `ceil(total / pageSize)`, so 0 when nothing matches
   - `facets`: unchanged; still counted over all matches, not the page

   A `page` past the end returns 200 with `products: []` and the real `total`/`totalPages`.
3. AC3: Order is stable across pages. Every sort ends with `slug` A–Z after its existing keys (product-catalog AC4 is unchanged otherwise). Fetching every page with `pageSize=5` and joining them gives exactly the same list as a single `pageSize=100` request: no product appears twice and none is missing.
4. AC4: /catalog shows page `N` of the results, server-rendered. The first HTML for `/catalog?page=2` already contains page 2's product names. The H1 stays `Shop all (total)`, where total covers all pages. The page reads `page` leniently: a missing, invalid (`abc`, `0`, `-1`, `1.5`) or repeated value means page 1 and never fails the page. `pageSize` is never read from the page URL; /catalog always uses 12.
5. AC5: The pager sits under the grid as `<nav aria-label="Pagination">`, styled with the existing tokens.
   - **Controls:** Previous, numbered page links, Next.
   - **Current page:** shown as text with `aria-current="page"`, not a link.
   - **Ends:** Previous is absent on page 1, and Next is absent on the last page.
   - **Hidden:** when `totalPages ≤ 1`.
   - **Long ranges:** with more than 7 pages, it shows the first page, the last page, and the current page ±1, with `…` between gaps.
   - **Links:** each is a canonical `/catalog` URL that keeps every other param. Page 1 has no `page` param; other pages have `page=N` last in the query string.
6. AC6: Going back to page 1. Every control that changes what matches links to or pushes a URL **without** `page`:
   - the search box, the filter checkboxes and the price inputs
   - the sort select
   - each active-filter chip and `Clear all`
   - the no-results `Clear search & filters` link and the suggestion links
7. AC7: Past the end. When `page` > `totalPages` and `total` > 0, the grid area shows `There's no page N.` and a link `Go to the last page`, pointing at page `totalPages`. The filters, chips and H1 still render. When `total` is 0, the existing no-results state shows instead.
8. AC8: Callers:
   - The home featured rail (`load-featured.ts`) and the no-results "Popular with beginners" grid request `pageSize=3`, and show the same 3 products as before.
   - Home picks (`load-home-picks.ts`) and the shoe finder (`load-shoes.ts`) request `pageSize=100`, so their picks are unchanged for the seeded catalog.
9. AC9: Tests.
   - **Shared:** query and response schema tests cover AC1 and AC2.
   - **API:**
     - service tests cover skip/take, the count and the tiebreaker
     - controller 400s for AC1
     - `catalog.db.test.ts` checks AC3's page-join property and AC2's past-the-end case against the seeded DB
   - **Web:**
     - RTL tests for `Pagination` (AC5) and the page-reset links (AC6)
     - a pure test for `pagination-items.ts`
   - **e2e:** a new Playwright test, `apps/web/e2e/catalog-pagination.spec.ts`. It:
     - opens /catalog and sees 12 cards with `Shop all (30)`
     - clicks Next and sees `page=2` and the next 12 cards
     - reloads and stays on page 2
     - jumps to page 3 and sees 6 cards
     - applies a filter from page 3 and lands on page 1
     - opens `?page=99` and follows `Go to the last page`

   Existing tests that assumed all 30 products on one page are updated (`catalog.spec.ts`, `catalog.db.test.ts`). All API, web, shared and e2e tests pass.

## Technical Approach

- **Shared (`packages/shared/src/catalog/query.ts`):**
  - `page` and `pageSize` built like `dollars` (blank → absent, `z.coerce.number().int()`, min/max), both with defaults. `CatalogQuery` gains `page: number; pageSize: number`.
  - `parseCatalogSearchParams` reads `page` with `single(...)`, falls back to 1, and always sets `pageSize: CATALOG_PAGE_SIZE`.
  - `catalogQueryToSearchParams` appends `page` only when it is > 1 and `pageSize` only when it isn't the default, both last, so the canonical key order is kept.
  - The response schema adds `page`, `pageSize` and `totalPages` (non-negative ints).
- **API (`apps/api/src/catalog/catalog.service.ts`):**
  - Compute `where = { ...base, ...groupWhere(query) }` once.
  - `Promise.all` gains `this.prisma.product.count({ where })` alongside the products `findMany`, which now has `skip: (page − 1) × pageSize, take: pageSize`. The facet and category queries stay as they are.
  - `total` comes from `count`, and `totalPages = Math.ceil(total / pageSize)`.
  - Each `ORDER_BY` entry appends `{ slug: "asc" }`.
  - The controller doesn't change: `ZodBodyPipe(catalogQuerySchema)` already validates the new params.
- **Web:**
  - `catalog-href.ts`: `catalogHref(query)` drops `page`, which gives AC6 in one place, because SortSelect, ActiveFilterChips, FilterForm and NoResults all build their URLs through it. A new `catalogPageHref(query, n)` keeps every other param and sets `page` (page 1 → none).
  - `pagination-items.ts`: a pure `pageItems(current, totalPages)` that returns `(number | "gap")[]` following AC5's rule.
  - `Pagination.tsx`: a Server Component that renders `<Link>`s from `catalogPageHref`, following `ActiveFilterChips`.
  - `CatalogView.tsx`:
    - `products.length > 0` → the grid plus `<Pagination>`
    - `total > 0` with an empty page → the past-the-end message from AC7
    - otherwise → NoResults
  - `page.tsx`: the no-results call becomes `loadCatalogProducts({ pageSize: 3 })` (no slice).
  - Caller wiring edits in files home-page and shoe-finder own: `load-featured.ts` passes `pageSize: 3` and drops the slice; `load-home-picks.ts` and `load-shoes.ts` pass `pageSize: CATALOG_PAGE_SIZE_MAX`.
- **Deploy order** (tech-stack: the API ships first and stays backward-compatible with the live web). The web parses responses with `z.strictObject`, so it must accept the new fields before the API sends them, and callers must send `pageSize` before the API starts paging:
  1. **Web tolerates:** the shared query accepts `page`/`pageSize`; the response schema adds `page`/`pageSize`/`totalPages` as `.optional()`; callers send `pageSize` and keep their `.slice()`. Today's API drops the unknown params (its query schema isn't strict) and still returns everything.
  2. **API pages:** skip/take, count, tiebreaker; the three response fields become required and the callers' slices go.
  3. **Pager:** the /catalog UI. Between 2 and 3, /catalog shows the first 12 products with no pager.
- **Note:** `FilterForm.tsx` and its test have uncommitted local changes on the current branch. Start this spec from a fresh `develop` branch so they aren't mixed in.
- **Tests:** follow product-catalog's layout (fake-db service test, real-HTTP controller test, seeded `catalog.db.test.ts`, RTL, Playwright). Every new test file starts with a `// covers AC…, T…` comment.

## Out of Scope

- Cursor or keyset pagination, infinite scroll and "Load more". Offset is fine at this size; revisit with indexes once the catalog has thousands of rows.
- A shopper-facing "per page" selector. `pageSize` exists for internal callers.
- DB indexes on the sort columns, and replacing the in-memory facet count with `groupBy`. Both are for when the catalog grows.
- Pagination of the CMS admin products list (cms/admin-catalog).
- Caching catalog reads (still deferred with the Vercel work), `rel="prev/next"` SEO tags, and scroll restoration beyond Next's default scroll-to-top.

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md): the shared Zod schema validates on both sides; Server Components fetch through `apiFetch`; the web never imports Prisma; tests use Vitest, RTL and Playwright.
- [global/auth-security](../../../../../../standards/global/auth-security.md): the endpoint stays a public GET behind the proxy secret and changes no state. `pageSize` is capped at 100, so nobody can ask for an unbounded page.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch, commits and PR.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-23 | david-schwartzman | created | Initial shaping | — |
| 2026-10-23 | david-schwartzman | change | Covers drops `/catalog?page=`; Technical Approach adds the deploy order (web tolerates → API pages → pager) and tasks.md splits into those PRs — consistency check: the strict response schema and tech-stack's API-first deploy rule | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
