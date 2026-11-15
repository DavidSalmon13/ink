# References for Product Management

## Related Specs

- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — matched by glob on `/admin/*`, `/api/admin/*`, `apps/cms/**` and `apps/api/src/admin/**`. Dismissed in Step 4d for the same reason as category-management: admin-foundation uses broad globs to claim the whole admin shell, and product management is a feature inside it. This spec depends on it (`AdminGuard`, `AdminModule`, the CMS layout and routes, `admin:grant`), and its wiring edits to `admin.module.ts`, `app.routes.ts` and `layout.component.ts` are minimal. It also replaces the spike's `ProductsPlaceholder` route.
- **[Related]** [cms / admin-catalog / 2026-10-19-category-management](../2026-10-19-category-management/spec.md) — this spec depends on its DB categories, `GET /api/admin/categories`, `facets.category`, `categoryName` and `SeedCategorySlug`. It extracts `slugifyCategoryName`'s core into `packages/shared/src/admin/slugify.ts` (a minimal edit to `categories.ts`), and it settles the "size sets for new categories" item that spec left out of scope. Kept separate because categories and products are separate CMS features; that spec keeps ownership of `categories.ts`.
- **[Related]** [stride / catalog-search / 2026-10-18-catalog-foundation](../../../../../stride/epics/catalog-search/specs/2026-10-18-catalog-foundation/spec.md) — this spec adds size presets and a One size fallback to `packages/shared/src/catalog/sizes.ts`, and makes the product and variant upserts in `apps/api/src/catalog/load-catalog.ts` create-only. Kept separate because these are the minimum edits needed for admin-managed products; that spec keeps ownership.
- **[Related]** [stride / catalog-search / 2026-10-18-product-catalog](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-catalog/spec.md) — `apps/web/e2e/catalog.spec.ts` asserts 30 products and isn't edited. This spec's Playwright `admin-writes` project runs after the storefront suites so that count holds. Kept separate; that spec keeps ownership.
- **[Related]** [stride / cart-checkout / 2026-10-18-cart](../../../../../stride/epics/cart-checkout/specs/2026-10-18-cart/spec.md) and [2026-10-18-checkout-order](../../../../../stride/epics/cart-checkout/specs/2026-10-18-checkout-order/spec.md) — future cart and order items will reference `ProductVariant`, so this spec's hard delete (and remove size) must be revisited when they land (tech-plan risk). No shared files today.

## Similar Implementations

### Category management (sibling spec)

- **Location:** `../2026-10-19-category-management/` (spec.md, tasks.md)
- **Relevance:** the pattern for this spec's admin controller and service, the in-memory fake with real Prisma error codes, the Rollback DB tests, the CMS service and component, the layout and route wiring, and the e2e setup with `admin:grant`.

### Sizes

- **Location:** `packages/shared/src/catalog/sizes.ts:13-23`, `sizes.test.ts:43-45`
- **Relevance:** `sizesForCategory` throws on an unknown slug. Its callers are `apps/api/src/catalog/catalog-data.ts:49`, `catalog-data.test.ts:43` and `product-detail.db.test.ts:46`. Nothing in apps/web or apps/cms calls it.
- **Key patterns:** `SHOE_SIZES` (US 6–13 in half sizes, 15 values), `APPAREL_SIZES` (XS–XL) and `GEAR_SIZES` (`One size`) become the three presets.

### Catalog load overwrites on re-seed

- **Location:** `apps/api/src/catalog/load-catalog.ts:16-20,48-53,56-60`, `load-catalog.test.ts:185,192-207`
- **Relevance:** the product `update: content` and the variant `update: { sortOrder, stock }` would revert admin edits and stock on every seed run. Nothing is ever deleted, so admin-created products survive.

### Schema and constraints

- **Location:** `apps/api/prisma/schema.prisma` (`Product`, `ProductVariant`), `apps/api/prisma/migrations/20261018090318_catalog/migration.sql:44,58,83,86`
- **Relevance:**
  - `CHECK priceCents > 0` and `CHECK stock >= 0`
  - Product→Category is `ON DELETE RESTRICT` (P2003 on an unknown category), and Variant→Product is `ON DELETE CASCADE`
  - unique `Product.slug` and `(productId, size)`
  - no DB hex check, so `artColor`/`artAccent` are validated in Zod only
  - no migration needed
- **Enums:** `runTypeSchema`/`genderSchema` (`packages/shared/src/catalog/enums.ts:6-7`), `artKindSchema` (`query.ts:38`), `productSlugSchema` (`product-detail.ts:7-10`, max 100).

### Storefront rendering

- **Location:** `apps/web/src/features/catalog/ProductArt.tsx:189,209`, `format-price.ts:7`
- **Relevance:** an unknown art kind falls back to the shoe, and color and accent go straight into SVG fill and stroke (hence the strict hex validation). `imageUrl` isn't rendered anywhere in web yet (`product-images`).

### Guarded controller, validation, error mapping

- **Location:** `apps/api/src/account-security/account-security.controller.ts:70-71,208`, `apps/api/src/auth/zod-body.pipe.ts:9-27`, `apps/api/src/auth/auth.service.ts:76-90`, `apps/api/src/app.module.ts:38-40` (`OriginCheckMiddleware`, `forRoutes("*")`)
- **Relevance:** `@UseGuards(AuthGuard, AdminGuard)`, Zod bodies, P2002 → 409 `fieldErrors`, P2025 → 404, and the Origin check covering writes.

### Tests and count gotchas

- **Location:**
  - `apps/api/src/catalog/catalog.controller.test.ts` (real `AppModule` + fake Prisma)
  - `apps/api/src/auth/testing/fake-db.ts:91-99` (a real P2002)
  - `load-catalog.db.test.ts:21,104-128` (Rollback)
  - `apps/web/playwright.config.ts:10,18` (`fullyParallel`, a single `chromium` project)
- **Gotchas:**
  - Some tests assert 30 products: `apps/web/e2e/catalog.spec.ts:46,50,65,88,118`, `catalog.db.test.ts:29-43,68-75` and `load-catalog.db.test.ts:47,57,127`. Admin DB tests must roll back, and the admin e2e must run after the storefront suites and clean up.
  - `shopping-journey.spec.ts:67,73` uses `\d+` and doesn't depend on the count.
