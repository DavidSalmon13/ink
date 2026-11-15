# Product Management

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/product-management
> Covers: /admin/products, /admin/products/*, /api/admin/products, /api/admin/products/*, apps/api/src/admin/products/**, apps/cms/src/app/products/**, apps/cms/src/app/toast/**, packages/shared/src/admin/products.ts, packages/shared/src/admin/slugify.ts, apps/web/e2e/admin-products.spec.ts

## Overview

Admins manage products in the CMS at `/admin/products`:
- list them a page at a time (20 per page), search by name or slug, and filter by category
- add a product with a size preset
- edit its details and category
- add or remove individual sizes
- remove it with a hard delete, where its variants cascade

The changes show in the storefront on the next request. Every successful save in the CMS shows a short "Saved" popup.

It serves these parts of the epic:
- the brief's stories "list, search and filter products", "add, edit and remove products" and the "assign products to categories" half of the category story
- the success criteria "product changes show up in the storefront catalog" and "every `/api/admin/*` endpoint returns 403/401"
- the mission's "Simple" and "Live"

It settles one open question from category-management: **which sizes a product in a new category gets.**
- The admin picks a preset when creating it: Shoe sizes (US 6–13), Apparel (XS–XL) or One size.
- The default is the category's set for `shoes`/`apparel`/`gear`, and One size for any other category.
- `sizesForCategory` falls back to One size instead of throwing.

It also makes the seed and catalog load create-only for products and variants, so re-seeding never reverts an admin's edits.

Decisions carried over:
- Writes are POST/DELETE only (auth-security).
- Removing a product is a hard delete, and its variants cascade (tech plan).
- Storefront fetches are `cache: "no-store"`, so there's no revalidation step (category-management).

It depends on `admin-foundation` (`AdminGuard`, `AdminModule`, the CMS shell) and `category-management`, which provides:
- DB categories and `GET /api/admin/categories`
- `facets.category` as a `[{ slug, name, count }]` array
- `categoryName` on products
- `SeedCategorySlug`
- the slugify helper

Both must be merged first.

## Goals & User Stories

- As an admin, I see the products a page at a time (20 per page), each with its category, price, number of sizes and total stock, and I can step through the pages, so the list stays fast as the range grows
- As an admin, I can search products by name or slug and filter them by category, so I find one quickly
- As an admin, typing in the search box doesn't send a request on every keystroke. The list updates once I pause
- As an admin, after any save I see a "Saved" popup, so I know it worked
- As an admin, I can add a product. I pick its category and a size preset (the category's usual sizes are suggested), and it shows in the storefront on the next page load
- As an admin, I can edit a product's details, price, flags and category, and the change shows in the storefront with no deploy
- As an admin, I can add or remove a single size on a product
- As an admin, I can remove a product after confirming. It disappears from the storefront and its product page returns "not found"
- As a developer, re-running the seed never undoes what admins changed

## Acceptance Criteria

1. AC1: `GET /api/admin/products` returns one page of products ordered by name (then slug, so the order is stable across pages), each with `id`, `slug`, `name`, `categoryId`, `categoryName`, `priceCents`, `sizeCount`, `totalStock`, `soldOut` and `updatedAt`. `?q=` matches name or slug case-insensitively, and `?category=<slug>` filters by category.
   - `page`: a whole number ≥ 1, default 1. `pageSize`: 1–100, default 20 (`ADMIN_PRODUCTS_PAGE_SIZE`). A blank value counts as absent. `page=0`, `page=abc`, `page=1.5`, `pageSize=0` and `pageSize=101` return 400 `{ fieldErrors }`.
   - The response is `{ products, total, page, pageSize, totalPages }`. `total` counts every match, not the page length, and `totalPages` is `ceil(total / pageSize)`, so it's 0 when nothing matches.
   - A page past the end returns 200 with `products: []` and the real `total`/`totalPages`.
   - An unknown or malformed category returns `total: 0` and no products, not an error.
2. AC2: `GET /api/admin/products/:id` returns every editable field plus `variants: [{ id, size, sortOrder, stock }]` in `sortOrder`. An unknown id returns 404.
3. AC3: `POST /api/admin/products` creates a product from:
   - `name`, `slug?`, `subtitle`, `description`, `techNote?`
   - `categoryId`, `runType`, `gender`
   - `priceCents` (a positive integer)
   - `beginnerTag`, `featured`, `isNew`
   - `artKind`, `artColor`, `artAccent` (`#rrggbb`)
   - `sizePreset` (`shoe` | `apparel` | `one-size`)

   Text is trimmed and length-limited:
   - `name` 1–80 characters
   - `subtitle` 1–120
   - `description` 1–2000
   - `techNote` up to 500
   - `beginnerTag` 1–80

   Every seed product fits these limits. The slug defaults to one generated from the name in the product-slug format (≤ 100). It creates one variant per preset size in preset order, each with stock 0, and returns 201 with the AC2 shape. A duplicate slug returns 409 `fieldErrors.slug`, an unknown `categoryId` returns 400 `fieldErrors.categoryId`, and invalid input returns 400 `{ fieldErrors }`. Nothing is written on any error.
4. AC4: `POST /api/admin/products/:id` updates the same fields except `slug` and `sizePreset`. The slug never changes, and the body is strict. Changing `categoryId` moves the product to that category and leaves its sizes untouched. An unknown `categoryId` returns 400, and an unknown id returns 404.
5. AC5: `POST /api/admin/products/:id/sizes` with `{ size }` (trimmed, 1–20 characters) adds a variant at the end with stock 0, and a duplicate size returns 409. `DELETE /api/admin/products/:id/sizes/:variantId` removes that variant. Removing the last remaining size returns 409 "A product needs at least one size", and a variant that belongs to another product returns 404. Both return the updated AC2 shape.
6. AC6: `DELETE /api/admin/products/:id` hard-deletes the product. Its variants are removed by the `ON DELETE CASCADE` and no orphan rows remain. An unknown id returns 404.
7. AC7: Every `/api/admin/products*` endpoint returns 401 when logged out and 403 for a non-admin. Writes are POST or DELETE only and return 401 when the `Origin` is missing or wrong.
8. AC8: An admin at `/admin/products` (linked from the CMS layout, and survives a deep-link reload) sees the table and can search by name or slug and filter by category (from `GET /api/admin/categories`). The filters reflect in the URL query, so a reload keeps them.
   - Search waits until 500 ms after the last keystroke, then updates the URL (`replaceUrl`) and makes one API call. An unchanged value makes no call. The category select applies immediately.
   - `page` lives in the URL too. The CMS reads it leniently: a missing, invalid or repeated value means page 1.
   - The heading shows `Products (total)`, where total counts every match.
9. AC9: An admin can add a product at `/admin/products/new` and edit one at `/admin/products/:id`:
   - The category select lists the DB categories.
   - The size preset defaults from the category (shoes → Shoe sizes, apparel → Apparel, any other → One size) and can be changed before saving.
   - The price is entered in dollars and sent as cents.
   - The two drawing colours sit in a "Placeholder drawing" section with the help text "Shown on the storefront only when this product has no photo." Each one ("Main colour", "Detail colour") is a group of named swatches: Ink #0e0f0c, Volt #d4ff3a, White #ffffff, Chalk #f2f2ee, Stone #3a3d36, Slate #5c5f57, Navy #1f3a5f. A "Custom…" option opens the browser's colour picker. The admin never types a hex code. A saved colour that isn't a swatch shows as Custom with that colour. New products default to Ink / Volt.
   - The slug preview can be edited on create and is read-only on edit.
   - Sizes show as chips with remove and "add size".
   - Delete asks for confirmation.
   - API errors (400/409) show next to their field. The pages use Stride's tokens.
10. AC10: A product created in the CMS lists in `/catalog` (sold out until it has stock) and opens on `/product/[slug]`, including one in a CMS-created category. Edits to its name, price or category show on the next request. After a delete, it's gone from `/catalog` and its `/product/[slug]` returns not found. There's no deploy and no revalidation step.
11. AC11: `sizesForCategory` returns the category's set for `shoes`/`apparel`/`gear` and One size for any other slug, and never throws. `defaultSizePreset(slug)` returns the matching preset key.
12. AC12: Re-running the seed or the catalog load creates missing seed products and variants but never overwrites an existing product's fields or an existing variant's stock or `sortOrder`.
13. AC13: The existing catalog, shopping-journey, product-detail and admin e2e suites and CI pass. They're unchanged except `admin-access.spec.ts`, whose `/admin/products` login-redirect and deep-link-reload checks now expect the Products page instead of the dashboard fallback, and the "Art color (#rrggbb)" fill step in admin-products, admin-images, admin-stock and admin-sale e2e, which now picks the "Navy" swatch. The admin-products e2e runs after the storefront suites, so their count of 30 holds.
14. AC14: Under the table, a `<nav aria-label="Pagination">` styled with Stride's tokens has Previous, numbered pages and Next (as catalog-pagination AC5–AC7 does on /catalog).
    - The current page is text with `aria-current="page"`, not a link. Previous is absent on page 1, and Next is absent on the last page.
    - The pager is hidden when `totalPages ≤ 1`. With more than 7 pages, it shows the first page, the last page and the current page ±1, with `…` in the gaps.
    - The links keep `q` and `category`. Page 1 has no `page` param.
    - Going back to page 1: changing the search or the category drops `page`.
    - Past the end: when `page` > `totalPages` and `total` > 0, the table area shows `There's no page N.` with a `Go to the last page` link to page `totalPages`. When `total` is 0, the existing empty state shows instead.
    - Bulk selection: "select all" selects the current page's rows. Changing pages clears the selection, as a filter change does.
15. AC15: Every successful CMS write shows a toast:
    - "Saved" for product create and edit, add and remove size, stock, sale, visibility, image set, replace and clear, category add, rename and move, and bulk apply. "Deleted" for a product or category delete.
    - It sits bottom-right in a `role="status"` `aria-live="polite"` region, uses Stride's tokens, and closes after 3 s or on its × button. A new toast replaces the current one.
    - A failed write shows no toast. Its errors stay inline as now.

## Technical Approach

- **Shared (`packages/shared`):**
  - New `src/admin/products.ts` holds:
    - the strict request schemas `createProductSchema`, `updateProductSchema` (create without `slug`/`sizePreset`) and `addSizeSchema`
    - `adminProductListItemSchema`, `adminProductSchema` (detail with variants) and the list query schema. The list query gains `page`/`pageSize`, and `adminProductListSchema` is `{ products, total, page, pageSize, totalPages }`, with `ADMIN_PRODUCTS_PAGE_SIZE` (20) and `ADMIN_PRODUCTS_PAGE_SIZE_MAX` (100) exported
    - `slugifyProductName()`
  - Extract category-management's slugify core into a shared `slugify(text, maxLength)` in `src/admin/slugify.ts` that both helpers call.
  - Hex colors match `/^#[0-9a-f]{6}$/i`. `runType`, `gender` and `artKind` reuse `runTypeSchema`, `genderSchema` and `artKindSchema`.
  - In `src/catalog/sizes.ts`, add:
    - `SIZE_PRESETS` (`shoe` / `apparel` / `one-size`), `sizePresetSchema` and `defaultSizePreset(slug: string)`
    - `sizesForCategory(slug: string)`, which goes through `defaultSizePreset` and never throws

    `catalog-data.ts` keeps its seed sizes unchanged.
- **Catalog load (`apps/api/src/catalog/load-catalog.ts`):** the product and variant upserts use `update: {}` (create-only), and seed products are still upserted by slug. This is a minimal edit to catalog-foundation code.
- **Admin API (`apps/api/src/admin/products/`):**
  - `products.controller.ts` under `@Controller("admin/products") @UseGuards(AuthGuard, AdminGuard)`, registered in `AdminModule`, plus `products.service.ts`.
  - Bodies go through `ZodBodyPipe`, and the list query is parsed leniently.
  - The list uses its own `where`, an `OR` of name/slug `contains` with insensitive mode plus `category: { slug }`. It doesn't touch `catalog.service.ts`. It aggregates `_count` and the stock sum from the variants.
  - The list runs `findMany({ skip, take })` and `count({ where })` in one `$transaction` and returns the paged shape. The controller turns schema failures for `page`/`pageSize` into 400s, while `q`/`category` stay lenient.
  - Create runs in a `$transaction` that creates the product and its preset variants (`sortOrder` = index, stock 0).
  - Error mapping:
    - P2002 on the slug → 409 `fieldErrors.slug`, as `auth.service.ts:76-90` does
    - P2003 or a missing category → 400 `fieldErrors.categoryId`
    - P2025 → 404
    - P2002 on `(productId, size)` → 409 `fieldErrors.size`
  - Removing a size counts the product's variants in the same transaction and blocks at 1.
  - Delete is `product.delete`, and the cascade removes the variants.
  - Write endpoints return the AC2 detail (create/update/sizes) or `{ ok: true }` (delete).
- **CMS (`apps/cms/src/app/products/`):**
  - `products`, `products/new` and `products/:id` routes under the guarded layout replace the spike's `ProductsPlaceholder` if it's still there. Add a "Products" link in the layout nav.
  - `products.service.ts` uses `HttpClient` against `/api/admin/products*` and reuses category-management's categories service for the select.
  - `product-list.component.ts`: the table, a search box and a category select, synced to query params.
    - The search input feeds a Subject → `debounceTime(500)` → `distinctUntilChanged()` → `setFilter`, and any filter change drops `page`.
    - `page` comes from `queryParamMap`. A `pagination.component.ts` with a pure `pagination-items.ts` (`paginationItems(page, totalPages)`) copies the logic of apps/web `features/catalog/pagination-items.ts`, since the Angular app can't import the React file.
- **CMS toast (`apps/cms/src/app/toast/`):**
  - `ToastService` holds the message in a signal, with `show(text)` and a 3 s timer that a new `show` restarts. `ToastComponent` renders it.
  - `ToastComponent` is mounted once in `layout.component.ts`, a wiring edit to admin-foundation.
  - Each write's success handler calls `toast.show("Saved")` (or `"Deleted"`). These are minimal wiring edits to the stock, sale, visibility, images, categories and bulk-bar components, each noted in its owner spec's Changelog.
  - `product-form.component.ts`: create and edit, the preset select defaulting via `defaultSizePreset`, dollars → cents, size chips, add size, delete confirm, and errors from `fieldErrors`/`formError`.
  - `colour-swatch-picker.component.ts`: a standalone ControlValueAccessor built as a radio group (fieldset + legend). It has one radio per named swatch (visible name for screen readers, a border so White and Chalk show up) and a "Custom…" radio paired with `<input type="color">`. It writes lowercase `#rrggbb`. The form uses it for `artColor`/`artAccent` under a "Placeholder drawing" section, and its defaults change from #000000 to Ink/Volt. The shared hex schema, the API, the DB and `ProductArt` are unchanged.
- **Web (`apps/web`):** no code changes. `catalog.service.ts` and `product-detail.service.ts` already read products from the DB, `ProductArt` falls back on an unknown kind, and `no-store` makes edits show on the next request.
- **E2E isolation:**
  - Add `admin-products.spec.ts` to a second Playwright project `admin-writes` with `dependencies: ["chromium"]`. The `chromium` project ignores that file through `testIgnore`.
  - This is a wiring edit to `apps/web/playwright.config.ts`. It keeps `catalog.spec.ts`'s count of 30 true while the storefront suites run.
  - `apps/web/e2e/admin-access.spec.ts` (admin-foundation) used `/admin/products` as an unrouted path that fell back to the dashboard. As a minimal wiring edit, its two `/admin/products` checks (`:103` and `:132`) assert the shell plus the "Products" heading there instead of "Dashboard". Its other cases stay unchanged.
- **Tests:**
  - Shared schema, slugify and sizes tests, where the "unknown category throws" case at `sizes.test.ts:44` becomes "falls back to One size".
  - Admin controller tests on `AppModule` with fake Prisma (401/403/400/404/409, Origin, no PATCH/PUT).
  - Service tests.
  - `products.db.test.ts` (create with preset variants, cascade delete, last-size block, P2002/P2003) with the Rollback pattern, so the counts of 30 in `catalog.db.test.ts` and `load-catalog.db.test.ts` stay true.
  - A `load-catalog.db.test.ts` case that edits a seeded product and its stock, re-runs the load and finds both kept.
  - CMS Vitest specs.
  - Paging and debounce tests:
    - shared schema tests for `page`/`pageSize` and the paged response
    - service tests for skip/take and the count, plus controller 400s
    - a `products.db.test.ts` check that joining every page with `pageSize=5` matches a single `pageSize=100` request
    - CMS Vitest with fake timers: 3 quick keystrokes make 1 call after 500 ms. Also the pager, the page reset and past-the-end
  - Toast tests: `toast.service.spec` covers show, replace and auto-close. Each panel's spec checks a toast on success and none on error.
  - e2e `admin-products.spec.ts`: an admin creates a product, sees it sold out in `/catalog` search, edits its price and sees it on `/product/[slug]`, adds and removes a size, deletes it and gets not found.

## Out of Scope

- Editing stock, and marking a product out of or back in stock (`stock-management`). New variants start at 0
- Product images and `imageUrl` (`product-images`). The art fields stay the storefront visual
- Changing a product's slug after creation
- Reordering sizes (new sizes go at the end)
- Bulk actions (bulk-actions owns them)
- Infinite scroll or a page-size picker. The CMS uses a fixed 20 per page
- Soft delete or blocking deletes of products with orders. Revisit when cart-checkout adds cart and order items that reference variants (tech-plan risk)
- Restoring a seeded product an admin deleted. Re-seeding recreates it, which is accepted for dev/seed environments
- A revalidation hook, which isn't needed because storefront fetches are `no-store`
- A live preview of the placeholder drawing in the form

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md) — `AuthGuard` + `AdminGuard` on every admin products endpoint, POST/DELETE-only writes with the Origin check, the CMS guard is UX only
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — the CMS calls only `/api/admin/*`, no Prisma in web or cms, shared Zod schemas, no migration needed
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-19 | david-schwartzman | created | Initial shaping | — |
| 2026-10-19 | david-schwartzman | change | AC13 + E2E isolation: allow a minimal edit to admin-access.spec.ts so its /admin/products checks expect the Products page — /admin/products was an unrouted dashboard fallback there, and T15 routes it (found in the T19 run) | — |
| 2026-10-23 | david-schwartzman | change | AC9/AC13/Technical Approach/Out of Scope: replace the hex text fields with named swatches + a Custom picker under "Placeholder drawing" — admins shouldn't have to type hex codes | — |
| 2026-10-25 | david-schwartzman | change | AC1/AC8 + new AC14/AC15, Covers +apps/cms/src/app/toast/**: paginate /admin/products (20/page, like catalog-pagination), debounce search 500 ms, "Saved" toast on every CMS write — the list shouldn't load every product or hit the DB on every keystroke, and admins get no clear confirmation that a save worked | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
