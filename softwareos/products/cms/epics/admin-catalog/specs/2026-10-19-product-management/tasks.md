# Tasks — Product Management

> Epic: admin-catalog
> Spec: 2026-10-19-product-management
> Branch: feat/admin-catalog/product-management

## Precondition

- [x] T1 **Done for the demo (local-only): branched from feat/admin-catalog/category-management, which builds on feat/accounts-auth/auth-api-demo, not from develop. Neither prerequisite is merged into develop yet. Every item below was checked present; products-placeholder.ts was already gone.** Before starting, confirm that both admin-foundation and category-management are merged into develop, then branch `feat/admin-catalog/product-management` from develop. On the current demo branch:
  - apps/api/src/admin/ holds only admin-foundation's guard, module, controller and grant-admin files.
  - apps/cms/src/app holds only the spike files, and app.routes.ts:3,6 still routes `products` to `ProductsPlaceholder`.
  - packages/shared/src/admin/ doesn't exist.

  Check that these exist:
  - apps/api/src/admin/admin.guard.ts (`AdminGuard`) and apps/api/src/admin/admin.module.ts (registered in apps/api/src/app.module.ts, with `CategoriesController` already in it)
  - apps/api/src/admin/categories/ (`GET /admin/categories`, categories.service.ts, testing/fake-categories-db.ts)
  - packages/shared/src/admin/categories.ts exporting `slugifyCategoryName`, `adminCategorySchema` and `adminCategoryListSchema`, re-exported through packages/shared/src/admin/index.ts and packages/shared/src/index.ts
  - packages/shared/src/catalog/enums.ts exporting `SLUG_PATTERN`, with `categorySlugSchema` as a format-checked string
  - packages/shared/src/catalog/sizes.ts exporting `SeedCategorySlug`, with `SIZES_BY_CATEGORY` keyed by it
  - packages/shared/src/catalog/query.ts, where `facets.category` is a `[{ slug, name, count }]` array and `catalogProductSchema` has `categoryName`
  - apps/api/src/catalog/load-catalog.ts, where the category upsert already uses `update: {}`
  - apps/cms/src/app/app.routes.ts (guarded layout with the `categories` child and the `**` fallback), apps/cms/src/app/layout/layout.component.ts (with the "Categories" link) and apps/cms/src/app/categories/categories.service.ts
  - apps/web/e2e/admin-access.spec.ts, apps/web/e2e/admin-categories.spec.ts and the `npm run admin:grant` script

  If any of these is missing, stop and report. Don't re-implement admin-foundation or category-management pieces here. (AC7, AC8, AC9, AC10)

## Shared schemas

- [x] T2 Write the failing shared tests first. (testing skill)
  - New packages/shared/src/admin/slugify.test.ts, starting with `// covers AC3, T2`:
    - `slugify("Trail Running", 40)` → `"trail-running"`
    - punctuation and repeated spaces collapse to one hyphen, and leading/trailing hyphens are stripped
    - accents are removed
    - the result is cut to `maxLength` with no trailing hyphen
    - a name made only of symbols → `""`
    - packages/shared/src/admin/categories.test.ts stays unchanged and green, which proves the extraction didn't change `slugifyCategoryName`
  - New packages/shared/src/admin/products.test.ts, starting with `// covers AC1, AC2, AC3, AC4, AC5, T2`:
    - `createProductSchema` trims text and enforces the AC3 limits: `name` 1–80, `subtitle` 1–120, `description` 1–2000, `techNote` ≤ 500 (optional) and `beginnerTag` 1–80. Empty or whitespace-only required text is rejected.
    - `priceCents` must be a positive integer, so 0, -1, 1.5 and `"100"` are all rejected.
    - `artColor`/`artAccent` must match `/^#[0-9a-f]{6}$/i`, so `"#fff"`, `"red"` and `"#gggggg"` are rejected.
    - `runType`, `gender` and `artKind` reuse `runTypeSchema`, `genderSchema` (enums.ts:6-7) and `artKindSchema` (query.ts:38).
    - `sizePreset` accepts only `shoe` / `apparel` / `one-size`.
    - `slug` is optional. When given, it must pass `productSlugSchema` (max 100).
    - Unknown keys are rejected because the object is strict.
    - Every seed product in apps/api/src/catalog/catalog-data.ts passes `createProductSchema` once a preset is added, so the length limits fit real data.
    - `updateProductSchema` is the create schema without `slug` and `sizePreset`, and rejects either key.
    - `addSizeSchema` trims `size` and accepts 1–20 characters.
    - The lenient list-query parse:
      - `q` is trimmed, and an empty `q` is dropped.
      - A well-formed `category` is kept, and a malformed one is flagged so the result is empty. It is never dropped and never throws.
    - `adminProductListItemSchema` and `adminProductSchema` (with `variants: [{ id, size, sortOrder, stock }]`) are strict and require every AC1/AC2 field.
    - `slugifyProductName("Cloud Runner 2")` → `"cloud-runner-2"`. The result is cut to 100 characters and passes `productSlugSchema`.
  - Update packages/shared/src/catalog/sizes.test.ts, starting with `// covers AC11, T2`:
    - Replace the "throws on an unknown slug" case (currently :43-45) with "falls back to One size for any other slug, never throws".
    - `defaultSizePreset`: shoes → `shoe`, apparel → `apparel`, gear → `one-size`, and `"trail-running"` → `one-size`.
    - `SIZE_PRESETS` keeps the existing size sets in order.
    - `sizePresetSchema` accepts only the three keys.
- [x] T3 Edit packages/shared/src/catalog/sizes.ts. This is a minimal edit to catalog-foundation code.
  - Add `SIZE_PRESETS` (`shoe` → `SHOE_SIZES`, `apparel` → `APPAREL_SIZES`, `one-size` → `GEAR_SIZES`), `sizePresetSchema`, the `SizePreset` type and `defaultSizePreset(slug: string)`.
  - `sizesForCategory(slug: string)` returns `SIZE_PRESETS[defaultSizePreset(slug)]` and no longer throws.
  - Keep `SIZES_BY_CATEGORY` and `SeedCategorySlug` from category-management.
  - Export the new names from packages/shared/src/catalog/index.ts.

  Confirm that the callers (apps/api/src/catalog/catalog-data.ts:49, catalog-data.test.ts:43, product-detail.db.test.ts:46) need no edit. The sizes.test.ts part of T2 goes green. (AC11)
- [x] T4 Extract the slugify core into new packages/shared/src/admin/slugify.ts, exporting `slugify(text, maxLength)`. Make `slugifyCategoryName` in packages/shared/src/admin/categories.ts call `slugify(name, 40)`, as a minimal edit to category-management code. Export `slugify` from packages/shared/src/admin/index.ts. slugify.test.ts goes green, and categories.test.ts stays green. (AC3)
- [x] T5 Add packages/shared/src/admin/products.ts with:
  - `createProductSchema`, `updateProductSchema`, `addSizeSchema`
  - `adminProductListQuerySchema` plus a lenient `parseAdminProductListQuery()`
  - `adminProductListItemSchema`, `adminProductListSchema`, `adminProductSchema` and their inferred types
  - `slugifyProductName()`, which calls `slugify(name, 100)`

  Reuse `productSlugSchema`, `runTypeSchema`, `genderSchema`, `artKindSchema` and `sizePresetSchema`. Export everything through packages/shared/src/admin/index.ts. The products.test.ts part of T2 goes green. (AC1, AC2, AC3, AC4, AC5)

## Catalog load (create-only)

- [x] T6 Write or update the failing catalog-load tests, each file starting with `// covers AC12, T6`. (testing skill)
  - apps/api/src/catalog/load-catalog.test.ts:
    - In "upserts variants by (productId, size) with stock and sort order", the `update.stock` assertion at :185 becomes `update` toEqual `{}`. The `create` stock and `sortOrder` assertions stay.
    - Replace "puts the same content fields in update as in create" (:192-207) with "every upsert is create-only": `args.update` is `{}` for category, product and productVariant.
    - The idempotency case (:234) and the never-deletes case (:255) stay green unchanged.
  - apps/api/src/catalog/load-catalog.db.test.ts: add one case inside the existing Rollback pattern (`class Rollback` :21, pattern :104-128), after category-management's case.
    - Inside `db.$transaction(async (tx) => …)`:
      1. Change a seeded product's `name` and `priceCents` and one variant's `stock` and `sortOrder`.
      2. Delete one variant of a second seed product.
      3. Re-run `loadCatalog({ $transaction: (fn) => fn(tx) } as never)`. `loadCatalog` takes `Pick<PrismaClient, "$transaction">` (load-catalog.ts:22), so this shim works.
    - Assert that the edits are kept and that the deleted variant is recreated with its seed stock, then throw `Rollback`.
    - The counts of 3/30/`VARIANT_TOTAL` at :47,56,57 and :127 must stay true outside the rollback.
- [x] T7 Edit apps/api/src/catalog/load-catalog.ts. This is a minimal edit to catalog-foundation code.
  - The product upsert at :49-53 uses `update: {}`, and is still keyed by slug.
  - The variant upsert at :56-60 uses `update: {}`.
  - Update the doc comment at :16-20 to say "creates missing rows, never overwrites or deletes".

  Confirm that apps/api/prisma/seed.ts needs no edit and that no migration is needed. T6 goes green. (AC12)

## Admin products API

- [x] T8 Write the failing admin products tests, each starting with `// covers AC1, AC2, AC3, AC4, AC5, AC6, AC7, T8`. (testing skill)
  - Add apps/api/src/admin/products/testing/fake-products-db.ts, an in-memory fake that supports:
    - `category`, `product` and `productVariant`
    - `findMany` with the name/slug `contains` + `mode: "insensitive"` `OR`, the `category: { slug }` filter and `orderBy`
    - `_count` and variant stock sums
    - nested `variants: { create }`
    - `$transaction(fn)`

    Error behavior:
    - It throws P2002 on a duplicate slug and on a duplicate `(productId, size)`, as apps/api/src/auth/testing/fake-db.ts:91-99 does.
    - It throws P2003 on an unknown `categoryId` and P2025 on update/delete of a missing row.
    - Deleting a product cascades to its variants.

    Don't edit the auth or categories fakes.
  - apps/api/src/admin/products/products.service.test.ts:
    - List:
      - The list is ordered by name, then slug.
      - `q` matches name or slug case-insensitively.
      - `category` filters by slug.
      - A well-formed unknown category or a malformed one returns `[]`, and a malformed one makes no query.
      - `sizeCount`, `totalStock`, `soldOut` (totalStock 0) and `categoryName` are correct.
    - Detail: variants come in `sortOrder`, and an unknown id gives 404.
    - Create:
      - Without a slug, it generates one with `slugifyProductName`.
      - A name that slugifies to `""` gives 400 `fieldErrors.slug`.
      - The `shoe` preset creates 15 variants in preset order, with `sortOrder` = index and stock 0. `one-size` creates one.
      - A P2002 on the slug gives 409 `fieldErrors.slug`.
      - An unknown `categoryId` (missing in the pre-check or a P2003) gives 400 `fieldErrors.categoryId`.
      - On every error, the fake's row counts are unchanged.
    - Update:
      - The fields change and the slug doesn't.
      - Changing `categoryId` leaves the variants untouched.
      - An unknown `categoryId` gives 400, and an unknown id gives 404.
    - Sizes:
      - Add puts the size at the end (`sortOrder` max + 1) with stock 0.
      - A duplicate size gives 409 `fieldErrors.size`.
      - Remove deletes the variant.
      - Removing the last size gives 409 `{ formError: "A product needs at least one size" }` with no delete call.
      - A `variantId` from another product gives 404.
      - Both return the detail shape.
    - Delete: the product is removed, no variants are left, and an unknown id gives 404.
  - apps/api/src/admin/products/products.controller.test.ts runs on the real `AppModule` with the fake Prisma, following apps/api/src/catalog/catalog.controller.test.ts. On every route:
    - 401 when logged out and 403 for a USER session
    - for an ADMIN: 200 or 201 on success, with the body passing the strict shared schema
    - 400 `{ fieldErrors }` for a bad body, a `slug` key on update, price 0, a bad hex color or a bad preset
    - 404 and 409 as above
    - writes return 401 when the `Origin` is missing or wrong
    - `PATCH`/`PUT` aren't routed, and the GET routes write nothing
    - a junk list query never gives a 400
  - apps/api/src/admin/products/products.db.test.ts uses `skipIf(!TEST_DATABASE_URL)` and the Rollback pattern from load-catalog.db.test.ts:21,104-128, running the service over a `{ $transaction: (fn) => fn(tx) }` shim (or whatever pattern category-management's categories.db.test.ts settled on). It covers:
    - create with the `shoe` preset (15 variants, stock 0)
    - the real P2002 on the slug → 409 and the real P2003 on an unknown category → 400
    - duplicate size → 409
    - the last-size block
    - hard delete with no orphan variants
    - read-only list checks against the seeded data (`?category=gear` matches the seed gear count, and `?q=` on a seeded slug)

    Everything rolls back, so the 30s in catalog.db.test.ts:67-75 and load-catalog.db.test.ts:47,57,127 still hold.
- [x] T9 Add apps/api/src/admin/products/products.service.ts with `list`, `get`, `create`, `update`, `addSize`, `removeSize` and `remove`.
  - The list builds its own `where` and doesn't touch apps/api/src/catalog/catalog.service.ts.
  - Create runs in a `$transaction` with nested preset variants.
  - Map errors as tested:
    - P2002 on the slug or size → `ConflictException({ fieldErrors })`, copying apps/api/src/auth/auth.service.ts:76-90
    - P2003 or a missing category → `BadRequestException({ fieldErrors: { categoryId } })`
    - P2025 or a missing row → `NotFoundException`
  - `removeSize` counts the product's variants in the same transaction and blocks at 1.

  The service and db parts of T8 go green. (AC1, AC2, AC3, AC4, AC5, AC6)
- [x] T10 Add apps/api/src/admin/products/products.controller.ts:
  - `@Controller("admin/products") @UseGuards(AuthGuard, AdminGuard)`
  - `GET /` (query through `parseAdminProductListQuery`), `GET /:id`, `POST /`, `POST /:id`, `POST /:id/sizes`, `DELETE /:id/sizes/:variantId` and `DELETE /:id` (returns `{ ok: true }`)
  - bodies go through `ZodBodyPipe` (apps/api/src/auth/zod-body.pipe.ts:9-27) with the T5 schemas

  Register the controller and service in apps/api/src/admin/admin.module.ts, as a wiring edit to admin-foundation. Confirm that `OriginCheckMiddleware` (apps/api/src/app.module.ts:38-40, `forRoutes("*")`) and the proxy-secret middleware already cover `/admin/products*` with no change. The controller part of T8 goes green. (AC1, AC2, AC3, AC4, AC5, AC6, AC7)

## CMS products pages

- [x] T11 Write the failing Vitest specs, each starting with `// covers AC8, AC9, T11`. (testing skill)
  - apps/cms/src/app/products/products.service.spec.ts, with `HttpTestingController`: each method calls the right `/api/admin/products*` URL and method (POST/DELETE only for writes), passes `q`/`category` as query params, and is typed with the `@stride/shared` admin types.
  - apps/cms/src/app/products/product-list.component.spec.ts:
    - the table shows name, category, price, size count, total stock and sold out
    - typing in search and choosing a category (options from category-management's categories service) update the URL query params
    - loading with `?q=&category=` restores both and fetches with them
    - an empty result shows an empty state
  - apps/cms/src/app/products/product-form.component.spec.ts:
    - Create mode:
      - the category select lists the DB categories
      - the preset defaults via `defaultSizePreset` when the category changes (shoes → Shoe sizes, apparel → Apparel, a CMS-created category → One size) and can be overridden
      - dollars `"129.99"` are sent as `12999`
      - the slug preview follows `slugifyProductName` and can be edited
    - Edit mode:
      - the slug is read-only and no preset select is shown
      - size chips show with remove and "add size"
      - delete calls the API only after confirming, then navigates to the list
    - 400/409 `fieldErrors` show next to their field (`slug`, `categoryId`, `size`), and `formError` (last size) shows above the sizes
  - Extend apps/cms/src/app/layout/layout.component.spec.ts: the nav has a "Products" link to `products`.
  - An apps/cms/src/app/app.routes.spec.ts case: `products`, `products/new` and `products/:id` sit under the guarded layout before `**`, and `ProductsPlaceholder` isn't routed.
- [x] T12 Add apps/cms/src/app/products/products.service.ts. It uses `HttpClient` against the same-origin `/api/admin/products*` with no Prisma and no env values. The service spec from T11 goes green. (AC8, AC9)
- [x] T13 Add apps/cms/src/app/products/product-list.component.ts and its template and styles, using Stride tokens from apps/cms/src/styles.css. It includes the table, the search box and the category select, synced with the router query params, and it reuses apps/cms/src/app/categories/categories.service.ts. The list spec from T11 goes green. (AC8)
- [x] T14 Add apps/cms/src/app/products/product-form.component.ts and its template and styles, using Stride tokens, for both create and edit. It includes:
  - a reactive form for every AC3 field
  - the preset select, which defaults via `defaultSizePreset`
  - dollars → cents
  - the slug preview, editable on create and read-only on edit
  - size chips with remove and add
  - the delete confirm step
  - errors mapped from `fieldErrors`/`formError`

  Product text renders as escaped text. The form spec from T11 goes green. (AC9)
- [x] T15 **Reload check covered by admin-products.spec.ts (T17) on production builds: it reloads /admin/products?q=…&category=… and loads /admin/products/<id> directly; passed locally on 2026-10-19.** Wiring edits to admin-foundation:
  - In apps/cms/src/app/app.routes.ts, add lazy `products`, `products/new` and `products/:id` children under the guarded layout, before `**`. Remove the spike's `ProductsPlaceholder` route and delete apps/cms/src/app/products-placeholder.ts if it's still there.
  - In apps/cms/src/app/layout/layout.component.ts, add a "Products" nav link.

  The layout and routes specs from T11 go green. On a production build, check by hand that reloading `/admin/products?q=cap` and `/admin/products/<id>` renders the page. (AC8, AC9)

## End-to-end

- [x] T16 Wiring edit to apps/web/playwright.config.ts:18:
  - The `chromium` project gets `testIgnore: /admin-products\.spec\.ts/`.
  - Add a second project `{ name: "admin-writes", testMatch: /admin-products\.spec\.ts/, dependencies: ["chromium"], use: { ...devices["Desktop Chrome"] } }`.

  Confirm that CI (.github/workflows/ci.yml:75, `npm run test:e2e` → `playwright test` with no `--project`) runs both projects. Confirm that catalog.spec.ts, shopping-journey.spec.ts, product-detail.spec.ts, admin-access.spec.ts and admin-categories.spec.ts still run in `chromium` with no edits. If a storefront test fails, Playwright skips `admin-writes`; CI already fails on the storefront test. (AC13)
- [x] T17 Write apps/web/e2e/admin-products.spec.ts, starting with `// covers AC8, AC9, AC10, AC13, T17`. Promote the admin with `npm run admin:grant`, as admin-access.spec.ts does. The test:
  1. creates a uniquely named (timestamped) category through `/admin/categories`
  2. on `/admin/products/new`, picks that category, sees the preset default to One size, and saves
  3. finds the product with search and the category filter on `/admin/products`
  4. sees it sold out in `/catalog?q=<name>` and opens `/product/[slug]`
  5. edits its price in the CMS and sees the new price on `/product/[slug]` on reload
  6. adds a size and removes "One size"
  7. deletes it after confirming, then sees it gone from `/catalog` and gets not found on `/product/[slug]`

  In `afterAll`, it deletes the product (if it's left) and then the category through the admin API, so local reruns with `reuseExistingServer` keep the count of 30. (AC8, AC9, AC10, AC13)
- [x] T22 Make a minimal wiring edit to apps/web/e2e/admin-access.spec.ts (admin-foundation), per Changelog 2026-10-19. In "logged out: /admin/products → login → back on /admin/products" (:103) and "an admin sees the shell, a deep-link reload serves it…" (:132), assert the shell plus the "Products" heading at /admin/products instead of the "Dashboard" heading.
  - Keep the Dashboard assertion for `/admin`.
  - Leave every other case unchanged.
  - Add `AC13, T22` to the file's covers comment.

  admin-access.spec.ts goes green in `chromium`. (AC13)

## Docs

- [x] T18 **Stride docs: no change needed. catalog-search/tech-plan.md:31 says "idempotent `loadCatalog`", which still holds, and architecture.md says nothing about seed overwrites. Record this in the PR. The epic.md row was already there.** Edit softwareos/products/cms/epics/admin-catalog/tech-plan.md:
  - Update the `product-management` candidate line (:33): list/search/filter, add with a size preset, edit, add or remove sizes, hard delete with the variant cascade; no stock editing.
  - Record the size-preset decision: Shoe / Apparel / One size, the default from the category, and that `sizesForCategory` falls back to One size.
  - Record that the re-seed and catalog load are create-only for products and variants, and that a seeded product an admin deleted is recreated on re-seed.
  - Keep or confirm the hard-delete risk to revisit with cart-checkout.

  Add the product-management row to the Specs table in softwareos/products/cms/epics/admin-catalog/epic.md if /shape-spec didn't. Check softwareos/products/stride/epics/catalog-search/tech-plan.md and softwareos/products/stride/architecture.md for statements that the load or seed overwrites content or stock. Fix any you find with a one-line edit; otherwise record "no change needed" in the PR.

## Verification

- [x] T19 **Waived locally, 2026-10-20 (setup mode, by david-schwartzman): the 3 load-catalog.db.test.ts timeouts against remote Neon are accepted. CI's Postgres must run them green on the PR. Every new or updated test file has its covers comment, and AC1–AC13 each trace to a test.** **Blocked, 2026-10-19 local run against the remote Neon dev DB:**
  - lint, typecheck and build are green
  - unit tests: 539/542 pass; the 3 failures in load-catalog.db.test.ts are timeouts (60s, and Prisma's 5s transaction limit) caused by remote latency, including a catalog-foundation case
  - e2e: admin-access.spec.ts:103 and :132 fail because their `expectShell` needs a "Dashboard" heading at /admin/products, which T15 now routes to the products page. That contradicts AC13 and T16's "no edits", so it needs /spec-changes
  - smoke.spec.ts:26 at 375px was a flake (15/15 on rerun)
  - admin-writes was skipped because chromium failed

  **2026-10-20 rerun, after T22:** the e2e blocker is gone. The full e2e run passed 52/54: smoke.spec.ts:26 at 1280px flaked again (30/30 on `--repeat-each 15`) and admin-writes didn't run. admin-writes then passed on its own (`--no-deps`). products.db.test.ts is green. The same 3 load-catalog.db.test.ts cases still time out against remote Neon. There's no local Postgres, so finish this in CI or against a local DB.

  Run the full suites green, locally and in CI (testing skill):
  - `npm run lint`
  - `npm run typecheck`
  - `npm test` for shared, api, cms and web, with `TEST_DATABASE_URL` set so the `*.db.test.ts` files run, including products.db.test.ts, the new load-catalog.db.test.ts case and the unchanged counts of 3 and 30
  - `npm run build`
  - Playwright `npm run test:e2e`, with both projects: `chromium` (catalog, shopping-journey, product-detail, admin-access and admin-categories) and then `admin-writes` (admin-products)

  Check that every new or updated test file has its `covers AC<n>, T<n>` comment, and that AC1–AC13 each trace to at least one test.
- [x] T20 **Passed 2026-10-20 (security-reviewer, low effort): all 10 checks pass, 0 findings. Key evidence: products.controller.ts:34 guards the whole controller; removeSize scopes the variant by productId (products.service.ts:245-247); schema.prisma:117 cascades variant deletes.** Security review of the spec's diff (security-reviewer agent), covering:
  - every `/api/admin/products*` route is behind `AuthGuard` then `AdminGuard`, and fails closed
  - writes are POST/DELETE only and are covered by the Origin check
  - every body is Zod-validated and strict, so the slug can't change on update and stock can't be set through any body
  - the list query can't cause an error or an injection (Prisma `contains`, no raw SQL)
  - Prisma errors map to 400/404/409 without leaking internals
  - `variantId` is scoped to its product, so there's no cross-product delete
  - hard delete can't orphan variants
  - the CMS bundle has no secrets or env values, and the Angular guard is treated as UX only
  - product text and hex colors render safely (escaped text, and `artColor`/`artAccent` constrained before reaching inline styles in `ProductArt`)
  - the Playwright project split doesn't skip any suite in CI
- [~] T21 **Partial QA 2026-10-25: qa-report.md is PASS WITH NOTES. AC10 and AC13 are not verifiable yet, the scope check is clean, and all red comes from cart-checkout. Still to do: e2e (blocked by cart's web build), the products.db.test.ts paging cases, and the manual pass below. Re-run qa afterwards.** Run QA against acceptance criteria AC1–AC15 (qa skill) and write qa-report.md. Include a manual pass:
  1. Grant admin to a local account and open `/admin/products` from the layout link. Reload with a search and a category filter set.
  2. Add a shoe product (15 sizes), and add a product in a CMS-created category (One size by default). Override a slug and try a duplicate slug (409 shown on the field).
  3. Edit the price and the category, and check `/catalog` and `/product/[slug]` on the next load (sold out, new price, category name).
  4. Add and remove a size, and try removing the last one (blocked).
  5. Delete a product after confirming, and check that `/product/[slug]` returns not found.
  6. Check a non-admin (403) and a logged-out user (401).
  7. Edit a seeded product and run `npm run db:seed` again. Confirm that its fields and its stock are kept.
  8. On a product, pick a named swatch and a Custom colour for the placeholder drawing, save, and reopen: the swatch shows selected and Custom shows the picked colour. Check a photo-less product's drawing on `/catalog` uses them.
  9. Open `/admin/products`. Check page 1 shows 20 rows with `Products (total)`, then step to page 2, reload, open a past-the-end `?page=9` and follow "Go to the last page".
  10. Type a search quickly. The Network tab shows one `/api/admin/products` call after the pause, and the URL drops `page`.
  11. Save in the product form, stock, sale, visibility, image, categories and bulk apply. Each shows "Saved", and a delete shows "Deleted". A failed save shows no toast.

  For scope, check that the only files touched outside the Covers list are:
  - the minimal edits in T3 and T7 to catalog-foundation files: packages/shared/src/catalog/sizes.ts, sizes.test.ts, catalog/index.ts, apps/api/src/catalog/load-catalog.ts, load-catalog.test.ts and load-catalog.db.test.ts
  - the minimal edit in T4 to category-management's packages/shared/src/admin/categories.ts, plus packages/shared/src/admin/slugify.test.ts and packages/shared/src/admin/index.ts
  - packages/shared/src/admin/products.test.ts
  - the wiring edits to admin.module.ts, app.routes.ts, layout.component.ts (and their specs) and playwright.config.ts in T10, T15 and T16, plus the removal of products-placeholder.ts
  - the docs in T18
  - the minimal edit in T22 to admin-foundation's apps/web/e2e/admin-access.spec.ts
  - the T32 toast wiring edits to layout.component.ts and the stock, sale, visibility, images, categories and bulk-bar components (and their specs), and the T33 Changelog notes

  catalog.service.ts, product-detail.service.ts, catalog-data.ts, prisma/seed.ts, apps/web/src/** and catalog.spec.ts must be untouched.

## Colour swatches (Changelog 2026-10-23)

- [x] T23 Write the failing Vitest specs, each starting with `// covers AC9, T23`. (testing skill)
  - New apps/cms/src/app/products/colour-swatch-picker.component.spec.ts:
    - it renders a fieldset with its legend and one radio per swatch (Ink, Volt, White, Chalk, Stone, Slate, Navy) plus "Custom…", each reachable by its accessible name
    - choosing a swatch writes its lowercase hex to the control; arrow keys move between radios
    - a control value that matches a swatch (any case) selects that swatch
    - a value that isn't a swatch selects Custom and shows it in the `<input type="color">`; changing the colour input writes that value
  - Extend apps/cms/src/app/products/product-form.component.spec.ts:
    - a "Placeholder drawing" section with the help text "Shown on the storefront only when this product has no photo." holds "Main colour" and "Detail colour"; no "#rrggbb" label remains
    - create mode defaults to Ink (`#0e0f0c`) / Volt (`#d4ff3a`)
    - edit mode selects the product's swatches; the submitted body carries the picked hex (replace the `type("artColor", …)` step)
- [x] T24 Add apps/cms/src/app/products/colour-swatch-picker.component.ts (standalone, ControlValueAccessor, Stride tokens; White and Chalk get a visible border). In product-form.component.ts/.html, take `artColor`/`artAccent` out of the text-field loop, render them with the picker in the "Placeholder drawing" section, and change their defaults to Ink/Volt. Field errors still show under each group. T23 goes green. (AC9)
- [x] T25 **Done in `c0aa923` (also admin-visibility.spec.ts, which reached the demo branch since).** Make the minimal e2e edits: in apps/web/e2e/admin-products.spec.ts, admin-images.spec.ts, admin-stock.spec.ts and admin-sale.spec.ts, replace `getByLabel("Art color (#rrggbb)").fill("#1f3a5f")` with picking the "Navy" radio in the "Main colour" group. Change nothing else in those files. Only admin-products.spec.ts exists on the product-management stack (#82); the other three get this edit when their own specs (product-images, stock-management, product-discounts) reach develop. (AC9, AC13)
- [ ] T26 Run `npm run lint`, `npm run typecheck`, the cms Vitest suite and Playwright `npm run test:e2e` (both projects) green. Check the new and updated spec files carry their covers comments. (testing skill) (AC9, AC13)

## Pagination, debounce and Saved toast (Changelog 2026-10-25)

- [x] T27 Write the failing shared and API tests, each starting with `// covers AC1, T27`. (testing skill)
  - `adminProductListQuerySchema` with `page`/`pageSize`: defaults, blank counts as absent, and 400s for `page=0`, `abc`, `1.5`, `pageSize=0` and `101`
  - the paged response `{ products, total, page, pageSize, totalPages }`
  - service tests for skip/take and the count
  - `products.db.test.ts`: joining every page with `pageSize=5` matches a single `pageSize=100` request, and a past-the-end page returns `[]` with the real total
- [x] T28 **Unit, controller, CMS, typecheck and lint green 2026-10-25. The products.db.test.ts paging cases are still unrun: the auto-mode classifier denied the run against the demo DB. Run them with `set -a; . apps/api/.env; TEST_DATABASE_URL=$DATABASE_URL npx vitest run src/admin/products/products.db.test.ts` in apps/api. The CMS products.service.spec.ts fixture got the paged fields to keep typecheck green.** Shared: add `page`/`pageSize` to `adminProductListQuerySchema`, give `adminProductListSchema` the paged shape, and export `ADMIN_PRODUCTS_PAGE_SIZE` (20) and `ADMIN_PRODUCTS_PAGE_SIZE_MAX` (100). API: `products.service.ts` `list` runs `findMany({ skip, take })` plus `count({ where })` in one `$transaction`, and `products.controller.ts` maps `page`/`pageSize` failures to 400. T27 goes green. (AC1)
- [x] T29 Write the failing CMS Vitest specs, each starting with `// covers AC8, AC14, T29`. (testing skill)
  - the 500 ms debounce with fake timers (3 quick keystrokes → 1 call), and no call for an unchanged value
  - a filter change drops `page`
  - the pager: Previous/Next at the ends, `…` gaps above 7 pages, `aria-current`, hidden at 1 page
  - past-the-end, and the `Products (total)` heading
  - a pure `pagination-items.spec.ts`
- [x] T30 Add apps/cms/src/app/products/pagination-items.ts and pagination.component.ts. Wire the debounce, the `page` param, the pager, past-the-end and the total heading into product-list.component.ts/.html, and update products.service.ts for the paged response. T29 goes green. (AC8, AC14)
- [x] T31 **RED 2026-10-25: 27 new AC15 cases fail on assertions (no toast yet), the 12 no-toast cases pass, the other 236 stay green. toast.service.ts and toast.component.ts are no-op stubs so the suite builds.** Write the failing toast specs, each starting with `// covers AC15, T31`. (testing skill)
  - `toast.service.spec.ts`: show, replace, auto-close at 3 s, and the × button
  - success shows the toast and an error shows none, in the product-form, stock, sale, visibility, image, categories and bulk-bar specs
- [x] T32 Add apps/cms/src/app/toast/ (`ToastService`, `ToastComponent`) and mount it in layout.component.ts, a wiring edit to admin-foundation. Call `show("Saved")` or `show("Deleted")` in the product form, then as minimal wiring edits in the stock, sale, visibility, image, categories and bulk-bar success handlers. T31 goes green. (AC15)
- [x] T33 Add a Changelog note pointing at this change (product-management Changelog 2026-10-25) in stock-management, product-discounts, product-visibility, product-images, category-management, bulk-actions ("select all" now means the current page) and admin-foundation (the layout mount).
- [~] T34 **Partial 2026-10-25 (left open, per the user). Green for this spec: cms 275/275 (incl. toast), shared admin/products and the api admin/products unit and controller tests, cms/shared/web typecheck, and Prettier on every non-cart file. Every updated spec file has its covers comment. Repo-wide lint, typecheck and tests are red only from cart-checkout's failing-first work on this demo branch: Prettier on 11 cart test files, api typecheck (missing ./cart.service and cartResponseSchema), and 71 failing cart tests (api 38, shared 30, web 3). Still to run: Playwright `npm run test:e2e` (both projects, writes to the shared demo DB) and the products.db.test.ts paging cases (see T28). Tick once both are green.** Run `npm run lint`, `npm run typecheck`, the api/shared/cms suites and Playwright `npm run test:e2e` (both projects) green. Check every new or updated spec file carries its covers comment. (testing skill) (AC1, AC8, AC13–AC15)
