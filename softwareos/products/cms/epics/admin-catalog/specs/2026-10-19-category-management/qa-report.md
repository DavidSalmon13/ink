# QA Report — Category Management

> Spec: spec.md
> Date: 2026-10-19 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | List ordered by `sortOrder` then slug, with `productCount` | pass | categories.service.test.ts and categories.controller.test.ts (covers T9). Manual: the table showed `Shoes \| shoes \| 10 \| 1` |
| AC2 | Create at the end; trimmed 1–40 name; slug default/format; 409 on duplicate; 400 `fieldErrors` | pass | shared categories.test.ts (T2) and the service/controller/db tests (T9). Manual: the preview `qa-trail-picks` was overridden to `qa-custom` and saved last with 0 products. `shoes` gave the name field error "A category with this name already exists." |
| AC3 | Rename keeps the slug; duplicate 409; unknown id 404 | pass | categories.service.test.ts and controller test. Manual: inline rename Apparel → Running Apparel, slug stayed `apparel` |
| AC4 | Move swaps in one transaction, handles ties; first-up/last-down is a no-op | pass | service tests (ties, edges, no write); categories.db.test.ts swaps the persisted `sortOrder` (rolled back). Manual: Gear up, then Running Apparel up and back down, re-render in the CMS and the catalog. First row's up and last row's down are disabled |
| AC5 | Delete empty; 409 "Move or delete its N products first" incl. the race; unknown 404 | pass | service tests; db test stubs the count to 0 so the real `ON DELETE RESTRICT` P2003 becomes a 409 and the row stays. Manual: the empty category was deleted after confirming. Deleting `shoes` showed "Move or delete its 10 products first", and shoes was still listed after a reload |
| AC6 | 401 logged out, 403 non-admin; writes POST/DELETE only; 401 on bad/missing Origin | pass | controller test (every route; no PATCH/PUT). Manual: logged-out GET → 401, USER GET → 403, admin POST without `Origin` → 401. T22 security review items 1–2 PASS |
| AC7 | CMS page: table, add with editable slug preview, inline rename, up/down, confirmed delete, inline errors, Stride tokens; layout link; deep-link reload | pass | cms specs 34/34 (T12) and e2e admin-categories.spec.ts. Manual: the layout link opens `/admin/categories`, a direct reload returns 200 and renders the page, errors show next to the field or row. Tokens by inspection: categories.component.html uses `bg-surface-alt`, `text-ink`, `border-line`, `text-sale`, `shadow-focus` |
| AC8 | Catalog filter lists every DB category in order with the current name and count, incl. 0; chips show the name | pass | catalog.service.test.ts, catalog.db.test.ts (T5), FilterForm/ActiveFilterChips tests (T16). Manual: the filter read `Shoes 10, Running Apparel 10, Gear 10, QA Empty 0` |
| AC9 | After a rename, the next request shows the new name in the filter, chips, breadcrumb and sold-out link | pass | ProductBreadcrumb/SoldOutNotice tests. Manual, on the next load with no deploy: filter "Running Apparel", chip "Remove filter Running Apparel", breadcrumb link "Running Apparel" → `/catalog?category=apparel`, and on `/product/thermal-long-sleeve-top` "See other running apparel" → `/catalog?category=apparel` |
| AC10 | A product in a CMS-created category lists, filters and opens; unknown slug → empty state; malformed dropped | pass | catalog.db.test.ts and product-detail.db.test.ts (product in a new category lists, filters by slug and opens, rolled back); the controller test gives 200 with an empty list for an unknown slug. Manual: `?category=qa-nothing-here` showed the empty-results state; `?category=Shoes` was dropped (no chip) |
| AC11 | The seed/load creates missing seed categories, never overwrites the name or `sortOrder` | pass | load-catalog.db.test.ts (rename + reorder kept, deleted seed category recreated); load-catalog.test.ts `update: {}`. Manual: after `prisma db seed` the API returned `shoes:Shoes:1, gear:Gear:2, apparel:Running Apparel:3` |
| AC12 | Existing catalog, shopping-journey, product-detail e2e and CI pass unchanged; header/footer/tiles/tabs link shoes/apparel/gear | pass | Playwright 53/53. catalog.spec.ts, shopping-journey.spec.ts, product-detail.spec.ts and admin-access.spec.ts have no diff in this spec's range. Manual: on `/` the header, footer and main each link `/catalog?category=` shoes, apparel and gear. `components/layout/**` and `features/home/**` (non-test) are unchanged. CI is not yet run on this branch, see Notes |

## Checks Run

Against a throwaway Postgres 16 set up like CI (`stride_test`, migrated and seeded: 3 categories, 30 products, 210 variants), with `TEST_DATABASE_URL` set:

- build: `npm run build` — pass
- lint: `npm run lint` (ESLint in every workspace + `prettier --check .`) — pass
- typecheck: `npm run typecheck` — pass
- tests: `npm test` — pass (api 444/444 including every `*.db.test.ts`, cms 34/34, web 352/352, shared 193/193)
- e2e: `npx playwright test` against production builds of the api and web — pass (53/53)
- manual pass (T23 steps 1–7): scripted with Playwright against the same servers and database — pass (all checks, see Notes)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | Duplicate category names are possible under a race: the case-insensitive name check is app-level only (T22 review) | /spec-changes if it matters: a unique index on `lower(name)` |
| 2 | low | `move` reads the order without a row lock, so two concurrent moves can scramble `sortOrder`. Integrity only (T22 review) | /hotfix later, if seen |

Neither blocks the spec. Both are recorded under T22 in tasks.md.

## Notes

- **The manual pass was scripted, not clicked by hand.** Playwright drove a real Chromium against production builds, signed up a fresh admin (granted with `npm run admin:grant`) and a fresh USER, and checked each step. The first run's two step-3 ordering checks failed because the script read the page before it re-rendered. The app was fine: step 6 already showed the persisted order. A re-run with retrying assertions passed: the move up re-rendered, the catalog showed the new order on the next load, and the move back down restored it. Visual design was not judged by eye beyond the token inspection under AC7.
- **Featured tabs:** the script didn't capture the tab labels (streamed content). AC12 for the tabs rests on `features/home/**` being unchanged in this spec's range and on the unchanged home and shopping-journey e2e passing.
- **CI:** not yet run for this branch, because there's no PR. Recent CI runs on other branches pass. Confirm the run when `pr` pushes.
- **Hygiene:**
  - T1–T22 are `[x]`, and T23 is this run.
  - There are no hotfix Changelog rows.
  - `> Status: in-progress` matches reality until the PR merges.
  - No `> PR:` is recorded yet.
- **Scope:** every file touched outside `> Covers:` is on T23's allowed list:
  - T4 shared catalog files
  - T6–T8 api catalog files
  - T16–T18 web files, plus T22's fix in `filter-labels.ts`, a T17 file
  - wiring edits to admin.module.ts, app.routes.ts and layout.component.ts
  - `packages/shared/src/admin/index.ts` and `packages/shared/src/index.ts`
  - the T20 tech-plan
- **Bugs found during verification (T21/T22), all fixed before this run:**
  - two test bugs: the db rollback harness for nested `$transaction`, and the e2e rename locator and alert regex
  - one LOW display bug: `?category=constructor` chip label
