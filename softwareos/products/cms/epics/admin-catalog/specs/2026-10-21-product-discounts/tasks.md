# Tasks: Product Discounts

> Epic: admin-catalog
> Spec: 2026-10-21-product-discounts
> Branch: feat/admin-catalog/product-discounts

Ships as two stacked PRs to stay under 18 files each: **PR 1** = T1–T9 (schema, shared, API), **PR 2** = T10–T15 (CMS, e2e), branched from PR 1.

## Precondition

- [ ] T1 Confirm admin-foundation, product-management and stock-management are merged into develop (or agree a stacked base with the user, as stock-management did). Check that these exist: `ProductsService.get(id)` with the AC2 detail, `apps/api/src/admin/products/testing/fake-products-db.ts`, `packages/shared/src/admin/products.ts` with strict create/update schemas, `apps/cms/src/app/products/product-form.component.ts` embedding `<app-stock-panel>`, `load-catalog.ts` with create-only upserts, and the `admin-writes` Playwright project. If any is missing, stop and report. (AC4, AC5, AC7)

## Schema

- [x] T2 Add `salePriceCents Int?`, `effectivePriceCents Int @default(0)` and `@@index([effectivePriceCents])` to `Product` in apps/api/prisma/schema.prisma. Write `<timestamp>_product_sale_price/migration.sql` by hand: the generated part (columns, index) comes from the read-only `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`; add the `Product_set_effective_price()` function and `BEFORE INSERT OR UPDATE` trigger, a backfill `UPDATE` that fires it, then `Product_sale_price_valid` and `Product_effective_price_matches`. Apply with `prisma migrate deploy`. Never pass a real database as `--shadow-database-url`. (AC1)

## Shared

- [x] T3 Write the failing shared tests first (testing skill), each starting with `// covers AC2, AC4, AC5, AC8, T3`:
  - packages/shared/src/pricing.test.ts: `percentOff(11000, 8800)` is 20, `percentOff(10000, 6667)` is 33 (rounded down); `salePriceFromPercent(11000, 20)` is 8800, `salePriceFromPercent(9999, 33)` is 6699 (rounded to the cent)
  - packages/shared/src/admin/sale.test.ts: `setSaleSchema` accepts a positive integer; rejects 0, -1, 1.5, `"8800"`, `null` and extra keys
  - products.test.ts: `adminProductSchema` requires the AC5 fields; create/update bodies with `salePriceCents` or `effectivePriceCents` are rejected
- [x] T4 Add packages/shared/src/pricing.ts (`percentOff`, `salePriceFromPercent`) and packages/shared/src/admin/sale.ts, extend `adminProductSchema` and the list item schema, and re-export through the barrels. T3 goes green. (AC2, AC5, AC8)

## Admin API

- [x] T5 Extend apps/api/src/admin/products/testing/fake-products-db.ts with the two fields. Mimic the trigger (every product create and update sets `effectivePriceCents` = `salePriceCents ?? priceCents`) and mirror both CHECKs (same error shape as its other constraint failures). Existing product and stock tests stay green. (AC1, AC6)
- [x] T6 Write the failing API tests (testing skill):
  - apps/api/src/admin/sale/sale.service.test.ts: set, clear (twice), sale ≥ price → 400 with nothing written, unknown id → 404, result equals `ProductsService.get(id)`, and the update sends only `salePriceCents`
  - apps/api/src/admin/sale/sale.controller.test.ts on `AppModule` with the fake: 401/403, 200 with a body passing `adminProductSchema`, bad bodies → 400, missing/wrong Origin → 401, GET/PUT/PATCH not routed, AC4 regression on product create/update bodies
  - products.service.test.ts cases for AC6: create and update never send `effectivePriceCents`; lowering the price to or below the sale → 400 `fieldErrors.priceCents` with nothing written
  - apps/api/src/admin/sale/sale.db.test.ts (skipIf no `TEST_DATABASE_URL`, Rollback pattern): set/clear round trip; a raw insert and a raw update that omit `effectivePriceCents` end up with the right value (trigger); both CHECKs reject a bad raw write; every seeded product has `effectivePriceCents = priceCents` and no sale
  - a load-catalog.db.test.ts case: set a sale on a seeded product, re-run the load, sale kept (AC7)
- [x] T7 Add apps/api/src/admin/sale/sale.service.ts and sale.controller.ts, register both in admin.module.ts (wiring edit). Map a CHECK violation on the write to the AC2 400. (AC2, AC3, AC4)
- [x] T8 Minimal edits to products.service.ts only: AC5 selects, the AC6 price guard on update, and a `Product_sale_price_valid` race mapped to the same 400. `load-catalog.ts` stays unchanged (the trigger covers it). T6 goes green. (AC5, AC6, AC7)
- [ ] T9 Open PR 1 (pr skill) with T1–T8.

## CMS

- [x] T10 Write the failing CMS specs (testing skill): sale.service.spec.ts (POST/DELETE URLs and bodies); sale-panel.component.spec.ts (Sale price / % off toggle; price mode: dollars → cents with live % off; % off mode: 1–99 → live price via `salePriceFromPercent`; inline error at or above the regular price in both modes; Save always sends `salePriceCents`, disabled until valid and changed; Remove only with a sale; `updated` emits and the panel resets; 400 shows by the input); product-form spec (panel in edit mode only, `updated` syncs the form); product-list spec (struck-through regular price on a sale row). (AC8, AC9)
- [x] T11 Add apps/cms/src/app/sale/sale.service.ts and sale-panel.component.ts with its template (signals, a `mode` signal `'price' | 'percent'`, Stride token classes, types only from `@stride/shared`, `percentOff` and `salePriceFromPercent` for the previews). (AC8)
- [x] T12 Minimal edits: embed `<app-sale-panel>` in product-form.component.ts edit mode next to the Stock panel; AC9 price cell in product-list.component.ts. T10 goes green. (AC8, AC9)

## End-to-end

- [x] T13 Widen the `admin-writes` `testMatch` (and `chromium` `testIgnore`) in apps/web/playwright.config.ts to include `admin-sale`. Write apps/web/e2e/admin-sale.spec.ts (`// covers AC2, AC3, AC6, AC8, AC9, T13`): an admin creates a throwaway $100 product, tries $100 (inline error), sets $80 by price (panel shows 20% off), sees it struck through on `/admin/products`, switches to % off and sets 25 (panel shows $75.00, saved as $75), tries to lower the regular price to $70 (error), removes the sale. `afterAll` deletes the product. (AC8, AC9, AC10)

## Verification

- [ ] T14 Run lint, typecheck, `npm test` (with `TEST_DATABASE_URL`), build and `npm run test:e2e` (both projects). Check every new or updated test has its `covers` comment and AC1–AC10 each trace to a test. (AC1–AC10)
- [ ] T15 Run the qa skill against AC1–AC10 and write qa-report.md, then open PR 2 (pr skill).
