# References for Product Visibility

## Related Specs

- **[Related]** [2026-10-19-product-management](../2026-10-19-product-management/spec.md): it owns the same product page and admin product endpoints (`apps/cms/src/app/products/**`, `apps/api/src/admin/products/**`). It stays separate because product-management is down to its QA task (T21), and each edit-page panel (stock, images, sale) has its own spec. This spec makes minimal edits to `products.service.ts`, `testing/fake-products-db.ts`, `product-form.component.*` and `product-list.component.*`.
- **[Considered]** [stride/catalog-search/2026-10-18-product-catalog](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-catalog/spec.md): matched on `apps/api/src/catalog/catalog.*` and dismissed in Step 4d. It owns listing and filtering; this spec adds only a visibility rule (`{ isActive: true }` in `baseWhere`).
- **[Considered]** [stride/catalog-search/2026-10-18-product-detail](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-detail/spec.md): matched on `apps/api/src/catalog/product-detail.*` and dismissed in Step 4d. It owns the product page; this spec adds only the `isActive` condition to the lookup, which reuses the existing 404.
- **[Considered]** [2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) and [stride/catalog-search/2026-10-18-catalog-foundation](../../../../../stride/epics/catalog-search/specs/2026-10-18-catalog-foundation/spec.md): matched only through workspace-wide globs (`apps/cms/**`, `apps/api/src/admin/**`, `apps/api/src/catalog/**`) and dismissed in Step 4d. They own the admin and catalog module shells, not product visibility.

## Similar Implementations

### Sale panel (product-discounts)

- **Location:** `apps/api/src/admin/sale/`, `apps/cms/src/app/sale/`, `packages/shared/src/admin/sale.ts`
- **Relevance:** the same shape as this spec: a per-product admin endpoint under `admin/products/:id/...` plus a panel on the product edit page
- **Key patterns:**
  - `SaleController`: `@UseGuards(AuthGuard, AdminGuard)`, `ZodBodyPipe` and `@HttpCode(200)`
  - `SaleService.clear`: a `$transaction` that runs `findUnique` (404), then `update`, then returns `ProductsService.get(id)`
  - `SalePanelComponent`: `input.required`, a `linkedSignal` for the saved value, `busy` and `formError` signals, a 404 message, and `updated` emitting into `product.set($event)` in `product-form.component.html`

### Mark out of stock (stock-management)

- **Location:** `apps/cms/src/app/stock/`
- **Relevance:** a one-click action on the product page that re-renders from the API response
- **Key patterns:** a button disabled while busy, an error kept in the panel, the status left unchanged on failure

### Storefront product reads

- **Location:** `apps/api/src/catalog/catalog.service.ts` (`baseWhere`, used by both the products query and the facet query) and `apps/api/src/catalog/product-detail.service.ts` (`getBySlug`)
- **Relevance:** every web loader (`load-catalog-products.ts`, `load-featured.ts`, `load-home-picks.ts`, `load-shoes.ts`, `load-product.ts`) reads only these two endpoints, so filtering here hides a product everywhere
- **Key patterns:** the home photo picks are `"use cache"` with a 5-minute revalidate (`apps/web/src/features/home/load-home-picks.ts`), which is why AC10 accepts the lag
