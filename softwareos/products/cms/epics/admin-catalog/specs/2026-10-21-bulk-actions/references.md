# References for Bulk Actions

## Related Specs

- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md): matched by its broad `/api/admin/*`, `apps/cms/**` and `apps/api/src/admin/**` globs. Dismissed, as for the other admin feature specs. The only change here is a wiring edit to `admin.module.ts`.
- **[Related]** [cms / admin-catalog / 2026-10-19-product-management](../2026-10-19-product-management/spec.md): owns the product list and the fake DB, and lists bulk actions as out of scope. Kept separate: that spec owns single-product CRUD, and this one owns batch actions. This spec makes minimal edits to these files:
  - `product-list.component.ts`/`.html`: selection and the action bar
  - `testing/fake-products-db.ts`: `in` matching and `product.updateMany`
  - `products.service.ts`: exports the category message

  The endpoint is `/admin/bulk/products` because that spec's `POST /admin/products/:id` would catch `bulk` as an id.
- **[Related]** [cms / admin-catalog / 2026-10-21-product-discounts](../2026-10-21-product-discounts/spec.md): reuses its `salePriceFromPercent`, its `sale-errors.ts` (`violatesCheck`, `SALE_PRICE_VALID`, `usd`) and its below-price rule. The trigger keeps `effectivePriceCents` right for bulk writes too.
- **[Related]** [cms / admin-catalog / 2026-10-19-stock-management](../2026-10-19-stock-management/spec.md): reuses the `setAll` pattern (`productVariant.updateMany`), `MAX_STOCK` and absolute stock values. That spec lists "Bulk stock across several products" as out of scope; this spec delivers it.
- **[Related]** [cms / admin-catalog / 2026-10-19-category-management](../2026-10-19-category-management/spec.md): move-category relies on categories in the DB and on `ON DELETE RESTRICT` / P2003 for the deleted-category race.

## Similar Implementations

### Single-product sale

- **Location:** `apps/api/src/admin/sale/sale.service.ts`, `sale-errors.ts`, `apps/cms/src/app/sale/sale-panel.component.ts`
- **Relevance:** applies the same below-price rule and percent maths that bulk set-sale uses.
- **Key patterns:**
  - one `$transaction` per write
  - a CHECK race mapped to a 400 through `violatesCheck`
  - `errorOf` for mapping `fieldErrors` in the CMS
  - previews from `salePriceFromPercent`

### Stock writes

- **Location:** `apps/api/src/admin/stock/stock.service.ts` (`setAll`) and `apps/cms/src/app/stock/stock-panel.component.ts` (the `confirmingOut` confirm step)
- **Key patterns:** `productVariant.updateMany` with an absolute value, and a confirm step before a destructive action.

### Product list

- **Location:** `apps/api/src/admin/products/products.service.ts` (`list`, `requireCategory`, P2003 → `categoryMissing`) and `apps/cms/src/app/products/product-list.component.ts`/`.html`
- **Key patterns:** filters in the URL query with a refetch on change, the table markup and token classes, and the sale price cell.

### Tests

- **Guard matrix:** `apps/api/src/admin/admin.module.test.ts` and `sale.controller.test.ts`
- **Rollback DB tests:** `apps/api/src/admin/sale/sale.db.test.ts`
- **Fake DB:** `apps/api/src/admin/products/testing/fake-products-db.ts`, whose `$transaction` snapshots and restores the tables on a throw
- **E2E:** the `admin-writes` project in `apps/web/playwright.config.ts`, and `apps/web/e2e/admin-sale.spec.ts` (throwaway product, `afterAll` cleanup)
