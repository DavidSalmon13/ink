# Stock Management

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/stock-management
> Covers: /api/admin/products/*/stock, /api/admin/products/*/stock/*, apps/api/src/admin/stock/**, apps/cms/src/app/stock/**, packages/shared/src/admin/stock.ts, apps/web/e2e/admin-stock.spec.ts

## Overview

Admins manage stock from a Stock panel on the product edit page (`/admin/products/:id`). They can:
- set the stock of each size and save them all at once
- **Mark out of stock**: set every size to 0, after a confirm
- **Back in stock**: enter one quantity and set it on every size

"Out of stock" stays derived, as the tech plan says: a product is sold out when every variant's stock is 0. There's no new column and no migration. Because "Back in stock" sets one quantity everywhere, quantities from before the product went out of stock aren't restored. The admin fine-tunes per size afterwards.

It serves these parts of the epic:
- the brief's story "mark a product out of stock or back in stock"
- the success criteria "stock changes show up in the storefront catalog", "every `/api/admin/*` endpoint returns 403/401" and "uses Stride's tokens and passes CI"
- the mission's "Simple" and "Live"

Storefront fetches are `cache: "no-store"`, and `soldOut` and per-size availability are computed on every request. So stock edits show on the next request with no web changes and no revalidation (category-management).

It depends on these specs being merged first:
- `admin-foundation`: `AdminGuard`, `AdminModule` and the CMS shell with tokens
- `category-management`
- `product-management`: `ProductsService.get`, the AC2 detail shape, `product-form.component.ts`, create-only re-seed of variant stock, and the `admin-writes` Playwright project

## Goals & User Stories

- As an admin, I see each size's stock on the product edit page, so I know what's available
- As an admin, I can change the stock of one or more sizes and save, and the storefront shows the new availability on the next page load
- As an admin, I can mark a product out of stock in one action, and it shows "Out of stock" in the storefront
- As an admin, I can put a product back in stock by entering one quantity for every size
- As a shopper, sizes with 0 stock are crossed out, and a product with no stock shows as sold out, always matching what the admin set

## Acceptance Criteria

1. AC1: `POST /api/admin/products/:id/stock` with `{ variants: [{ variantId, stock }] }` (strict; 1+ entries; unique `variantId`s; `stock` is an integer from 0 to 9999) sets each listed variant's stock in one transaction and leaves unlisted variants untouched. It returns 200 with the product-management AC2 detail. Invalid input returns 400 `{ fieldErrors }`.
2. AC2: An unknown product id returns 404. Any `variantId` that doesn't belong to the product returns 404. Nothing is written in either case.
3. AC3: `POST /api/admin/products/:id/stock/out` (empty body) sets every variant of the product to 0 and returns the AC2 detail. It's idempotent, any body key returns 400 `{ fieldErrors }`, and an unknown id returns 404.
4. AC4: `POST /api/admin/products/:id/stock/restock` with `{ quantity }` (strict; an integer from 1 to 9999) sets every variant to `quantity` and returns the AC2 detail. 0 or invalid input returns 400 `{ fieldErrors }`, and an unknown id returns 404.
5. AC5: Every stock endpoint returns 401 when logged out and 403 for a non-admin. Writes are POST only and fail with 401 when the `Origin` is missing or wrong. No product create or update body can set stock (product-management's strict schemas).
6. AC6: On `/admin/products/:id`, the Stock panel lists every size in `sortOrder` with a number input (min 0, max 9999) and an "Out" badge on sizes at 0. Behaviour:
   - **Save stock** sends only the changed sizes and is disabled when nothing changed.
   - **Mark out of stock** asks for confirmation first.
   - **Back in stock** takes a quantity.
   - After any action, the panel and the product's size list update from the response, without a reload.
   - API errors (400/404) show next to the input or panel.
   - It uses Stride's tokens.
   - It's not shown on `/admin/products/new`.
7. AC7: After an admin saves stock:
   - the product list (product-management AC1) shows the new `totalStock` and `soldOut`
   - on the next request, `/catalog` shows or clears the "Out of stock" badge
   - `/product/[slug]` enables or crosses out each size to match
   - there's no deploy and no revalidation step
8. AC8: Adding a size (product-management AC5) still creates it with stock 0, and the panel shows it right away. Re-running the seed or the catalog load never overwrites a variant's stock (product-management AC12 holds).
9. AC9: The existing catalog, product-detail, shopping-journey and admin e2e suites and CI pass unchanged. Seeded products' stock is never changed outside a rolled-back DB test.

## Technical Approach

- **Shared (`packages/shared/src/admin/stock.ts`):**
  - `MAX_STOCK = 9999`
  - `updateStockSchema`: strict `{ variants: [{ variantId: string, stock: int 0..MAX }] }` with min 1 entry and unique ids (`superRefine`)
  - `restockSchema`: strict `{ quantity: int 1..MAX }`
  - exported from the admin barrel. The CMS imports types only (`me.service.ts:9` rule) and mirrors the limits in input attributes, with the API as the authority.
- **API (`apps/api/src/admin/stock/`):**
  - `stock.controller.ts`: `@Controller("admin/products/:id/stock") @UseGuards(AuthGuard, AdminGuard)` with `POST /`, `POST /out` and `POST /restock`. Bodies go through `ZodBodyPipe`. It's registered in `AdminModule` (minimal edit), alongside `StockService`.
  - `stock.service.ts`:
    - Each write runs in one `$transaction`.
    - `update`: loads the product's variant ids (404 if the product is missing), 404s if any id isn't in that set, then runs `productVariant.update` per entry.
    - `markOut` and `restock`: check the product exists (404), then run `productVariant.updateMany({ where: { productId }, data: { stock } })`.
    - Each returns `ProductsService.get(id)`, which needs `ProductsService` in the module's providers (already there from product-management).
  - The DB `CHECK stock >= 0` stays a backstop behind Zod.
  - Absolute sets mean last write wins. That race with cart-checkout's future `decrement` is accepted and noted below.
- **CMS (`apps/cms/src/app/stock/`):**
  - `stock.service.ts`: three `HttpClient` POSTs to same-origin `/api/admin/products/:id/stock*`, typed with `AdminProduct`.
  - `stock-panel.component.ts`: a standalone, signals component.
    - Inputs: `productId` and `variants`. Output: `updated: AdminProduct`.
    - It keeps a dirty map, and Save sends only the changed sizes.
    - It has a confirm step for Mark out of stock and a quantity field for Back in stock.
    - Errors come from `fieldErrors` and `formError`.
    - It uses Tailwind token classes.
  - Embedded in `apps/cms/src/app/products/product-form.component.ts` in edit mode only (minimal edit to product-management code). `(updated)` replaces the form's product signal, so the size chips and the panel stay in sync.
- **Web:** no code changes.
- **Tests:**
  - shared schema tests
  - `stock.service.test.ts` and controller tests on product-management's `fake-products-db.ts`, extended with `updateMany`
  - `stock.db.test.ts` using the Rollback pattern (`load-catalog.db.test.ts:21,104-128`), covering the per-size update, out, restock, a foreign `variantId` writing nothing, and the CHECK backstop
  - the guard matrix in the `admin.module.test.ts` style
  - `stock-panel.component.spec.ts` (`HttpTestingController`)
  - e2e `apps/web/e2e/admin-stock.spec.ts` in the `admin-writes` project. The admin creates a throwaway product (sold out), sets one size, sees `/catalog` and `/product/[slug]` update, marks it out, then restocks with 5.

## Out of Scope

- Remembering pre-out-of-stock quantities (no new column, per the tech plan)
- Bulk stock across several products, CSV import, a stock overview or low-stock report page
- Stock history and an audit log
- Reconciling with checkout's stock decrement. Absolute sets are last write wins. Revisit when cart-checkout's `checkout-order` lands
- Bumping `Product.updatedAt` on stock edits (stock lives on `ProductVariant`)
- Low-stock indicators in the CMS (the storefront's `LOW_STOCK_THRESHOLD` message is unchanged)
- Adding or removing sizes (product-management)

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard + AdminGuard on every stock endpoint, POST-only writes with the Origin check and proxy secret
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): the CMS calls same-origin `/api/admin/*` with shared Zod types, and only the API touches Prisma
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-19 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): a successful Save stock, Mark out of stock or Back in stock shows the CMS "Saved" toast; a failed write shows none and its errors stay inline. This spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
