# Product Visibility

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/product-visibility
> Covers: /api/admin/products/*/visibility, apps/api/src/admin/visibility/**, apps/cms/src/app/visibility/**, packages/shared/src/admin/visibility.ts, apps/api/prisma/migrations/*_product_is_active/**, apps/web/e2e/admin-visibility.spec.ts

## Overview

Admins hide a product from the storefront, and show it again, with one click on the product edit page (`/admin/products/:id`). A hidden product isn't deleted: its details, sizes, stock, sale price and photo stay, and admins still see and edit it in the CMS. Shoppers don't see it anywhere: not in the catalog, its filter counts, the home page, the shoe finder, or at its product URL (404).

It adds one column, `Product.isActive Boolean @default(true)`. Every existing product stays visible, with no backfill. Shoppers reach products only through two API reads, `GET /catalog/products` (catalog page, home featured section and photo picks, shoe finder) and `GET /catalog/products/:slug` (product page), so the storefront change is two `where` clauses in the API and no web code.

It also gives the epic a reversible alternative to hard delete, which the tech plan flags as a risk once cart-checkout's `OrderItem` references products.

The epic has no product brief, and the cms product has no mission.md, so the alignment check was skipped. This spec serves the epic summary's "changes show up in the storefront without a developer or a deploy".

It depends on these specs being merged first:
- `admin-foundation`: `AdminGuard`, `AdminModule`, the CMS shell
- `product-management`: `ProductsService.get`/`list`, the AC2 detail and AC1 list shapes, `product-form` and `product-list`, `fake-products-db.ts`, create-only re-seed, the `admin-writes` Playwright project
- `product-discounts`: the Sale panel pattern this spec copies (per-product endpoint + edit-page panel)
- `bulk-actions`: the list fixtures (`bulk-bar.component.spec.ts`) that gain `isActive`

## Goals & User Stories

- As an admin, I can hide a product from shoppers with one click, without losing anything about it
- As an admin, I can show a hidden product again, and it's back exactly as it was
- As an admin, I can see at a glance which products are hidden, on the product page and in the product list
- As a shopper, I never see a hidden product, and an old link to one shows the usual "not found" page

## Acceptance Criteria

1. AC1: A Prisma migration `<timestamp>_product_is_active` adds `Product.isActive BOOLEAN NOT NULL DEFAULT true`. Every existing product is active after it runs. It runs cleanly on the seeded DB and on an empty one.
2. AC2: `GET /catalog/products` leaves out inactive products from `products`, `total` and every facet count, for any combination of `q`, price, category, run, gender and sort. The catalog page, home featured section, home photo picks and shoe finder therefore never show a hidden product.
3. AC3: `GET /catalog/products/:slug` returns 404 for an inactive product, and `/product/[slug]` renders the existing not-found page.
4. AC4: `POST /api/admin/products/:id/visibility` with `{ isActive }` (strict; a boolean) sets the flag and returns 200 with the product-management AC2 detail. It's idempotent: setting the current value returns 200. Invalid input returns 400 `{ fieldErrors }`, an unknown id returns 404, and nothing is written on any error. No other product field changes.
5. AC5: The visibility endpoint returns 401 when logged out and 403 for a non-admin. It's POST only and returns 401 when the `Origin` is missing or wrong. Product create and update bodies can't set `isActive` (product-management's strict schemas reject it).
6. AC6: The product-management AC2 detail and AC1 list item add `isActive` (boolean). The admin list and detail include inactive products; the admin list's search and category filter are unchanged. Bulk actions still apply to hidden products.
7. AC7: Re-running the seed or the catalog load creates missing products as active and never changes an existing product's `isActive` (product-management AC12 holds). `load-catalog.ts` is unchanged.
8. AC8: On `/admin/products/:id`, a Visibility panel shows the status ("Visible in the catalog" or "Hidden from the catalog") and one button: **Hide from catalog** or **Show in catalog**. No confirm, since the action is fully reversible. The button is disabled while the request runs. After it succeeds the panel and the form's product update from the response, without a reload. An error shows in the panel, and the status is unchanged. It uses Stride's tokens and isn't shown on `/admin/products/new`.
9. AC9: On `/admin/products`, a hidden product's row shows a **Hidden** badge in the status column, next to Sold out when both apply.
10. AC10: After Show, the product is back in the catalog and at its URL on the next request. The home page photo picks are cached stale-while-revalidate for 5 minutes (`load-home-picks.ts`): after a Hide, the first home visit once 5 minutes have passed can still show the cached picks while they refresh in the background. On a quiet site a hidden product's photo, name and price can therefore stay on the home hero or tiles longer than 5 minutes (at most the cache's 1-week expiry); its link already 404s. This is accepted.
11. AC11: An e2e test in the `admin-writes` project, on a throwaway product: hide it, then it's missing from `/catalog?q=<name>` and its URL is a 404; show it, then both are back. The existing catalog, product-detail, shopping-journey, shoe-finder and admin suites and CI pass. Seeded products' `isActive` is never changed outside a rolled-back DB test.

## Technical Approach

- **Schema (`apps/api/prisma`):** `isActive Boolean @default(true)` on `Product`, with a comment ("false = hidden from shoppers, kept for admins"). No index: the catalog is ~30 rows and every read already filters in the same query. Generate the migration, check the SQL is the single `ALTER TABLE ... ADD COLUMN`, and apply it with `migrate deploy`. Never point a shadow-DB URL at a real database.
- **Storefront reads (`apps/api/src/catalog/`, minimal edits to catalog-search's files):**
  - `catalog.service.ts`: `baseWhere()` starts from `{ isActive: true }`. The products query and the facet query both build on `baseWhere`, so the counts follow.
  - `product-detail.service.ts`: `findUnique({ where: { slug } })` becomes `findFirst({ where: { slug, isActive: true } })`; it returns null, and the controller's existing 404 applies.
  - No web change: every web loader (`load-catalog-products.ts`, `load-featured.ts`, `load-home-picks.ts`, `load-shoes.ts`, `load-product.ts`) reads these two endpoints.
- **Shared (`packages/shared`):**
  - `src/admin/visibility.ts`: strict `setVisibilitySchema` (`{ isActive: z.boolean() }`) and its type, exported from the admin barrel.
  - `src/admin/products.ts`: `adminProductSchema` and `adminProductListItemSchema` gain `isActive: z.boolean()`. `createProductSchema` and `updateProductSchema` stay strict with no `isActive`.
- **API (`apps/api/src/admin/visibility/`):**
  - `visibility.controller.ts`: `@Controller("admin/products/:id/visibility") @UseGuards(AuthGuard, AdminGuard)`, one `@Post() @HttpCode(200)` with `ZodBodyPipe(setVisibilitySchema)`. Registered in `AdminModule` (minimal edit).
  - `visibility.service.ts`: `set(id, isActive)` in one `$transaction`: `findUnique` (404), then `product.update({ data: { isActive } })`. Returns `ProductsService.get(id)`. Same shape as `SaleService.clear`.
- **Product-management wiring (minimal edits):** `products.service.ts` selects `isActive` in `list` and maps it in `toDetail`. `testing/fake-products-db.ts` stores `isActive` (default true).
- **CMS (`apps/cms/src/app/visibility/`):**
  - `visibility.service.ts`: `HttpClient` POST to `/api/admin/products/:id/visibility`, typed with `AdminProduct`.
  - `visibility-panel.component.ts` + `.html`: standalone, signals, same structure as `sale-panel`. Inputs `productId`, `isActive`; output `updated: AdminProduct`; `current` is a `linkedSignal` of the input; `busy` and `formError` signals; 404 → "This product no longer exists. Reload the page."
  - Mounted in `product-form.component.html` in edit mode, after the Image panel and before the delete section, with `(updated)="product.set($event)"` (minimal edit).
  - `product-list.component.html`: the AC9 badge in the status cell, styled like Sold out (minimal edit).
- **Tests:** shared schema tests; `visibility.service.test.ts` and `visibility.controller.test.ts` (guard matrix, 400/404, Origin, POST only, the AC5 regression on product bodies); `visibility.db.test.ts` with the Rollback pattern; `catalog.db.test.ts` and `product-detail.db.test.ts` cases for AC2 and AC3 (an inactive product drops out of the list, the facet counts and the detail); a `load-catalog.db.test.ts` case for AC7; CMS specs for the panel, service and list badge; e2e `admin-visibility.spec.ts`. Every `AdminProduct` / list-item fixture gains `isActive: true` (both schemas are strict).
- **PR size:** the fixture updates push one PR past 18 files, so the work ships as stacked PRs (see tasks.md).

## Out of Scope

- Bulk Hide / Show in `POST /admin/bulk/products` (a follow-up spec)
- A Visible / Hidden filter on the admin product list
- Scheduled visibility (show or hide at a date)
- Invalidating the home photo picks cache on Hide (AC10 accepts the stale-while-revalidate lag)
- Cart, wishlist and checkout behaviour for hidden products: those features don't exist yet. When cart-checkout lands, it must refuse inactive products
- Replacing hard delete: delete stays as product-management ships it

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md) — the new admin write: AuthGuard + AdminGuard, POST only, Origin check
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — Prisma only in the API; web and CMS use shared Zod types
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — canonical branch, stacked PRs against develop

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-23 | david-schwartzman | created | Initial shaping | — |
| 2026-10-24 | david-schwartzman | change | AC10 and Out of Scope: the home photo picks cache is stale-while-revalidate, so a hidden product can stay on the home page longer than 5 minutes on a quiet site; accepted — the old "up to 5 minutes" was wrong (T22 security review low finding, QA issue 1) | qa-report.md |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): a successful Hide from catalog or Show in catalog shows the CMS "Saved" toast; a failed write shows none and its error stays inline. This spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
