# Bulk Actions

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/bulk-actions
> Covers: /api/admin/bulk/*, apps/api/src/admin/bulk/**, apps/cms/src/app/bulk/**, packages/shared/src/admin/bulk.ts, apps/web/e2e/admin-bulk.spec.ts

## Overview

Admins select several products on `/admin/products` and apply one action to all of them at once:
- **Put on sale (% off)**
- **Remove sale**
- **Mark out of stock**
- **Back in stock (quantity)**
- **Move to category**

Before anything is saved, a review step shows each selected product's before and after. Apply then writes the whole batch in one transaction: either every product changes or none does.

This adds no new capability. It speeds up user stories the brief already has (sale, out of stock / back in stock, assigning categories) for seasonal sales and catalog reorganising. It follows the same rules as the single-product panels: sale prices come from `salePriceFromPercent` and must stay below the regular price, out of stock stays derived (every size at 0), and stock values are absolute.

The endpoint is `POST /api/admin/bulk/products` and not `/api/admin/products/bulk`, because product-management's `POST /admin/products/:id` would catch `bulk` as an id.

It serves these parts of the epic:
- the stories for sale, stock and category
- the success criteria "changes show up in the storefront", "every `/api/admin/*` endpoint returns 403/401" and "Stride tokens + CI"
- the mission's "Simple": no bulk delete and no CSV import

It depends on these specs being merged first:
- `admin-foundation`: `AdminGuard`, `AdminModule`
- `category-management`: categories in the DB
- `product-management`: the list, `fake-products-db.ts` and the `admin-writes` e2e project
- `stock-management`: the absolute-stock rules
- `product-discounts`: `salePriceCents`, the trigger and `pricing.ts`

## Goals & User Stories

- As an admin, I can select several products, or all the products in the current filtered list, so I can act on a group at once
- As an admin, I can put the selected products on sale at one % off, each priced from its own regular price, or take them all off sale
- As an admin, I can mark the selected products out of stock, or put every size of each one back in stock at one quantity
- As an admin, I can move the selected products to another category
- As an admin, I see exactly what will change before I apply, and either everything changes or nothing does, so I never end up with a half-updated catalog

## Acceptance Criteria

1. AC1: `@stride/shared` exports a strict `bulkProductsSchema`:
   - `ids`: 1–100 unique non-empty strings
   - `action`: one of `set-sale { percent: int 1–99 }`, `clear-sale`, `mark-out`, `restock { quantity: int 1–MAX_STOCK }` or `move-category { categoryId }`

   A bad body returns 400 `{ fieldErrors }`.
2. AC2: `set-sale` sets each product's `salePriceCents` to `salePriceFromPercent(priceCents, percent)`, replacing any existing sale. The trigger updates `effectivePriceCents`.
   - If any result isn't above 0 and below that product's `priceCents`, it returns 400 `{ itemErrors: { <id>: "Must be below the regular price $X" } }` and writes nothing.
   - A CHECK violation from a race maps to the same 400, never a 500.
3. AC3: `clear-sale` sets `salePriceCents` to null on every selected product. Products not on sale are fine (idempotent).
4. AC4: `mark-out` sets every size of every selected product to 0. `restock` sets every size to `quantity`.
5. AC5: `move-category` sets `categoryId` on every selected product. An unknown category, including one deleted mid-request, returns 400 `fieldErrors.categoryId` ("Choose an existing category.").
6. AC6: All or nothing:
   - Each request runs in one `$transaction` and returns 200 `{ updated: <count> }`.
   - Any unknown id returns 404 `{ itemErrors: { <id>: "This product no longer exists." } }`.
   - On any error nothing is written.
   - The single-product endpoints are unchanged.
7. AC7: The endpoint returns 401 when logged out and 403 for a non-admin. It's POST only and returns 401 when the `Origin` is missing or wrong. GET, PUT and PATCH aren't routed.
8. AC8: Selection on `/admin/products`:
   - Every row has a checkbox labelled "Select <name>".
   - The header checkbox selects or clears every visible row, and is indeterminate when only some are selected.
   - Changing the search or category clears the selection.
9. AC9: When at least one product is selected, an action bar shows:
   - "N selected"
   - the action picker and that action's input (percent, quantity or category select)
   - Clear selection

   **Review** is disabled until the input is valid.
10. AC10: Review lists every selected product with its before → after value: sale/regular price, "Sold out" or "N per size", or old → new category.
    - Products that would fail the client-side check are flagged, and Apply is disabled.
    - **Apply to N products** sends the request. Cancel returns to the bar unchanged.
11. AC11: Result handling:
    - On success, a `role="status"` message says "Updated N products", the list refetches and the selection clears.
    - On a 400/404, the item errors show next to their products in the review and nothing changes.
    - Controls are disabled while the request runs.
    - The page uses Stride's tokens and works by keyboard alone.
12. AC12: Existing admin, catalog and storefront e2e suites and CI pass. Seeded products are only changed inside rolled-back DB tests or on throwaway e2e products.

## Technical Approach

- **Shared (`packages/shared/src/admin/bulk.ts`):**
  - `bulkProductsSchema`: a `z.discriminatedUnion` on `action` inside a strict object with `ids`, plus a `superRefine` for duplicate ids.
  - `BulkProductsInput` and `BulkProductsResult` (`{ updated: number }`) types, re-exported from the admin barrel.
  - It reuses `MAX_STOCK` (`stock.ts`) and `salePriceFromPercent` (`pricing.ts`).
- **API (`apps/api/src/admin/bulk/`):**
  - `bulk.controller.ts`: `@Controller("admin/bulk/products") @UseGuards(AuthGuard, AdminGuard)`, with `@Post() @HttpCode(200)` and a `ZodBodyPipe(bulkProductsSchema)`. It's registered in `admin.module.ts` (a wiring edit).
  - `bulk.service.ts`: `apply(input)` runs in one `$transaction`:
    1. `findMany({ where: { id: { in: ids } }, select: { id, priceCents } })`. Any missing id gives the AC6 404.
    2. It then switches on the action:
       - **set-sale:** compute each sale price. Any invalid one gives the AC2 400 with `itemErrors`. Otherwise run one `product.update` per id (the values differ per product).
       - **clear-sale:** `product.updateMany({ salePriceCents: null })`.
       - **mark-out / restock:** `productVariant.updateMany({ where: { productId: { in: ids } }, data: { stock } })`, the same as `StockService.setAll`.
       - **move-category:** check that the category exists, then `product.updateMany({ categoryId })`. A P2003 gives the AC5 400.
    3. CHECK races map through `violatesCheck(error, SALE_PRICE_VALID)` and `usd()` from `sale/sale-errors.ts`. The "Choose an existing category." message is shared with `products.service.ts` by exporting it (a one-line edit).
  - The rules come from the same helpers as the single-item services, so bulk and single edits can't disagree.
- **Fake DB (minimal edit to product-management's `testing/fake-products-db.ts`):**
  - `matches` supports `{ in: [...] }`.
  - Add `product.updateMany`, which runs `withEffectivePrice` and `assertPrices` on each row.
- **CMS:**
  - `apps/cms/src/app/bulk/bulk.service.ts`: an `HttpClient` POST to `/api/admin/bulk/products`.
  - `bulk-bar.component.ts` and its template (standalone, signals):
    - inputs `selected: AdminProductListItem[]` and `categories: AdminCategory[]`; output `applied: number`
    - a `step` signal (`'pick' | 'review'`) and an `action` signal
    - client-side previews use `salePriceFromPercent`; the `itemErrors` mapping copies the sale panel's `errorOf`
  - `product-list.component.ts` and its `.html` (minimal edit):
    - a `selected` signal (a `Set` of ids), cleared in the `queryParamMap` pipe
    - row checkboxes and the header checkbox (`indeterminate`)
    - `<app-bulk-bar>` when the selection isn't empty; `(applied)` refetches the list and clears the selection
- **Tests:**
  - Shared schema tests.
  - `bulk.service.test.ts` on the fake DB: each action, all-or-nothing rollback, 404/400 `itemErrors`, a single transaction.
  - `bulk.controller.test.ts` on `AppModule` with the fake DB: the guard matrix, Origin, no GET/PUT/PATCH, bad bodies.
  - `bulk.db.test.ts` using the Rollback pattern: a real trigger/CHECK race path, `updateMany` on variants, and the P2003 category race.
  - CMS specs for the list selection, the bar, the review and the result.
  - `apps/web/e2e/admin-bulk.spec.ts` in the `admin-writes` project, on throwaway products.

## Out of Scope

- Bulk delete. Hard delete with no soft delete is already a risk; revisit when `OrderItem` lands.
- Bulk changes to the regular price, or setting all to one fixed sale price.
- CSV import or export.
- Selecting "all products matching a filter" on the server, and pagination (the catalog is about 30 products).
- Partial success. The batch is all or nothing.
- Undo, history or an audit log. Remove sale is the undo for a sale.
- Bulk image changes and per-size stock edits across products.

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard + AdminGuard, a POST-only write with the Origin check
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): shared Zod schemas; only the API touches Prisma; integer cents
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions, stacked PRs

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-21 | david-schwartzman | created | Initial shaping: bulk sale (% off), remove sale, out of stock / back in stock and move category on the product list; all or nothing; no bulk delete or CSV | — |
| 2026-10-25 | david-schwartzman | change | Follows product-management (Changelog 2026-10-25, AC8/AC15): /admin/products is now paged (20 per page), so "select all" selects the current page's rows and changing pages clears the selection, as a filter change does; a successful Apply shows the CMS "Saved" toast and a failed one shows none. Supersedes the "pagination" Out of Scope note here; this spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
