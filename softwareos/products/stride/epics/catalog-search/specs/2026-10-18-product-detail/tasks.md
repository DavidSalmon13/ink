# Tasks — Product Detail

> Epic: catalog-search
> Spec: 2026-10-18-product-detail
> Branch: feat/catalog-search/product-detail

## Gate

- [x] T1 (demo branch: auth stack, catalog-foundation and product-catalog are on feat/accounts-auth/auth-api-demo; product-catalog T22 is still [~] over its no-JS e2e) Check that accounts-auth `api-foundation` and `auth-api-migration` are merged into `develop`. Check that catalog-foundation and product-catalog are both merged too, including:
  - the Category/Product/ProductVariant migration, with `description`, `techNote` and `ProductVariant.sortOrder`/`stock`
  - in `packages/shared/src/catalog/`: `sizes.ts` (`sizesForCategory`), `enums.ts` (`categorySlugSchema`, `CATEGORY_LABELS`), `query.ts` (`catalogProductSchema`, the URL slug maps) and the barrel `index.ts`
  - `apps/api/src/catalog/catalog-data.ts`, `loadCatalog`, `apps/api/prisma/seed.ts` and the CI "Seed database" step
  - `apps/api/src/catalog/catalog.controller.ts`, `catalog.service.ts` (the row → `CatalogProduct` mapping) and `catalog.module.ts`, registered in `app.module.ts`
  - in `apps/web/src/features/catalog/`: `ProductArt.tsx`, `ProductCard.tsx` (linking to `/product/<slug>`), `format-price.ts` and `load-catalog-products.ts`
  - `apps/web/e2e/catalog.spec.ts`

  Then create `feat/catalog-search/product-detail` from the latest `develop`. Stop if any of them is still only on its feature branch (AC1, AC9).

## Spike

- [x] T2 (spike done 2026-10-18, local `next build && next start`, curl -i). Results:
  - Baseline, `notFound()` inside Suspense: `/product/does-not-exist` → 200 + noindex.
  - (a) `generateStaticParams` + a `"use cache"` public fetch, no Suspense: unknown slug → 200 + noindex. The prerendered `[slug]` shell flushes first.
  - `notFound()` in `generateMetadata`: also 200 + noindex, for browser and Googlebot user agents.
  - (b) A proxy `NextResponse.rewrite(url, { status: 404 })`: the status is ignored, so 200.
  - (b') The proxy checks the slug format, then existence via the API. On a miss it fetches the rendered not-found page and returns its HTML with status 404: does-not-exist → 404, Bad--Slug → 404, a real slug → 200.
  - Also: a dynamic `[slug]` route needs `generateStaticParams`, or the build fails ("usePathname() in a Client Component outside <Suspense>" from the layout header).
  - Chosen: (b'). It changes the Technical Approach (a proxy edit and one extra API call per product page), so it needs /spec-changes before T14. Throwaway pages deleted.
  Spike: get a real HTTP 404 for `/product/<unknown>` with `cacheComponents: true` in apps/web/next.config.ts.

  First, build a throwaway `/product/[slug]` page that calls `notFound()` inside `<Suspense>` after streaming starts. It's expected to return 200 + `noindex`; confirm that with `curl -i`. Then try, in order:
  - **(a) Resolve the product before the first flush.** Use `generateStaticParams` from a public slug list, or a `"use cache"` public fetch that doesn't call `headers()`. The cached fetch would need an `apiFetch` variant that sends the proxy secret but no cookie or `x-stride-*` headers.
  - **(b) Check the slug in the proxy.** In apps/web/src/proxy.ts, check that the slug exists (or at least matches `productSlugSchema`) and rewrite to the not-found page with status 404.

  Record the chosen option and the `curl -i` evidence in the PR description. If the choice changes the Technical Approach (a cached fetch, an `apiFetch` variant or a proxy edit), record it with /spec-changes before T14. Delete the throwaway page. T14 and T17 follow this outcome (AC7).

## Tests first (TDD)

- [x] T3 Write failing Vitest tables in packages/shared/src/catalog/product-detail.test.ts, starting with `// covers AC1, AC5, T3`.
  - **`productSlugSchema`:**
    - accepts `stride-glide-road-shoe` and a valid 100-character slug
    - rejects a 101-character slug, `""`, `Stride-Glide`, `-glide`, `glide-`, `glide--road`, `glide_road`, `glide road`, `../etc` and `%2e%2e`
  - **`productDetailResponseSchema`:**
    - accepts every `catalogProductSchema` key plus `description`, `techNote` (string or `null`) and `variants: [{ size, stock }]`
    - rejects a missing `techNote`, an extra key, a negative or non-integer `stock`, and an empty `size`
  - **`stockMessage`:**
    - `null` → `Sold-out sizes are crossed out.`
    - `{ size: "US 9", stock: 2 }` → `Only 2 left in US 9`
    - stock 3 → `Only 3 left in …`, because `LOW_STOCK_THRESHOLD` is inclusive
    - stock 4 → `In stock in US 9`
    - stock 1 on `M` → `Only 1 left in M`
    - `LOW_STOCK_THRESHOLD === 3` (testing skill)
- [x] T4 Write failing apps/api/src/catalog/product-detail.service.test.ts, starting with `// covers AC1, T4`. Use the fake-db style of apps/api/src/auth/testing/fake-db.ts: a fake `PrismaService` whose `product.findUnique` records its args and returns a fixture row or `null`.
  - **Query:**
    - one `findUnique` with `where: { slug }`
    - an explicit `select` that includes `category: { select: { slug: true } }`, `description`, `techNote` and `variants: { orderBy: { sortOrder: "asc" }, select: { size: true, stock: true } }`
    - no `findMany` and no second query
  - **Mapping:**
    - the result parses with `productDetailResponseSchema`
    - `category`/`run`/`gender` are URL slugs, as in product-catalog's mapping (`race-day`)
    - `art` is `{ kind, color, accent }` and `imageUrl` stays `null`
    - `techNote: null` passes through
    - variants keep the order the fake returns
    - `soldOut` is `true` exactly when every variant has stock 0
  - **Missing:** a `null` row → `getBySlug` returns `null`. (testing skill)
- [x] T5 Add failing cases to apps/api/src/catalog/catalog.controller.test.ts (wiring edit), in a new `describe("GET /catalog/products/:slug")` block starting with `// covers AC1, T5`. Make real HTTP calls through the existing `AppModule` app, with `PrismaService` overridden.
  - Without `x-stride-proxy-secret` → 401.
  - With the secret and no cookie → 200. The body parses with `productDetailResponseSchema`, and no AuthGuard is involved.
  - An unknown slug → 404.
  - Malformed slugs (uppercase, `a--b`, 101 characters, `%2E%2E`) → 404, with no `findUnique` call (check the fake's recorded calls).
  - The response carries the SecurityHeaders headers.
  - The existing `GET /catalog/products` cases still pass. (testing skill)
- [x] T6 Write failing apps/api/src/catalog/product-detail.db.test.ts, starting with `// covers AC1, T6`. Follow apps/api/src/auth/session.db.test.ts: `describe.skipIf(!process.env.TEST_DATABASE_URL)`, a 60 s timeout and a `PrismaService` with `datasourceUrl`. The test only reads the seeded catalog; it writes nothing.
  - Pick one shoe, one apparel item and one gear item from `catalogData`. For each, the variant sizes equal `sizesForCategory(category)`, in order (15 US sizes / XS–XL / `One size`), and each stock matches its `catalogData` entry.
  - Thermal Long-Sleeve Top has every stock at 0 and `soldOut: true`.
  - Stride Glide Road Shoe has at least one size at 0, at least one size with stock ≤ 3, and `soldOut: false`.
  - `description` and `techNote` match `catalogData`.
  - An unknown slug returns `null`. (testing skill)
- [x] T7 Write failing RTL tests (jsdom) in apps/web/src/features/product/SizePicker.test.tsx and apps/web/src/features/product/ProductPurchasePanel.test.tsx, each starting with `// covers AC4, AC5, T7`.
  - **SizePicker:**
    - a `fieldset` with the legend `Select size`
    - one native `input[type=radio]` per variant, in the given order, sharing one `name`
    - no radio checked at first
    - a sold-out size is `disabled`, has the accessible name `<size>, sold out` and has the crossed-out/hatched class
    - arrow keys move between enabled radios
    - controlled: the `value` prop sets the checked radio, and clicking a radio calls `onChange(size)`
    - a `disabled` prop disables every radio
  - **ProductPurchasePanel:**
    - the `aria-live="polite"` line starts as `Sold-out sizes are crossed out.`
    - selecting a size with stock 2 shows `Only 2 left in US 9`, and stock 9 shows `In stock in US 8`
    - `actions` is called with `null`, then with the selected size
    - without `actions`, no extra button is rendered
    - there is no add-to-cart, quantity or wishlist control (AC8) (testing skill)
- [x] T8 (reopened 2026-10-18 by spec change, done: the fixture techNote now carries the "For the technical crowd: " prefix; the component adds none) Write failing RTL tests in apps/web/src/features/product/ProductBreadcrumb.test.tsx, ProductInfo.test.tsx and SoldOutNotice.test.tsx, each starting with `// covers AC3, AC6, AC8, T8`.
  - **ProductBreadcrumb:**
    - `nav[aria-label="Breadcrumb"]` reads `Shop / Shoes / Stride Glide Road Shoe`
    - Shop links to `/catalog` and the category to `/catalog?category=shoes`
    - the name is plain text with `aria-current="page"`
  - **ProductInfo:**
    - the H1 name, then the subtitle, `$110.00` and the guidance-tag badge
    - the shipping box reads `Free shipping on orders over $75 · $5 otherwise` and `Demo checkout: nothing is charged.`
    - a `details`/`summary` accordion where `Description` is open and shows the description, and `Details` is collapsed with `For the technical crowd: <techNote>`
    - with `techNote: null`, there is no `Details`
    - a `soldOut` product shows a neutral `Out of stock` badge before the H1
  - **SoldOutNotice:** a `role="status"` box with `Out of stock in every size`, plus a `See other apparel` link to `/catalog?category=apparel`. (testing skill)
- [x] T9 Write failing RTL tests in apps/web/src/features/product/load-product.test.ts and apps/web/src/app/product/[slug]/not-found.test.tsx, each starting with `// covers AC7, T9`. If the web Vitest include glob doesn't pick up tests under `app/`, move the not-found test to features/product/.
  - **loadProduct**, with `apiFetch` mocked as in the existing account loaders:
    - it calls `/catalog/products/<slug>` with `cache: "no-store"` (or the cached variant chosen in T2)
    - 200 → the parsed product
    - 404 → `null`
    - 500 → throws
    - a body that fails `productDetailResponseSchema` → throws
  - **not-found:**
    - the eyebrow `Page not found` and the H1 `This path doesn't go anywhere`
    - the body copy from NotFound.dc.html
    - a `Browse the catalog` link to `/catalog` and a `Back to home` link to `/`
    - the ProductArt shoe is `aria-hidden` (testing skill)
- [x] T10 (reopened 2026-10-18 by spec change: AC4 no longer promises no-JS; no-JS block removed, product-detail e2e 9/9 green) Write failing Playwright tests in apps/web/e2e/product-detail.spec.ts, starting with `// covers AC2, AC4, AC5, AC6, AC7, AC8, AC9, T10`. They need the seeded DB.
  - **Raw HTML:** for `request.get("/product/stride-glide-road-shoe")`, the raw HTML already contains the name, `$` + the price, the description and every size label.
  - **In-stock shoe:**
    - 15 size radios, none checked
    - a sold-out size is disabled
    - selecting an in-stock size with stock > 3 shows `In stock in …`, and one with stock ≤ 3 shows `Only n left in …`
    - the tab title is `Stride Glide Road Shoe · Stride`
    - there is no button named /add to (cart|bag)/i, and no wishlist or quantity control
  - **Sold out:** Thermal Long-Sleeve Top shows the `Out of stock` badge and `Out of stock in every size`, every radio is disabled, and `See other apparel` lands on `/catalog?category=apparel`.
  - **Not found:** `page.goto("/product/does-not-exist")` and `/product/Bad--Slug` both return status 404 and show the not-found H1.
  - **Catalog link:** clicking a card on /catalog lands on `/product/<slug>` and shows that product's H1.
  - **No JS:** remove the `test.use({ javaScriptEnabled: false })` block; AC4 no longer promises a page that works without JS (spec change 2026-10-18).
  - Read the expected sizes and stock from the seeded data through the page rather than hard-coding the Glide stock map. (testing skill)

## API

- [x] T11 Add packages/shared/src/catalog/product-detail.ts with:
  - `productSlugSchema`: `z.string().max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)`
  - `productDetailResponseSchema = catalogProductSchema.extend({ description, techNote: z.string().nullable(), variants: z.array(z.object({ size, stock: z.number().int().nonnegative() })) })`, strict like `catalogProductSchema`
  - `LOW_STOCK_THRESHOLD = 3`
  - the pure function `stockMessage(variant | null)`
  - the inferred `ProductDetail` and `ProductVariantStock` types

  No Prisma import. Add `export * from "./product-detail";` to packages/shared/src/catalog/index.ts (wiring edit). T3 goes green.
- [x] T12 In apps/api/src/catalog/catalog.service.ts (wiring edit), extract product-catalog's row → `CatalogProduct` mapping into an exported `toCatalogProduct(row)`, with no behaviour change. Keep it in place if it's already exported. product-catalog's catalog.service.test.ts must stay green.

  Then add apps/api/src/catalog/product-detail.service.ts with `ProductDetailService.getBySlug(slug)`:
  - one `product.findUnique({ where: { slug }, select })`, with the T4 select
  - `toCatalogProduct` for the base fields, plus `description`, `techNote` and `variants`
  - `soldOut` derived from the variants
  - `null` when the row is missing (AC1)

  T4 goes green.
- [x] T13 Edit apps/api/src/catalog/catalog.controller.ts (wiring edit). Add `@Get("products/:slug")` with no guard:
  - if `productSlugSchema.safeParse(slug)` fails, throw `NotFoundException` without calling the service
  - if the service returns `null`, throw `NotFoundException`
  - otherwise return the product

  Register `ProductDetailService` in the providers of apps/api/src/catalog/catalog.module.ts (wiring edit). The existing SecurityHeaders → ProxySecret → OriginCheck chain applies unchanged (AC1). T5 and T6 go green.

## Web

- [x] T14 Add apps/web/src/features/product/load-product.ts, following load-catalog-products.ts and the T2 outcome. `loadProduct(slug)`:
  - returns `null` without a request when `productSlugSchema` fails
  - calls `apiFetch("/catalog/products/" + slug)` with `cache: "no-store"`
  - returns `null` on 404 and throws on any other non-200
  - parses the body with `productDetailResponseSchema`

  Then add apps/web/src/app/product/[slug]/page.tsx (AC2, AC3, AC7, AC8). The loader half of T9 goes green.
  - `generateMetadata` returns the title `<Name> · Stride`.
  - The page calls `loadProduct`, then `notFound()` on `null` as a fallback; the 404 status comes from the proxy check in T17.
  - Add `generateStaticParams` to the `[slug]` route; the T2 spike found the build fails without it.
  - The layout follows Product.dc.html and MobileProduct.dc.html: the breadcrumb, then a 4:5 art well with a single ProductArt next to an `md:sticky` info column, stacking at ≤760px.
  - `apps/web` imports no Prisma.
- [x] T15 Add these Server Components in apps/web/src/features/product/. They reuse `ProductArt` and `formatPriceCents` from features/catalog, and take Badge and Price styling from the design-system bundle.css and apps/web/src/styles/tokens.css. T8 goes green.
  - **ProductBreadcrumb.tsx:** the category name comes from `CATEGORY_LABELS` (AC3).
  - **ProductInfo.tsx** (AC3, AC6):
    - an optional `Out of stock` badge, then the H1, subtitle, Price and guidance-tag badge
    - the shipping box
    - the `details`/`summary` accordion: `Description` open, plus `Details` only when there is a `techNote`, shown exactly as stored (the seeded notes already start `For the technical crowd: `)
  - **SoldOutNotice.tsx** (AC6).

  In page.tsx, when `soldOut` is true:
  - dim the art
  - make the info column non-sticky
  - render SoldOutNotice
  - pass `disabled` to the purchase panel
- [x] T16 Add these Client Components (`"use client"`) in apps/web/src/features/product/ (AC4, AC5, AC8). Match the SizePicker in stride-design/design-system (bundle.js:152–166, bundle.css:57–64). T7 goes green.
  - **SizePicker.tsx:** a radio fieldset with controlled `value`/`onChange` and no default selection.
    - Sold-out sizes are `disabled`, carry a visually hidden `, sold out` and use the hatched, crossed-out chip.
    - The chip grid is styled with Tailwind and the tokens.
    - Without JS it renders as plain radios.
  - **ProductPurchasePanel.tsx:** owns `selectedSize` and renders, in order:
    - the SizePicker
    - a `<p aria-live="polite">` showing `stockMessage(selectedVariant)`, muted when nothing is selected and in the warning colour for low stock
    - `actions?.(selectedSize)`, with a comment noting that cart-checkout and account-wishlist plug into `actions`

  Wire `<ProductPurchasePanel variants={…} disabled={soldOut} />` into page.tsx, with no `actions`.
- [x] T17 (2026-10-18: curl -i on next start: does-not-exist → 404, Bad--Slug → 404, stride-glide-road-shoe → 200; product-detail e2e 9/10, T9 green. The no-JS case stays red: Suspense-streamed content is hidden without JS (AC4 vs the page's Suspense), same conflict as product-catalog T22; resolved by the 2026-10-18 spec change, T10 reopened to drop the case. Wiring edits: proxy.ts, proxy.test.ts, components/ui/Button.tsx (exports buttonClassName for the Link CTAs)) Add apps/web/src/app/product/[slug]/not-found.tsx following NotFound.dc.html, scoped to the product route (AC7). The app-wide not-found page stays with launch-polish. T9 and T10 go green. The page has:
  - the eyebrow `Page not found` and the H1 `This path doesn't go anywhere`
  - the body copy
  - `Browse the catalog` (`/catalog`, primary) and `Back to home` (`/`, secondary), using the existing Button styles
  - a decorative `aria-hidden` ProductArt shoe

  Add the proxy 404 check to apps/web/src/proxy.ts (wiring edit). For `GET /product/<slug>`:
  - check the slug with `productSlugSchema`, then check it exists via the API
  - on a miss, return the rendered not-found HTML with status 404, fetched internally with `WEB_PROXY_SECRET` so it can't be bypassed or loop

  Add cases to apps/web/src/proxy.test.ts:
  - a malformed slug → 404 with no API call
  - an unknown slug → 404
  - a known slug → passes through
  - a forged bypass header without the secret is ignored

## Wiring (wiring edits)

- [x] T18 (reviewed 2026-10-18: every file outside Covers is a listed wiring edit — barrel, toCatalogProduct + CatalogProductRow, controller + module, catalog.controller.test.ts, proxy.ts + proxy.test.ts (T2 chose the proxy). One unlisted wiring edit: apps/web/src/components/ui/Button.tsx now exports `buttonClassName` (no behaviour change to Button), used by the not-found page's Link CTAs. ProductCard untouched) Review the wiring edits against the spec's Covers list:
  - the barrel (T11)
  - `toCatalogProduct` (T12)
  - the controller and module (T13)
  - catalog.controller.test.ts (T5)
  - proxy.ts and proxy.test.ts (T17), only if T2 chose the proxy option

  Make no other edits to product-catalog or catalog-foundation files. In particular, ProductCard already links to `/product/<slug>`, so it needs no change.

## Docs

- [x] T19 Edit the `product-detail` candidate line in softwareos/products/stride/epics/catalog-search/tech-plan.md so it covers:
  - /product/[slug], server-rendered, with a single ProductArt instead of images (`imageUrl` unused)
  - the guidance tag, a native-radio size selector, per-size stock with "Only n left" at ≤ 3, and a fully sold-out state
  - a not-found page scoped to the route, returning a real 404 (name the T2 approach)
  - `GET /catalog/products/:slug`: public, behind the proxy secret only
  - no add-to-cart or wishlist; `ProductPurchasePanel` `actions(selectedSize)` is the slot for cart-checkout and account-wishlist
- [x] T20 (2026-10-18: edited — the proxy-level 404 check is a new pattern; architecture.md's Proxy / middleware bullet now lists it as job (3)) Check softwareos/products/stride/architecture.md. Edit it only if the T2 outcome adds a pattern, such as a cached public fetch without request headers or a proxy-level 404 check. Otherwise leave it unchanged and record "no change needed" in the PR.

## Verification

- [x] T21 (2026-10-18, TEST_DATABASE_URL = apps/api/.env DB: typecheck green; npm test 800/800, 0 skipped; e2e 40 passed, 1 failed; covers comments on every new test file, incl. the T5 block; no @prisma import in apps/web/src (one hit is the ESLint rule's test fixture string); curl -i on next start: does-not-exist 404, Bad--Slug 404, stride-glide-road-shoe 200, thermal-long-sleeve-top 200. Waived by the user in setup mode, both outside this spec: catalog.spec.ts:124 no-JS test (product-catalog T22) and a Prettier issue in packages/shared/src/account-security/index.ts (accounts-auth, 7daebd4)) Run the full suites green:
  - `npm run lint` and `npm run typecheck`
  - `npm test` (shared + api + web), with `TEST_DATABASE_URL` set to a seeded DB so T6 and the existing db tests run
  - `npm run test:e2e` locally against a seeded DB, so T10 goes green and every existing e2e spec, including catalog.spec.ts, still passes

  Also check that:
  - every new test file has its `covers AC<n>, T<n>` comment
  - `grep -r "@prisma" apps/web/src` finds nothing
  - `curl -i` on `/product/does-not-exist` returns 404 (testing skill)
- [x] T22 (2026-10-18: PASS WITH NOTES after hotfix e6cdb54 — see qa-report.md) Run QA against acceptance criteria AC1–AC9 (qa skill).
  - Compare `/product/stride-glide-road-shoe`, `/product/thermal-long-sleeve-top`, `/product/does-not-exist`, and the 375px and ≤760px layouts against Product.dc.html, ProductSoldOut.dc.html, MobileProduct.dc.html and NotFound.dc.html.
  - Check keyboard and screen-reader behaviour of the size fieldset and the live stock line.
  - Check that there is no add-to-cart, quantity or wishlist control.
  - Check that the diff touches only the Covers list plus the wiring edits listed in T18–T20.
