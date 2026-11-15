# References for Category Management

## Related Specs

- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — matched by glob on `/admin/*`, `/api/admin/*`, `apps/cms/**` and `apps/api/src/admin/**`. Dismissed in Step 4d because admin-foundation claims the whole admin shell with broad globs, and category management is a feature inside it. This spec depends on it (`AdminGuard`, `AdminModule`, the CMS layout and routes, `admin:grant`), and its wiring edits to `admin.module.ts`, `app.routes.ts` and `layout.component.ts` are minimal.
- **[Related]** [stride / catalog-search / 2026-10-18-catalog-foundation](../../../../../stride/epics/catalog-search/specs/2026-10-18-catalog-foundation/spec.md) — this spec replaces the category enum in `packages/shared/src/catalog/enums.ts` and `sizes.ts`, and makes `apps/api/src/catalog/load-catalog.ts` create-only for categories, with `catalog-data.ts` using a seed-local slug type. Kept separate because these are the minimum edits needed for DB-driven categories; that spec keeps ownership.
- **[Related]** [stride / catalog-search / 2026-10-18-product-catalog](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-catalog/spec.md) — `query.ts` (the facet array, `categoryName`, the slug-format filter), `catalog.service.ts` (DB facets, no enum parse), `FilterForm`, `filter-labels`, `ActiveFilterChips` and `CatalogView`. Kept separate for the same reason.
- **[Related]** [stride / catalog-search / 2026-10-18-product-detail](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-detail/spec.md) — `product-detail.service.ts` selects the category name, and `ProductBreadcrumb`, `SoldOutNotice` and `app/product/[slug]/page.tsx:71` use `categoryName`. Kept separate for the same reason.

## Similar Implementations

### Category enum usage (what changes)

- **Location:**
  - shared: `packages/shared/src/catalog/enums.ts:5,9,13-17`, `query.ts:61,84,113,155,174,190,205-209`, `sizes.ts:13-23`
  - api: `apps/api/src/catalog/catalog.service.ts:32,62,115-119,127,138,153-158`, `product-detail.service.ts:12`, `catalog-data.ts:2,10,23,48-49`, `load-catalog.ts:28-34`
  - web: `apps/web/src/features/catalog/FilterForm.tsx:4,38,81-86,200,202`, `filter-labels.ts:2,19`, `ActiveFilterChips.tsx:17-22`, `apps/web/src/features/product/ProductBreadcrumb.tsx:1,19`, `SoldOutNotice.tsx:1,7,20`
- **Relevance:** every place the hardcoded `shoes`/`apparel`/`gear` enum or `CATEGORY_LABELS` is read. `toCatalogProduct`'s `categorySlugSchema.parse` would return 500 for a product in a new category.
- **Key patterns:**
  - All response schemas are `z.strictObject`, so the shared, api and web changes ship together.
  - The slug regex already exists as `productSlugSchema` (`product-detail.ts:7-10`).
  - Header, Footer, CategoryTiles, FeaturedTabs and load-featured stay curated.

### Storefront freshness

- **Location:** `apps/web/src/features/catalog/load-catalog-products.ts:17-19`, `apps/web/src/features/product/load-product.ts:18-20`, `apps/web/src/lib/api-client.ts:28`, `apps/web/next.config.ts:8`
- **Relevance:** every catalog and product fetch is `cache: "no-store"` and reads `headers()`, and no page uses `revalidate`, `"use cache"` or `revalidateTag`. Admin edits show on the next request with no revalidation hook.

### Guarded controller, validation, error mapping

- **Location:**
  - guarded controller: `apps/api/src/account-security/account-security.controller.ts:70-71,91-92,195,208`, `account-security.module.ts:7-10`
  - validation: `apps/api/src/auth/zod-body.pipe.ts:9-27`
  - P2002 → 409: `apps/api/src/auth/auth.service.ts:76-90`
- **Relevance:** the pattern for the admin categories controller (`@UseGuards(AuthGuard, AdminGuard)` per admin-foundation), Zod bodies, P2002 → 409 and the 404s.
- **Key patterns:** `ConflictException({ fieldErrors })`, `{ formError }` bodies, and `OriginCheckMiddleware` (`common/origin-check.middleware.ts`) covering writes. Delete gets P2003 from `Product_categoryId_fkey ON DELETE RESTRICT` (catalog migration line 83).

### Tests

- **Location:**
  - controller tests: `apps/api/src/catalog/catalog.controller.test.ts` (real `AppModule` + fake Prisma), `apps/api/src/auth/testing/fake-db.ts:91-99` (throws a real P2002)
  - DB tests: `apps/api/src/catalog/load-catalog.db.test.ts:21,104-128` (the `$transaction` Rollback pattern), `catalog.db.test.ts:15-16,48-60,73`
  - CI database setup: `.github/workflows/ci.yml:37,51-57`
- **Relevance:** the admin controller and DB tests follow these.
- **Gotchas:**
  - `load-catalog.db.test.ts:47,56` asserts there are 3 categories, and `catalog.db.test.ts:73` asserts facet totals of 30. New DB tests must roll back.
  - The e2e suites `catalog.spec.ts:58-59,95-100`, `shopping-journey.spec.ts:33-71` and `product-detail.spec.ts:132-133` depend on the seeded slugs and names.

### Category table

- **Location:** `apps/api/prisma/schema.prisma:70-76`, `apps/api/prisma/migrations/20261018090318_catalog/migration.sql:11-18,62,83`
- **Relevance:** `slug` is unique, `name` is not (the case-insensitive check happens in the app), and `sortOrder Int` is not unique (moves must handle ties). No migration is needed.
