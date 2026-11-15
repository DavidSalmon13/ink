# Product Discounts

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/product-discounts
> Covers: /api/admin/products/*/sale, apps/api/src/admin/sale/**, apps/cms/src/app/sale/**, packages/shared/src/admin/sale.ts, packages/shared/src/pricing.ts, apps/api/prisma/migrations/*_product_sale_price/**, apps/web/e2e/admin-sale.spec.ts

## Overview

Admins put a product on sale from a Sale panel on the product edit page (`/admin/products/:id`). They type the sale price in dollars, see the "% off" it works out to, and save. **Remove sale** puts the product back to its regular price. A sale has no start or end date in v1: it runs until an admin removes it.

The discount is a **sale price per product**. In the Sale panel the admin chooses **Sale price** (types $88) or **% off** (types 20 and sees $88.00). Either way the API stores a price in cents, so the storefront never rounds. One sale price applies to every size of the product, since prices are per product today.

It adds two columns to `Product`:
- `salePriceCents Int?`: null means the product isn't on sale. A CHECK keeps it above 0 and below `priceCents`.
- `effectivePriceCents Int @default(0)`: the price a shopper pays. A Postgres `BEFORE INSERT OR UPDATE` trigger sets it to `COALESCE(salePriceCents, priceCents)` on every write, and a second CHECK backs it up. No application code writes it, so the API, the seed, the catalog load and branches on the shared demo DB that don't know the column all stay correct. The catalog sorts, filters and indexes on this one column, and checkout reads one field.

It's a stored column kept by a trigger, not a generated column, because Prisma can't model generated columns (they'd show as drift on every `migrate dev`). Prisma ignores triggers, so there's no drift. It also leaves room for scheduled sales later, where a cron job sets or clears `salePriceCents` at the start and end time.

This spec covers the data, the admin API and the CMS. The storefront (sale price on cards and the product page, and sorting and filtering by the price shoppers pay) is `catalog-search/2026-10-21-sale-pricing`, which depends on this spec. Between the two merges, an admin can set a sale and the storefront still shows the regular price.

It serves these parts of the epic:
- the brief's story "put a product on sale and take it off sale"
- the success criteria "product changes show up in the storefront catalog" (with sale-pricing), "every `/api/admin/*` endpoint returns 403/401" and "uses Stride's tokens and passes CI"
- the mission's "Simple" and "Live"

It depends on these specs being merged first:
- `admin-foundation`: `AdminGuard`, `AdminModule` and the CMS shell with tokens
- `product-management`: `ProductsService.get`, the AC2 detail shape, `product-form.component.ts`, `fake-products-db.ts`, create-only re-seed and the `admin-writes` Playwright project
- `stock-management`: the edit-page panel pattern this spec copies

## Goals & User Stories

- As an admin, I can set a discount either as a sale price or as a % off, and see the other value before I save, so I know what shoppers will see
- As an admin, I can remove a sale, and the product goes back to its regular price
- As an admin, I see which products are on sale, and at what price, in the product list
- As an admin, I can't set a sale price at or above the regular price, or raise a sale above a lowered regular price by accident
- As a developer, I never write `effectivePriceCents`: the database keeps it right on every insert and update

## Acceptance Criteria

1. AC1: A Prisma migration `<timestamp>_product_sale_price` adds `Product.salePriceCents Int?` and `Product.effectivePriceCents Int NOT NULL DEFAULT 0`, plus an index on `effectivePriceCents`. A hand-written trigger `Product_set_effective_price` (`BEFORE INSERT OR UPDATE`) sets it to `COALESCE(salePriceCents, priceCents)`, and an `UPDATE` backfills existing rows. A raw insert or update that omits `effectivePriceCents` still ends up correct. Two hand-written CHECKs: `Product_sale_price_valid` (`salePriceCents IS NULL OR (salePriceCents > 0 AND salePriceCents < priceCents)`) and `Product_effective_price_matches` (`effectivePriceCents = COALESCE(salePriceCents, priceCents)`). The migration runs cleanly on the seeded DB and on an empty one.
2. AC2: `POST /api/admin/products/:id/sale` with `{ salePriceCents }` (strict; a positive integer) sets the sale price (the trigger updates `effectivePriceCents`) and returns 200 with the product-management AC2 detail. A sale price at or above the product's `priceCents` returns 400 `fieldErrors.salePriceCents` ("Must be below the regular price $X"). Invalid input returns 400 `{ fieldErrors }`, and an unknown id returns 404. Nothing is written on any error.
3. AC3: `DELETE /api/admin/products/:id/sale` clears `salePriceCents` (the trigger sets `effectivePriceCents` back to `priceCents`) and returns the AC2 detail. It's idempotent: removing a sale that isn't there returns 200. An unknown id returns 404.
4. AC4: Every sale endpoint returns 401 when logged out and 403 for a non-admin. Writes are POST or DELETE only and return 401 when the `Origin` is missing or wrong. Product create and update bodies can't set `salePriceCents` or `effectivePriceCents` (product-management's strict schemas reject them).
5. AC5: The product-management AC2 detail adds `salePriceCents` (number or null) and `effectivePriceCents`. The AC1 list adds `salePriceCents`. Shapes are otherwise unchanged.
6. AC6: Product create and update never write `effectivePriceCents`; the trigger keeps it right. Lowering `priceCents` to or below an existing sale price returns 400 `fieldErrors.priceCents` ("Must be above the sale price $X. Change or remove the sale first.") and writes nothing, never a 500.
7. AC7: Re-running the seed or the catalog load creates missing products (the trigger sets `effectivePriceCents`) and never touches an existing product's `salePriceCents` (product-management AC12 holds). `load-catalog.ts` is unchanged.
8. AC8: On `/admin/products/:id`, the Sale panel shows the regular price and a **Sale price / % off** toggle. In Sale price mode the admin types dollars and sees the % off (rounded down to a whole percent). In % off mode the admin types a whole percent from 1 to 99 and sees the resulting price (rounded to the cent). Either way it shows an inline error when the price isn't below the regular price. **Save sale** always sends `salePriceCents` and is disabled until the value is valid and changed. **Remove sale** shows only while a sale is set. After either action the panel and the form update from the response, without a reload. API errors show next to the input. It uses Stride's tokens and isn't shown on `/admin/products/new`.
9. AC9: On `/admin/products`, the price column shows a sale product's sale price with its regular price struck through, so on-sale products are visible at a glance.
10. AC10: The existing catalog, product-detail, shopping-journey and admin e2e suites and CI pass. Seeded products' prices are never changed outside a rolled-back DB test.

## Technical Approach

- **Schema (`apps/api/prisma`):**
  - `schema.prisma`: `salePriceCents Int?` and `effectivePriceCents Int` on `Product`, with `@@index([effectivePriceCents])`. Keep `@@index([priceCents])`.
  - `effectivePriceCents Int @default(0)`. The migration's generated part (columns, index) gets hand-added SQL: the `Product_set_effective_price()` function and its `BEFORE INSERT OR UPDATE` trigger, a backfill `UPDATE "Product" SET "salePriceCents" = "salePriceCents"` (fires the trigger), then both CHECKs (the same hand-edit approach as the catalog migration's `priceCents > 0`). Apply it with `migrate deploy`; never point a shadow-DB URL at a real database.
- **Shared (`packages/shared`):**
  - `src/pricing.ts`: `percentOff(priceCents, salePriceCents)` (whole percent, rounded down) and `salePriceFromPercent(priceCents, percent)` (rounded to the cent). Pure; used by the CMS panel and the storefront badge.
  - `src/admin/sale.ts`: strict `setSaleSchema` (`{ salePriceCents: positive int }`) and its type, exported from the admin barrel.
  - `src/admin/products.ts`: `adminProductSchema` and the list item schema gain the AC5 fields. `createProductSchema` and `updateProductSchema` stay strict with no sale keys.
- **API (`apps/api/src/admin/sale/`):**
  - `sale.controller.ts`: `@Controller("admin/products/:id/sale") @UseGuards(AuthGuard, AdminGuard)` with `POST /` (`ZodBodyPipe(setSaleSchema)`, `@HttpCode(200)`) and `DELETE /`. It's registered in `AdminModule` (minimal edit).
  - `sale.service.ts`: `set(id, cents)` and `clear(id)`, each one `$transaction`: load the product (404), check `cents < priceCents` (400), then `product.update` with `salePriceCents` only. Returns `ProductsService.get(id)`.
  - A CHECK violation from a race (price lowered between the read and the write) maps to the same 400, never a 500.
- **Product-management wiring (minimal edits):**
  - `products.service.ts`: update reads the current `salePriceCents`, returns the AC6 400 when the new price isn't above it, and maps a race (CHECK `Product_sale_price_valid`) to the same 400. Create is unchanged. `get` and `list` select the AC5 fields.
  - `testing/fake-products-db.ts`: stores the two fields, mimics the trigger and mirrors both CHECKs.
- **Catalog load (`apps/api/src/catalog/load-catalog.ts`):** no change; the trigger sets `effectivePriceCents` on create.
- **CMS (`apps/cms/src/app/sale/`):**
  - `sale.service.ts`: `HttpClient` POST and DELETE against `/api/admin/products/:id/sale`, typed with `AdminProduct`.
  - `sale-panel.component.ts`: standalone, signals. Inputs `productId`, `priceCents`, `salePriceCents`; output `updated: AdminProduct`. A `mode` signal (`'price' | 'percent'`): dollars → cents with a live % off from `percentOff`, or a percent → cents via `salePriceFromPercent`. Client-side check against the regular price (the API stays the authority).
  - Embedded in `product-form.component.ts` in edit mode next to the Stock panel (minimal edit). `(updated)` replaces the form's product signal, so a price change in the form and the panel stay in sync.
  - `product-list.component.ts`: the AC9 price cell (minimal edit).
- **Web:** no code changes in this spec (see sale-pricing).
- **Tests:** shared `pricing` and `sale` schema tests; `sale.service.test.ts` and `sale.controller.test.ts` (guard matrix, 400/404, Origin, no PATCH/PUT, AC4 regression on product bodies); `sale.db.test.ts` with the Rollback pattern (set, clear, both CHECKs, backfill holds for seeded rows); product-management service tests for AC6; a `load-catalog.db.test.ts` case for AC7; CMS specs for the panel, service and list cell; e2e `admin-sale.spec.ts` in the `admin-writes` project on a throwaway product.

## Out of Scope

- Showing the sale on the storefront and sorting/filtering by the paid price (`catalog-search/2026-10-21-sale-pricing`)
- Using the sale price in cart and order totals (`cart-checkout`: cart AC5 and checkout-order AC13 read `effectivePriceCents`)
- Scheduled sales with start and end dates. Later: a cron job updates `effectivePriceCents` at the boundaries
- Category-wide or site-wide discounts
- Coupons and promo codes (applied at checkout, a separate feature)
- A different sale price per size
- Sale history or an audit log

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard + AdminGuard on both sale endpoints, POST/DELETE-only writes with the Origin check and proxy secret
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): integer cents, a Prisma migration with hand-written CHECKs, shared Zod types, only the API touches Prisma
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-21 | david-schwartzman | created | Initial shaping — per-product sale price, no scheduling, entered as a price (decided with the user) | — |
| 2026-10-21 | david-schwartzman | change | Sale panel gets a Sale price / % off toggle (AC8, Goals, Overview, Tech); effectivePriceCents is kept by a DB trigger with default 0 instead of API writes (AC1–AC3, AC6, AC7, Tech; load-catalog untouched); percent entry leaves Out of Scope — admins asked to set the discount as a rate; a DB trigger keeps effectivePriceCents right for every writer, including branches on the shared demo DB that don't know the column | — |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): a successful Save sale or Remove sale shows the CMS "Saved" toast; a failed write shows none and its errors stay inline. This spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
