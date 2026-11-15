# Admin Catalog CMS — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

A new Angular 22 SPA in `apps/cms` (`base href` `/admin/`) is built as static files and served by the web app at `/admin/*`, with deep links falling back to its `index.html`. It calls only the same-origin `/api/admin/*`. Those requests go through the existing web proxy (trusted proxy headers) to a new Nest admin module behind `AuthGuard` plus a new `AdminGuard`, which reads `User.role`. The module validates with shared Zod schemas and writes through Prisma to the same tables the storefront reads. Product images go straight from the browser to Vercel Blob, using a client token the API issues. See `../../architecture.md` and `../../tech-stack.md`.

## Architecture Impact

- **New workspace `apps/cms` (`@stride/cms`):** the root build runs it before the web build
- **Web (`apps/web`):** serves the static CMS at `/admin/*` with an `index.html` fallback. The proxy treats `/admin/*` as a page route (checks only that a session cookie is present). The nav link shows only when `GET /auth/me` reports the admin role
- **API (`apps/api`):** a new admin module (products, categories, variants/stock, image upload token) plus `AdminGuard`. `GET /auth/me` returns the role
- **Schema (Prisma migration):** a `User.role` enum (`USER` | `ADMIN`, default `USER`). Product gets no new column: removing a product is a hard delete, and its variants cascade
- **Shared (`packages/shared`):** admin Zod schemas and types
- **Categories (settled in `category-management`, 2026-10-19):** categories live in the database, and the shared category enum (`CATEGORY_LABELS`, the fixed slug options) is gone. `categorySlugSchema` checks only the slug format, and the catalog facets and product responses carry each category's current name. The curated storefront nav, footer, home tiles and featured tabs stay code-managed and keep linking to shoes/apparel/gear
- **Infra:** a Vercel Blob store, with `BLOB_READ_WRITE_TOKEN` on the API project only. The first admin is set by the seed or a script
- **Stock (settled in `stock-management`, 2026-10-19):** "out of stock" stays derived: a product is sold out when every `ProductVariant.stock` is 0. There is no new column and no migration. Mark out of stock sets every variant to 0, and Back in stock sets one quantity on every variant, so the quantities from before the product went out aren't restored
- **Size presets (decided in `product-management`, 2026-10-19):** a new product gets its sizes from one of three presets: Shoe sizes, Apparel or One size (`SIZE_PRESETS` in `@stride/shared`). The preset defaults from the category via `defaultSizePreset` (shoes → Shoe sizes, apparel → Apparel, any other → One size) and can be changed before saving. Every size starts with stock 0. `sizesForCategory` now falls back to One size for any slug and never throws
- **Re-seed and catalog load are create-only (decided in `product-management`, 2026-10-19):** `loadCatalog` and `prisma db seed` create missing categories, products and variants but never overwrite an existing product's fields or a variant's stock or `sortOrder`, so admin edits survive a re-seed. A seeded product an admin deleted is recreated on the next re-seed

## Risks & Unknowns

- **Storefront freshness (decided in `category-management`, 2026-10-19):** storefront catalog fetches are `cache: "no-store"`, so admin edits show on the next request and there is no revalidation hook
- **Serving Angular from Next.js at `/admin/*` (settled by the `admin-foundation` T1 spike, 2026-10-19):**
  - The Angular build writes straight to `apps/web/public/admin/` (gitignored). Files with an extension (`/admin/main-*.js`, `styles-*.css`, `fonts/*.woff2`) skip the proxy matcher and are served from `public/`
  - `/admin` is a protected prefix. For extensionless `/admin` and `/admin/*` paths, once the cookie check passes, `apps/web/src/proxy.ts` rewrites to `/admin/index.html` with `Cache-Control: private, no-store`, so deep-link reloads serve the shell
  - CSP is unchanged. Angular's critical-CSS inlining runs under `script-src`/`style-src 'unsafe-inline'`, and the fonts are self-hosted under `/admin/fonts/` for `font-src 'self'`. Production build: no `securitypolicyviolation`
  - The base href `/admin/` turns `/admin` into `/admin/`. The root build runs shared → api → cms → web. Web ESLint ignores `public/admin/**`
- **`@vercel/blob` behaviour (settled by the `product-images` T2 spike, 2026-10-20, `@vercel/blob@2.8.1` pinned in `apps/api` and `apps/cms`):**
  - The browser's `upload()` sends the file to `https://vercel.com/api/blob` (`defaultVercelBlobApiUrl`), multipart included. That single host goes in `connect-src`
  - `generateClientTokenFromReadWriteToken` signs `pathname`, `allowedContentTypes`, `maximumSizeInBytes`, `addRandomSuffix` and `validUntil` (ms) into the token. `pathname` is an exact pin (the suffix is added server-side), so the API checks the requested pathname against `products/<id>/` before signing
  - `upload()` → `handleUploadUrl` POSTs `{ type: "blob.generate-client-token", payload: { pathname, clientPayload, multipart } }` and reads `{ clientToken }` from the response. 2.8.1 sends no `callbackUrl`; the API's schema strips one if it ever appears and never forwards it
  - `head(url)` returns `{ url, pathname, size, contentType, … }` and throws `BlobNotFoundError` on a 404
  - The store's public host is derived from the token the same way the library does (`vercel_blob_rw_<storeId>_…` → `<storeid>.public.blob.vercel-storage.com`), so there's no `BLOB_STORE_HOST` setting
- **Blob `onUploadCompleted` (decided in `product-images`, 2026-10-20):** skipped. The CMS posts the blob URL on save, and the API checks it (https, the exact store host, no userinfo, the product's `products/<id>/` prefix, then `head()` for type and size) before writing `imageUrl`. No callback route and no new exception: `/cron/*` stays the only one
- **Product hard delete vs. a future `OrderItem`:** cart-checkout will add order items that reference products. Hard delete is fine for now, and `product-management` ships it (variants cascade). Revisit (soft delete, or block deleting products that have orders) when `OrderItem` lands
- **Deleting a category that still has products (decided in `category-management`, 2026-10-19):** the delete is blocked with a 409 that gives the product count ("Move or delete its N products first"). `ON DELETE RESTRICT` on `Product.categoryId` covers the race where a product is added between the count and the delete
- **Blob store per environment (decided in `product-images`, 2026-10-20):** one hand-made dev store now, an agreed exception to the Vercel deferral, with its `BLOB_READ_WRITE_TOKEN` in the gitignored `apps/api/.env`. Preview and production stores are deferred (Vercel, `product-images` T23). The web allows the public Blob wildcard host `*.public.blob.vercel-storage.com` under `/products/**` (next/image `remotePatterns`, CSP `img-src`) and the upload host `https://vercel.com/api/blob/` in `connect-src`; the API's exact store-host check keeps other stores' URLs out of `imageUrl`
- **Stock edits vs. checkout's future decrement (accepted in `stock-management`, 2026-10-19):** the admin stock endpoints set absolute values, so an admin save and a concurrent checkout `decrement` are last write wins. The risk is accepted for now; the DB `CHECK stock >= 0` (`ProductVariant_stock_nonnegative`) stays the backstop against negative stock. Revisit when cart-checkout's `checkout-order` lands
- **Bootstrapping the first admin:** use the seed or a one-off script, and leave no API or UI path through which a user can make themselves an admin

## Candidate Specs

- `admin-foundation` (shaped and in progress, `specs/2026-10-19-admin-foundation`) — `User.role` migration and the `admin:grant` script for the first admin, `AdminGuard` and an empty admin module (`GET /admin/status`), the role in `/auth/me`, the Angular shell served from `apps/web/public/admin` at `/admin/*`, and the admin-only nav link
- `category-management` (shaped and in progress, `specs/2026-10-19-category-management`) — list, add, rename, reorder and delete categories; deleting a category that still has products is blocked. No revalidation needed: storefront catalog reads are `no-store`
- `product-management` (shaped and in progress, `specs/2026-10-19-product-management`) — list products with search by name or slug and a category filter; add a product with a size preset; edit its details and category; add or remove individual sizes; remove it with a hard delete, where its variants cascade. No stock editing (that's `stock-management`)
- `stock-management` (shaped and in progress, `specs/2026-10-19-stock-management`) — a Stock panel on the product edit page: set each size's stock and save only the changed sizes; Mark out of stock (every size to 0, after a confirm); Back in stock (one quantity on every size). Out of stock stays derived, with no new column
- `product-images` (shaped and in progress, `specs/2026-10-19-product-images`) — an Image panel on the product edit page: the browser uploads to Vercel Blob with a client token from `POST /admin/products/:id/image/token`, then the CMS sets, replaces or clears `Product.imageUrl`. The old blob is deleted best effort on replace, remove and product hard delete. The storefront renders `imageUrl` through `next/image` on cards and the product hero, falling back to `ProductArt`
- `admin-dashboard` (shaped, `specs/2026-10-20-admin-dashboard`) — replaces admin-foundation's empty dashboard at `/admin` with a landing page: a one-line purpose and cards linking to Categories, Products, Stock and Images (the last two via Products). No counts yet; those need an API endpoint and a follow-up spec
- `bulk-actions` (shaped, `specs/2026-10-21-bulk-actions`) — select products on `/admin/products` and apply one action to all of them: put on sale at a % off, remove sale, mark out of stock, back in stock at one quantity, or move to a category. `POST /admin/bulk/products` writes the batch in one transaction, all or nothing. No bulk delete and no CSV import
