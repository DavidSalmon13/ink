# References for Stock Management

## Related Specs

- **[Related]** [cms / admin-catalog / 2026-10-19-product-management](../2026-10-19-product-management/spec.md) — strong overlap: `/api/admin/products/*` is a route prefix of `/api/admin/products/:id/stock*`. Confirmed in Step 4d and kept separate in 4e ("Create anyway") because product-management owns product CRUD and sizes, while this spec owns stock quantities. That follows the tech plan's candidate slicing, and its Out of Scope defers stock here. This spec depends on its `ProductsService.get`, AC2 detail shape, `fake-products-db.ts`, `product-form.component.ts` and `admin-writes` Playwright project. It makes minimal edits to `product-form.component.ts` and its spec, `fake-products-db.ts` (`updateMany`) and the `admin-writes` `testMatch` in `apps/web/playwright.config.ts`.
- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — matched by glob on `apps/cms/**` and `apps/api/src/admin/**`. Dismissed in Step 4d for the same reason as category-management and product-management: admin-foundation uses broad globs to claim the whole admin shell, and stock management is a feature inside it. This spec depends on it (`AdminGuard`, `AdminModule`, the CMS shell and tokens), and its wiring edit to `admin.module.ts` is minimal.
- **[Related]** [cms / admin-catalog / 2026-10-19-category-management](../2026-10-19-category-management/spec.md) — a dependency (merged before product-management). It settled storefront freshness (`cache: "no-store"`, no revalidation), which this spec relies on. No shared files.
- **[Related]** [stride / cart-checkout / 2026-10-18-checkout-order](../../../../../stride/epics/cart-checkout/specs/2026-10-18-checkout-order/spec.md) — plans `productVariant.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`. An admin's absolute set races with it (last write wins). That's accepted here, with `CHECK stock >= 0` as the backstop. Revisit when checkout-order lands.

## Similar Implementations

### Schema and constraints

- **Location:** `apps/api/prisma/schema.prisma:114-123` (`ProductVariant`), `apps/api/prisma/migrations/20261018090318_catalog/migration.sql:56-58,80,86`
- **Relevance:**
  - `stock Int @default(0)` and `CONSTRAINT "ProductVariant_stock_nonnegative" CHECK ("stock" >= 0)`
  - unique `(productId, size)` and `ON DELETE CASCADE` to Product
  - no migration needed
  - a stock change doesn't bump `Product.updatedAt`

### Admin guard pair and module

- **Location:** `apps/api/src/admin/admin.controller.ts:10-11`, `admin.guard.ts:17-24`, `admin.module.ts:8-12`
- **Key patterns:** `@Controller(...) @UseGuards(AuthGuard, AdminGuard)`. New controllers and services are registered in `AdminModule`.

### Validation, Origin check, error mapping

- **Location:** `apps/api/src/auth/zod-body.pipe.ts:9-27`, `apps/api/src/common/origin-check.middleware.ts:8-31` (global via `app.module.ts:34-40`), `apps/api/src/auth/auth.service.ts:79-89`
- **Key patterns:**
  - `@Body(new ZodBodyPipe(schema))` → 400 `{ fieldErrors }`
  - the Origin check covers every POST with no wiring
  - Prisma known errors → Nest exceptions

### Storefront stock reads

- **Location:**
  - `apps/api/src/catalog/catalog.service.ts:42-43,164` (`soldOut` = no variant with stock > 0)
  - `apps/api/src/catalog/product-detail.service.ts:24-51`
  - `apps/web/src/features/product/SizePicker.tsx:42`
  - `apps/web/src/features/catalog/ProductCard.tsx:17-25`
  - no-store loaders: `load-catalog-products.ts:18`, `load-product.ts:19`
- **Relevance:** stock edits show on the next request with no web changes.

### Tests

- **Rollback DB pattern:** `apps/api/src/catalog/load-catalog.db.test.ts:21,104-128` (the CHECK test is at :60-75)
- **Seeded-stock constraints:** `apps/api/src/catalog/product-detail.db.test.ts:40-66` and `apps/web/e2e/product-detail.spec.ts:117-126`. Never mutate seeded products outside a rollback.
- **Guard matrix:** `apps/api/src/admin/admin.module.test.ts` (`sessionFor(role)`)
- **CMS spec pattern:** `apps/cms/src/app/dashboard/dashboard.component.spec.ts` (`HttpTestingController`)
- **E2E admin promotion:** `apps/web/e2e/admin-access.spec.ts:49-63` (`admin:grant` + reload)
