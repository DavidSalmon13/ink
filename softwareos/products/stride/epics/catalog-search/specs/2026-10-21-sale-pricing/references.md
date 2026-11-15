# References for Sale Pricing

## Related Specs

- **[Extended]** [2026-10-18-product-catalog](../2026-10-18-product-catalog/spec.md) — this spec extends its `GET /catalog/products` (`apps/api/src/catalog/catalog.*`), `catalogProductSchema` (`packages/shared/src/catalog/query*.ts`) and `ProductCard` (`apps/web/src/features/catalog/**`) with minimal edits. Its AC3/AC4 now say "effective price" (amended 2026-10-21).
- **[Extended]** [2026-10-18-product-detail](../2026-10-18-product-detail/spec.md) — extends `product-detail.service.ts` and `ProductInfo.tsx` with minimal edits. Its AC3 now shows the sale price (amended 2026-10-21).
- **[Related]** [2026-10-18-home-page](../2026-10-18-home-page/spec.md) — its featured rail renders `ProductCard`, so sales show there with no edit.
- **[Related]** [cms / admin-catalog / 2026-10-21-product-discounts](../../../../../cms/epics/admin-catalog/specs/2026-10-21-product-discounts/spec.md) — the prerequisite: columns, admin API, CMS panel, `@stride/shared` `pricing.ts`.

## Similar Implementations

### Card and hero price

- **Location:** `apps/web/src/features/catalog/ProductCard.tsx:47-50`, `apps/web/src/features/product/ProductInfo.tsx:34-37`, `apps/web/src/features/catalog/format-price.ts`
- **Key patterns:** `data-price` on the price element is what `catalog.spec.ts:69` and `admin-products.spec.ts:171` read; keep it on the price the shopper pays.

### Price sort and range

- **Location:** `apps/api/src/catalog/catalog.service.ts:18-25` (`ORDER_BY`), `:85-94` (`baseWhere`)

### A web feature folder owned by a later spec

- **Location:** `apps/web/src/features/product-image/**` (product-images) — the same pattern: a small shared component dropped into `ProductCard` and the product hero.
