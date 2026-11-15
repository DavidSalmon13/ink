# Tasks: Product Images

> Epic: admin-catalog
> Spec: 2026-10-19-product-images
> Branch: feat/admin-catalog/product-images

## Precondition

- [x] T1 Before starting, confirm that admin-foundation, category-management and product-management are all merged into develop. Then branch `feat/admin-catalog/product-images` from develop. Also note whether stock-management is merged, because T20's regex and T15's placement depend on it. It isn't required. On the current demo branch:
  - apps/api/src/admin/ holds only admin-foundation's guard, module, controller and grant-admin files.
  - apps/api/src/admin/products/, apps/cms/src/app/products/ and packages/shared/src/admin/ don't exist.
  - apps/web/playwright.config.ts has only the `chromium` project.
  - apps/web/next.config.ts has no `images` key.

  Check that these exist:
  - apps/api/src/admin/admin.guard.ts (`AdminGuard`) and apps/api/src/admin/admin.module.ts, with `ProductsController` and `ProductsService` registered in it
  - apps/api/src/admin/products/products.service.ts, which exports `ProductsService.get(id)` (the AC2 detail, `NotFoundException` on an unknown id) and `ProductsService.remove(id)` (hard delete, variants cascade)
  - apps/api/src/admin/products/testing/fake-products-db.ts, which supports `product`, `productVariant` and `$transaction(fn)`
  - packages/shared/src/admin/products.ts, which exports `adminProductSchema` and the `AdminProduct` type, with strict `createProductSchema` and `updateProductSchema` objects. It must be re-exported through packages/shared/src/admin/index.ts and packages/shared/src/index.ts.
  - apps/cms/src/app/products/product-form.component.ts (edit mode holds the product in a signal) and its spec
  - apps/web/playwright.config.ts, with the `admin-writes` project (`dependencies: ["chromium"]`), and apps/web/e2e/admin-products.spec.ts
  - `Product.imageUrl` at apps/api/prisma/schema.prisma:103, `imageUrl: z.string().nullable()` in `catalogProductSchema` (packages/shared/src/catalog/query.ts:202), and `imageUrl: true` in the storefront selects (apps/api/src/catalog/catalog.service.ts:41, apps/api/src/catalog/product-detail.service.ts:21)
  - apps/web/src/lib/security-headers.ts `buildCsp`, apps/web/src/config/next-config.test.ts, and the `signUpAdmin` (:57-64) and `cspViolations` (:66) helpers in apps/web/e2e/admin-access.spec.ts

  If any of these is missing, stop and report. Don't re-implement anything from admin-foundation, category-management or product-management here. Add no migration. (AC2, AC4, AC5, AC6, AC7)

## Spike and setup

- [x] T2 Spike on `@vercel/blob`:
  - Install a pinned exact version (no `^`) in apps/api and apps/cms. In apps/cms it is a deliberate runtime dependency: it holds no secrets, and `@stride/shared` stays types-only there, following the me.service.ts:9 convention.
  - From the installed source (not the docs), confirm:
    1. the host the browser `PUT`s to from `upload()`, which goes into `connect-src`. Expected `https://blob.vercel-storage.com`; older versions use `https://vercel.com/api/blob`. Also check for any extra host used for multipart or retry.
    2. the options of `generateClientTokenFromReadWriteToken`: `pathname`, `allowedContentTypes`, `maximumSizeInBytes`, `addRandomSuffix`, `validUntil`, `onUploadCompleted`. Find out whether `pathname` is an exact pin or a prefix. That decides how AC1's prefix restriction is enforced: by validating the requested `pathname` before signing, or by the token itself. T10 validates it before signing either way.
    3. the `upload()` → `handleUploadUrl` request and response shape: `{ type: "blob.generate-client-token", payload: { pathname, callbackUrl?, clientPayload, multipart } }` → `{ type, clientToken }`. Check whether `callbackUrl` is sent even when no callback is configured, and confirm the API must ignore it.
    4. what `head()` returns: `contentType`, `size`, `url`, `pathname`, and how it behaves on a 404
    5. how the API derives the store's exact public host: does the token format `vercel_blob_rw_<storeId>_…` give `<storeid>.public.blob.vercel-storage.com`? If not, or if it's fragile, add a non-secret `BLOB_STORE_HOST` API setting instead.

    The web side was decided at shaping: `remotePatterns` and the CSP use the wildcard `*.public.blob.vercel-storage.com` limited to `/products/**`, and the web never needs the token or an exact host. Pick one answer for each item above and record it in tech-plan.md (T22) before T5 starts. (AC1, AC2, AC8, AC10)
- [x] T3 Human task (user), an exception to the project-wide Vercel deferral for one dev store only. Create one dev Vercel Blob store (public access) by hand. Put its `BLOB_READ_WRITE_TOKEN` in the gitignored apps/api/.env, which is covered by `.env*` in .gitignore:37. Never put it in apps/web/.env*, apps/cms or any `NEXT_PUBLIC_` variable. Confirm `git status` shows no env file. Tell the implementer the store's public host so T2 item 5 can be checked against it. (AC10)
  - 2026-10-20: dev store `store_yUBTQ7vaX5dBo7ZC` (public) created; token in apps/api/.env only, `git status` clean of env files. Public host `yubtq7vax5dbo7zc.public.blob.vercel-storage.com` matches blob-client.ts:95's derivation (lowercased store id), so no `BLOB_STORE_HOST` is needed.

## Shared schemas

- [x] T4 Write the failing shared tests first. (testing skill)
  - New packages/shared/src/admin/images.test.ts, starting with `// covers AC1, AC2, AC5, T4`:
    - `ALLOWED_IMAGE_TYPES` is exactly `["image/jpeg", "image/png", "image/webp"]`, and `MAX_IMAGE_BYTES` is `5 * 1024 * 1024`.
    - `setImageSchema` accepts `{ url: "https://<host>/products/<id>/a.jpg" }` and trims it. It rejects:
      - `http:`, `javascript:`, `data:` and relative URLs
      - an empty string and a non-string
      - an over-long URL (pick a bound, for example 2048)
      - unknown keys, because the object is strict

      The host and prefix checks belong to the API (T10), not the schema.
    - The token-request schema accepts the T2 shape (`type: "blob.generate-client-token"`, `payload.pathname` a non-empty string). It ignores or allows `callbackUrl`, `clientPayload` and `multipart` the way T2 settled. It rejects a missing `pathname` and a wrong `type`.
  - Extend product-management's packages/shared/src/admin/products.test.ts with cases tagged `// covers AC2, AC5, T4`:
    - `adminProductSchema` requires `imageUrl` as `string | null`.
    - AC5 regression: `createProductSchema` and `updateProductSchema` reject a body with an `imageUrl` key.
- [x] T5 Add packages/shared/src/admin/images.ts. It exports:
  - `ALLOWED_IMAGE_TYPES` and the `AllowedImageType` type
  - `MAX_IMAGE_BYTES`
  - `IMAGE_PATH_PREFIX = (productId) => \`products/${productId}/\``
  - `setImageSchema` (strict `{ url }`) and the token-request schema
  - the inferred `SetImageInput` type

  Re-export it from packages/shared/src/admin/index.ts with a one-line barrel edit. Make a minimal edit to product-management's packages/shared/src/admin/products.ts: add `imageUrl: z.string().nullable()` to `adminProductSchema` only. The create and update schemas stay without `imageUrl`. T4 goes green. (AC1, AC2, AC5)

## Admin images API

- [x] T6 Test doubles:
  - Make a wiring edit to product-management's apps/api/src/admin/products/testing/fake-products-db.ts. Products carry `imageUrl` (default `null`), `product.update({ data: { imageUrl } })` works inside `$transaction(fn)` with rollback on throw, and `select: { imageUrl: true }` is honoured.
  - Add apps/api/src/admin/images/testing/fake-blob-client.ts. It records every `generateClientToken`, `head` and `del` call. It is seeded with blobs (`url → { contentType, size }`), can be set to throw on `del` or `head`, and has a configurable "token unset" state.

  Confirm that products.service.test.ts, products.controller.test.ts and, if merged, the stock tests stay green with no edits. (AC1, AC2, AC3, AC4)
- [x] T7 Write the failing API tests. (testing skill)
  - apps/api/src/admin/images/images.service.test.ts, starting with `// covers AC1, AC2, AC3, AC4, T7`, runs on the T6 fakes.
    - Token:
      - Signs only for `products/<id>/…` with `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `addRandomSuffix: true` and `validUntil` ≤ now + 10 min. Use fake timers for this check.
      - A pathname outside the prefix gives 400 `fieldErrors`, with no sign call. Cases: another product's id, `products/<id>` with no slash, `../`, an encoded `%2e%2e`, and a leading `/`.
      - An unknown product gives 404 with no sign call.
      - An unset token gives 503, and the error body and the logged lines don't contain the token. Spy on the Nest `Logger`.
    - Set:
      - It saves `imageUrl` and returns `ProductsService.get(id)` including `imageUrl`.
      - Each of these gives 400 `fieldErrors.url` with the fake's `imageUrl` unchanged:
        - `http:`
        - another host
        - a look-alike host suffix (`<store>.public.blob.vercel-storage.com.evil.com`, `evil<store>.public…`)
        - a userinfo trick (`https://<store-host>@evil.com/…`)
        - another product's prefix
        - `head()` 404
        - `head()` with a wrong `contentType`
        - `head()` with size > `MAX_IMAGE_BYTES`
      - An unknown id gives 404.
    - Replace and remove:
      - Replace calls `del(oldUrl)` only after the commit.
      - A throwing `del` still returns 200, and the warning is logged without the token.
      - `DELETE` sets `null` and calls `del`.
      - `DELETE` when the value is already `null` returns 200 with no `del` call.
      - `del` is never called for a previous `imageUrl` that isn't on this store's host, for example a hand-edited row.
    - Product hard delete (AC4): `ProductsService.remove` reads `imageUrl`, deletes the row, and then calls best-effort `del`. A throwing `del` still removes the row. If the value was `null` or on a foreign host, there is no `del` call.
  - apps/api/src/admin/images/images.controller.test.ts, starting with `// covers AC1, AC2, AC3, AC5, T7`, runs on the real `AppModule` with the fake Prisma and the fake blob client. It follows the products.controller.test.ts and admin.module.test.ts patterns (`sessionFor(role)`, plus `Origin` and `x-stride-forwarded-host` on writes). For `POST /admin/products/:id/image/token`, `POST /admin/products/:id/image` and `DELETE /admin/products/:id/image`:
    - Logged out gives 401, and a USER session gives 403.
    - An ADMIN gets 200. The token body is `{ type: "blob.generate-client-token", clientToken }`. The set and delete bodies pass the strict `adminProductSchema`.
    - A missing or wrong `Origin` gives 401.
    - `GET`, `PUT` and `PATCH` on these paths aren't routed.
    - A strict-body violation (an extra key, a non-string `url`) gives 400 `{ fieldErrors }`.
    - An unset token gives 503 on token, set and delete.
    - AC5 regression: `POST /admin/products` and `POST /admin/products/:id` with an `imageUrl` key give 400, and the fake's `imageUrl` is unchanged.
  - apps/api/src/admin/images/images.db.test.ts, starting with `// covers AC2, AC3, AC4, AC9, T7`, uses `skipIf(!TEST_DATABASE_URL)` and the Rollback pattern from apps/api/src/catalog/load-catalog.db.test.ts:21,104-128, with the fake blob client. Inside one rolled-back transaction on a product it creates there:
    - set, then replace, then clear `imageUrl`
    - read the value back through the storefront `CatalogService` and `ProductDetailService` selects (AC9: the next read sees it)
    - hard delete calls `del`

    It never mutates seeded products outside the rollback. Afterwards, every seeded `imageUrl` is still `null`.
- [x] T8 Add apps/api/src/admin/images/blob-client.ts, an injectable thin wrapper (`BLOB_CLIENT` token) over `generateClientTokenFromReadWriteToken`, `head` and `del`.
  - It reads `BLOB_READ_WRITE_TOKEN` lazily on each call, so existing suites without the token keep booting. If the token is unset or empty, it throws `ServiceUnavailableException` (503), failing closed like `isCronRequest` (apps/api/src/cron/cron.controller.ts:17-24).
  - It exposes `storeHost()`, derived per T2 item 5.
  - `isOwnBlob(url)` does an exact `URL.hostname` match plus the `products/` prefix. No `endsWith` on the host.
  - It never puts the token in an exception message or a log line.

  Add a `BLOB_READ_WRITE_TOKEN=` entry to apps/api/.env.example, using the `CRON_SECRET` entry as the template: what it is, "API project only, never NEXT_PUBLIC_", and "unset → image endpoints answer 503". Add `BLOB_STORE_HOST` too if T2 chose it. (AC1, AC3, AC10)
- [x] T9 Make a minimal edit to product-management's apps/api/src/admin/products/products.service.ts:
  - Add `imageUrl` to the DETAIL select, so `get(id)` returns it.
  - Inject `BLOB_CLIENT`. In `remove(id)`, read `imageUrl` first, delete the row, and then call best-effort `del` only when `isOwnBlob`. Catch the error and log a warning with the product id only.

  The `ProductsService` part of T7 goes green, and the existing products tests stay green. Note: the existing products test module setups may need a one-line `BLOB_CLIENT` provider (the fake from T6). That's an allowed wiring edit; record it in the T26 scope check. (AC2, AC4)
- [x] T10 Add apps/api/src/admin/images/images.service.ts:
  - `issueToken(id, body)`: the product must exist, otherwise 404. The pathname must start with `IMAGE_PATH_PREFIX(id)` after normalisation and contain no `..`, otherwise 400 `fieldErrors.pathname`. Then sign per T2 with `validUntil = now + 10 min`.
  - `set(id, url)`:
    1. Parse the URL, then check that the protocol is `https:`, the hostname is exactly `storeHost()`, there is no userinfo, and the pathname starts with `/products/<id>/`.
    2. Call `head(url)` and check that the type is allowed and the size is ≤ `MAX_IMAGE_BYTES`. Any failure gives 400 `fieldErrors.url`.
    3. Write `imageUrl` in a `$transaction` that also returns the previous value.
    4. After the commit, call best-effort `del(previous)` if `isOwnBlob`.
    5. Return `ProductsService.get(id)`.
  - `clear(id)`: same as set, but writes `null`. When the value is already `null`, skip both the write and the `del`.

  The service and db parts of T7 go green. (AC1, AC2, AC3)
- [x] T11 Add apps/api/src/admin/images/images.controller.ts:
  - `@Controller("admin/products/:id/image") @UseGuards(AuthGuard, AdminGuard)`
  - `POST /token`, with `ZodBodyPipe` (apps/api/src/auth/zod-body.pipe.ts) and the token-request schema
  - `POST /`, with `ZodBodyPipe(setImageSchema)`
  - `DELETE /`
  - All three return 200 (`@HttpCode(200)`).

  Register `ImagesController`, `ImagesService` and the `BLOB_CLIENT` provider in apps/api/src/admin/admin.module.ts. This is a wiring edit to admin-foundation code.
  - Confirm there's no route conflict with product-management's `POST /admin/products/:id` and `POST /admin/products/:id/sizes`.
  - Confirm that `OriginCheckMiddleware` (`forRoutes("*")`) and the proxy-secret middleware cover these paths with no change.
  - Confirm that no new proxy-secret exception is added: `/cron/*` stays the only one, and there is no `onUploadCompleted` route.

  The controller part of T7 goes green. (AC1, AC2, AC3, AC5)

## CMS image panel

- [x] T12 Write the failing Vitest specs. (testing skill)
  - apps/cms/src/app/images/images.service.spec.ts, starting with `// covers AC6, T12`, uses `HttpTestingController` and follows apps/cms/src/app/dashboard/dashboard.component.spec.ts. The `BLOB_UPLOAD` wrapper token is overridden with a fake.
    - `upload(productId, file, onProgress)` calls the wrapper with pathname `products/<id>/<safe-file-name>`, `access: "public"`, `handleUploadUrl: "/api/admin/products/<id>/image/token"`, no `clientPayload`, and the content type. It forwards progress events.
    - It then POSTs `{ url }` to `/api/admin/products/<id>/image` and returns a typed `AdminProduct`.
    - `remove(id)` sends a DELETE to the same path.
    - A wrapper rejection surfaces as an error and makes no POST.
  - apps/cms/src/app/images/image-panel.component.spec.ts, starting with `// covers AC6, T12`:
    - Display: it shows the current image (`<img>` with the URL and the product-name alt) or a "No image" placeholder.
    - Client-side checks: a file with a wrong type or over 5 MB shows an inline error and never calls `upload`. The `accept` attribute lists `ALLOWED_IMAGE_TYPES`.
    - Upload: progress shows while uploading and the controls are disabled. On success the new image shows without a reload and `updated` emits the response.
    - Replace uses the same picker when an image exists.
    - Remove: nothing is sent until the admin confirms, and Cancel sends nothing. On success the placeholder shows and `updated` emits.
    - Errors: a 400 `fieldErrors.url`, a 404, a 503 or an upload rejection each shows inline, and the previous image stays.
  - Make a minimal edit to product-management's apps/cms/src/app/products/product-form.component.spec.ts, adding cases tagged `// covers AC6, T12`:
    - Edit mode renders the Image panel with `productId` and `imageUrl`. `/admin/products/new` doesn't.
    - When the panel emits `updated`, the form's product signal updates.
- [x] T13 Add apps/cms/src/app/images/blob-upload.ts, an `InjectionToken` `BLOB_UPLOAD` whose default factory wraps `upload` from `@vercel/blob/client`. This is the only import of that package, so the specs can mock it. Then add apps/cms/src/app/images/images.service.ts:
  - It uses `HttpClient` against the same-origin `/api/admin/products/:id/image*`.
  - It imports types only from `@stride/shared`. `ALLOWED_IMAGE_TYPES` and `MAX_IMAGE_BYTES` are mirrored as local constants, with a spec asserting they equal the shared values through a type-only check or a test-time import. The exact drift-check mechanism is the implementer's choice; it must fail if the values diverge.
  - It has no env values.

  The service spec from T12 goes green. (AC6, AC10)
- [x] T14 Add apps/cms/src/app/images/image-panel.component.ts and its template, as a standalone component with signals:
  - `input.required` `productId` and `imageUrl` (`string | null`), and an `input` `productName` for the alt text
  - an `output` named `updated` that emits an `AdminProduct`
  - states: idle, checking, uploading with progress, saving and confirm-remove
  - inline errors
  - Tailwind classes using the Stride tokens from apps/cms/src/styles.css

  The preview is a plain `<img>` bound by property, never `innerHTML`. The panel spec from T12 goes green. (AC6)
- [x] T15 Make a minimal edit to product-management's apps/cms/src/app/products/product-form.component.ts:
  - Embed `<app-image-panel>` in edit mode only, passing `productId`, `product().imageUrl` and `product().name`.
  - `(updated)` replaces the form's product signal.
  - If stock-management is merged, put it next to the Stock panel and don't touch the Stock panel.

  The other fields and the size-chip logic stay unchanged. The product-form part of T12 goes green, and the existing product-form specs stay green. (AC6)

## Web storefront

- [x] T16 Write the failing web tests. (testing skill)
  - New apps/web/src/features/product-image/ProductImage.test.tsx, starting with `// covers AC7, T16`:
    - When `imageUrl` is set, it renders a next/image `img` with `src` from the URL, the given `alt` and `sizes`, `fill` and `object-cover`, and passes through the className (hover-scale classes).
    - When `imageUrl` is `null`, it renders `ProductArt` exactly as today (the svg with `aria-hidden="true"`) and no `img`.
    - Hero usage: `alt` is the product name. Note: apps/web/src/app/product/[slug]/ has no page-level test, so this unit case plus the token-gated T21 round trip are what cover the hero; CI doesn't check the page wiring itself.
  - Extend apps/web/src/features/catalog/ProductCard.test.tsx, tagged `// covers AC7, T16`:
    - Keep the existing 4:5-well art case (:31).
    - Add an image case: the `img` sits in the `aspect-[4/5]` well with `alt=""`, keeps `group-hover:scale-[1.04]`, and the well has `opacity-60` when sold out.
    - Use `{ ...testProduct(), imageUrl }` from apps/web/src/features/catalog/test-products.ts. Fixtures stay `imageUrl: null` by default.
  - Extend apps/web/src/features/home/FeaturedTabs.test.tsx with one case: a product with `imageUrl` renders an `img` in its card. (AC7)
  - Update apps/web/src/lib/security-headers.test.ts, tagged `// covers AC8, T16`:
    - Update the pinned `PROD_CSP` (:13) and `PREVIEW_CSP` (:16) and the dev case (:34-35): `img-src` gains `https://*.public.blob.vercel-storage.com` and `connect-src` gains the T2 upload host.
    - Add a case that the Blob hosts appear in all three variants and nowhere except `img-src` and `connect-src`.
    - Check that `PREVIEW_ORIGINS` (:19) doesn't match the Blob hosts, so the "never outside preview" assertion still holds.
  - Update apps/web/e2e/security-headers.spec.ts `CSP` (:8) to the new production string.
  - Extend apps/web/src/config/next-config.test.ts, tagged `// covers AC8, T16`: `images.remotePatterns` has exactly one entry, `{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/products/**" }`.
- [x] T17 Add apps/web/src/features/product-image/ProductImage.tsx with props `{ product: Pick<CatalogProduct, "imageUrl" | "art">, alt, sizes, className?, priority? }`:
  - When `imageUrl` is set, render `next/image` with `fill`, `sizes`, `object-cover` and the className.
  - Otherwise render `ProductArt` from apps/web/src/features/catalog/ProductArt.tsx with the same className.

  It has no wrapper element, so the parent wells keep their aspect ratio and opacity. The ProductImage tests from T16 go green. (AC7)
- [x] T18 Wiring edits:
  - In product-catalog's apps/web/src/features/catalog/ProductCard.tsx, replace `<ProductArt>` with `<ProductImage alt="" sizes="(min-width: 1024px) 25vw, 50vw" className=…>`. Keep the existing hover classes. The well's `relative` already supports `fill`.
  - In product-detail's apps/web/src/app/product/[slug]/page.tsx:56-60, replace `<ProductArt>` in the hero well with `<ProductImage alt={product.name} sizes="(min-width: 1024px) 50vw, 100vw" priority>`. Add `relative` to the well, because `fill` needs a positioned parent. Keep `opacity-70` for sold out.

  FeaturedTabs needs no edit, because it uses ProductCard. The ProductCard and FeaturedTabs parts of T16 go green, and the existing catalog, product and home tests stay green. (AC7)
- [x] T19 CSP and images config:
  - In apps/web/src/lib/security-headers.ts:
    - Add a constant `BLOB_IMG_SOURCES` (`https://*.public.blob.vercel-storage.com`) and a constant `BLOB_CONNECT_SOURCES` (the T2 upload host), as literal strings. The file stays import-free (lines 1-3).
    - Spread them into `img-src` (:47-55) and `connect-src` (:63-66) in every variant. They aren't behind `toolbar()`.
  - In apps/web/next.config.ts, add `images: { remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/products/**" }] }`. No env read, so the token can't leak into the web build.

  The CSP, next-config and security-headers e2e parts of T16 go green. (AC8, AC10)

## End-to-end

- [x] T20 Wiring edit to apps/web/playwright.config.ts:
  - Widen the `admin-writes` `testMatch`, and the matching `chromium` `testIgnore`, to `/admin-(products|stock|images)\.spec\.ts/`. If stock-management isn't merged, use `/admin-(products|images)\.spec\.ts/`.
  - In the API `webServer.env`, pass `BLOB_READ_WRITE_TOKEN` through only when it's set: `...(process.env.BLOB_READ_WRITE_TOKEN ? { BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN } : {})`. Never pass it to the web server.

  Confirm that CI (`npm run test:e2e`, with no `--project` and no Blob token in .github/workflows/ci.yml) still runs both projects. Confirm that catalog.spec.ts, product-detail.spec.ts, shopping-journey.spec.ts, security-headers.spec.ts (only the CSP string from T16 changes), admin-access.spec.ts and admin-categories.spec.ts stay in `chromium`. (AC10)
- [x] T21 Write apps/web/e2e/admin-images.spec.ts, starting with `// covers AC5, AC6, AC7, AC8, AC9, AC10, T21`. It promotes the admin using the `signUpAdmin` pattern (admin-access.spec.ts:57-64) and creates a timestamped throwaway product (One size) through `/admin/products/new`.
  - These always run, with or without the token:
    1. With a `cspViolations` collector, open `/admin/products/:id` and see the Image panel with "No image". Check that `/admin/products/new` has no panel.
    2. Pick a `.txt` file and then a file over 5 MB built from a `Buffer`. Both show inline errors, and no request goes to `/image/token`. Watch with `page.on("request")`.
    3. Use `page.route` to fake the `/image/token` response as a 503 and see the inline error. This is the first `page.route` in the suite, so keep it scoped to this test.
    4. A logged-out `request` and a non-admin `request` to the three image endpoints give 401 and 403.
    5. `/catalog?q=<name>` and `/product/[slug]` show the ProductArt svg with no `img`.
  - This runs only with `test.skip(!process.env.BLOB_READ_WRITE_TOKEN)`:
    1. Upload a small PNG fixture and see the progress and then the new image without a reload.
    2. On the next request, see an `img` in the card well on `/catalog?q=<name>` (`alt=""`) and the hero on `/product/[slug]` (alt = name). The product isn't featured, so the home rail is covered by the T16 unit tests and the T26 manual pass.
    3. Replace it with a second image and see the new URL.
    4. Remove it after confirming and see the ProductArt again on both pages.
    5. Throughout, there are no CSP violations on the admin page or on the storefront pages.

  In `afterAll`, delete the throwaway product through the admin API, which also best-effort deletes its blob. It never touches seeded products. (AC5, AC6, AC7, AC8, AC9, AC10)

## Docs

- [x] T22 Doc edits:
  - In softwareos/products/cms/epics/admin-catalog/tech-plan.md:
    - Record the T2 spike findings: package version, upload host, public-host derivation, token options, and `callbackUrl` handling.
    - Resolve the `onUploadCompleted` risk as "skipped; the CMS posts the URL; no new exception, `/cron/*` stays the only one".
    - Resolve "Blob store per environment" as "one hand-made dev store now (an exception to the Vercel deferral); per-env stores deferred (Vercel)". Record that the web uses the wildcard `*.public.blob.vercel-storage.com` host under `/products/**` and the API checks the exact store host.
    - Update the `product-images` candidate line: token, set/replace/remove, best-effort blob delete on replace, remove and product delete, storefront next/image with the ProductArt fallback.
  - In softwareos/standards/global/auth-security.md:41, replace the `onUploadCompleted` TBD with the decision (skipped, no exception).
  - In softwareos/standards/global/tech-stack.md:49, replace "One Blob store per environment: TBD" with the dev store now and per-env deferred (Vercel).
  - In softwareos/products/cms/architecture.md, update :19 (store per env) and :25 (callback). Also fix :14, which names `/api/admin/uploads`, to `/api/admin/products/:id/image/token`.
  - Check softwareos/products/cms/tech-stack.md:24. It needs no change unless it says TBD.
  - Confirm that the product-images row in softwareos/products/cms/epics/admin-catalog/epic.md's Specs table is present (added at shaping). (AC10)

## Deferred (Vercel)

- [ ] T23 Deferred (Vercel): create the preview and production Blob stores and set `BLOB_READ_WRITE_TOKEN` (and `BLOB_STORE_HOST` if T2 added it) on the API project per environment. The web's wildcard `remotePatterns` and CSP hosts already cover every store. Then run the T21 round trip against a preview deploy. Leave this open; it doesn't block this spec's PR. (AC8, AC10)

## Verification

- [~] T24 Run the full suites green, locally and in CI (testing skill):
  - `npm run lint`
  - `npm run typecheck`
  - `npm test` for shared, api, cms and web, with `TEST_DATABASE_URL` set so that images.db.test.ts and the unchanged catalog, product-detail and load-catalog db suites run. Also run once without `BLOB_READ_WRITE_TOKEN`, to prove the API suites don't need it.
  - `npm run build`
  - `npm run test:e2e`, with both projects: `chromium` (catalog, product-detail, shopping-journey, security-headers and admin-access, unchanged except for the CSP string) and then `admin-writes` (admin-products, admin-stock if merged, and admin-images). Run it locally once with the dev token set, so the round trip runs, and once without.

  Check that every new or updated test file has its `covers AC<n>, T<n>` comment, and that AC1–AC10 each trace to at least one test. (AC1–AC10)
  - 2026-10-20 (partial): `npm run lint`, `npm run typecheck`, `npm test` (api 619 passed / 63 skipped, cms 127, web 359, shared 275) and `npm run build` are green without `TEST_DATABASE_URL` and without `BLOB_READ_WRITE_TOKEN`, so the API suites don't need the token. No `vercel_blob_rw_` in `apps/web/.next` or `apps/web/public/admin`. `admin-images.spec.ts` passed locally against the Neon dev DB (`--project admin-writes --no-deps`, reusing the dev API): 3 passed, the token-gated round trip skipped. Still open: the `*.db.test.ts` suites with `TEST_DATABASE_URL`, the full two-project e2e run, and a run with the dev Blob token once T3 is done.
  - 2026-10-20 (partial): full two-project `npm run test:e2e` green on fresh builds of api, cms and web, without `BLOB_READ_WRITE_TOKEN`. The `TEST_DATABASE_URL` gate was pointed at the Neon dev DB that the API already uses. `chromium` then `admin-writes`: 58 passed, 1 skipped (the token-gated round trip in admin-images.spec.ts:236). Still open: the `*.db.test.ts` suites against a dedicated test DB, and the e2e plus round trip with the dev Blob token once T3 is done.
  - 2026-10-20 (partial): with the dev Blob token (T3) and the `TEST_DATABASE_URL` gate on the Neon dev DB, `admin-writes` alone (`--project admin-writes --no-deps`, fresh servers): 6 passed, including the admin-images.spec.ts:236 round trip against the real store. The full two-project run is red: admin-categories.spec.ts:79 hits a strict-mode clash (`Categories` vs the dashboard's `Manage categories` link). That comes from admin-dashboard commits 7e134c8/15b72a1 on this branch, not from this spec, so `admin-writes` didn't run in it. Still open: a green full two-project run, and the `*.db.test.ts` suites against a dedicated test DB.
- [ ] T25 Light security review of the spec's diff (security-reviewer agent):
  - All three image routes are behind `AuthGuard` then `AdminGuard`, are POST/DELETE only, are covered by the Origin check and fail closed (503) when the token is unset.
  - The token is scoped to `products/<id>/` with type, size, random-suffix and ≤10 min limits. Pathname traversal is rejected.
  - Saved URLs are https, an exact store-host match (no suffix or userinfo tricks), under the product's prefix and checked with `head()`.
  - `del` only ever targets own-store blobs.
  - The token never appears in responses, logs, the web or CMS bundles, or `NEXT_PUBLIC_`. Grep the built `apps/web/.next` and `apps/web/public/admin` for `vercel_blob_rw_`.
  - No new proxy-secret exception is added.
  - Product create and update still can't set `imageUrl`.
  - The CSP widening is limited to the two Blob hosts in `img-src` and `connect-src`, and `remotePatterns` is limited to `/products/**` on the Blob wildcard host.
  - The CMS preview binds `src` by property only.
- [ ] T26 Run the qa skill against acceptance criteria AC1–AC10 and write qa-report.md. Include a manual pass with the dev store:
  1. As an admin, open a product you created. Upload a JPEG and watch the progress. The image shows without a reload.
  2. Try a GIF and a 6 MB file. Both are rejected inline, before any upload.
  3. Replace the image. Check in the Blob dashboard that the old blob is gone.
  4. Remove the image: cancel once, then confirm.
  5. Check `/catalog`, `/` (featured, after temporarily featuring a product inside a dev DB only, or by inspection) and `/product/[slug]` on the next load. Check both the image and the ProductArt fallback, sold-out dimming, and that hover scale still works.
  6. With DevTools open, check there are no CSP violations on `/admin/products/:id` during upload or on the storefront.
  7. `POST /image` with a URL on another host gives 400.
  8. Unset the token and restart. Image endpoints give 503 and the rest of the admin works.
  9. Hard-delete the product and confirm its blob is gone.
  10. Check a non-admin (403) and a logged-out user (401).

  For scope, check that the only files touched outside the Covers list are:
  - packages/shared/src/admin/index.ts (barrel), plus products.ts and products.test.ts (T4, T5)
  - fake-products-db.ts (T6), products.service.ts and any one-line `BLOB_CLIENT` provider in the products test setups (T9)
  - admin.module.ts (T11)
  - apps/api/.env.example (T8)
  - apps/api/package.json, apps/cms/package.json and package-lock.json (T2)
  - product-form.component.ts and its spec (T12, T15)
  - ProductCard.tsx, ProductCard.test.tsx, FeaturedTabs.test.tsx and apps/web/src/app/product/[slug]/page.tsx (T16, T18)
  - security-headers.ts and its test, apps/web/e2e/security-headers.spec.ts, next.config.ts and next-config.test.ts (T16, T19)
  - playwright.config.ts (T20)
  - the docs in T22

  The Prisma schema and migrations, prisma/seed.ts, the catalog services, ProductArt.tsx, the storefront fixtures' default `imageUrl: null`, and catalog.spec.ts, product-detail.spec.ts and shopping-journey.spec.ts must be untouched.
