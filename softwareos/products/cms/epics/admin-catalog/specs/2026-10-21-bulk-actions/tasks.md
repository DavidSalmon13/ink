# Tasks: Bulk Actions

> Epic: admin-catalog
> Spec: 2026-10-21-bulk-actions
> Branch: feat/admin-catalog/bulk-actions

Ships as two stacked PRs to stay under 18 files each: **PR 1** = T1–T7 (shared, API), **PR 2** = T8–T13 (CMS, e2e), branched from PR 1.

## Precondition

- [x] T1 Confirm admin-foundation, category-management, product-management, stock-management and product-discounts are merged into develop (or agree a stacked base with the user). If any of these is missing, stop and report:
  - `SaleService`
  - `sale/sale-errors.ts` (`violatesCheck`, `SALE_PRICE_VALID`, `usd`)
  - `salePriceFromPercent`
  - `MAX_STOCK`
  - `fake-products-db.ts` with `withEffectivePrice` / `assertPrices`
  - `product-list.component.ts` with the sale price cell
  - the `admin-writes` Playwright project

  (AC2, AC5, AC6)

## Shared

- [x] T2 Write the failing packages/shared/src/admin/bulk.test.ts first (testing skill), starting with `// covers AC1, T2`. The schema accepts each action and rejects:
  - no ids, or more than 100
  - a duplicate id
  - percent 0 or 100
  - quantity 0 or above `MAX_STOCK`
  - an unknown action
  - extra keys
  - a missing `categoryId`
- [x] T3 Add packages/shared/src/admin/bulk.ts (`bulkProductsSchema`, `BulkProductsInput`, `BulkProductsResult`) and re-export it from the admin barrel. T2 goes green. (AC1)

## Admin API

- [x] T4 Minimal edits to product-management's apps/api/src/admin/products/testing/fake-products-db.ts. Existing product, stock and sale tests stay green. (AC2–AC6)
  - `matches` supports `{ in: [...] }`.
  - Add `product.updateMany`. It runs `withEffectivePrice` and `assertPrices` on each row and restores the tables on a throw inside `$transaction`.
- [x] T5 Write the failing API tests (testing skill):
  - apps/api/src/admin/bulk/bulk.service.test.ts:
    - each action's writes
    - set-sale replaces an existing sale and rounds through `salePriceFromPercent`
    - a sale that would hit 0 or reach the price → 400 `itemErrors`, nothing written
    - an unknown id → 404 `itemErrors`, nothing written
    - an unknown category → 400 `fieldErrors.categoryId`
    - one `$transaction`; the result is `{ updated }`
  - apps/api/src/admin/bulk/bulk.controller.test.ts on `AppModule` with the fake:
    - 401/403 and 200
    - bad bodies → 400
    - a missing or wrong Origin → 401
    - GET/PUT/PATCH not routed
  - apps/api/src/admin/bulk/bulk.db.test.ts (skipIf no `TEST_DATABASE_URL`, Rollback pattern):
    - set-sale and clear-sale update `effectivePriceCents` through the trigger
    - mark-out and restock set every variant
    - move-category
    - a CHECK race maps to the AC2 400
- [x] T6 Add apps/api/src/admin/bulk/bulk.service.ts and bulk.controller.ts at `POST /admin/bulk/products`, and register them in admin.module.ts (wiring edit). Export the "Choose an existing category." message from products.service.ts (one-line edit) and reuse sale-errors.ts. T5 goes green. (AC2–AC7)
- [ ] T7 Open PR 1 (pr skill) with T1–T6. Deferred (demo): built on the demo branch; redo on a fresh branch from develop after the demo.

## CMS

- [x] T8 Write the failing CMS specs (testing skill). (AC8–AC11)
  - bulk.service.spec.ts: the URL and body.
  - bulk-bar.component.spec.ts:
    - the action picker and its inputs; Review is disabled until the input is valid
    - the review shows before → after for each action
    - client-side sale failures are flagged and Apply is disabled
    - Apply posts and emits `applied`; Cancel returns to the bar
    - a 400/404 shows item errors next to their products
    - controls are disabled while the request runs
  - product-list.component.spec.ts:
    - labelled row checkboxes
    - the header checkbox selects or clears all, and is indeterminate when only some are selected
    - a filter change clears the selection
    - the bar shows only when something is selected
    - `applied` refetches and clears; the status message shows
- [x] T9 Add apps/cms/src/app/bulk/bulk.service.ts and bulk-bar.component.ts with its template (signals, Stride token classes, types only from `@stride/shared`, previews with `salePriceFromPercent`). (AC9–AC11)
- [x] T10 Minimal edits to product-list.component.ts and .html: the `selected` signal, the checkboxes, `<app-bulk-bar>` and the `role="status"` result message. T8 goes green. (AC8, AC11)

## End-to-end

- [x] T11 Write the e2e test. (AC12)
  - In apps/web/playwright.config.ts, add `admin-bulk` to the `admin-writes` `testMatch` (and the `chromium` `testIgnore`).
  - Write apps/web/e2e/admin-bulk.spec.ts, starting with `// covers AC2–AC5, AC8–AC11, T11`. An admin:
    - creates two throwaway products in one category
    - selects both and sets 20% off; the review shows both new prices, and after applying the list shows them struck through
    - removes the sale
    - marks them out of stock (Sold out), then restocks them to 5
    - moves them to another category
    - searches, and the selection clears
  - `afterAll` deletes both products.
  - Demo build note: the new checkbox column shifts the list cell indexes, so admin-sale.spec.ts (price `nth(2)` → `nth(3)`) and admin-stock.spec.ts (stock `nth(4)` → `nth(5)`) were updated (minimal edits, needs /spec-changes).

## Verification

- [x] T12 Run lint, typecheck, `npm test` (with `TEST_DATABASE_URL`), build and `npm run test:e2e` (both projects). Check every new test has its `covers` comment and AC1–AC12 each trace to a test. (AC1–AC12)
  - Demo run 2026-10-21: lint, typecheck, Prettier, shared/API/CMS unit tests and bulk.db.test.ts (demo DB, rolled back) pass. Build plus full e2e in a scratch worktree on :3200/:4200: 71 passed, 1 skipped, 1 environmental failure (security-headers AC9 hardcodes `localhost:4000`; the same headers checked by hand on :4200 are correct).
- [ ] T13 Run the qa skill against AC1–AC12 and write qa-report.md, then open PR 2 (pr skill). Deferred (demo).
