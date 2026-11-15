# QA Report — Product Detail

> Spec: spec.md
> Date: 2026-10-18 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | `GET /catalog/products/:slug` is public behind the proxy secret, returns `productDetailResponseSchema`, and returns 404 for unknown or malformed slugs with no query | pass | catalog.controller.test.ts `GET /catalog/products/:slug` block (401 without the secret, 200 + schema, 404 unknown, malformed slugs → 404 with no `findUnique`); product-detail.service.test.ts; product-detail.db.test.ts ran against the seeded DB (api 327/327) |
| AC2 | Server-rendered: the first HTML already has the name, price, description and every size | pass | e2e `server-rendered HTML › the first response has the name, price, description and every size` (product-detail.spec.ts:13) |
| AC3 | Breadcrumb, 4:5 art next to a sticky info column, stacks at ≤760px, info column, shipping box, accordion | pass | ProductBreadcrumb/ProductInfo RTL tests; 4:5 well and desktop sticky column at page.tsx:57 and :63. The 375px overflow from the previous run is fixed by hotfix e6cdb54 (`max-md:min-w-0` on the size fieldset, SizePicker.tsx:31, and on the info column). Regression e2e `at 375px (MobileProduct.dc.html)` (product-detail.spec.ts:138) checks `scrollWidth <= innerWidth` on stride-glide-road-shoe and thermal-long-sleeve-top. Both pass |
| AC4 | Size fieldset with exactly the variant sizes in order: native radios, none selected, sold-out sizes disabled, labelled ", sold out" and hatched | pass | SizePicker.test.tsx; e2e `15 sizes, none checked, sold-out ones disabled` (:46) and `arrow keys move between in-stock sizes, skipping sold-out ones` (:87) |
| AC5 | `aria-live` stock line (crossed-out hint / "Only n left" at ≤ 3 / "In stock in"); `actions(selectedSize)` slot renders nothing | pass | product-detail.test.ts (`stockMessage`, `LOW_STOCK_THRESHOLD`); ProductPurchasePanel.test.tsx; e2e `selecting sizes updates the stock line, including the low-stock case` (:60) |
| AC6 | Sold-out state: Out of stock badge, dimmed art, all chips disabled, `role="status"` notice, "See other <category>" link, not sticky | pass | e2e `sold-out product` (:117); SoldOutNotice/ProductInfo RTL tests; page.tsx:57 (`opacity-70`), :63 (no `md:sticky` when sold out) |
| AC7 | Unknown or invalid slug → HTTP 404 with the NotFound.dc.html page | pass | e2e `not found` (does-not-exist and Bad--Slug → 404 with the not-found page, :157); not-found.test.tsx |
| AC8 | No add-to-cart, quantity or wishlist control; title `<Name> · Stride` | pass | e2e `has no add-to-cart, quantity or wishlist control` (:105); page.tsx:31 |
| AC9 | Playwright product-detail e2e on the seeded DB; no Prisma in apps/web; existing tests still pass | pass | product-detail.spec.ts 11/11 green (the 9 original cases plus the two 375px regression cases). Full e2e suite 45/45 green on the seeded DB. `@prisma` in apps/web/src only appears in the ESLint rule's test fixture string |

## Checks Run

- build: `npm run build` — pass
- lint: `npm run lint` — fail (eslint clean in api and web; `prettier --check .` flags packages/shared/src/account-security/index.ts, from accounts-auth `7daebd4`, not this spec)
- typecheck: `npm run typecheck` — pass
- tests: `npm test` with `TEST_DATABASE_URL` = apps/api/.env DB — pass (shared 162, api 327, web 326; 0 failed)
- e2e: `npm run test:e2e` with `TEST_DATABASE_URL` — pass (45 passed, 0 failed). Without `TEST_DATABASE_URL`: 29 passed, 16 skipped (db-gated), 0 failed

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | SizePicker.tsx:13–14 still says native radios make "no-JS work"; AC4 dropped that promise (spec change 2026-10-18). Stale comment only | reopen T22 note / one-line edit |

## Notes

- Re-run after hotfix e6cdb54 (Changelog row 2026-10-18 `hotfix`). The previous FAIL (AC3, 17px sideways scroll at 375px) is fixed and its regression test passes.
- The catalog no-JS e2e failure from the previous run is gone: product-catalog dropped that case after its AC7 change (4a510dc).
- The lint failure is a Prettier issue in an accounts-auth file. It is not part of this spec and is waived in setup mode, but CI will flag it on any PR until it's fixed.
- The md breakpoint is 960px (globals.css:44), so the column also stacks between 761 and ~960px. That fits AC3's "stacks at ≤760px".
- Hygiene: all 22 tasks are `[x]` after this run. Spec `> Status:` is `in-progress`, which is correct until the PR merges. There's no PR yet: QA ran on the local demo branch feat/accounts-auth/auth-api-demo, not the spec's `feat/catalog-search/product-detail`.
- Screen-reader behaviour is checked through accessible names and roles in the RTL and e2e tests (`<size>, sold out`, the "Select size" group, `aria-live`), not with a real screen reader.
