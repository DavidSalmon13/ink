# Product Detail

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/product-detail
> Covers: /product/[slug], apps/web/src/app/product/**, apps/web/src/features/product/**, apps/api/src/catalog/product-detail.*, packages/shared/src/catalog/product-detail*.ts, apps/web/e2e/product-detail.spec.ts

## Overview

The third catalog-search spec. It delivers `/product/[slug]`, a server-rendered product page with:
- the product's ProductArt, name, subtitle, USD price, guidance tag and description
- a size selector built from the category's size set, where sold-out sizes are visible but disabled
- a per-size stock line
- a fully-sold-out state
- a not-found page for unknown slugs

It adds `GET /catalog/products/:slug` to the catalog controller that product-catalog creates.

It depends on catalog-foundation (variants, size sets, seed) and on product-catalog (`CatalogModule`/controller, `catalogProductSchema`, `ProductArt`, `formatPriceCents`, the `/catalog` URL slugs). The epic's journey e2e stays in home-page; this spec adds a product-detail e2e.

The product visual is the ProductArt component, driven by `artKind`/`artColor`/`artAccent`, which matches the catalog-foundation decision. There are no photos and no image gallery, and `imageUrl` stays unused. The page renders no add-to-cart or wishlist button. Instead, the size selector exposes the selected size, so cart-checkout can attach add-to-cart to it, and account-wishlist adds its own button.

This spec serves these brief success criteria:
- the page is server-rendered
- size rules and per-size stock display correctly for shoes, apparel and gear
- the out-of-stock state matches `ProductSoldOut.dc.html`
- prices show as USD

Covers note: catalog-foundation's `apps/api/src/catalog/**` and `packages/shared/src/catalog/**` globs match this spec's files, and product-catalog's spec mentions `/product/[slug]` as its card link target. Both were reviewed in the pre-flight check and dismissed (see references.md).

## Goals & User Stories

- As a shopper, I open a product and see its art, name, subtitle, price in USD, a plain-language guidance tag and a description, so I can decide whether it's for me.
- As a shopper, I pick a size from the sizes that fit the category (shoes US 6–13 including half sizes; apparel XS–XL; gear one size). Sold-out sizes are visible, but I can't pick them.
- As a shopper, after picking a size I see whether it's in stock, and I get a warning when only a few are left.
- As a shopper, a fully sold-out product still has a page that clearly says "Out of stock" and points me to similar products.
- As a shopper, a mistyped or old product link shows a friendly not-found page with a way back to the catalog.

## Acceptance Criteria

1. AC1: `GET /catalog/products/:slug` is public (no AuthGuard) but still needs the proxy secret: without it, the response is 401.
   - For a known slug it returns `productDetailResponseSchema`: every `catalogProductSchema` field, plus `description`, `techNote` (nullable) and `variants: [{ size, stock }]` in the size set's `sortOrder`.
   - For an unknown slug, or one that isn't URL-safe (`^[a-z0-9]+(-[a-z0-9]+)*$`, at most 100 characters), it returns 404. A malformed slug never triggers a query.
2. AC2: `/product/[slug]` is server-rendered. The first HTML response already contains the product name, price, description and every size label.
3. AC3: The page follows `stride-design/pages/Product.dc.html`:
   - **Breadcrumb:** `Shop / <Category> / <Name>` in a `nav aria-label="Breadcrumb"`. Shop links to `/catalog`, the category links to `/catalog?category=<slug>`, and the name is plain text.
   - **Layout:** a single ProductArt in a 4:5 well, next to an info column that is sticky on desktop. At ≤760px the info column stacks below the art.
   - **Info column:** the H1 name, the subtitle, the price as USD (`$110.00`) and the guidance-tag badge.
   - **Shipping box:** "**Free shipping** on orders over $75 · $5 otherwise" and "Demo checkout: nothing is charged."
   - **Accordion:** "Description" is open by default. A collapsed "Details" item shows the tech note exactly as stored (the seeded notes already start "For the technical crowd: …"; the page adds no prefix) and appears only when a tech note exists.
4. AC4: The size selector shows exactly the variant sizes, in order:
   - shoes: the 15 US sizes
   - apparel: XS–XL
   - gear: "One size"

   It is a fieldset with the legend "Select size", made of native radio inputs, so it works with a keyboard and with screen readers. No size is selected by default. A sold-out size is visible but `disabled`, labelled "`<size>`, sold out", and styled crossed out and hatched.
5. AC5: An `aria-live="polite"` stock line sits under the selector:
   - with no size selected: "Sold-out sizes are crossed out."
   - when the selected size has stock ≤ 3: "Only `<n>` left in `<size>`"
   - otherwise: "In stock in `<size>`"

   `ProductPurchasePanel` exposes the selected size through its `actions(selectedSize)` render slot. In this spec the slot renders nothing.
6. AC6: When no variant has stock, the page follows `ProductSoldOut.dc.html`:
   - a neutral `Out of stock` badge above the H1
   - the art is dimmed
   - every size chip is disabled
   - a `role="status"` box reads "**Out of stock in every size**"
   - a "See other `<category>`" link goes to `/catalog?category=<slug>`
   - the info column isn't sticky
7. AC7: An unknown or invalid slug returns HTTP 404 and renders a not-found page per `stride-design/pages/NotFound.dc.html`:
   - the eyebrow "Page not found" and the H1 "This path doesn't go anywhere"
   - the body copy
   - a "Browse the catalog" button (`/catalog`) and a "Back to home" button (`/`)
   - a decorative ProductArt shoe
8. AC8: The page has no add-to-cart, quantity or wishlist control. Its `metadata` title is `<Name> · Stride`.
9. AC9: A Playwright test, `apps/web/e2e/product-detail.spec.ts`, runs against the seeded database. It covers:
   - an in-stock shoe with a sold-out size: the sold-out size is disabled, and selecting an in-stock size updates the stock line, including the "Only n left" case
   - the sold-out state of Thermal Long-Sleeve Top
   - an unknown slug: the not-found page with status 404
   - clicking a catalog card lands on its product page

   `apps/web` imports no Prisma. All existing tests still pass.

## Technical Approach

- **Shared (`packages/shared/src/catalog/product-detail.ts`, exported through the catalog barrel as a wiring edit):**
  - `productSlugSchema`
  - `productDetailResponseSchema`, as `catalogProductSchema.extend({ description, techNote, variants })`
  - `LOW_STOCK_THRESHOLD = 3`
  - a pure `stockMessage(variant | null)`, used by both the UI and the tests
- **API:**
  - `apps/api/src/catalog/product-detail.service.ts` has `ProductDetailService.getBySlug(slug)`. It runs one `findUnique({ where: { slug }, select })`, selecting `category.slug` and `variants` ordered by `sortOrder`. It reuses product-catalog's row → `CatalogProduct` mapping, extracted as a helper in a wiring edit if needed. It returns null when the product is missing.
  - The route `@Get("products/:slug")` is added to product-catalog's `catalog.controller.ts`, and the service is registered in `catalog.module.ts` (both wiring edits). The route validates with `productSlugSchema.safeParse` and throws `NotFoundException` on a bad slug or a null result.
- **Web:**
  - **Page:** `apps/web/src/app/product/[slug]/page.tsx` has `generateMetadata` and calls `notFound()` on a null product (a fallback; the 404 status comes from the proxy check below).
  - **Loader:** `loadProduct(slug)` in `features/product/load-product.ts` calls `apiFetch("/catalog/products/<slug>", { cache: "no-store" })`. A 404 becomes `null`, any other non-200 throws, and the body is parsed with the shared schema.
  - **Not-found page:** `apps/web/src/app/product/[slug]/not-found.tsx`, per NotFound.dc.html. launch-polish can later promote it to the app-wide not-found page.
  - **Proxy 404 check (wiring edit to `apps/web/src/proxy.ts`, owned by protected-routes):** for `GET /product/<slug>` page requests, the proxy:
    - checks the slug with `productSlugSchema`
    - for a valid slug, checks it exists with `GET /catalog/products/<slug>` (with the proxy secret)
    - on a bad or unknown slug, fetches the rendered product not-found page and returns its HTML with status 404 and the usual security and Cache-Control headers

    That internal fetch is authenticated with `WEB_PROXY_SECRET`, so a browser can't skip the check or loop the proxy. This costs one extra API call per product page view, which is accepted for v1.
  - **Server Components in `features/product/`:** `ProductBreadcrumb`, `ProductInfo` (H1, subtitle, Price, badges, shipping box, accordion) and `SoldOutNotice`. They reuse product-catalog's `ProductArt` and `formatPriceCents`.
  - **Client Components:**
    - `SizePicker`: a radio fieldset, controlled through `value`/`onChange`.
    - `ProductPurchasePanel`: owns the selected size and renders SizePicker, the stock line and the `actions` slot.
- **404 under cacheComponents (T2 spike, 2026-10-18):** inside the page, `notFound()` returns 200 + noindex. That holds in Suspense, with `generateStaticParams` and a `"use cache"` fetch, and in `generateMetadata`. A proxy `rewrite(…, { status: 404 })` also ignores the status. Only the proxy check above, which returns the not-found HTML with an explicit 404, gave a real 404: does-not-exist → 404, Bad--Slug → 404, a real slug → 200. A dynamic `[slug]` route also needs `generateStaticParams`, or the build fails because the header uses `usePathname()` outside Suspense.
- **No JS (2026-10-18):** the product loads inside `<Suspense>`, which cacheComponents requires because `apiFetch` reads the request headers. React reveals streamed content with an inline script, so without JS the page stays on its loading state. The sizes are still in the raw HTML (AC2), but v1 doesn't promise a page that works without JS.
- **Tests:**
  - shared `product-detail.test.ts`: the schemas and `stockMessage`
  - API `product-detail.service.test.ts` (fake-db)
  - controller HTTP cases added to `catalog.controller.test.ts` (wiring edit): 404s, 401 and the response shape
  - `product-detail.db.test.ts` on the seeded database: variant order per category, and every Thermal Long-Sleeve Top variant at 0
  - web RTL tests for SizePicker, ProductPurchasePanel, ProductInfo, SoldOutNotice and the not-found page
  - Playwright `product-detail.spec.ts`

## Out of Scope

- Add to cart, the quantity stepper and the wishlist button. These belong to cart-checkout and account-wishlist; this spec provides only the `actions` slot.
- Real photos, a multi-view gallery and thumbnails. `imageUrl` stays unused.
- The design's "Why it's good for beginners" bullets and "Details, in plain words" table. The data has no fields for them.
- A size guide, related products and "notify me".
- An app-wide not-found or error page, which launch-polish owns. This spec owns only the product route's not-found page.
- Caching product reads, which is deferred with the Vercel work. The T2 spike showed a cached fetch doesn't give a real 404.
- A product page that works without JavaScript (see Technical Approach, No JS).

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md):
  - server-rendered by default, with small Client Components
  - no Prisma in the web
  - `apiFetch` and shared Zod
  - Vitest + RTL + Playwright
- [global/auth-security](../../../../../../standards/global/auth-security.md): the public GET still sits behind the proxy secret, and a GET never changes state
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch, commits and PR

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-18 | david-schwartzman | change | Real 404 via a proxy slug check (AC7 unchanged); tech note shown verbatim, no added prefix (AC3) — T2 spike: with cacheComponents only a proxy-level check returns a real 404; seeded tech notes already carry the prefix, so adding it doubled it | — |
| 2026-10-18 | david-schwartzman | change | AC4 drops "works without JS"; the no-JS case leaves the e2e — Under cacheComponents the product must load inside <Suspense>; React reveals streamed content with an inline script, so without JS the page stays on its loading state (T17 e2e, 2026-10-18) | — |
| 2026-10-18 | david-schwartzman | hotfix | Fixed AC3 at 375px: /product/<slug> scrolled sideways by 17px (the size grid's six-chip min-content width held the info column at 376px); max-md:min-w-0 on the size fieldset and the info column; regression e2e `at 375px (MobileProduct.dc.html)` in product-detail.spec.ts | qa-report.md issue 1 |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
