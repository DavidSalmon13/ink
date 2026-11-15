# Tasks: Sale Pricing

> Epic: catalog-search
> Spec: 2026-10-21-sale-pricing
> Branch: feat/catalog-search/sale-pricing

Ships as two PRs for the deploy order: **PR 1** = T1–T5 (schema accepts the field, web renders it), **PR 2** = T6–T10 (API sends it, sort and filter switch).

## Precondition

- [ ] T1 Confirm `cms/admin-catalog/2026-10-21-product-discounts` is merged: `Product.salePriceCents`, `Product.effectivePriceCents` (with its index and CHECKs) and `percentOff` in `@stride/shared` exist. If not, stop and report. (AC1–AC3)

## PR 1 — web renders sales

- [x] T2 Write the failing tests first (testing skill): shared `query.test.ts` cases for `salePriceCents` (null, a number, missing, 0 rejected) and apps/web/src/features/pricing/PriceTag.test.tsx (`// covers AC4, T2`): regular branch identical to today's markup; sale branch with `data-price` on the sale price, `data-regular-price` in `<s>`, hidden "Was", "−20%" for 11000 → 8800. (AC1, AC4)
- [x] T3 Add `salePriceCents` (`.nullable().optional()`) to `catalogProductSchema`. Add apps/web/src/features/pricing/PriceTag.tsx. T2 goes green. (AC1, AC4)
- [x] T4 Minimal edits: `ProductCard.tsx` and `ProductInfo.tsx` render `<PriceTag>`. Check 375px and 1280px on `/catalog` and `/product/[slug]`; existing catalog, product-detail and journey e2e stay green unchanged. (AC5, AC7)
- [ ] T5 Open PR 1 (pr skill).

## PR 2 — API sends sales, sort and filter by paid price

- [x] T6 Write the failing API tests (testing skill): catalog.service.test.ts and catalog.db.test.ts (Rollback: put one seeded product on sale inside the transaction, assert price-asc/desc order, `min`/`max` inclusion and facet counts use the sale price, and `salePriceCents` is returned); product-detail.service.test.ts maps `salePriceCents`. (AC2, AC3)
- [x] T7 Minimal edits to catalog.service.ts (`PRODUCT_SELECT`, `ORDER_BY`, `baseWhere`, mapping) and product-detail.service.ts. Make `salePriceCents` required in `catalogProductSchema`. T6 goes green. (AC1–AC3)
- [x] T8 Widen the `admin-writes` `testMatch` (and `chromium` `testIgnore`) in apps/web/playwright.config.ts to include `sale-pricing`. Write apps/web/e2e/sale-pricing.spec.ts (`// covers AC3, AC4, AC6, T8`) as in the spec's Tests section. (AC3, AC4, AC6, AC7)

## Verification

- [ ] T9 Run lint, typecheck, `npm test` (with `TEST_DATABASE_URL`), build and `npm run test:e2e` (both projects). Check each AC traces to a test. (AC1–AC7)
- [ ] T10 Run the qa skill against AC1–AC7, write qa-report.md, then open PR 2 (pr skill).
