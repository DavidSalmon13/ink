# QA Report — Stock Management

> Spec: spec.md
> Date: 2026-10-20 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | `POST /:id/stock` sets the listed sizes in one transaction, leaves the rest alone, returns the AC2 detail, and gives 400 `{ fieldErrors }` on bad input | pass | stock.controller.test.ts:246 "sets the listed sizes and returns the strict detail"; stock.db.test.ts:81 "updates one size and leaves the others alone"; packages/shared/src/admin/stock.test.ts (empty, duplicate, out-of-range, non-integer and extra-key rejections) |
| AC2 | An unknown product id or a foreign `variantId` gives 404, and nothing is written | pass | stock.controller.test.ts:308, :324; stock.db.test.ts:121 "404s on a foreign variantId and writes nothing"; security review T16 (ownership checked before any write, stock.service.ts:17-26) |
| AC3 | `/stock/out` sets every size to 0, is idempotent, gives 400 on any body key and 404 on an unknown id | pass | stock.controller.test.ts:337, :352, :366; stock.service.test.ts (calling it twice gives the same result); stock.db.test.ts:103 |
| AC4 | `/stock/restock` sets every size to `quantity` (1–9999); 0 or bad input gives 400, and an unknown id gives 404 | pass | stock.controller.test.ts:377, :388 (0, 10000, extra key), :405; stock.db.test.ts:103 |
| AC5 | 401 logged out, 403 non-admin, POST only, 401 on a missing or wrong Origin; product create and update can't set stock | pass | stock.controller.test.ts:190-219 "access control (AC5)", :437 "rejects stock keys on create and update with 400"; T16 security review PASS |
| AC6 | The Stock panel: sizes in `sortOrder` with 0–9999 inputs and "Out" badges; Save sends only changed sizes; confirm before Mark out; Back in stock quantity; updates without a reload; inline errors; not on `/new` | pass | stock-panel.component.spec.ts:128-292; product-form.component.spec.ts (edit-mode panel, none on `/new`); e2e admin-stock.spec.ts steps 1, 2, 5, 6, 8 (checks the request bodies and that the page never reloads) |
| AC7 | After a save, the product list, `/catalog` and `/product/[slug]` follow on the next request | pass | e2e admin-stock.spec.ts steps 3–6: total stock and Sold out on `/admin/products`, the "Out of stock" badge on `/catalog`, enabled or disabled size radios on `/product/[slug]` |
| AC8 | A new size starts at 0 and shows in the panel right away; a re-seed never overwrites stock | pass | e2e admin-stock.spec.ts step 7; stock-panel.component.spec.ts:292; load-catalog.test.ts (create-only re-seed, green on the fake DB) |
| AC9 | The existing e2e suites and CI pass unchanged; seeded stock only changes in rolled-back DB tests | pass | Full e2e 55/55 on production builds (`chromium`, then `admin-writes`), with 30 products afterwards; stock.db.test.ts rolls back; no existing e2e suite edited on this branch |

## Checks Run

The T15 run on 2026-10-20 at the same code (only docs commits since `888d3f5`):

- build: `npm run build` — pass
- lint: `npm run lint` — pass
- typecheck: `npm run typecheck` — pass
- tests: `npm test` with `TEST_DATABASE_URL` set to the Neon dev DB:
  - shared, cms and web pass
  - api: 585 passed, 7 failed. All 7 are outside this spec and waived in T15; see Notes
- e2e: `npm run test:e2e` — pass (55 passed, both projects)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `updateStockSchema.variants` has no `.max()` (packages/shared/src/admin/stock.ts:13). The 100kb body limit bounds it in practice (T16 note) | /spec-changes if wanted |
| 2 | low | If a variant is deleted between the ownership check and its update, Prisma's P2025 surfaces as a generic 500 instead of 404. It rolls back, so nothing is half-written (T16 note) | /spec-changes if wanted |

## Notes

- **The 7 local API DB failures are not in this spec's code**, and they're waived in T15. CI's fresh Postgres must run them green on the PR:
  - 3 load-catalog.db.test.ts timeouts against remote Neon
  - 4 failures in catalog.db.test.ts and categories.db.test.ts, caused by manual edits in the dev DB: a "Hats" category, and cloudstep-cushion-shoe's price changed to $99.00
- **The T17 manual pass was replaced by automated evidence**, with the user's agreement:
  - steps 1–3, 5 and 6: admin-stock e2e
  - step 4: the panel and controller specs
  - step 7: the controller access-control tests
  - step 8: load-catalog.test.ts
- **No PR yet.** This branch is based on `feat/admin-catalog/product-management`, so its PR merges after product-management's.
- **Spec `> Status:` is still `in-progress`.** The `pr` skill will update it.
