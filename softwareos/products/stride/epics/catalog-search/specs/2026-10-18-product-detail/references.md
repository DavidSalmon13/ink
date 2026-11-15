# References for Product Detail

## Related Specs

- **[Considered]** [2026-10-18-catalog-foundation](../2026-10-18-catalog-foundation/spec.md): its globs `apps/api/src/catalog/**` and `packages/shared/src/catalog/**` match this spec's `product-detail.*` files. The match was dismissed in Step 4d, because foundation owns the data layer: models, variants with `sortOrder`/`stock`, size sets, catalog data and the seed. Its Out of Scope section hands "Catalog API endpoints and response schemas (product-catalog, product-detail)" to other specs.
- **[Considered]** [2026-10-18-product-catalog](../2026-10-18-product-catalog/spec.md): its spec mentions `/product/[slug]` only as the target of its card links, and lists the page as out of scope. This match was also dismissed in Step 4d. This spec reuses product-catalog's `ProductArt`, `formatPriceCents`, `catalogProductSchema` and row mapping (`toCatalogProduct`). It adds its route to `catalog.controller.ts` as a wiring edit.

## Upstream Meeting

None.

## Similar Implementations

### Design handoff: the product page

- **Location:** `stride-design/pages/Product.dc.html`, `ProductSoldOut.dc.html`, `MobileProduct.dc.html`, `NotFound.dc.html`. HANDOFF.md:23 maps Product and ProductSoldOut to `/product/[slug]`. These are visual references to rebuild, not code to copy.
- **Relevance:** the layout, copy, size picker, stock line and sold-out state that AC3–AC7 are checked against.
- **Key patterns:**
  - **Breadcrumb** (P:28–30): `Shop / <Category> / <Name>`. The last item is plain text.
  - **Layout:**
    - The page is a flex-wrap split: the gallery is `flex 999 1 520px` and the info column is `flex 1 1 360px; max-width 460px`.
    - The info column is sticky at `top: 120px` (P:40). It isn't sticky on the sold-out page (SO:40).
    - At ≤760px the sticky positioning is removed (P:19).
  - **Info order** (P:41–94): H1 (display 44/800 uppercase), subtitle, `Price size="lg"`, guide badge, size picker with the stock line, then the CTA row and wishlist (both omitted here), the shipping box, and the `<details>` accordion with Description open by default. The tech note sits inside the collapsed details (P:92).
  - **Stock line** (P:124–125), shown as `aria-live` text:
    - nothing selected: "Sold-out sizes are crossed out."
    - stock ≤ 3: "Only {n} left in US {size}"
    - otherwise: "In stock in US {size}"
  - **Sold-out page** (SO:42–63):
    - guide and neutral `Out of stock` badges above the H1
    - art dimmed to 0.7
    - every chip disabled
    - a `role="status"` box reading "Out of stock in every size"
    - a disabled "Out of stock" CTA (omitted here)
    - the link "See other apparel in stock"
  - **Not-found page** (NotFound:26–33):
    - eyebrow "Page not found"
    - H1 "This path doesn't go anywhere"
    - body copy
    - "Browse the catalog" (accent) and "Back to home" (outline) buttons
    - a decorative white shoe ProductArt with `view="angle"`

### Design handoff: components

- **SizePicker:** `index.d.ts:29–37`, `bundle.js:152–166`, `bundle.css:57–64`.
  - It renders a fieldset and legend with `role="radio"` chips. Chips are 48px tall, laid out with `auto-fill minmax(56px,1fr)` up to `max-width: 400px`.
  - A sold-out chip is `disabled`, has `aria-label "<size>, sold out"`, a line-through and a 135° hatch.
  - This spec uses native radios instead, which keeps the same look and works with a keyboard and screen readers.
- **Price:** `index.d.ts:16–24`, `bundle.css:40–44`. The `lg` size is 28px/700 with tabular numerals.
- **Badge:** `index.d.ts:13`, `bundle.css:31–37`. `guide` is volt-soft; neutral is uppercase 12px.
- **ProductArt:** `index.d.ts:70–81`. It supports views (full/zoom/angle/back); this spec renders a single view.

### Product-catalog (shaped, not built yet)

- `apps/api/src/catalog/catalog.controller.ts`, `catalog.service.ts` (row → `CatalogProduct`) and `catalog.module.ts`
- `packages/shared/src/catalog/query.ts`: `catalogProductSchema` and the URL slug maps
- `apps/web/src/features/catalog/ProductArt.tsx`, `ProductCard.tsx`, `format-price.ts` and `load-catalog-products.ts` (the loader pattern)

### Existing code patterns

- `apps/web/src/app/account/security/page.tsx`: page-local loader with `apiFetch(..., { cache: "no-store" })`, non-200 throws, Zod parse.
- `apps/web/src/lib/api-client.ts`: `apiFetch` is server-only and reads `headers()`. That matters for the T2 404 spike.
- `apps/web/next.config.ts`: `cacheComponents: true`. There is no `not-found.tsx` or `error.tsx` in `apps/web/src/app` yet.
- `apps/api/src/auth/testing/fake-db.ts`, `apps/api/src/auth/session.db.test.ts`, and the controller HTTP tests in `account-security.controller.test.ts`.
- `apps/web/e2e/` and `apps/web/playwright.config.ts`.

## Wiring edits (files other specs own)

- `packages/shared/src/catalog/index.ts` (catalog-foundation)
- In `apps/api/src/catalog/` (product-catalog):
  - `catalog.service.ts` (export `toCatalogProduct`)
  - `catalog.controller.ts`
  - `catalog.controller.test.ts`
  - `catalog.module.ts`
- Conditional on the T2 outcome: `apps/web/src/proxy.ts` and `proxy.test.ts` (protected-routes), or `apps/web/src/lib/api-client.ts` (api-foundation). Either one would also be recorded with `/spec-changes`.
- `softwareos/products/stride/epics/catalog-search/tech-plan.md`; `softwareos/products/stride/architecture.md` (only if T2 adds a pattern)

## Deliberate deviations and design drift

- **Single art, no gallery:** the design shows a 4-view ProductArt gallery. This spec renders one ProductArt, by the user's decision at alignment.
- **Content dropped for lack of data:** the "Why it's good for beginners" bullets and the "Details, in plain words" table. The data has only `description` and `techNote`.
- **Sold-out link:** the design's "See other apparel in stock" becomes "See other `<category>`", because the catalog can't filter by stock.
- **Sold-out wishlist line:** "Save it to your wishlist and check back soon." is dropped until account-wishlist exists.
- **Cart and wishlist controls:** the CTA, quantity stepper and wishlist button are omitted. `ProductPurchasePanel`'s `actions(selectedSize)` slot is where they plug in later. The SizePicker README says "Add to bag" while the page says "Add to cart"; cart-checkout settles the label.
- **Stock line copy:** the design writes "US {size}". Variant labels already include "US" for shoes, so the copy uses the label as-is ("Only 2 left in US 9", "In stock in M").
- **404 status risk:** with `cacheComponents`, `notFound()` after streaming starts returns 200 + `noindex`. T2 settles how to return a real 404.
