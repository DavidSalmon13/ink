# Category Management

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/category-management
> Covers: /admin/categories, /api/admin/categories, /api/admin/categories/*, apps/api/src/admin/categories/**, apps/cms/src/app/categories/**, packages/shared/src/admin/categories.ts

## Overview

Admins manage the storefront's categories in the CMS at `/admin/categories`: list, add, rename, reorder and delete them. Deleting a category is blocked while it still has products. To make those changes show up in the storefront, this spec replaces the hardcoded category enum (`shoes`/`apparel`/`gear` in `packages/shared/src/catalog/enums.ts`) with database categories in the catalog API and the storefront's filters, chips, breadcrumb and sold-out notice. The header, footer, home tiles and featured tabs stay curated links to the three seeded categories.

It serves these parts of the epic:
- the brief's story "add, edit and remove categories" (assigning products to categories is `product-management`)
- the success criteria "category changes show up in the storefront catalog" and "every `/api/admin/*` endpoint returns 403/401"
- the mission's "Simple" and "Live"

It settles two tech-plan risks:
- **Freshness:** every storefront catalog fetch already uses `cache: "no-store"`, and no page caches or revalidates, so edits show on the next request with no revalidation hook.
- **Deleting a category with products:** blocked with a clear error.

It depends on `admin-foundation` (`AdminGuard`, `AdminModule`, the CMS shell) being merged first.

## Goals & User Stories

- As an admin, I see every category with its product count in the order shoppers see it, so I know what the storefront offers
- As an admin, I can add a category, so new kinds of products have a home
- As an admin, I can rename a category, and the new name shows in the storefront on the next page load with no deploy
- As an admin, I can move a category up or down, so the catalog filter lists them in the order I want
- As an admin, I can delete a category that has no products. If it still has products, I'm told how many and nothing is deleted
- As a shopper, the catalog filter, active-filter chips, breadcrumb and "See other …" link show the current category names

## Acceptance Criteria

1. AC1: `GET /api/admin/categories` returns every category ordered by `sortOrder` (then slug), each with `id`, `slug`, `name`, `sortOrder` and `productCount`.
2. AC2: `POST /api/admin/categories` with `{ name, slug? }` creates a category at the end of the order. The name is trimmed and 1–40 characters. The slug defaults to one generated from the name and must match the product-slug format (lowercase, hyphenated, ≤ 40). A duplicate slug, or a name that matches an existing one case-insensitively, returns 409 with a field error and creates nothing. Invalid input returns 400 `{ fieldErrors }`.
3. AC3: `POST /api/admin/categories/:id` with `{ name }` renames the category. The slug never changes. A duplicate name returns 409 and an unknown id returns 404.
4. AC4: `POST /api/admin/categories/:id/move` with `{ direction: "up" | "down" }` swaps the category with its neighbor in one transaction, and still changes the order when the two share a `sortOrder`. Moving the first category up or the last one down changes nothing and returns the unchanged list.
5. AC5: `DELETE /api/admin/categories/:id` removes a category with no products. A category that still has products returns 409 "Move or delete its N products first" and nothing changes, including when a product is added between the check and the delete. An unknown id returns 404.
6. AC6: Every `/api/admin/categories*` endpoint returns 401 when logged out and 403 for a non-admin. Writes are POST or DELETE only and fail with 401 when the `Origin` is missing or wrong.
7. AC7: An admin at `/admin/categories` (linked from the CMS layout, and survives a deep-link reload) can:
   - see the table (name, slug, product count, order)
   - add a category, with a slug preview that can be edited before saving
   - rename a category inline
   - move it up or down
   - delete it after a confirm step

   API errors (409/400) show next to the field or row. The page uses Stride's tokens.
8. AC8: The storefront catalog filter lists every database category in `sortOrder` with its current name and count, including categories with 0 products. Active-filter chips show the category name.
9. AC9: After an admin renames a category, the next request shows the new name in the catalog filter, chips, the product breadcrumb and the sold-out "See other …" link. There's no deploy and no revalidation step.
10. AC10: A product in a category created in the CMS lists in `/catalog`, filters by its slug and opens on `/product/[slug]` with no error. A well-formed unknown `?category=` slug shows the empty-results state. A malformed one is dropped, as before.
11. AC11: Re-running the seed or the catalog load creates any missing seed categories but never overwrites an existing category's name or `sortOrder`.
12. AC12: The existing catalog, shopping-journey and product-detail e2e suites and CI pass unchanged. The header, footer, home tiles and featured tabs still link to shoes/apparel/gear.

## Technical Approach

- **Shared (`packages/shared`):**
  - New `src/admin/categories.ts` holds the admin request and response schemas:
    - `createCategorySchema`, `renameCategorySchema`, `moveCategorySchema`
    - `adminCategorySchema` and the list response
    - `slugifyCategoryName()`, shared by the CMS preview and the API default
  - In `src/catalog/enums.ts`, `categorySlugSchema` becomes a slug-format string (the same regex as `productSlugSchema`) and `CATEGORY_LABELS` is removed.
  - In `query.ts`:
    - `group()` accepts a string schema.
    - The lenient parse and canonical params filter by format, de-dupe and sort, so the hrefs stay deterministic.
    - `facets.category` becomes an ordered array `[{ slug, name, count }]`.
    - `catalogProductSchema` gains `categoryName`.
  - `SIZES_BY_CATEGORY` is keyed by a seed-local `SeedCategorySlug`.
  - The response schemas are strict, so the API and web changes ship in one PR and one deploy.
- **Catalog API (`apps/api/src/catalog`):**
  - In `listProducts`, add a `category.findMany({ orderBy: [{ sortOrder: "asc" }, { slug: "asc" }] })` to the existing `Promise.all`. It builds the category facet (0-filled) and replaces `GROUP_OPTIONS.category`.
  - `PRODUCT_SELECT` and `DETAIL_SELECT` select `category: { slug, name }`, and `toCatalogProduct` drops the enum parse.
  - In `load-catalog.ts`, the category upsert uses `update: {}` (create-only).
  - `catalog-data.ts` uses the seed-local slug type.
- **Admin API (`apps/api/src/admin/categories/`):**
  - `categories.controller.ts` under `@Controller("admin/categories") @UseGuards(AuthGuard, AdminGuard)`, registered in `AdminModule`, plus `categories.service.ts`.
  - Bodies go through `ZodBodyPipe`.
  - Create:
    - The name check (case-insensitive) runs in the service.
    - `sortOrder = max + 1`.
    - P2002 on the slug → `ConflictException({ fieldErrors: { slug } })`, copied from `auth.service.ts:76-90`.
  - Move: swap the two `sortOrder` values in a `$transaction`. When they're equal, renumber so the order still changes.
  - Delete:
    - `product.count` → 409 `{ formError, productCount }`.
    - Also map P2003 from the `ON DELETE RESTRICT` foreign key to the same 409 (race).
    - Missing → 404.
  - Write endpoints return the updated list, so the CMS re-renders from the server.
- **CMS (`apps/cms/src/app/categories/`):**
  - A `categories` route under the guarded layout, and a "Categories" link in the layout nav.
  - `categories.service.ts` calls `/api/admin/categories*` with types from `@stride/shared`.
  - `categories.component.ts` holds the table, the add form with the live slug preview (`slugifyCategoryName`), inline rename, up/down buttons and a delete confirm. Errors map from `fieldErrors`/`formError`.
- **Web (`apps/web`):**
  - `FilterForm` options come from `facets.category`.
  - `filter-labels`/`ActiveFilterChips` take a slug→name map passed down from `CatalogView`, falling back to the slug.
  - `ProductBreadcrumb` and `SoldOutNotice` use `product.categoryName`.
  - The test fixtures gain `categoryName`.
  - Curated nav, footer, home tiles and featured tabs are not touched.
- **Tests:**
  - Shared schema tests.
  - Admin controller tests on `AppModule` with fake Prisma (401/403/400/404/409, Origin), following `catalog.controller.test.ts`.
  - `categories.db.test.ts` (create, move, delete-blocked, race) with the Rollback pattern, so `load-catalog.db.test.ts`'s count of 3 stays true.
  - Updated catalog service and DB tests for the facet array.
  - CMS Vitest component specs.
  - e2e `apps/web/e2e/admin-categories.spec.ts`: an admin adds a category, renames it, sees the name in the storefront filter and deletes it. Deleting `shoes` shows the blocked error.

## Out of Scope

- Assigning products to categories, and size sets for new categories (`product-management`)
- Category images, descriptions, nesting or SEO fields
- Changing a slug after it's created
- Making the header, footer, home tiles or featured tabs dynamic. They're code-managed links to the three seeded categories, and deleting one of those (once empty) is allowed but leaves its curated link showing empty results
- A revalidation hook, which isn't needed because storefront fetches are `no-store`
- Drag-and-drop reordering
- Bulk actions

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md) — `AuthGuard` + `AdminGuard` on every admin categories endpoint, POST/DELETE-only writes with the Origin check, the CMS guard is UX only
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — the CMS calls only `/api/admin/*`, no Prisma in web or cms, shared Zod schemas, no migration needed
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-19 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): a successful add, rename or move shows the CMS "Saved" toast and a delete shows "Deleted"; a failed write shows none and its errors stay inline. This spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
