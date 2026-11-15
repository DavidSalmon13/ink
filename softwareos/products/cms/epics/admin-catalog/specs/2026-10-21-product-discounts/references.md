# References for Product Discounts

## Related Specs

- **[Related]** [cms / admin-catalog / 2026-10-19-product-management](../2026-10-19-product-management/spec.md) — `/api/admin/products/*` is a route prefix of `/api/admin/products/:id/sale`. Kept separate: product-management owns product CRUD, this spec owns the sale price. Minimal edits to its `products.service.ts` (AC5 fields, AC6 price guard), `fake-products-db.ts`, `product-form.component.ts` and `product-list.component.ts`; its AC1/AC2/AC4 were amended on 2026-10-21 to match.
- **[Related]** [cms / admin-catalog / 2026-10-19-stock-management](../2026-10-19-stock-management/spec.md) — the edit-page panel pattern (`stock-panel.component.ts`, `updated` output) this spec copies. The Sale panel sits next to it.
- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — matched by its broad `apps/cms/**` and `apps/api/src/admin/**` globs; dismissed as for the other admin feature specs. Wiring edit to `admin.module.ts` only.
- **[Related]** [stride / catalog-search / 2026-10-21-sale-pricing](../../../../../stride/epics/catalog-search/specs/2026-10-21-sale-pricing/spec.md) — the storefront half. Depends on this spec's columns and `@stride/shared` `pricing.ts`.
- **[Related]** [stride / catalog-search / 2026-10-18-catalog-foundation](../../../../../stride/epics/catalog-search/specs/2026-10-18-catalog-foundation/spec.md) — owns `schema.prisma`'s `Product` and `load-catalog.ts`; this spec adds a migration and a one-line create edit.
- **[Related]** [stride / cart-checkout / 2026-10-18-cart](../../../../../stride/epics/cart-checkout/specs/2026-10-18-cart/spec.md) and [2026-10-18-checkout-order](../../../../../stride/epics/cart-checkout/specs/2026-10-18-checkout-order/spec.md) — amended on 2026-10-21 to price lines and order snapshots from `effectivePriceCents`.

## Similar Implementations

### Edit-page panel

- **Location:** `apps/cms/src/app/stock/stock-panel.component.ts`, `apps/api/src/admin/stock/stock.controller.ts`, `stock.service.ts`
- **Key patterns:** `@Controller("admin/products/:id/<thing>") @UseGuards(AuthGuard, AdminGuard)`, one `$transaction` per write, return `ProductsService.get(id)`; the panel's `updated` output replaces the form's product signal.

### Hand-written CHECKs in a migration

- **Location:** `apps/api/prisma/migrations/20261018090318_catalog/migration.sql` (`priceCents > 0`, `ProductVariant_stock_nonnegative`)
- **Key patterns:** generate with `--create-only`, append `ALTER TABLE ... ADD CONSTRAINT ... CHECK (...)`.

### Error mapping and tests

- `apps/api/src/auth/zod-body.pipe.ts` → 400 `{ fieldErrors }`; Prisma known errors → Nest exceptions as in `products.service.ts`
- Rollback DB pattern: `apps/api/src/catalog/load-catalog.db.test.ts`; guard matrix: `apps/api/src/admin/admin.module.test.ts`; e2e admin promotion: `apps/web/e2e/admin-access.spec.ts`
