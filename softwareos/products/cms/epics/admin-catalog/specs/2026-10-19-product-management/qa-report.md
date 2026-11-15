# QA Report — Product Management

> Spec: spec.md
> Date: 2026-10-25 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on the local demo branch `feat/accounts-auth/auth-api-demo` (prerequisites intentionally unmerged), at `b4df8a5` plus cart-checkout commits up to `f6541c0`. This is a partial QA run. T21 stays open until Playwright e2e, the `products.db.test.ts` paging cases and the 11-step manual pass are done (see Notes).

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Paged, filtered admin product list with `page`/`pageSize` validation and `{ products, total, page, pageSize, totalPages }` | pass | `products.service.test.ts` (skip/take + count in one `$transaction`), `products.controller.test.ts` (400s), `packages/shared/src/admin/products.test.ts` (query schema defaults, blank = absent, 400 cases). DB paging cases pending (Notes) |
| AC2 | Detail with variants in `sortOrder`; 404 on unknown id | pass | `products.service.test.ts`, `products.controller.test.ts` (covers AC2) |
| AC3 | Create with trimmed, limited fields, slug default, preset variants; 409/400 and no writes on error | pass | `products.service.test.ts`, `products.controller.test.ts`, `shared/admin/products.test.ts`, `slugify.test.ts` |
| AC4 | Update without slug/preset, strict body, category move keeps sizes; 400/404 | pass | `products.service.test.ts`, `products.controller.test.ts` (covers AC4) |
| AC5 | Add/remove size, 409 on duplicate and on last size, 404 for another product's variant | pass | `products.service.test.ts`, `products.controller.test.ts` (covers AC5) |
| AC6 | Hard delete, variants cascade, 404 on unknown id | pass | `products.service.test.ts` / `products.controller.test.ts`; `apps/api/prisma/schema.prisma:125` `onDelete: Cascade`. No-orphans check in `products.db.test.ts` pending |
| AC7 | 401 logged out, 403 non-admin, POST/DELETE only, 401 on missing or wrong Origin | pass | `products.controller.test.ts:253` (401), `:264` (403), `:275` (no Origin), `:289` (wrong Origin) |
| AC8 | `/admin/products` table, search/category in URL, 500 ms debounce, lenient `page`, `Products (total)` heading | pass | `product-list.component.spec.ts:220` (debounce, one fetch), `:258`, `:283` (URL restore), `:431` (heading), `:437`/`:456` (page from URL, repeated = 1); `layout.component.spec.ts:97` (layout link); `app.routes.spec.ts:25`. Deep-link reload e2e pending |
| AC9 | Add/edit form: categories, preset default, dollars → cents, swatch picker, slug rules, size chips, delete confirm, inline errors | pass | `product-form.component.spec.ts` (create/edit/sizes/delete/colours), `colour-swatch-picker.component.spec.ts` |
| AC10 | CMS-created products show on `/catalog` and `/product/[slug]`; edits and deletes show on the next request | not verifiable | Needs the storefront: `admin-products.spec.ts` e2e (can't build, Notes) and manual steps 3 and 5 |
| AC11 | `sizesForCategory` / `defaultSizePreset` | pass | `packages/shared/src/catalog/sizes.test.ts` (covers AC11) |
| AC12 | Seed/catalog load never overwrites existing fields, stock or `sortOrder` | pass | `apps/api/src/catalog/load-catalog.test.ts` (covers AC12). `load-catalog.db.test.ts` and manual step 7 pending |
| AC13 | Existing e2e suites and CI pass; only the listed e2e edits | not verifiable | Playwright can't start (Notes). The only e2e files touched are `admin-products.spec.ts` (in Covers) and `admin-access.spec.ts` (T22), as allowed |
| AC14 | Pager: Previous/pages/Next, `aria-current`, hidden at 1 page, gaps above 7, keeps filters, past-the-end, selection = current page | pass | `product-list.component.spec.ts:462`–`:558` (hide, links, ends, gaps, page drop on filter change, past-the-end, empty state, selection cleared on page change), `:355` (select all); `pagination-items.spec.ts` |
| AC15 | Saved/Deleted toast on every successful CMS write; bottom-right polite live region, 3 s, ×, replace; none on failure | pass | `toast/toast.service.spec.ts` plus the `// covers AC15, T31` blocks in the product-form, stock, sale, visibility, image, categories and bulk-bar specs. Manual step 11 pending |

## Checks Run

- tests (spec scope): `npx vitest run src/admin/products src/catalog` in apps/api — pass (199 passed, 54 skipped: DB suites, `TEST_DATABASE_URL` unset)
- tests (spec scope): `npx vitest run src/admin src/catalog` in packages/shared — pass (236 passed)
- tests: `npm test` in apps/cms — pass (275 passed)
- build: `npm run build` in apps/cms — pass. `next build` in apps/web — fail: type errors in cart-checkout's failing-first `apps/web/src/features/cart/*.test.tsx` (missing `./AddToCartButton`, `./CartEmpty`, `./load-cart`, …)
- lint: `npm run lint` — fail, only Prettier on 11 cart-checkout test files; every other file passes
- typecheck: `npm run typecheck` — fail in apps/api on cart-checkout tests only; cms, shared and web typecheck with 0 non-cart errors
- tests (full): `npm test` — fail, only cart-checkout's failing-first tests (api 38, shared 30, web 3)
- e2e: `npm run test:e2e` — not run, the web server's `next build` fails (above)
- DB: `products.db.test.ts` paging cases — not run, blocked by the auto-mode classifier

## Issues Found

(none) — no defects found in this spec. The red checks come from cart-checkout's in-progress work on this shared demo branch.

## Notes

- **Pending before T21 can be ticked:**
  1. Playwright `npm run test:e2e` (both projects), once cart-checkout's web components exist so `next build` passes. This settles AC10 and AC13 and the AC8 deep-link reload.
  2. The `products.db.test.ts` paging cases and the AC6 no-orphans check: `set -a; . apps/api/.env; TEST_DATABASE_URL=$DATABASE_URL npx vitest run src/admin/products/products.db.test.ts` in apps/api. Write cases roll back.
  3. The 11-step manual pass in T21, including step 7 (`npm run db:seed` on the shared demo DB) for AC12.
- **Why PASS WITH NOTES and not FAIL:** the broken build and suites are entirely cart-checkout's failing-first tests, which aren't part of this spec, and nothing in this spec's scope is red. AC10 and AC13 are not verifiable rather than failing. In `production` mode this run would be a FAIL. Re-run QA once the pending checks are done; that report replaces this one.
- **Scope check (T21):** clean. Files that this spec's commits touched outside Covers: the T3/T7 catalog-foundation files (`sizes.ts`, `sizes.test.ts`, `catalog/index.ts`, `load-catalog.ts`, `load-catalog.test.ts`, `load-catalog.db.test.ts`); the T4 files (`admin/categories.ts`, `admin/index.ts`, `slugify.test.ts`); `admin/products.test.ts`; the wiring edits (`admin.module.ts`, `app.routes.ts`, `layout.component.ts` and their specs, `playwright.config.ts`); `admin-access.spec.ts` (T22); the T32 toast wiring in the stock, sale, visibility, images, categories and bulk-bar components and their specs; the T33 Changelog rows in seven sibling specs; and the epic docs (`epic.md` status in `a1224a9`, `tech-plan.md` in `80f4722`, T18). `catalog.service.ts`, `product-detail.service.ts`, `catalog-data.ts`, `prisma/seed.ts`, `apps/web/src/**` and `catalog.spec.ts` are untouched.
- **Hygiene:** T21, T26 and T34 are open (T34 `[~]`, with notes in tasks.md). No hotfix rows. Status `in-progress` matches. No PR yet: this is the demo branch, and the spec's own branch `feat/admin-catalog/product-management` has no open PR.
