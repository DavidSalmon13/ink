# Tasks: Catalog Pagination

> Epic: catalog-search
> Spec: 2026-10-23-catalog-pagination
> Branch: feat/catalog-search/catalog-pagination

Ships as four PRs, in the deploy order from the spec's Technical Approach:
- **PR 0** = T1: docs, merged to develop first
- **PR 1** = T2–T5: the web tolerates the paged response, and callers ask for the size they need
- **PR 2** = T6–T9: the API returns pages
- **PR 3** = T10–T15: the pager on /catalog

PR 2 and PR 3 are stacked on the one before. Between PR 2 and PR 3, /catalog shows the first 12 products with no pager.

## PR 0 — docs

- [ ] T1 Open the docs PR: this spec folder, the epic.md Specs row, specs.index.yml, the tech-plan bullet, and product-catalog's AC1 change. Merge to develop before PR 1 (pr skill).

## PR 1 — web tolerates pages

- [x] T2 Write the failing shared tests first (testing skill) in `packages/shared/src/catalog/query.test.ts` (`// covers AC1, AC2, AC4, T2`). (AC1, AC2, AC4)
  - `page`/`pageSize` defaults, blank → absent
  - the invalid values from AC1 fail `catalogQuerySchema`
  - the lenient page parse from AC4 (abc, 0, -1, 1.5, repeated → 1; `pageSize` never read)
  - `catalogQueryToSearchParams` writes `page` only when > 1 and `pageSize` only when not the default
  - the response schema parses both today's `{ products, total, facets }` and the paged shape from AC2
- [x] T3 `packages/shared/src/catalog/query.ts`: `page`/`pageSize` schemas, `CATALOG_PAGE_SIZE`/`CATALOG_PAGE_SIZE_MAX`, `CatalogQuery` fields, `parseCatalogSearchParams`, `catalogQueryToSearchParams`, and `page`/`pageSize`/`totalPages` as `.optional()` in the response schema. The shared tests go green. (AC1, AC2, AC4)
- [x] T4 Caller wiring edits, keeping today's slices so nothing changes against the current API. (AC8)
  - `load-featured.ts` and the no-results call in `app/catalog/page.tsx`: `pageSize: 3`.
  - `load-home-picks.ts` and `shoe-finder/load-shoes.ts`: `pageSize: CATALOG_PAGE_SIZE_MAX`.
  - Update their tests to expect the param.
- [x] T5 (2026-10-24, demo branch: lint, typecheck, `npm test` green — 80 DB tests skipped without TEST_DATABASE_URL, no API change yet; build green on retry after a Next 16.4.0 SecurityFatalError; PR deferred (demo)) Run the verify command (lint, typecheck, `npm test`, build). Open PR 1 (pr skill).

## PR 2 — API returns pages (stacked on PR 1)

- [x] T6 (2026-10-24, demo branch: unit tests green; catalog.db.test.ts not run — the sandbox can't reach the Neon DB and the user waived the DB run) Write the failing API tests first (testing skill), each file starting with `// covers AC…, T6`. (AC1–AC3)
  - `catalog.service.test.ts`:
    - skip/take
    - `total` from count, not the page length
    - `totalPages` (0 when nothing matches)
    - the `slug` tiebreaker on every sort
    - a page past the end
  - `catalog.controller.test.ts`: the 400s for `page`/`pageSize`.
  - `catalog.db.test.ts`:
    - joining every `pageSize=5` page equals a single `pageSize=100` request
    - `page=99` returns `[]` with total 30
- [x] T7 (2026-10-24, demo branch: unit tests green; catalog.db.test.ts not run — the sandbox can't reach the Neon DB and the user waived the DB run) `apps/api/src/catalog/catalog.service.ts`: compute `where` once, add `count` to the `Promise.all`, add `skip`/`take` and `totalPages`, and append `{ slug: "asc" }` to each `ORDER_BY`. The API tests go green. (AC2, AC3)
- [x] T8 (2026-10-24, demo branch: typecheck + unit tests green; the catalog.db.test.ts and e2e/catalog.spec.ts edits not run — DB run waived by the user) Make `page`/`pageSize`/`totalPages` required in the response schema, drop the `.slice()` in `load-featured.ts` and `app/catalog/page.tsx`, and update the 30-product assertions in `catalog.db.test.ts` and `e2e/catalog.spec.ts` to 12 cards with `Shop all (30)`. (AC2, AC8)
- [x] T9 (2026-10-25, demo branch: lint, typecheck, `npm test` green; DB tests not run, waived by the user; build green on retry after the Next 16.4.0 SecurityFatalError; PR deferred (demo)) Run the verify command (with `TEST_DATABASE_URL`). Open PR 2 (pr skill) and note the interim /catalog behavior in its description.

## PR 3 — pager on /catalog (stacked on PR 2)

- [x] T10 (2026-10-25, demo branch: RED confirmed — missing `catalogPageHref`, `pagination-items`, `Pagination`, past-the-end view, and `page` kept by catalogHref; the FilterForm/NoResults additions already pass as regression guards) Write the failing web tests first (testing skill). (AC5–AC7)
  - `catalog-href.test.ts`: `catalogHref` drops `page`; `catalogPageHref` keeps the other params, and page 1 has no `page`.
  - `pagination-items.test.ts`: up to 7 pages; more than 7 with gaps; first, last and middle pages.
  - `Pagination.test.tsx`: the nav label, `aria-current`, no Previous on page 1, no Next on the last page, hidden at 1 page or fewer.
  - CatalogView past-the-end tests.
  - Extend the SortSelect, ActiveFilterChips, NoResults and FilterForm tests: their links have no `page`.
- [x] T11 Add `catalogPageHref` and the `page` drop in `apps/web/src/features/catalog/catalog-href.ts`, plus `pagination-items.ts` and the `Pagination.tsx` Server Component styled with the tokens. (AC5, AC6)
- [x] T12 `CatalogView.tsx`: grid + `<Pagination>` / past-the-end message and link / NoResults. Check 375px and 1280px. (AC4, AC5, AC7)
- [x] T13 (2026-10-25, demo branch: 4/4 passed against a local dev web on :3300 + API on :4300; the full e2e suite runs in T14) Write `apps/web/e2e/catalog-pagination.spec.ts` (`// covers AC4–AC7, T13`), as described in AC9. (AC4–AC7, AC9)

## Verification

- [x] T14 (2026-10-25, demo branch: lint, typecheck, build (green on retry after the Next 16.4.0 SecurityFatalError) and web/shared/cms unit tests green; with TEST_DATABASE_URL every pagination DB test passes, 7 DB tests from other specs waived by the user — six "rolled back" tests hit Prisma's 5 s transaction limit on the slow demo DB, images.db fails in setup; e2e 77/77 incl. DB-gated, admin-products and admin-stock pass only with --timeout=90000 (~27 s each); fixed a reload race in catalog-pagination.spec.ts and catalog.spec.ts's first-page names; every AC traces to a test) Run lint, typecheck, `npm test` (with `TEST_DATABASE_URL`), build and `npm run test:e2e`. Check that each AC traces to a test. (AC1–AC9)
- [ ] T15 Run the qa skill against AC1–AC9, write `qa-report.md`, then open PR 3 (pr skill).
