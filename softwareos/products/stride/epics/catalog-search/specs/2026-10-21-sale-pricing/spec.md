# Sale Pricing

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/sale-pricing
> Covers: apps/web/src/features/pricing/**, apps/web/e2e/sale-pricing.spec.ts

## Overview

Shoppers see the sales admins set in the CMS (`cms/admin-catalog/2026-10-21-product-discounts`). A product on sale shows its sale price, the regular price struck through and a "−N%" badge, on catalog cards (`/catalog`, the home featured rail) and on `/product/[slug]`. Price sort and the min/max price filter use the price the shopper pays (`Product.effectivePriceCents`), so a $110 shoe on sale for $88 sorts and filters as $88.

It extends product-catalog (`GET /catalog/products`, `catalogProductSchema`, `ProductCard`) and product-detail (`GET /catalog/products/:slug`, `ProductInfo`) with minimal edits; their AC3/AC4 and AC3 were amended on 2026-10-21 to match. The new price display lives in its own `features/pricing/` folder so cards and the product page share it.

It depends on `product-discounts` being merged first (the `salePriceCents`/`effectivePriceCents` columns and `@stride/shared`'s `percentOff`).

**Deploy order.** `catalogProductSchema` is a strict object that the web parses, so a web build that predates this spec rejects a response carrying `salePriceCents`. Per the architecture's deploy-order rule, this spec ships as two PRs: **PR 1** makes the shared schema accept an optional `salePriceCents` and teaches the web to render it; **PR 2** makes the API send it and switches sort and filter to `effectivePriceCents`.

It serves these parts of the epic:
- a new brief story: "see when a product is on sale and how much I save"
- the success criteria "search, every filter and sort work alone and combined" and "prices are stored as integer cents and shown as USD"

## Goals & User Stories

- As a shopper, I see at a glance which products are on sale, the sale price, the old price and the % off, on the catalog and the product page
- As a shopper, sorting by price and filtering by a price range use the price I'd actually pay
- As a shopper using a screen reader, I hear the current price first and the old price announced as "was"

## Acceptance Criteria

1. AC1: `catalogProductSchema` (and so `productDetailResponseSchema`) gains `salePriceCents` (positive integer or null). In PR 1 the field is optional and the web treats a missing value as null; PR 2 makes it required.
2. AC2: `GET /catalog/products` and `GET /catalog/products/:slug` return `salePriceCents` for every product (null when not on sale). `priceCents` stays the regular price.
3. AC3: `sort=price-asc`/`price-desc` order by `effectivePriceCents`, ties by name A–Z. `min`/`max` are inclusive on `effectivePriceCents` (`min*100 ≤ effectivePriceCents ≤ max*100`). Facet counts apply the same price range. `featured` is unchanged.
4. AC4: A `PriceTag` component renders, for a product on sale: the sale price (USD, Stride's sale/accent token) carrying `data-price`; the regular price in an `<s>` carrying `data-regular-price`, preceded by visually hidden "Was"; and a "−N%" badge from `percentOff`. For a product not on sale it renders exactly what the card and page show today (`data-price` with the regular price), so existing tests keep passing.
5. AC5: `ProductCard` and `ProductInfo` render `PriceTag` in place of the plain price. The layout matches today's at 375px and 1280px with no horizontal scroll; a long struck-through price wraps under the sale price on cards rather than overflowing.
6. AC6: After an admin sets or removes a sale in the CMS, `/catalog`, the home featured rail and `/product/[slug]` show it on the next request, with no deploy and no revalidation (storefront reads are `no-store`).
7. AC7: The existing catalog, product-detail, home and shopping-journey e2e suites pass unchanged. No seeded product is on sale, so the seeded `data-price` values and the catalog's price-sort assertions hold.

## Technical Approach

- **Shared (`packages/shared/src/catalog/query.ts`):** add `salePriceCents: z.number().int().positive().nullable()` to `catalogProductSchema` (`.optional()` in PR 1). `productDetailResponseSchema` extends it, so it needs no edit.
- **API (`apps/api/src/catalog/`):** in `catalog.service.ts`, add `salePriceCents` to `PRODUCT_SELECT`, switch `ORDER_BY`'s price entries and `baseWhere`'s range to `effectivePriceCents`, and map the field in the response. `product-detail.service.ts` selects and maps `salePriceCents`. Both are minimal edits to product-catalog and product-detail code; the `effectivePriceCents` index from product-discounts backs the sort.
- **Web (`apps/web/src/features/pricing/`):**
  - `PriceTag.tsx`: a Server Component taking `{ priceCents, salePriceCents, size: "card" | "hero" }`. It reuses `formatPriceCents` from `features/catalog` and `percentOff` from `@stride/shared`.
  - `ProductCard.tsx` and `ProductInfo.tsx` swap their price element for `<PriceTag>` (minimal edits).
  - The struck-through price and badge use existing Stride tokens; if there is no sale token yet, add one to the web theme next to the existing accent colours.
- **Tests:**
  - shared schema tests (null, a number, missing in PR 1, rejected 0)
  - `catalog.service.test.ts` / `catalog.db.test.ts` (Rollback pattern): a product put on sale inside the transaction sorts and filters by its sale price, and facet counts follow
  - `product-detail.service.test.ts`: `salePriceCents` mapped
  - `PriceTag.test.tsx`: both branches, `data-price` on the paid price, "Was" text, badge value
  - e2e `apps/web/e2e/sale-pricing.spec.ts` in the `admin-writes` project: an admin creates a throwaway product, sets a sale in the CMS, then sees the sale price, struck price and badge on `/catalog?q=<name>` and `/product/[slug]`, and sees it sort by the sale price within its search results; removes the sale and sees the plain price again. `afterAll` deletes the product.

## Out of Scope

- Setting sales, the schema and the admin API (`cms/admin-catalog/2026-10-21-product-discounts`)
- An "On sale" filter, a sale sort or a sale landing page
- Sale prices in the cart, checkout and order history (`cart-checkout`; its cart AC5 and checkout-order AC13 read `effectivePriceCents`)
- Scheduled sales and countdowns
- Coupons and promo codes

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md): integer cents shown as USD, shared Zod schemas, Server Components read from the API, no Prisma in web
- [global/auth-security](../../../../../../standards/global/auth-security.md): the catalog reads stay public behind the proxy secret, no new endpoint
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-21 | david-schwartzman | created | Initial shaping — storefront half of product discounts | [product-discounts](../../../../../cms/epics/admin-catalog/specs/2026-10-21-product-discounts/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
