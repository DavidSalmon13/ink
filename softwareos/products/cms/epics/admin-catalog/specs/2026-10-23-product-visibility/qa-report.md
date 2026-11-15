# QA Report — Product Visibility

> Spec: spec.md
> Date: 2026-10-24 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on the local demo branch `feat/accounts-auth/auth-api-demo` at `42abd61`, with the user's agreement (T1). Rerun the same day after /spec-changes corrected AC10's wording. No code changed between the two runs (`git diff 04b3894..HEAD -- apps packages` is empty), so the checks and test evidence below carry over, and AC10 is re-checked against its new text. This spec's code commits: `2d6e34b`, `eaf6721`, `9f921bc`, `0305ac7`, `9861c5a`, `1ba58e5`. The DB and e2e evidence is from the new demo DB `ep-red-feather` on 2026-10-24.

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Migration adds `isActive BOOLEAN NOT NULL DEFAULT true`; existing products active | pass | `20261024090000_product_is_active/migration.sql` is the single `ALTER TABLE … ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`. Applied by `migrate deploy` to an empty DB, then seeded: 30 products, 0 inactive. `schema.prisma:109`. `visibility.db.test.ts` "every seeded product is active" passes |
| AC2 | `GET /catalog/products` leaves inactive products out of `products`, `total` and every facet, for any query | pass | `catalog.service.ts:88` `baseWhere` starts from `{ isActive: true }` and feeds both queries. `catalog.service.test.ts` (9 where assertions) passes. `catalog.db.test.ts` "leaves an inactive product out of products, total and facets (rolled back)" covers q, price, category, run, gender and every sort, and passes on Postgres. e2e `admin-visibility.spec.ts` step 4 |
| AC3 | `GET /catalog/products/:slug` 404 for inactive; `/product/[slug]` not-found page | pass | `product-detail.service.ts:40` `findFirst({ slug, isActive: true })`. `product-detail.service.test.ts` and `catalog.controller.test.ts` (404) pass. `product-detail.db.test.ts` "returns null for an inactive product" passes. e2e: `/product/<slug>` answers 404 while hidden |
| AC4 | `POST /api/admin/products/:id/visibility` `{ isActive }` strict; 200 + detail; idempotent; 400 / 404, no write on error; no other field changes | pass | `visibility.controller.ts:24-29`, `visibility.service.ts:17-35`. `visibility.service.test.ts` (6 cases, including a delete between read and write → 404, fixed in `1ba58e5`) and `visibility.controller.test.ts` (200, idempotent, 5 bad bodies → 400 with no write, unknown id → 404) pass. `visibility.db.test.ts` hide/show round trip leaves every other column unchanged on Postgres. `visibility.test.ts` (shared schema) passes |
| AC5 | 401 logged out, 403 non-admin, POST only, 401 on missing/wrong Origin; product bodies can't set `isActive` | pass | `@UseGuards(AuthGuard, AdminGuard)` at `visibility.controller.ts:25`, `@Post()` only. `visibility.controller.test.ts`: 401, 403, 401 with no Origin, 401 with a wrong Origin, GET/PUT/PATCH/DELETE → 404, create/update with `isActive` → 400. `products.test.ts` (shared) rejects `isActive` on create/update. Security review (T22) confirmed this |
| AC6 | Admin detail and list item add `isActive`; admin list includes inactive; search/filter unchanged; bulk applies to hidden | pass | `packages/shared/src/admin/products.ts:91,127`; `products.service.ts:91,155`. `products.service.test.ts` "isActive (product-visibility)" (3 cases) and `bulk.service.test.ts` "applies every action to a hidden product and keeps it hidden" pass |
| AC7 | Re-seed / catalog load creates missing products active, never changes `isActive`; `load-catalog.ts` unchanged | pass | No commit of this spec touches `load-catalog.ts` or `prisma/seed.ts`. `load-catalog.db.test.ts` "keeps a hidden product hidden on a re-run and recreates a deleted one as active" passes on Postgres when run with a longer transaction timeout (see Notes) |
| AC8 | Visibility panel on `/admin/products/:id`: status, one button, no confirm, disabled while running, updates without reload, errors in panel, Stride tokens, not on `/new` | pass | `visibility-panel.component.html:17-31`, mounted at `product-form.component.html:434` after the Image panel. `visibility-panel.component.spec.ts` (6 cases, including busy, error and 404 message) and `product-form.component.spec.ts` "Visibility panel" (3 cases: not on new, placement, form sync) pass. e2e steps 2 and 5 |
| AC9 | Hidden badge in the list's status column, next to Sold out | pass | `product-list.component.html:153`. `product-list.component.spec.ts` "shows a Hidden badge … next to Sold out" and "no Hidden badge on a visible row" pass. e2e step 3 |
| AC10 | After Show, back on the next request; home picks are stale-while-revalidate, so a hidden product can stay on the home page longer than 5 minutes on a quiet site (accepted) | pass | e2e step 5: after Show, the catalog card and the 200 product page are back on the next request. `load-home-picks.ts:41` `cacheLife({ stale: 300, revalidate: 300, expire: 7 days })` matches the accepted behaviour, and while hidden the link 404s (AC3) |
| AC11 | e2e in `admin-writes` on a throwaway product; existing suites and CI pass; seeded `isActive` never changed | pass | `admin-visibility.spec.ts` passes in `admin-writes` (`playwright.config.ts` wiring), with `afterAll` deleting the product. All 10 admin-writes tests pass. After the runs the DB still has 30 products, 0 hidden. Existing suites: see Notes for 2 storefront failures that aren't caused by this spec. CI not run (demo) |

## Checks Run

- build: `npm run build` — pass. The first web build stopped on Next.js's SecurityFatalError (16.4.0 has a known vulnerability) and passed on retry with `npm run build -w @stride/web`
- lint: `npm run lint` (ESLint in every workspace + `prettier --check .`) — pass
- typecheck: `npm run typecheck` (including CMS `tsconfig.spec.json`) — pass
- tests: `npm test` — pass (api 730 passed and 80 skipped without `TEST_DATABASE_URL`; cms 209; shared 457; web 315)
- DB tests for this spec, with `TEST_DATABASE_URL` on the demo DB: 5/5 pass (catalog inactive, detail inactive, detail unknown slug, seeded active, hide/show round trip), plus the AC7 case with a longer timeout
- e2e (2026-10-24, servers on 3200/4200): admin-writes 10/10 pass. chromium 63/65, with 2 failures not from this spec (see Notes)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | T21 isn't fully green: chromium e2e `security-headers.spec.ts:159` hardcodes `localhost:4000` (fails on spare ports), and `session-management.spec.ts:69` (logged-out `/account/security` doesn't redirect to login). The second likely comes from loading-feedback's Suspense fallback (`2d9b9f0`). Neither file is touched by this spec | report to the owning specs (security-headers, loading-feedback) |

## Notes

- **DB latency:** each query to the demo DB (us-east-1) takes about 170 ms from here. 7 DB tests that use Prisma's default 5 s interactive transaction, or `loadCatalog`'s 60 s, fail with P2028. Six of them are older tests that this spec doesn't touch. This spec's AC7 case passed from a temporary copy with a 10-minute transaction timeout. CI's Postgres is local, where these limits hold.
- **e2e and the CMS build:** another session committed colour swatches to this branch during QA and rebuilt the CMS bundle served from `apps/web/public/admin`. The admin-writes run used the current e2e files, including that session's uncommitted swatch edit to `admin-visibility.spec.ts`, against the swatch CMS.
- **AC10:** the first run's Issue 1 (AC10 promised at most 5 minutes) was closed by /spec-changes on 2026-10-24, which accepts the stale-while-revalidate lag.
- **Hygiene:** T21 is open (Issue 1). T2, T6, T11, T16, T24 and T23's PR step are deferred (demo). There is no PR, by design: the demo branch is never split into PRs. The spec status moves from `shaped` to `in-progress`; it isn't marked done because the work isn't on develop. No hotfix rows in the Changelog.
- **Scope:** none of this spec's commits touch `apps/web/src/**`, `load-catalog.ts` or `prisma/seed.ts`.
