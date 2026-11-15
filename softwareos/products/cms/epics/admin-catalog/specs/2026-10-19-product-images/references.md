# References for Product Images

## Related Specs

- **[Related]** [cms / admin-catalog / 2026-10-19-product-management](../2026-10-19-product-management/spec.md) — strong match: `/api/admin/products/*` is a route prefix of `/api/admin/products/:id/image*`. Dismissed as a different concern in Step 4d. product-management owns product CRUD and sizes, and its Out of Scope hands images and `imageUrl` to this spec. This spec depends on:
  - its `ProductsService.get` and `remove`
  - the AC2 detail shape
  - `fake-products-db.ts`
  - `product-form.component.ts`
  - the `admin-writes` Playwright project

  It makes minimal edits to these files:
  - `adminProductSchema` (`imageUrl`)
  - `products.service.ts` (`imageUrl` in the detail, and a best-effort blob delete on `remove`)
  - `fake-products-db.ts`
  - `product-form.component.ts` and its spec
  - the `admin-writes` `testMatch`
- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../2026-10-19-admin-foundation/spec.md) — matched by route prefix and glob on `/api/admin/*`, `apps/cms/**` and `apps/api/src/admin/**`. Dismissed in Step 4d for the same reason as category-management, product-management and stock-management: admin-foundation's broad globs claim the whole admin shell, and images is a feature inside it. This spec depends on it (`AdminGuard`, `AdminModule`, the CMS shell and tokens), and its wiring edit to `admin.module.ts` is minimal.
- **[Related]** [cms / admin-catalog / 2026-10-19-stock-management](../2026-10-19-stock-management/spec.md) — there's no ordering dependency. Both specs embed a panel in `product-form.component.ts` and widen the same `admin-writes` regex, so whichever lands second adapts (T1, T15, T20).
- **[Related]** [cms / admin-catalog / 2026-10-19-category-management](../2026-10-19-category-management/spec.md) — a dependency. It settled storefront freshness (`cache: "no-store"`, no revalidation), which AC9 relies on.
- **[Related]** [stride / catalog-search / 2026-10-18-product-catalog](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-catalog/spec.md) — this spec makes a wiring edit to `apps/web/src/features/catalog/ProductCard.tsx`, swapping `ProductArt` for `ProductImage`, plus its test.
- **[Related]** [stride / catalog-search / 2026-10-18-product-detail](../../../../../stride/epics/catalog-search/specs/2026-10-18-product-detail/spec.md) — this spec makes a wiring edit to the hero in `apps/web/src/app/product/[slug]/page.tsx`.
- **[Related]** [stride / accounts-auth / 2026-10-11-security-headers](../../../../../stride/epics/accounts-auth/specs/2026-10-11-security-headers/spec.md) — this spec adds the Blob hosts to `buildCsp` in `security-headers.ts` and updates the pinned CSP strings in its unit and e2e tests.

## Upstream Meeting

_None._

## Similar Implementations

### Schema and storefront read path

- **Location:**
  - `apps/api/prisma/schema.prisma:103` (`imageUrl String?`)
  - `apps/api/src/catalog/catalog.service.ts:41,166`
  - `apps/api/src/catalog/product-detail.service.ts:21`
  - `packages/shared/src/catalog/query.ts:202` (`imageUrl: z.string().nullable()`, inherited by `product-detail.ts:17`)
- **Relevance:**
  - No migration is needed.
  - `imageUrl` already reaches every web loader (`load-catalog-products.ts`, `load-product.ts`, `load-featured.ts`).
  - The seed leaves it unset (`catalog-data.ts:7`).

### Storefront visuals

- **Location:**
  - `apps/web/src/features/catalog/ProductArt.tsx:172-180` (props). The svg fills its parent, and the parent sets the aspect ratio.
  - `apps/web/src/features/catalog/ProductCard.tsx:16-22`: a `relative aspect-[4/5]` well, `opacity-60` when sold out, and `group-hover:scale-[1.04]`. Used by `/catalog` and `features/home/FeaturedTabs.tsx:69`.
  - `apps/web/src/app/product/[slug]/page.tsx:56-60`: the hero well `aspect-[4/5] … overflow-hidden`, `opacity-70` when sold out. It's not `relative`.
- **Key patterns:**
  - `ProductImage` replaces only these two product-data spots.
  - The home Hero, CategoryTiles, RunTiles, RunTypeTiles and not-found pages use static art and stay as they are.
  - `ProductCard.test.tsx:31` pins the art-in-a-4:5-well case.

### CSP and images config

- **Location:**
  - `apps/web/src/lib/security-headers.ts:27-79` (`buildCsp`, import-free, `toolbar()` for preview only; `img-src` :47-55, `connect-src` :63-66)
  - `apps/web/next.config.ts`, which has no `images` key today
  - the pinned strings: `security-headers.test.ts:13,16` (plus the dev case :34-35) and `e2e/security-headers.spec.ts:8`
- **Relevance:**
  - The CMS is served by web under `/admin`, so it gets the same CSP. `connect-src 'self'` blocks the direct browser upload to Blob today.
  - `next/image` serves storefront images from `/_next/image`, so they need only `remotePatterns`. The CMS preview `<img>` needs the Blob host in `img-src`.

### Admin API, middleware, secrets

- **Location:**
  - `apps/api/src/admin/admin.controller.ts:10-17`, `admin.guard.ts:18-24` and `admin.module.ts`
  - `apps/api/src/auth/zod-body.pipe.ts`
  - `apps/api/src/common/origin-check.middleware.ts`
  - `apps/api/src/common/proxy-secret.middleware.ts:14-15` (the only exception, `/cron/`)
  - `apps/api/src/cron/cron.controller.ts:17-24` (fails closed when the secret is unset)
  - `apps/api/.env.example` (the `CRON_SECRET` entry as a template)
  - `apps/api/src/main.ts:13` (`process.loadEnvFile`)
- **Key patterns:**
  - `@Controller(...) @UseGuards(AuthGuard, AdminGuard)`
  - `@Body(new ZodBodyPipe(schema))` → 400 `{ fieldErrors }`
  - the Origin check covers every POST/DELETE with no wiring
  - secrets are read lazily from `process.env`; there's no env schema module

### CMS

- **Location:**
  - `apps/cms/src/app/auth/me.service.ts:3,9` (a type-only `@stride/shared` import, a convention that isn't lint-enforced)
  - `apps/cms/src/app/dashboard/dashboard.component.spec.ts` (`HttpTestingController`)
  - `apps/cms/src/app/app.config.ts` (`provideHttpClient(withFetch())`, no interceptors)
  - `apps/cms/src/styles.css` (Stride tokens)
- **Relevance:**
  - `@vercel/blob/client` becomes the CMS's first third-party runtime dependency for data access. It's wrapped behind a `BLOB_UPLOAD` injection token so specs can mock it.

### @vercel/blob

- It isn't installed anywhere in the repo yet. T2 spikes it from the installed source. These are the expected APIs:
  - `upload()` (browser), which calls `handleUploadUrl` and then PUTs to the Blob API host
  - `generateClientTokenFromReadWriteToken()`
  - `head()`
  - `del()`
- The public URL pattern is `https://<storeId>.public.blob.vercel-storage.com/<pathname>-<suffix>.<ext>`.

### Tests

- **Rollback DB pattern:** `apps/api/src/catalog/load-catalog.db.test.ts:21,104-128`. Never mutate seeded products outside a rollback.
- **Guard matrix:** `apps/api/src/admin/admin.module.test.ts` (`sessionFor(role)`).
- **E2E admin promotion and CSP collector:** `apps/web/e2e/admin-access.spec.ts:57-64` (`signUpAdmin`) and `:66` (`cspViolations`). Both are local to that file.
- **E2E mocking:** there's no `page.route` anywhere in `apps/web/e2e` yet. T21 introduces it, scoped to one test.
