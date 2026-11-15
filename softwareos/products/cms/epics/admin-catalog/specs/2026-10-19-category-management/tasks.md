# Tasks — Category Management

> Epic: admin-catalog
> Spec: 2026-10-19-category-management
> Branch: feat/admin-catalog/category-management

## Precondition

- [x] T1 Before starting, confirm that admin-foundation is merged into develop, then branch `feat/admin-catalog/category-management` from develop. On the current demo branch, apps/api/src/admin/ does not exist yet and apps/cms/src/app only has the placeholder files. Check that these exist:
  - apps/api/src/admin/admin.guard.ts (`AdminGuard`)
  - apps/api/src/admin/admin.module.ts (registered in apps/api/src/app.module.ts)
  - apps/cms/src/app/app.routes.ts (guarded layout with the `**` fallback child)
  - apps/cms/src/app/layout/layout.component.ts
  - apps/web/e2e/admin-access.spec.ts
  - the `npm run admin:grant` script

  If any of these is missing, stop and report. Do not re-implement admin-foundation pieces here. (AC6, AC7)

## Shared schemas

- [x] T2 Write the failing shared tests first. (testing skill)
  - New packages/shared/src/admin/categories.test.ts, starting with `// covers AC1, AC2, AC3, AC4, T2`:
    - `createCategorySchema` trims `name`, accepts 1–40 characters, and rejects an empty, whitespace-only or 41-character name.
    - `slug` is optional. When given, it must match the slug format and be at most 40 characters, so `"Shoes"`, `"a--b"`, `"-a"` and 41 characters are all rejected.
    - `renameCategorySchema` accepts only `{ name }` and rejects a `slug` key, because it's a strict object.
    - `moveCategorySchema` accepts only `"up"` and `"down"`.
    - `adminCategorySchema` and the list response require `id`, `slug`, `name`, `sortOrder` and `productCount`.
    - `slugifyCategoryName`:
      - `"Trail Running"` → `"trail-running"`
      - punctuation and repeated spaces collapse to one hyphen, and leading/trailing hyphens are stripped
      - accents are removed, so `"Après Ski"` → `"apres-ski"`
      - the result is cut to 40 characters with no trailing hyphen
      - a name made only of symbols → `""`
  - Update packages/shared/src/catalog/enums.test.ts, starting with `// covers AC8, AC10, T2`:
    - `categorySlugSchema` accepts any well-formed slug (`"trail-running"`) and rejects `"Shoes"`, `"a--b"` and more than 40 characters.
    - `CATEGORY_LABELS` is no longer exported.
  - Update packages/shared/src/catalog/query.test.ts, starting with `// covers AC8, AC10, T2`:
    - In the lenient parse and the canonical params, a well-formed unknown category slug is kept and a malformed one is dropped.
    - Duplicate slugs are removed and the slugs are sorted, so the same selection always builds the same href. `?category=shoes&run=trail` stays canonical as `category=shoes&run=trail`.
    - `facets.category` is a strict ordered array of `{ slug, name, count }`.
    - `catalogProductSchema` requires `categoryName`.
  - Update packages/shared/src/catalog/sizes.test.ts, starting with `// covers AC11, T2`: `SIZES_BY_CATEGORY` is keyed by `SeedCategorySlug` (`shoes`/`apparel`/`gear`) and still has the same size sets.
- [x] T3 Add packages/shared/src/admin/categories.ts with:
  - `createCategorySchema`, `renameCategorySchema`, `moveCategorySchema`
  - `adminCategorySchema`, `adminCategoryListSchema` and their inferred types
  - `slugifyCategoryName()`

  Export them through a new packages/shared/src/admin/index.ts and packages/shared/src/index.ts. Write these as strict objects, like the other shared response schemas. The categories.test.ts part of T2 goes green. (AC1, AC2, AC3, AC4)
- [x] T4 Replace the category enum. These are minimal edits to catalog-foundation and product-catalog shared files.
  - packages/shared/src/catalog/enums.ts:5,9,13-17:
    - Move the slug regex from product-detail.ts:7-10 into an exported `SLUG_PATTERN`. Putting it in enums.ts avoids a circular import, because product-detail.ts already imports query.ts.
    - `categorySlugSchema` becomes `z.string().max(40).regex(SLUG_PATTERN)`.
    - Remove `CATEGORY_LABELS`.
    - `CategorySlug` becomes `string`.
  - packages/shared/src/catalog/product-detail.ts: `productSlugSchema` reuses `SLUG_PATTERN`. Its behavior stays the same, including max 100.
  - packages/shared/src/catalog/query.ts:
    - `group()` at :61 accepts a string schema.
    - At :84, :113, :155 and :174, replace `pick(categorySlugSchema.options, …)` with a format filter, de-dupe and sort.
    - `catalogProductSchema.category` at :190 stays the slug string, and the schema gains `categoryName: z.string().min(1)`.
    - `facets.category` at :205-209 becomes `z.array(z.strictObject({ slug, name, count }))`.
  - packages/shared/src/catalog/sizes.ts:13-23: add a seed-local `SeedCategorySlug = "shoes" | "apparel" | "gear"` and key `SIZES_BY_CATEGORY` by it.
  - Update the exports in packages/shared/src/catalog/index.ts.

  The rest of T2 goes green. The api and web typechecks stay red until T8 and T18. That's expected: the strict schemas mean all three must land in this one PR. (AC8, AC10, AC11)

## Catalog API (DB categories)

- [x] T5 Write or update the failing catalog API tests, each file starting with `// covers AC8, AC9, AC10, AC11, T5`. (testing skill)
  - apps/api/src/catalog/catalog.service.test.ts:
    - `listProducts` builds `facets.category` from `category.findMany` in `sortOrder`, then slug order, with the current names.
    - A category with no matching products shows `count: 0`.
    - Each product carries `categoryName`.
    - A well-formed unknown `?category=` slug returns an empty list, not a 400 or 500.
    - A product in a non-seed category maps without throwing.
  - apps/api/src/catalog/catalog.controller.test.ts: the response has the facet array and passes the strict shared schema. An unknown, well-formed category slug returns 200 with an empty list.
  - apps/api/src/catalog/product-detail.service.test.ts: the detail select includes the category `name`, and the response has `categoryName`. A product in a CMS-created category parses.
  - apps/api/src/catalog/catalog-data.test.ts: the seed data uses `SeedCategorySlug`.
  - apps/api/src/catalog/load-catalog.test.ts: the category upsert passes `update: {}`.
  - apps/api/src/catalog/catalog.db.test.ts: the facet array is in order and the totals are still 30. Inside a `$transaction` Rollback, a new category shows with 0 products. A product added to it lists, filters by its slug and shows that category's name.
  - apps/api/src/catalog/product-detail.db.test.ts: the response has `categoryName`. Inside a Rollback, a product in a new category opens.
  - apps/api/src/catalog/load-catalog.db.test.ts: add one case inside the existing Rollback pattern (:104-128). Rename a seed category and change its `sortOrder`, then re-run the load. The name and `sortOrder` are kept, and a deleted seed category is recreated. The count of 3 at :47,56 must stay true outside the rollback.
- [x] T6 Edit apps/api/src/catalog/catalog.service.ts. This is a minimal edit to product-catalog code.
  - `PRODUCT_SELECT` at :32 selects `category: { select: { slug: true, name: true } }`.
  - Add `category.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] })` to the `Promise.all` at :62.
  - Build the 0-filled ordered `facets.category` from that list and the counts at :138.
  - Remove `GROUP_OPTIONS.category` (:115-119, :127).
  - `toCatalogProduct` (:153-158) sets `category: slug` and `categoryName: name` without the enum parse, which removes the 500 risk.

  The catalog.service, controller and db parts of T5 go green. (AC8, AC9, AC10)
- [x] T7 Edit apps/api/src/catalog/product-detail.service.ts. This is a minimal edit to product-detail code. `DETAIL_SELECT` at :12 selects `category: { select: { slug: true, name: true } }`, and the mapper outputs `categoryName`. The product-detail parts of T5 go green. (AC9, AC10)
- [x] T8 Edit apps/api/src/catalog/load-catalog.ts:28-34 so the category upsert uses `update: {}` (create-only). Switch apps/api/src/catalog/catalog-data.ts (:2, :10, :23, :48-49) to `SeedCategorySlug`. Confirm that apps/api/prisma/seed.ts needs no edit and that no migration is needed. The rest of T5 goes green, and the api typecheck passes. (AC11)

## Admin categories API

- [x] T9 Write the failing admin categories tests, each starting with `// covers AC1, AC2, AC3, AC4, AC5, AC6, T9`. (testing skill)
  - Add apps/api/src/admin/categories/testing/fake-categories-db.ts:
    - an in-memory fake with `category` and `product.count` support, including the case-insensitive `name` match
    - it throws P2002 on a duplicate slug, as auth/testing/fake-db.ts:91-99 does, and P2003 on deleting a category that has products
    - don't edit the auth fake
  - apps/api/src/admin/categories/categories.service.test.ts:
    - The list is ordered by `sortOrder`, then slug, and includes `productCount`.
    - Create:
      - Without a slug, it generates one with `slugifyCategoryName`.
      - A name that slugifies to `""` gives a 400 with `fieldErrors.slug`.
      - `sortOrder` is max + 1, or 0 when there are no categories.
      - A case-insensitive duplicate name gives 409 with `fieldErrors.name`.
      - A P2002 on the slug gives 409 with `fieldErrors.slug`.
    - Rename:
      - The slug is unchanged.
      - A duplicate name (other than the category's own name in a different case) gives 409.
      - An unknown id gives 404.
    - Move:
      - It swaps the category with its neighbor in one `$transaction`.
      - If the two have equal `sortOrder` values, the order is still fixed afterwards. `sortOrder` isn't unique, so ties need handling.
      - Moving the first category up or the last one down returns the unchanged list with no write.
    - Delete:
      - A category with no products is removed.
      - A category with N products gives 409 `{ formError: "Move or delete its N products first", productCount: N }`, with no delete call.
      - A P2003 from the delete is mapped to the same 409.
      - An unknown id gives 404.
  - apps/api/src/admin/categories/categories.controller.test.ts runs on the real `AppModule` with the fake Prisma, following apps/api/src/catalog/catalog.controller.test.ts. On every route:
    - 401 when logged out and 403 for a USER session
    - for an ADMIN: 200 or 201 on success, 400 `{ fieldErrors }` on a bad body, 404 and 409 as above
    - writes return 401 when the `Origin` is missing or wrong
    - no GET route writes, and `PATCH`/`PUT` aren't routed
    - writes return the updated list
  - apps/api/src/admin/categories/categories.db.test.ts uses `skipIf(!TEST_DATABASE_URL)` and the `$transaction` Rollback pattern from load-catalog.db.test.ts:21,104-128. It covers:
    - create
    - move, which swaps the persisted `sortOrder` values
    - delete blocked for a seeded category
    - the race: stub the count to 0, so the real `ON DELETE RESTRICT` P2003 becomes a 409 and the row still exists

    Everything rolls back, so the count of 3 in load-catalog.db.test.ts and the facet totals of 30 in catalog.db.test.ts still hold.
- [x] T10 Add apps/api/src/admin/categories/categories.service.ts with `list`, `create`, `rename`, `move` and `remove`. Each write returns the full list.
  - Map P2002 to `ConflictException({ fieldErrors: { slug } })`, copying auth/auth.service.ts:76-90.
  - Map P2003 to the delete 409.
  - Map P2025 or a missing row to `NotFoundException`, as account-security.controller.ts:208 does.
  - Move rewrites the pair's `sortOrder` inside `$transaction`, and resolves ties as tested.

  The service and db parts of T9 go green. (AC1, AC2, AC3, AC4, AC5)
- [x] T11 Add apps/api/src/admin/categories/categories.controller.ts:
  - `@Controller("admin/categories") @UseGuards(AuthGuard, AdminGuard)`
  - `GET /`, `POST /`, `POST /:id`, `POST /:id/move` and `DELETE /:id`
  - bodies go through `ZodBodyPipe` (apps/api/src/auth/zod-body.pipe.ts) with the T3 schemas

  Register the controller and service in apps/api/src/admin/admin.module.ts, as a wiring edit to admin-foundation. Confirm that `OriginCheckMiddleware` and the proxy-secret middleware already cover `/admin/categories*` with no change. The controller part of T9 goes green. (AC1, AC2, AC3, AC4, AC5, AC6)

## CMS categories page

- [x] T12 Write the failing Vitest specs, each starting with `// covers AC7, T12`. (testing skill)
  - apps/cms/src/app/categories/categories.service.spec.ts, with `HttpTestingController`: each method calls the right `/api/admin/categories*` URL and method (POST/DELETE only for writes), and is typed with the `@stride/shared` admin types.
  - apps/cms/src/app/categories/categories.component.spec.ts:
    - the table shows name, slug, product count and order
    - typing a name updates the slug preview, which stays editable
    - add, inline rename, up/down and delete (only after confirming) each re-render from the list the server returns
    - the up button is disabled on the first row and the down button on the last
    - a 409 or 400 `fieldErrors` shows next to its field, and the delete `formError` (with N) shows on its row
  - Extend apps/cms/src/app/layout/layout.component.spec.ts: the nav has a "Categories" link to `categories`.
  - An apps/cms/src/app/app.routes.spec.ts case: the `categories` child sits under the guarded layout, before `**`.
- [x] T13 Add apps/cms/src/app/categories/categories.service.ts, which uses `HttpClient` against the same-origin `/api/admin/categories*` with no Prisma and no env values. The service spec from T12 goes green. (AC7)
- [x] T14 Add apps/cms/src/app/categories/categories.component.ts and its template and styles, using Stride tokens from apps/cms/src/styles.css. It includes:
  - the table
  - the add form with the live `slugifyCategoryName` preview, which the user can override
  - inline rename
  - up/down buttons
  - a delete confirm step
  - errors mapped from `fieldErrors`/`formError`

  The component spec from T12 goes green. (AC7)
- [x] T15 Wiring edits to admin-foundation:
  - In apps/cms/src/app/app.routes.ts, add a lazy `categories` child under the guarded layout, before the `**` fallback.
  - In apps/cms/src/app/layout/layout.component.ts, add a "Categories" nav link.

  The layout and routes specs from T12 go green. On a production build, check by hand that reloading `/admin/categories` renders the page. (AC7)
  - Note (2026-10-19): the hand reload check is deferred to T23 manual step 1, because the web build stays red until T18 by design. The proxy already rewrites every extensionless `/admin/*` path to `/admin/index.html` (apps/web/src/proxy.ts:45,63-66).

## Storefront (web)

- [x] T16 Write or update the failing web tests, each file starting with `// covers AC8, AC9, AC10, AC12, T16`. (testing skill)
  - Add `categoryName` to the fixtures in apps/web/src/features/catalog/test-products.ts:11 and apps/web/src/features/product/test-products.ts:18.
  - apps/web/src/features/catalog/FilterForm.test.tsx: the options come from `facets.category` in order, with the current names. A category with 0 products is listed. The hrefs are deterministic (the comparison at :81-86 still holds).
  - apps/web/src/features/catalog/ActiveFilterChips.test.tsx: the chip shows the name from the slug→name map, and falls back to the slug.
  - apps/web/src/features/product/ProductBreadcrumb.test.tsx: renders `categoryName` and links by slug.
  - apps/web/src/features/product/SoldOutNotice.test.tsx: "See other <categoryName>" links to `/catalog?category=<slug>`.
  - apps/web/src/features/home/load-featured.test.ts: update only the fixture facets (:26) to the array shape. The featured tabs still use shoes/apparel/gear.
- [x] T17 Edit the catalog filter UI. These are minimal edits to product-catalog code.
  - apps/web/src/features/catalog/FilterForm.tsx (:4, :38, :200, :202): build the options from `facets.category`.
  - apps/web/src/features/catalog/filter-labels.ts (:2, :19) and ActiveFilterChips.tsx (:17-22): take a slug→name map.
  - apps/web/src/features/catalog/CatalogView.tsx: build the map from `facets.category` and pass it down.

  The FilterForm and ActiveFilterChips parts of T16 go green. (AC8, AC9, AC10)
- [x] T18 Edit the product page. These are minimal edits to product-detail code.
  - apps/web/src/features/product/ProductBreadcrumb.tsx (:1, :19) uses `product.categoryName`.
  - apps/web/src/features/product/SoldOutNotice.tsx (:1, :7, :20) takes `{ slug, name }`.
  - Update its caller in apps/web/src/app/product/[slug]/page.tsx:71.

  Confirm that apps/web/src/features/home/home-content.ts:9 still typechecks with no edit, and that Header, Footer, CategoryTiles, FeaturedTabs and load-featured.ts are untouched. The rest of T16 goes green, and the web typecheck passes. (AC9, AC12)

## End-to-end

- [x] T19 Write apps/web/e2e/admin-categories.spec.ts, starting with `// covers AC5, AC7, AC8, AC9, T19`. Promote the admin with `npm run admin:grant`, as admin-access.spec.ts does. The test:
  1. adds a uniquely named category (timestamped, and not matching `/Shoes/`) with the slug preview
  2. renames it
  3. sees the new name in the `/catalog` filter with count 0
  4. deletes it after the confirm step
  5. tries to delete `shoes` and sees the "Move or delete its N products first" error, after which shoes is still listed

  It never renames or reorders the seeded categories, and it cleans up in `afterAll`, so the parallel catalog.spec.ts, shopping-journey.spec.ts and product-detail.spec.ts (`fullyParallel: true`) stay green with no edits. (AC5, AC7, AC8, AC9, AC12)

## Docs

- [x] T20 Edit softwareos/products/cms/epics/admin-catalog/tech-plan.md:
  - Update the `category-management` candidate line: list, add, rename, reorder and delete; delete is blocked while the category has products; no revalidation needed.
  - Replace the "Storefront freshness" risk with the decision: storefront catalog fetches are `cache: "no-store"`, so there's no revalidation hook.
  - Replace the "Deleting a category that still has products" risk with the decision: blocked with a 409 and the product count, and `ON DELETE RESTRICT` covers the race.
  - Note that DB categories replaced the shared category enum, and that the curated nav, footer, tiles and tabs stay code-managed.

  Add the category-management row to the Specs table in softwareos/products/cms/epics/admin-catalog/epic.md if /shape-spec didn't. Check softwareos/products/cms/architecture.md and softwareos/products/stride/epics/catalog-search/tech-plan.md for statements that categories are a fixed enum. Fix any you find with a one-line edit; otherwise record "no change needed" in the PR.

## Verification

- [x] T21 Run the full suites green, locally and in CI (testing skill):
  - `npm run lint`
  - `npm run typecheck`
  - `npm test` for shared, api, cms and web, with `TEST_DATABASE_URL` set so the `*.db.test.ts` files run, including categories.db.test.ts and the unchanged counts of 3 and 30
  - `npm run build`
  - Playwright `npm run test:e2e`, including admin-categories.spec.ts, catalog.spec.ts, shopping-journey.spec.ts, product-detail.spec.ts and admin-access.spec.ts

  Check that every new or updated test file has its `covers AC<n>, T<n>` comment, and that AC1–AC12 each trace to at least one test. AC12 is also covered by the unchanged e2e suites passing in CI.
  - Note (2026-10-19): green locally against a throwaway Postgres 16 set up like CI (migrated and seeded, `TEST_DATABASE_URL` set): lint, typecheck, `npm run build`, `npm test` (api 444/444, including all `*.db.test.ts`, with the 3 categories and 30-product totals intact) and `npm run test:e2e` (53/53, including admin-categories, catalog, shopping-journey, product-detail and admin-access). The first database run found two test bugs, both fixed and the app code unchanged: the categories.db.test.ts rollback harness now runs move's nested `$transaction` inline, and admin-categories.spec.ts now finds Save through the rename form and matches the padded alert text. Every test file named in T2, T5, T9, T12, T16 and T19 has its covers header, and AC1–AC12 each trace. The CI run happens when `pr` pushes the branch.
- [x] T22 Security review of the spec's diff (security-reviewer agent), covering:
  - every `/api/admin/categories*` route is behind `AuthGuard` then `AdminGuard`, and fails closed
  - writes are POST/DELETE only and are covered by the Origin check
  - every body is Zod-validated and strict, so the slug can't change on rename
  - Prisma errors map to 404/409 without leaking internals
  - the delete race can't orphan products
  - the CMS bundle has no secrets or env values, and the Angular guard is treated as UX only
  - category names render as escaped text in both the CMS and the storefront
  - Note (2026-10-19): security-reviewer verdict PASS WITH NOTES, with no critical or high findings and all 7 items passing. One LOW issue is fixed test-first: `filterLabel` (apps/web/src/features/catalog/filter-labels.ts) now reads only own keys, so `?category=constructor` no longer picks up `Object.prototype.constructor` as the chip label. Accepted as LOW and not fixed here:
    - duplicate names under a race: the name check is app-level only, and a DB unique index on `lower(name)` would be a schema change for /spec-changes
    - `move` reads the order without a row lock, so two concurrent moves can scramble `sortOrder` (integrity only; a later fix could use `SELECT … FOR UPDATE`)
    - INFO: there's no rate limit on the admin write routes, which require an admin session
- [x] T23 Run QA against acceptance criteria AC1–AC12 (qa skill) and write qa-report.md. Include a manual pass:
  1. Grant admin to a local account and open `/admin/categories` from the layout link. Reload the page directly.
  2. Add a category and override its slug.
  3. Rename and reorder, then check the catalog filter order, the chip, the breadcrumb and the sold-out "See other …" link on the next load.
  4. Delete an empty category, and try deleting `shoes` (blocked).
  5. Check a non-admin (403) and a logged-out user (401).
  6. Re-run `npm run db:seed` and confirm the renames and order are kept.
  7. Check that the header, footer, home tiles and featured tabs still link to shoes/apparel/gear.

  For scope, check that the only files touched outside the Covers list are:
  - the minimal edits in T4, T6–T8 and T16–T18 to catalog-foundation, product-catalog and product-detail files
  - the wiring edits to admin.module.ts, app.routes.ts and layout.component.ts in T11 and T15
  - packages/shared/src/admin/index.ts and packages/shared/src/index.ts
  - the docs in T20
