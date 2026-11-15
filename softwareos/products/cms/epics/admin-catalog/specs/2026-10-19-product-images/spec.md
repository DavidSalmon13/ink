# Product Images

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/product-images
> Covers: /api/admin/products/*/image, /api/admin/products/*/image/*, apps/api/src/admin/images/**, apps/cms/src/app/images/**, packages/shared/src/admin/images.ts, apps/web/src/features/product-image/**, apps/web/e2e/admin-images.spec.ts

## Overview

Admins set, replace or clear a product's single image from an Image panel on the product edit page (`/admin/products/:id`). The browser uploads the file straight to Vercel Blob with a short-lived client token from an admin-only API endpoint. The CMS then sends the blob URL to the API, which checks it and saves `Product.imageUrl`. The storefront shows the image on `/catalog` cards, the home featured rail (same `ProductCard`) and the `/product/[slug]` hero through `next/image`. When `imageUrl` is null it falls back to `ProductArt`.

It settles three open questions from the tech plan:
- **`onUploadCompleted` is skipped.** The CMS posts the URL on save, so there's no second proxy-secret exception. `/cron/*` stays the only one.
- **Blob store:** one dev store, created by hand as an agreed exception to the Vercel deferral. Its `BLOB_READ_WRITE_TOKEN` goes in the gitignored `apps/api/.env`. Stores per environment stay deferred (Vercel).
- **Allowed image host on the web:** the web never sees the token, so `remotePatterns` and the CSP use the public Blob wildcard host `*.public.blob.vercel-storage.com`, limited to `/products/**`. The API's exact store-host check (AC2) is what keeps other stores' URLs out of `imageUrl`.

It serves these parts of the epic:
- the brief's story "upload product images and set them on a product"
- the success criteria "image changes show up in the storefront catalog", "every `/api/admin/*` endpoint returns 403/401" and "uses Stride's tokens and passes CI"
- the mission's "Simple" and "Live"

It stays within the brief's limit of one image per product. `imageUrl` already exists in the schema (`schema.prisma:103`) and in the shared catalog responses (`query.ts:202`), so there's no migration and no change to the API's read side. Storefront fetches are `no-store`, so changes show on the next request.

It depends on these specs being merged first:
- `admin-foundation`
- `category-management`
- `product-management`: `ProductsService.get`/AC2 detail, `product-form.component.ts`, `fake-products-db.ts` and the `admin-writes` Playwright project

It's independent of `stock-management`. Both specs embed a panel in `product-form`.

## Goals & User Stories

- As an admin, I can upload a JPEG, PNG or WebP image (5 MB or smaller) for a product and see it on the edit page right away
- As an admin, I can replace a product's image. The old file is removed from storage
- As an admin, I can remove a product's image after confirming, and the storefront goes back to the product's art
- As a shopper, I see the product's photo on catalog cards, in the featured rail and on the product page. Products without one still show their art

## Acceptance Criteria

1. AC1: `POST /api/admin/products/:id/image/token` takes the `@vercel/blob/client` token request.
   - It returns `{ type: "blob.generate-client-token", clientToken }`.
   - The token only works for a pathname under `products/<id>/`, the types `image/jpeg`, `image/png` and `image/webp`, a maximum of 5 MB (`MAX_IMAGE_BYTES`) and a random suffix, and it expires within 10 minutes.
   - A pathname outside `products/<id>/` returns 400 `{ fieldErrors }`, and an unknown product id returns 404.
   - When `BLOB_READ_WRITE_TOKEN` is unset, it fails closed with 503 and the error never contains the token.
2. AC2: `POST /api/admin/products/:id/image` with `{ url }` (strict) saves `imageUrl` and returns the product-management AC2 detail including `imageUrl`. Before saving it checks that:
   - the URL is `https`
   - the host is exactly this store's public host
   - the pathname starts with `products/<id>/`
   - the blob exists, with an allowed type and size (via `head`)

   Any failure returns 400 `fieldErrors.url` and writes nothing. An unknown id returns 404.
3. AC3: Replacing an image deletes the previous blob after the new URL is saved. This is best effort: a failed delete is logged without the token and doesn't fail the request. `DELETE /api/admin/products/:id/image` sets `imageUrl` to null, deletes the blob and returns the AC2 detail. It's idempotent when `imageUrl` is already null. Only blobs on this store are ever deleted.
4. AC4: Hard-deleting a product (product-management AC6) also deletes its blob, best effort.
5. AC5: Every image endpoint returns 401 when logged out and 403 for a non-admin. Writes are POST/DELETE only and return 401 when the `Origin` is missing or wrong. Product create and update bodies still can't set `imageUrl` (strict schemas).
6. AC6: On `/admin/products/:id`, the Image panel:
   - shows the current image or a "No image" placeholder
   - has a file picker that checks the type and the 5 MB limit before uploading
   - shows upload progress, then the new image without a reload
   - has Replace and Remove, where Remove asks for confirmation
   - shows API and upload errors inline
   - uses Stride's tokens
   - isn't shown on `/admin/products/new`
7. AC7: The storefront renders `imageUrl` through `next/image` in two places, keeping the existing aspect ratios, sold-out dimming and hover scale:
   - the `ProductCard` 4:5 well, on `/catalog` and in the home featured rail
   - the `/product/[slug]` hero

   A null `imageUrl` renders `ProductArt` exactly as today. The product page image's alt text is the product name. The card image is decorative (`alt=""`), as the art is today.
8. AC8: In `next.config.ts`, `images.remotePatterns` allows only `https://*.public.blob.vercel-storage.com` under `/products/**`. The CSP adds the Blob upload host to `connect-src` and the public Blob wildcard host to `img-src`, in the prod, preview and dev variants. The API's exact store-host check (AC2) keeps foreign stores out of `imageUrl`. There are no CSP violations on `/admin/products/:id` during an upload or on the storefront pages.
9. AC9: After an admin sets, replaces or removes an image, `/catalog`, `/` (featured) and `/product/[slug]` show the change on the next request, with no deploy and no revalidation.
10. AC10: `BLOB_READ_WRITE_TOKEN` lives only in `apps/api` env (documented in `.env.example`) and never in web, the CMS bundle or a `NEXT_PUBLIC_` variable. The existing catalog, product-detail, shopping-journey, security-headers and admin e2e suites and CI pass. CI has no Blob token, so the real-upload e2e skips without it.

## Technical Approach

- **Spike first:** install `@vercel/blob` (pinned) in `apps/api` and `apps/cms`. From the installed source, confirm:
  - the browser upload host (for `connect-src`)
  - `generateClientTokenFromReadWriteToken` options, including whether `pathname` is a pin or a prefix
  - the `upload()` → `handleUploadUrl` request and response shape
  - `head()`'s result
  - how the API derives the store's exact public host from the token, or uses a non-secret `BLOB_STORE_HOST` API setting if that's fragile

  Record the findings in the tech plan.
- **Shared (`packages/shared/src/admin/images.ts`):**
  - `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES = 5 MiB` and `IMAGE_PATH_PREFIX`
  - `setImageSchema` (strict `{ url }`, https URL) and the token request schema
  - `adminProductSchema` gains `imageUrl: string | null`. This is a minimal edit to product-management's `products.ts`. The create and update schemas stay without it.
- **API (`apps/api/src/admin/images/`):**
  - `images.controller.ts`: `@Controller("admin/products/:id/image") @UseGuards(AuthGuard, AdminGuard)` with `POST /token`, `POST /` and `DELETE /`, registered in `AdminModule`.
  - `blob-client.ts`: an injectable thin wrapper around `generateClientTokenFromReadWriteToken`, `head` and `del`.
    - It reads the token lazily and fails closed (503), following `CRON_SECRET`.
    - `isOwnBlob` is an exact hostname match.
    - Tests use a fake.
  - `images.service.ts`:
    - checks that the product exists
    - validates the pathname, host and userinfo, plus `head` for type and size
    - writes `imageUrl` in a `$transaction`
    - best-effort deletes the old blob after the commit
    - returns `ProductsService.get(id)`
  - `ProductsService` (minimal edit): `imageUrl` in the detail, plus a best-effort blob delete on `remove`.
- **CMS (`apps/cms/src/app/images/`):**
  - `blob-upload.ts`: a `BLOB_UPLOAD` injection token wrapping `upload()` from `@vercel/blob/client`. It's the only import of that package, and it's mockable in specs.
  - `images.service.ts`: uploads with `handleUploadUrl: /api/admin/products/:id/image/token`, then POSTs the URL, and sends the DELETE.
  - `image-panel.component.ts`: standalone, using signals.
  - It's embedded in `product-form.component.ts` in edit mode (minimal edit).
  - `@vercel/blob/client` is a deliberate runtime dependency in the CMS bundle and holds no secrets. The types-only rule still applies to `@stride/shared`, so the limits are mirrored as local constants with a drift check.
- **Web:**
  - `apps/web/src/features/product-image/ProductImage.tsx`: `imageUrl ? <Image fill sizes=… className="object-cover"/> : <ProductArt/>`.
  - It's used in `ProductCard.tsx` and the `product/[slug]/page.tsx` hero. The hero well gets `relative`. These are wiring edits to product-catalog and product-detail files.
  - Add `images.remotePatterns` in `next.config.ts` (the wildcard host, `/products/**`).
  - Add the Blob hosts in `buildCsp` (`security-headers.ts`) as constant lists. The three pinned CSP strings are updated.
- **Tests:**
  - shared schema tests
  - service and controller tests on `fake-products-db` plus a fake blob client, covering:
    - the guard matrix
    - pathname traversal
    - host spoofing: look-alike suffixes, userinfo, `http`
    - another product's prefix
    - `head` rejects
    - a missing token (503)
    - best-effort delete
  - `images.db.test.ts` (Rollback)
  - CMS specs with `HttpTestingController` and a mocked `BLOB_UPLOAD`
  - `ProductImage`, `ProductCard` and `FeaturedTabs` tests for both branches
  - CSP and next-config tests
  - e2e `admin-images.spec.ts` in `admin-writes`, introducing `page.route`. The guard and fallback parts always run. The real upload → storefront round trip uses `skipIf(!BLOB_READ_WRITE_TOKEN)`.

## Out of Scope

- More than one image per product, galleries, a media library, cropping or resizing in the CMS (`next/image` handles responsive sizes)
- Category images
- Blob stores per environment and Vercel project env setup (deferred, Vercel)
- The `onUploadCompleted` callback
- Migrating seed products to photos. The seed keeps `imageUrl` unset
- Cleaning up orphaned blobs from abandoned uploads (an upload that's never saved)
- og:image metadata on `/product/[slug]`

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard + AdminGuard, POST/DELETE writes with the Origin check, `BLOB_READ_WRITE_TOKEN` on the API only, short-lived client tokens, no new proxy-secret exception
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): direct browser uploads to Blob, the CMS calls same-origin `/api/admin/*`, `next/image` for product images, only the API touches Prisma
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-19 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): a successful image upload, replace or remove shows the CMS "Saved" toast once the write is saved; a failed write or a file rejected client-side shows none. This spec's ACs are unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
