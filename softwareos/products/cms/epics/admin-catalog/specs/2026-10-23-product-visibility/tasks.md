# Tasks: Product Visibility

> Epic: admin-catalog
> Spec: 2026-10-23-product-visibility
> Branch: feat/admin-catalog/product-visibility

This ships as one docs PR and four stacked code PRs, so each PR stays at 18 files or fewer and covers one area. The docs PR merges to develop first. **PR A** = T3–T6 (migration and storefront reads, targets develop). **PR B** = T7–T11 (the admin product shape: shared schemas, products.service wiring and every fixture, stacked on A). **PR C** = T12–T16 (the visibility endpoint, stacked on B). **PR D** = T17–T23 (CMS panel, list badge and e2e, stacked on C). Layer branches are `feat/admin-catalog/product-visibility--storefront`, `--admin-shape`, `--api` and `--cms`. The docs branch is `chore/docs-product-visibility`.

## Precondition

- [x] T1 Before starting, confirm that admin-foundation, product-management, product-discounts and bulk-actions are merged into develop. Then branch from develop. Today they exist only on the local demo branch `feat/accounts-auth/auth-api-demo`, which is the reference for this spec, and none of them is on develop yet. If they still aren't merged, stop and agree a stacked base with the user. Don't build on the demo branch without that agreement. Check that these exist:
  - apps/api/src/admin/products/products.service.ts with `get(id)` (the AC2 detail through `toDetail`) and `list` (an explicit `select`)
  - apps/api/src/admin/products/testing/fake-products-db.ts with `FakeProductSeed`
  - apps/api/src/admin/sale/sale.service.ts with `clear` (the `$transaction` → `findUnique` 404 → `update` → `ProductsService.get` shape)
  - apps/api/src/admin/admin.module.ts
  - packages/shared/src/admin/products.ts, where `adminProductSchema`, `adminProductListItemSchema`, `createProductSchema` and `updateProductSchema` are all strict, re-exported through packages/shared/src/admin/index.ts
  - apps/cms/src/app/products/product-form.component.html with `<app-image-panel>` followed by the delete section
  - apps/cms/src/app/products/product-list.component.html with the Sold out status cell
  - apps/cms/src/app/bulk/bulk-bar.component.spec.ts
  - apps/api/src/catalog/catalog.service.ts with `baseWhere()`, and apps/api/src/catalog/product-detail.service.ts with `findUnique({ where: { slug } })`
  - `20261021120000_product_sale_price` as the latest migration
  - the `admin-writes` Playwright project in apps/web/playwright.config.ts

  If any of these is missing, stop and report. (AC4, AC6, AC8, AC9, AC11)

  Demo (2026-10-24): none of the prerequisites is on develop. The user agreed to build on the demo branch `feat/accounts-auth/auth-api-demo`. All the checks above pass there. The PR tasks (T2, T6, T11, T16, the PR step of T23, T24) are deferred (demo).

  Demo progress (2026-10-24): built on the demo branch in `2d6e34b` (T3–T5), `eaf6721` (T7–T10), `9f921bc` (T12–T15), `0305ac7` (T17–T19) and `9861c5a` (T20). Unit, controller and CMS tests, typecheck, lint and build are green. The demo DB (ep-rapid-boat) was unreachable (P1001), so these are still open: applying the migration (T3), the DB test cases in T4 and T14, and the e2e run (T20, T21). The T3 migration SQL came from an offline `migrate diff --from-schema-datamodel <committed schema>`, not `--from-schema-datasource`. It is the expected single `ALTER TABLE`.

  DB and e2e (2026-10-24, new demo DB `ep-red-feather`): all 6 migrations applied and the catalog seeded (30 products). The new DB cases in T4 and T14 pass. The T4 AC7 case and 6 older DB tests time out from here (about 170 ms per round trip, Prisma's 5 s transaction default, P2028), and AC7 passes with a longer timeout. e2e on spare ports 3200/4200: all 10 admin-writes tests pass, including admin-visibility against the colour-swatch CMS. The storefront project passes 63 of 65. The 2 failures aren't this spec's: security-headers AC9 hardcodes :4000, and session-management AC1 (a logged-out /account/security doesn't redirect to /login), which is likely loading-feedback's Suspense fallback in `2d9b9f0`. T21 stays open for those. T22 security review: PASS, no critical/high/medium. Low 1 (a delete race returned 500) is fixed in `1ba58e5`. Low 2: on a quiet site the home picks cache can show a hidden product for longer than AC10's 5 minutes (stale-while-revalidate), which /spec-changes accepted on 2026-10-24 (AC10 reworded).

  T23 QA (2026-10-24): PASS WITH NOTES, see qa-report.md. The PR step is deferred (demo).

## Docs (merges first)

- [ ] T2 (deferred (demo)) Open the docs PR (pr skill) from `chore/docs-product-visibility` to develop. It holds the spec folder (spec.md, references.md, standards.md, tasks.md) and these one-line edits:
  - softwareos/products/cms/epics/admin-catalog/epic.md: add the row `| 2026-10-23-product-visibility | shaped | feat/admin-catalog/product-visibility |` to the Specs table if /shape-spec didn't.
  - softwareos/products/cms/epics/admin-catalog/tech-plan.md:
    - In the Architecture Impact Schema bullet (:14), replace "Product gets no new column: removing a product is a hard delete, and its variants cascade" with: Product gains `isActive Boolean @default(true)` (`product-visibility`). Hiding is reversible, and removing a product is still a hard delete with the variant cascade.
    - Under the "Product hard delete vs. a future `OrderItem`" risk (:37), add one sentence: `product-visibility`'s Hide is the reversible alternative, and cart-checkout must refuse inactive products.
    - Add `- \`product-visibility\` (shaped, \`specs/2026-10-23-product-visibility\`) — hide or show a product from the edit page with one click; hidden products drop out of every storefront read (catalog, facets, home, shoe finder, product URL 404) but stay in the CMS. Adds \`Product.isActive\`. No bulk hide` to Candidate Specs.

  The code PRs open only after this one has merged to develop.

## Storefront (PR A)

- [x] T3 Add `isActive Boolean @default(true)` to `Product` in apps/api/prisma/schema.prisma, with the comment "false = hidden from shoppers, kept for admins". Add no index.
  - Write `<timestamp>_product_is_active/migration.sql` from the read-only `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`. Check that it is the single `ALTER TABLE "Product" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true`.
  - Apply it with `prisma migrate deploy`. Never pass a real database as `--shadow-database-url`.

  (AC1)
- [x] T4 Write the failing storefront tests first (testing skill). Each new case starts with `// covers AC<n>, T4`.
  - apps/api/src/catalog/catalog.service.test.ts: every `where` assertion on the products call and the facet call now starts from `{ isActive: true }`, including the empty query. (AC2)
  - apps/api/src/catalog/product-detail.service.test.ts: one `findFirst` by `{ slug, isActive: true }` with the explicit select, and `null` → not found. (AC3)
  - apps/api/src/catalog/catalog.controller.test.ts: the fake `product` gains `findFirst`, and the "not called" assertion at :210 moves to `findFirst`. (AC3)
  - apps/api/src/catalog/catalog.db.test.ts (Rollback pattern): set one seeded product inactive in the transaction. It drops out of `products`, `total` and every facet count, for `q`, price, category, run, gender and each sort. Every seeded product is active outside the rollback. (AC1, AC2)
  - apps/api/src/catalog/product-detail.db.test.ts (Rollback): an inactive product's slug → 404. (AC3)
  - apps/api/src/catalog/load-catalog.db.test.ts: hide a seeded product and re-run the load. It stays inactive. A deleted seeded product is recreated as active. (AC7)
- [x] T5 Make these minimal edits to catalog-search's files, with no refactor:
  - In catalog.service.ts, `baseWhere()` starts from `{ isActive: true }`.
  - In product-detail.service.ts, `findUnique({ where: { slug } })` becomes `findFirst({ where: { slug, isActive: true } })`, and the existing 404 applies.

  No web change. `load-catalog.ts` and `prisma/seed.ts` stay unchanged. T4 goes green. (AC2, AC3, AC7, AC10)
- [ ] T6 (deferred (demo)) Open PR A (pr skill) with T3–T5 against develop, titled `feat(admin-catalog): hide inactive products from the storefront [product-visibility 1/4]`.

## Admin product shape (PR B)

- [x] T7 Write the failing tests first (testing skill), each starting with `// covers AC5, AC6, T7`:
  - packages/shared/src/admin/products.test.ts:
    - `adminProductSchema` and `adminProductListItemSchema` require a boolean `isActive`
    - create and update bodies with `isActive` are rejected
  - apps/api/src/admin/products/products.service.test.ts:
    - `get` and `list` return `isActive`
    - an inactive product is listed, and search and the category filter are unchanged
    - create and update never send `isActive`, and a created product is active
  - apps/api/src/admin/bulk/bulk.service.test.ts: each action still applies to an inactive product (AC6)
- [x] T8 Add `isActive: z.boolean()` to `adminProductSchema` and `adminProductListItemSchema` in packages/shared/src/admin/products.ts. Create and update stay strict with no `isActive`. (AC5, AC6)
- [x] T9 Make these minimal edits to product-management's files:
  - products.service.ts: select `isActive` in `list` and map it in `toDetail`.
  - testing/fake-products-db.ts: store `isActive`, default true, and let `FakeProductSeed` set it.

  Existing product, stock, image, sale and bulk tests stay green. T7 goes green. (AC6)
- [x] T10 Add `isActive: true` to every `AdminProduct` / list-item fixture, so CMS `tsconfig.spec.json` typecheck stays green with the strict schemas:
  - apps/cms/src/app/sale/sale.service.spec.ts
  - apps/cms/src/app/sale/sale-panel.component.spec.ts
  - apps/cms/src/app/products/products.service.spec.ts (`LIST` and `DETAIL`)
  - apps/cms/src/app/products/product-form.component.spec.ts
  - apps/cms/src/app/products/product-list.component.spec.ts
  - apps/cms/src/app/images/images.service.spec.ts
  - apps/cms/src/app/images/image-panel.component.spec.ts
  - apps/cms/src/app/stock/stock.service.spec.ts
  - apps/cms/src/app/stock/stock-panel.component.spec.ts
  - apps/cms/src/app/bulk/bulk-bar.component.spec.ts

  Only the fixtures change. (AC6)
- [ ] T11 (deferred (demo)) Open PR B (pr skill) with T7–T10, stacked on PR A, titled `feat(admin-catalog): add isActive to the admin product shape [product-visibility 2/4]`.

## Visibility API (PR C)

- [x] T12 Write the failing packages/shared/src/admin/visibility.test.ts first (testing skill), starting with `// covers AC4, T12`. `setVisibilitySchema` accepts `true` and `false`, and rejects `"true"`, `1`, `null`, a missing key and extra keys.
- [x] T13 Add packages/shared/src/admin/visibility.ts (`setVisibilitySchema`, `SetVisibilityInput`) and re-export it from packages/shared/src/admin/index.ts. T12 goes green. (AC4)
- [x] T14 Write the failing API tests (testing skill), each starting with `// covers AC<n>, T14`:
  - apps/api/src/admin/visibility/visibility.service.test.ts (AC4):
    - hide, show, and setting the current value (idempotent) each return 200
    - an unknown id → 404 with nothing written
    - the update sends only `isActive`
    - the result equals `ProductsService.get(id)`
    - one `$transaction`
  - apps/api/src/admin/visibility/visibility.controller.test.ts on `AppModule` with the fake (AC4, AC5):
    - 401 logged out, 403 for a non-admin, 200 with a body passing `adminProductSchema`
    - bad bodies → 400 `{ fieldErrors }`
    - a missing or wrong Origin → 401
    - GET/PUT/PATCH/DELETE not routed
    - the AC5 regression: product create and update bodies with `isActive` → 400
  - apps/api/src/admin/visibility/visibility.db.test.ts (skipIf no `TEST_DATABASE_URL`, Rollback pattern) (AC1, AC4, AC11):
    - a hide/show round trip on a seeded product leaves every other column unchanged
    - every seeded product is active after the rollback
- [x] T15 Add apps/api/src/admin/visibility/visibility.service.ts (`set(id, isActive)`, shaped like `SaleService.clear`) and visibility.controller.ts:
  - `@Controller("admin/products/:id/visibility") @UseGuards(AuthGuard, AdminGuard)`
  - one `@Post() @HttpCode(200)` with `ZodBodyPipe(setVisibilitySchema)`

  Register both in admin.module.ts (wiring edit). T14 goes green. (AC4, AC5)
- [ ] T16 (deferred (demo)) Open PR C (pr skill) with T12–T15, stacked on PR B, titled `feat(admin-catalog): add the product visibility endpoint [product-visibility 3/4]`.

## CMS (PR D)

- [x] T17 Write the failing CMS specs (testing skill), each starting with `// covers AC<n>, T17`:
  - apps/cms/src/app/visibility/visibility.service.spec.ts: the POST URL and the `{ isActive }` body. (AC8)
  - apps/cms/src/app/visibility/visibility-panel.component.spec.ts (AC8):
    - each status shows its text and its single button (Hide from catalog / Show in catalog), with no confirm
    - the button is disabled while the request runs
    - on success, `updated` emits and the panel shows the new status
    - an error shows in the panel and the status is unchanged
    - a 404 shows "This product no longer exists. Reload the page."
  - product-form.component.spec.ts (AC8):
    - the panel shows in edit mode, after the Image panel and before delete, and not on `/admin/products/new`
    - `updated` syncs the form's product
  - product-list.component.spec.ts: a hidden row shows the Hidden badge, next to Sold out when both apply. (AC9)
- [x] T18 Add apps/cms/src/app/visibility/visibility.service.ts and visibility-panel.component.ts with its .html. Follow the same structure as `sale-panel`:
  - standalone component with signals
  - inputs `productId` and `isActive`; `current` is a `linkedSignal` of `isActive`
  - `busy` and `formError` signals
  - Stride token classes, and types only from `@stride/shared`

  (AC8)
- [x] T19 Make these minimal edits to product-management's files:
  - product-form.component.ts: import the panel.
  - product-form.component.html: mount `<app-visibility-panel>` in edit mode with `(updated)="product.set($event)"`.
  - product-list.component.html: the AC9 badge in the status cell, styled like Sold out.

  T17 goes green. (AC8, AC9)

## End-to-end (PR D)

- [x] T20 Write the e2e test. (AC10, AC11)
  - In apps/web/playwright.config.ts, add `visibility` to the `admin-(...)` group in both the `admin-writes` `testMatch` and the `chromium` `testIgnore` (wiring edit).
  - Write apps/web/e2e/admin-visibility.spec.ts, starting with `// covers AC2, AC3, AC8, AC9, AC10, AC11, T20`. An admin:
    1. creates a throwaway product
    2. hides it on `/admin/products/:id`; the panel shows "Hidden from catalog" without a reload
    3. sees the Hidden badge on `/admin/products`
    4. finds it missing from `/catalog?q=<name>`, and `/product/<slug>` shows not found
    5. shows it again; both are back on the next request
  - `afterAll` deletes the product. No seeded product is touched.

## Verification

- [ ] T21 Run lint, typecheck (including CMS `tsconfig.spec.json`), `npm test` (with `TEST_DATABASE_URL`, against the demo DB, rolled back), build and `npm run test:e2e` (both projects) green, at the tip of PR D and at the head of each of PRs A–C (testing skill). Check that every new or updated test has its `covers` comment, and that AC1–AC11 each trace to a test. (AC1–AC11)
- [x] T22 Optional in setup mode: security review of the new admin write (security-reviewer agent). Cover:
  - `POST /api/admin/products/:id/visibility` is behind `AuthGuard` then `AdminGuard` and fails closed
  - it is POST only and covered by the Origin check
  - the strict body accepts only a boolean
  - the update writes only `isActive`
  - product create and update bodies can't set `isActive`
  - Prisma errors map to 404 without leaking internals
  - every shopper read filters on `isActive`, so no web loader bypasses it

  (AC4, AC5, AC2, AC3)
- [x] T23 Run the qa skill against AC1–AC11 and write qa-report.md. For scope, check that the only files touched outside the Covers list are:
  - the T5 minimal edits to catalog.service.ts and product-detail.service.ts, plus their tests
  - the T9 edits to products.service.ts and fake-products-db.ts
  - the T10 fixture edits
  - the T15 admin.module.ts wiring
  - the T19 edits to product-form and product-list
  - the T20 playwright.config.ts wiring
  - packages/shared/src/admin/{products.ts, products.test.ts, index.ts}
  - the T2 docs

  `load-catalog.ts`, `prisma/seed.ts` and apps/web/src/** must be untouched. Then open PR D (pr skill), stacked on PR C, titled `feat(admin-catalog): add the Visibility panel and Hidden badge to the CMS [product-visibility 4/4]`.
- [ ] T24 (deferred (demo)) Open the progress docs PR (`chore/docs-product-visibility-progress`, pr skill) with the ticked tasks.md, qa-report.md and the epic.md status. It merges to develop before the code PRs.
