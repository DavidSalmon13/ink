# Tasks: Stock Management

> Epic: admin-catalog
> Spec: 2026-10-19-stock-management
> Branch: feat/admin-catalog/stock-management

## Precondition

- [x] T1 Before starting, confirm that admin-foundation, category-management and product-management are all merged into develop. Then branch `feat/admin-catalog/stock-management` from develop. On the current demo branch:
  - apps/api/src/admin/ holds only admin-foundation's guard, module, controller and grant-admin files.
  - apps/api/src/admin/products/, apps/cms/src/app/products/ and packages/shared/src/admin/ don't exist.
  - apps/web/playwright.config.ts has only the `chromium` project.

  Check that these exist:
  - apps/api/src/admin/admin.guard.ts (`AdminGuard`) and apps/api/src/admin/admin.module.ts, with `ProductsController` and `ProductsService` registered in it
  - apps/api/src/admin/products/products.service.ts, which exports `ProductsService.get(id)`. It returns the AC2 detail with `variants: [{ id, size, sortOrder, stock }]` in `sortOrder` and throws `NotFoundException` on an unknown id.
  - apps/api/src/admin/products/testing/fake-products-db.ts, which supports `product`, `productVariant` and `$transaction(fn)`
  - packages/shared/src/admin/products.ts, which exports `adminProductSchema` and the `AdminProduct` type, with strict `createProductSchema` and `updateProductSchema` objects that have no `stock` or `variants` key. It must be re-exported through packages/shared/src/admin/index.ts and packages/shared/src/index.ts.
  - apps/cms/src/app/products/product-form.component.ts (edit mode holds the product in a signal) and apps/cms/src/app/products/products.service.ts
  - apps/api/src/catalog/load-catalog.ts, where the product and variant upserts use `update: {}` (create-only re-seed)
  - apps/web/playwright.config.ts, with the `admin-writes` project (`dependencies: ["chromium"]`), and apps/web/e2e/admin-products.spec.ts

  If any of these is missing, stop and report. Don't re-implement anything from admin-foundation, category-management or product-management here. (AC1, AC6, AC8, AC9)
  - 2026-10-20: every listed file and export is present. The three prerequisite specs are **not** merged into develop yet. The user chose to branch `feat/admin-catalog/stock-management` from `feat/admin-catalog/product-management`, so this PR merges after product-management's.

## Shared schemas

- [x] T2 Write the failing shared tests first in the new file packages/shared/src/admin/stock.test.ts, starting with `// covers AC1, AC4, AC5, T2`. (testing skill)
  - `MAX_STOCK` is 9999.
  - `updateStockSchema` accepts `{ variants: [{ variantId, stock }] }`:
    - It rejects an empty `variants` array.
    - It rejects a duplicate `variantId`, and the error path points at the duplicate entry.
    - `stock` accepts 0 and 9999. It rejects -1, 10000, 1.5, `"5"` and `null`.
    - `variantId` must be a non-empty string.
    - Unknown keys are rejected at both the top level and the entry level, because both objects are strict.
  - `restockSchema` accepts `{ quantity }` with an integer from 1 to 9999. It rejects 0, -1, 10000, 2.5 and `"5"`, and rejects unknown keys.
  - This is the AC5 regression: product-management's `createProductSchema` and `updateProductSchema` reject a body that adds `stock` or `variants`. Assert it here and leave products.test.ts alone.
- [x] T3 Add packages/shared/src/admin/stock.ts. It exports:
  - `MAX_STOCK`
  - `updateStockSchema`: strict, with `superRefine` checking that the ids are unique
  - `restockSchema`: strict
  - the inferred `UpdateStockInput` and `RestockInput` types

  Re-export it from packages/shared/src/admin/index.ts. This is a one-line barrel edit. T2 goes green. (AC1, AC4, AC5)

## Admin stock API

- [x] T4 Wiring edit to product-management's apps/api/src/admin/products/testing/fake-products-db.ts. Add `productVariant.updateMany({ where: { productId }, data: { stock } })`, which returns `{ count }`. It must:
  - reject a negative `stock` with the same error shape the fake uses for constraint failures, so it mirrors the CHECK constraint
  - run inside `$transaction(fn)` with rollback-on-throw, the same way the existing write methods do

  Confirm that the existing products.service.test.ts and products.controller.test.ts stay green with no edits. (AC3, AC4)
- [x] T5 Write the failing stock API tests, each starting with `// covers AC1, AC2, AC3, AC4, AC5, T5`. (testing skill)
  - apps/api/src/admin/stock/stock.service.test.ts runs on the fake from T4:
    - Update:
      - Only the listed variants change, and unlisted variants keep their stock.
      - The result equals `ProductsService.get(id)`, with variants in `sortOrder`.
      - An unknown product id gives 404.
      - If any `variantId` belongs to another product, the result is 404 and the fake's stock values are unchanged for every variant, including the valid entries in the same request.
      - All of the writes happen inside one `$transaction`.
    - Out:
      - Every variant ends at 0.
      - Calling it twice gives the same result, which proves it's idempotent.
      - An unknown id gives 404 and makes no `updateMany` call.
    - Restock:
      - Every variant is set to `quantity`.
      - An unknown id gives 404 and makes no `updateMany` call.
  - apps/api/src/admin/stock/stock.controller.test.ts runs on the real `AppModule` with the fake Prisma, following the products.controller.test.ts and apps/api/src/admin/admin.module.test.ts patterns (`sessionFor(role)` :33, plus `Origin` and `x-stride-forwarded-host` on writes). For `POST /admin/products/:id/stock`, `/stock/out` and `/stock/restock`:
    - Logged out gives 401, and a USER session gives 403.
    - An ADMIN gets 200, and the body passes the strict `adminProductSchema`.
    - A bad body gives 400 `{ fieldErrors }`. The cases are an empty `variants` array, a duplicate id, stock 10000, a negative stock, an extra key, `quantity` 0 on restock, and a non-empty body on `/out`.
    - A foreign `variantId` or an unknown product id gives 404.
    - A missing or wrong `Origin` gives 401.
    - `GET`, `PUT` and `PATCH` on these paths aren't routed.
    - This is the AC5 regression: `POST /admin/products` and `POST /admin/products/:id` with a `stock` or `variants` key give 400, and the fake's stock is unchanged.
  - apps/api/src/admin/stock/stock.db.test.ts, starting with `// covers AC1, AC2, AC3, AC4, AC9, T5`, uses `skipIf(!TEST_DATABASE_URL)` and the Rollback pattern from apps/api/src/catalog/load-catalog.db.test.ts:21,104-128. It runs `StockService` over a `{ $transaction: (fn) => fn(tx) }` shim, or whatever pattern products.db.test.ts settled on. Inside one rolled-back transaction it checks:
    - a per-size update, where the other sizes don't change
    - out → all 0, and then restock 7 → all 7
    - a request mixing a valid id with a foreign `variantId` gives 404 and writes nothing
    - the CHECK backstop: a raw `productVariant.update` with `stock: -1` is rejected by `ProductVariant_stock_nonnegative`
    - after the rollback, the seeded stock is byte-for-byte unchanged. This protects apps/api/src/catalog/product-detail.db.test.ts:40-66 and apps/web/e2e/product-detail.spec.ts:117-126.
  - 2026-10-20 (user-approved): T6 runs `productVariant.update` per entry, but T4 only added `updateMany` to the fake. T5 also adds `productVariant.update` to fake-products-db.ts (P2025 on a missing row, P2004 on negative stock). Fold this into T4 with /spec-changes.
- [x] T6 Add apps/api/src/admin/stock/stock.service.ts, with `update(id, input)`, `markOut(id)` and `restock(id, quantity)`. Each one runs a single `$transaction`:
  - `update` loads the product's variant ids, throwing `NotFoundException` if the product is missing. It throws `NotFoundException` if any `variantId` isn't one of them, before any write. Then it runs `productVariant.update` once per entry.
  - `markOut` and `restock` check that the product exists (404 if not), then run `productVariant.updateMany({ where: { productId }, data: { stock } })`.
  - Each method returns `ProductsService.get(id)`.

  Add no migration and no new column. Out of stock stays derived. The service and db parts of T5 go green. (AC1, AC2, AC3, AC4)
- [x] T7 Add apps/api/src/admin/stock/stock.controller.ts:
  - `@Controller("admin/products/:id/stock") @UseGuards(AuthGuard, AdminGuard)`
  - `POST /` with `ZodBodyPipe(updateStockSchema)` (apps/api/src/auth/zod-body.pipe.ts)
  - `POST /out`, which accepts an empty body and gives 400 on any key
  - `POST /restock` with `ZodBodyPipe(restockSchema)`
  - All three return 200 (`@HttpCode(200)`).

  Register `StockController` and `StockService` in apps/api/src/admin/admin.module.ts. This is a wiring edit to admin-foundation code. Confirm that it introduces no route conflict with product-management's `POST /admin/products/:id`, and that `OriginCheckMiddleware` (`forRoutes("*")`) and the proxy-secret middleware cover these paths with no change. The controller part of T5 goes green. (AC1, AC2, AC3, AC4, AC5)

## CMS stock panel

- [x] T8 Write the failing Vitest specs. (testing skill)
  - apps/cms/src/app/stock/stock.service.spec.ts, starting with `// covers AC6, T8`, uses `HttpTestingController` and follows the pattern in apps/cms/src/app/dashboard/dashboard.component.spec.ts.
    - `update`, `markOut` and `restock` POST to `/api/admin/products/:id/stock`, `/stock/out` and `/stock/restock` with the right bodies.
    - Each returns a typed `AdminProduct`.
  - apps/cms/src/app/stock/stock-panel.component.spec.ts, starting with `// covers AC6, AC8, T8`:
    - Display:
      - Every size renders in `sortOrder`, each with a number input (min 0, max 9999).
      - Sizes at 0 show an "Out" badge.
    - Save stock:
      - The button is disabled until a value changes, and disabled again if the change is reverted.
      - The request sends only the changed sizes.
    - Mark out of stock:
      - It sends nothing until the admin confirms.
      - Cancel sends nothing.
    - Back in stock:
      - It takes a quantity and sends `{ quantity }`.
    - After any action:
      - The `updated` output emits the response.
      - The inputs and badges reflect the new stock, and the dirty state resets, without a reload.
    - Errors:
      - A 400 `fieldErrors` response shows next to the matching input or the quantity field.
      - A 404 shows a panel-level `formError`.
    - AC8: when the `variants` input changes to include a newly added size, the panel shows it at stock 0 right away and keeps any unsaved edits to the other sizes.
  - A minimal edit to product-management's apps/cms/src/app/products/product-form.component.spec.ts adds cases tagged `// covers AC6, AC8, T8`:
    - Edit mode renders the Stock panel. `/admin/products/new` doesn't.
    - When the panel emits `updated`, the form's product signal and its size chips update.
    - Adding a size through the form passes the new variant to the panel.
- [x] T9 Add apps/cms/src/app/stock/stock.service.ts. It uses `HttpClient` against the same-origin `/api/admin/products/:id/stock*`, imports types only from `@stride/shared`, and has no env values. The service spec from T8 goes green. (AC6)
- [x] T10 Add apps/cms/src/app/stock/stock-panel.component.ts and its template, as a standalone component with signals:
  - `input.required` `productId` and `variants`
  - an `output` named `updated` that emits an `AdminProduct`
  - a dirty map
  - a confirm step for Mark out of stock
  - a quantity field for Back in stock (1–9999)
  - `fieldErrors` and `formError` display
  - Tailwind classes using the Stride tokens from apps/cms/src/styles.css

  Size labels render as escaped text. The panel spec from T8 goes green. (AC6, AC8)
- [x] T11 Make a minimal edit to product-management's apps/cms/src/app/products/product-form.component.ts:
  - Embed `<app-stock-panel>` in edit mode only, passing `productId` and `product().variants`.
  - `(updated)` replaces the form's product signal.

  Don't touch the other form fields or the size chips logic. The product-form part of T8 goes green, and the existing product-form specs stay green. (AC6, AC7, AC8)

## End-to-end

- [x] T12 Wiring edit to apps/web/playwright.config.ts. Widen product-management's `admin-writes` `testMatch`, and the matching `chromium` `testIgnore`, from `/admin-products\.spec\.ts/` to `/admin-(products|stock)\.spec\.ts/`. Confirm that CI (`npm run test:e2e`, with no `--project`) still runs both projects. Also confirm that catalog.spec.ts, product-detail.spec.ts, shopping-journey.spec.ts, admin-access.spec.ts and admin-categories.spec.ts stay in `chromium` and are unedited. (AC9)
  - 2026-10-20: `playwright test --list` puts admin-products in `admin-writes` and every other suite in `chromium`; CI's `npm run test:e2e` (.github/workflows, no `--project`) runs both. No commit on this branch touches the existing e2e suites.
- [x] T13 Write apps/web/e2e/admin-stock.spec.ts, starting with `// covers AC6, AC7, AC8, AC9, T13`. It promotes the admin using the `signUpAdmin` pattern from apps/web/e2e/admin-access.spec.ts. The test:
  1. creates a timestamped throwaway product on `/admin/products/new` with the Shoe preset (all sizes at 0), and opens `/admin/products/:id`
  2. sets one size to 3 and saves. The panel updates without a reload.
  3. sees the product's total stock and sold-out state change on `/admin/products`
  4. sees "Out of stock" cleared on `/catalog?q=<name>`, and sees on `/product/[slug]` that only that size is enabled and the others are crossed out
  5. marks the product out of stock after confirming, and sees "Out of stock" again on `/catalog` and every size crossed out on `/product/[slug]`
  6. clicks Back in stock with 5, and sees every size enabled on `/product/[slug]`
  7. adds a size through the form and sees it in the panel at 0 straight away
  8. checks that `/admin/products/new` has no Stock panel

  In `afterAll`, it deletes the throwaway product through the admin API. It never touches seeded products, so the count of 30 and the seeded-stock assertions hold. (AC6, AC7, AC8, AC9)
  - 2026-10-20: passed locally against the Neon dev DB (`--project admin-writes --no-deps`; no local Postgres). That first run reused a `next dev` server already on :3000, not a production build. The full two-project run on production builds passed in T15. afterAll left no `e2e-stock-*` product behind.

## Docs

- [x] T14 Edit softwareos/products/cms/epics/admin-catalog/tech-plan.md:
  - Update the `stock-management` candidate line to cover the per-size save, Mark out of stock and Back in stock.
  - Record that out of stock is derived (all variants 0), with no new column.
  - Record the accepted last-write-wins risk against cart-checkout's future stock decrement, with the CHECK constraint as the backstop. (AC7)

## Verification

- [x] T15 Run the full suites green, locally and in CI (testing skill):
  - `npm run lint`
  - `npm run typecheck`
  - `npm test` for shared, api, cms and web, with `TEST_DATABASE_URL` set so that stock.db.test.ts and the unchanged product-detail.db.test.ts, catalog.db.test.ts and load-catalog.db.test.ts run
  - `npm run build`
  - `npm run test:e2e`, with both projects: `chromium` (unchanged storefront and admin-access suites) and then `admin-writes` (admin-products and admin-stock)

  Check that every new or updated test file has its `covers AC<n>, T<n>` comment, and that AC1–AC9 each trace to at least one test. (AC1–AC9)
  - **Waived locally, 2026-10-20 (setup mode, by david-schwartzman). CI's fresh Postgres must run the full suite green on the PR.** Local run against the Neon dev DB (no local Postgres):
    - lint, typecheck and build are green
    - unit tests: shared, cms and web are green; api is 585/592. stock.db, products.db and product-detail.db ran (not skipped) and pass. The 7 failures are outside this spec's code:
      - 3 load-catalog.db.test.ts timeouts against remote Neon (the same ones waived in product-management T19)
      - 4 in catalog.db.test.ts (facets, price-asc, price-desc) and categories.db.test.ts (category count), caused by dev-DB drift from manual CMS use: an extra "Hats" category, and cloudstep-cushion-shoe's price edited to $99.00 on 2026-10-20 08:17
    - e2e: 55/55 on production builds, `chromium` then `admin-writes` (admin-products, admin-stock), with 30 products afterwards. An earlier attempt reused a `next dev` server on :3000 and failed the security-header suites; that server was stopped. smoke.spec.ts:26 at 1280px flaked once (known, see product-management T19)
    - every new or updated test file has its covers comment, and AC1–AC9 each trace to at least one test
- [x] T16 Light security review of the spec's diff (security-reviewer agent):
  - All three stock routes are behind `AuthGuard` then `AdminGuard`, fail closed, are POST-only and are covered by the Origin check.
  - Bodies are strict Zod with bounded integers.
  - `variantId` is scoped to its product, so there's no cross-product write and no partial write on a 404.
  - Product create and update still can't set stock.
  - Errors don't leak Prisma internals.
  - The CMS bundle has no secrets, and size labels render escaped.
  - 2026-10-20, security-reviewer: **PASS with notes**, no Critical or High findings. All six items pass:
    - class-level `@UseGuards(AuthGuard, AdminGuard)` (stock.controller.ts:31-32), POST only, with ProxySecret then OriginCheck failing closed (app.module.ts:34-40)
    - `strictObject` bodies, bounded integers, and `/out` uses `z.strictObject({})`
    - ownership is checked before any write in one `$transaction` (stock.service.ts:17-26)
    - product schemas have no `stock`
    - no custom exception filter, so Prisma errors surface as a generic 500
    - the CMS uses same-origin `/api` with type-only shared imports and `{{ row.size }}` interpolation
  - Notes, not fixed here, because they'd change the contract (`/spec-changes` if wanted):
    - [LOW] `updateStockSchema.variants` has no `.max()` (stock.ts:13). The 100kb body limit and the ownership check bound it in practice
    - [INFO] a variant deleted between the ownership check and its update gives P2025, which surfaces as a generic 500, not 404. It rolls back, so nothing is half-written and nothing leaks
- [x] T17 Run the qa skill against acceptance criteria AC1–AC9 and write qa-report.md. Include a manual pass:
  1. As an admin, open a product you created and edit two sizes. Confirm Save stock sends only those sizes, and is disabled when nothing changed.
  2. Mark the product out of stock: cancel once, then confirm. Then click Back in stock with 5.
  3. Check `/admin/products`, `/catalog` and `/product/[slug]` on the next load.
  4. Enter stock 10000, and quantity 0. Both errors should show inline.
  5. Add a size and confirm it shows at 0 in the panel.
  6. Confirm `/admin/products/new` has no panel.
  7. Check a non-admin (403) and a logged-out user (401).
  8. Run `npm run db:seed` again and confirm the edited stock is kept.

  For scope, check that the only files touched outside the Covers list are:
  - packages/shared/src/admin/index.ts (barrel)
  - fake-products-db.ts (T4)
  - admin.module.ts (T7)
  - product-form.component.ts and its spec (T8, T11)
  - playwright.config.ts (T12)
  - the docs in T14

  apps/web/src/**, the catalog services, the Prisma schema and migrations, prisma/seed.ts and the seeded-stock tests must be untouched.
  - 2026-10-20: qa-report.md written, **PASS WITH NOTES** (setup mode). AC1–AC9 all pass. With the user's agreement, the manual pass was replaced by automated evidence (e2e, panel, controller and load-catalog tests). The 7 local API DB failures waived in T15 remain for CI.
