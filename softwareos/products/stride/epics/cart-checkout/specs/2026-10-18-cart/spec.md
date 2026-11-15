# Cart

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/cart-checkout/cart
> Covers: /cart, /api/cart/*, apps/api/src/cart/**, apps/web/src/features/cart/**, apps/web/src/app/cart/**, packages/shared/src/cart/**, apps/web/e2e/cart.spec.ts

## Overview

The logged-in shopping cart. Shoppers add a product in a chosen size from the product page and see it on /cart. There they can change the quantity (+/-) or remove it, and they see the subtotal, shipping and total. An empty cart shows an empty state, and the header shows the item count. The cart is stored in the database (Cart / CartItem) and served by a new NestJS `cart` module. Totals and shipping come from one shared function that checkout-order will reuse.

This spec serves the cart-checkout success criteria for logged-in shoppers:
- add, quantity and remove work in the DB cart
- shipping is $5 under $75 and free at $75 or more
- all money is in integer cents
- quantities are capped at stock

It is the "cart" step of the mission's landing → … → confirmation flow, which should take under 3 minutes. The guest cookie cart and merge-on-login belong to **guest-cart-merge**. Until that ships, signed-out shoppers are asked to log in.

Depends on:
- accounts-auth/api-foundation, auth-api-migration and protected-routes: the Nest API, `AuthGuard`, `@CurrentUser()`, `apiFetch` and the `/api` rewrite
- accounts-auth/header-account-menu: the current `HeaderSession` (owner of that file), which keeps a `cartCount` slot for this spec
- accounts-auth/security-headers: `lib/private-paths.ts`
- catalog-search/product-detail: the product page and the `ProductPurchasePanel` `actions(selectedSize)` slot
- catalog-search/sale-pricing and admin-catalog/product-discounts: `Product.salePriceCents`, the trigger-kept `effectivePriceCents`, and `PriceTag`
- admin-catalog/product-visibility: `Product.isActive`
- admin-catalog/product-images: `Product.imageUrl` and `ProductImage`

## Goals & User Stories

- As a logged-in shopper, I can add a product in a chosen size to my cart from the product page.
- As a shopper, I can change quantities (+/-) and remove items, and I see the subtotal, shipping and total.
- As a shopper with an empty cart, I see an empty state with a link back to the catalog.
- As a shopper, I can't put more of a size in my cart than is in stock.
- As a shopper, I see how many items are in my cart in the header from any page.
- As a shopper, I pay the sale price I saw on the product page, and the cart shows it the same way.
- As a signed-out shopper (until guest-cart-merge), I'm prompted to log in instead of losing what I add.

## Acceptance Criteria

1. AC1: On /product/[slug], a logged-in shopper who picks an in-stock size and clicks "Add to cart" gets that variant added to their DB cart with qty 1. The request sends the product slug and the picked size; the API resolves the variant. Adding the same variant again increases its quantity; it does not create a second line. The button stays disabled until a size is picked, and is disabled for sold-out sizes and sold-out products.
2. AC2: A signed-out shopper who clicks "Add to cart" is sent to /login?callbackUrl=<product page>, using a validated callback. A signed-out shopper who opens /cart is sent to /login?callbackUrl=/cart the same way: /cart is on the protected list (protected-routes AC1), and the page also redirects on a 401. Because /cart is per-shopper, it is served `Cache-Control: private, no-store` (private-paths list), redirect included.
3. AC3: /cart lists each line with the product image (`ProductImage`, which falls back to the art), name, size, unit price, a quantity stepper, Remove and the line total (price × qty). The unit price uses `PriceTag`, so a sale line shows the sale price and the struck "Was" price as on the product page. It matches the stride-design `Cart` and `MobileCart` (375px) pages.
4. AC4: The quantity stepper changes a line's quantity between 1 and min(10, stock). At the cap, + is disabled and an "Only N left" note shows. Remove deletes the line. Totals and the header count update without a full reload.
5. AC5: Subtotal = Σ current unit price × qty, where the unit price is `Product.effectivePriceCents` (the sale price when set, else the regular price). Shipping = 500¢ when the subtotal is under 7500¢, otherwise 0. Total = subtotal + shipping. All amounts are integer cents, formatted as USD. Under $75, an "Add $X more for free shipping" hint shows.
6. AC6: Prices are always read from the DB at request time. Nothing price-related is stored in CartItem, so a sale starting or ending changes the next cart read.
7. AC7: The API returns 400 `{ fieldErrors }` when an add or set-quantity would exceed the variant's stock or 10, or when the slug or size is unknown or the product is inactive (`isActive = false`, catalog-foundation hides products instead of deleting them). If stock later drops below a line's quantity, /cart shows that line with the "Only N left" note; checkout-order blocks the order.
8. AC8: An empty cart shows the stride-design `CartEmpty` state with a "Browse the catalog" link to /catalog. The Checkout button is hidden.
9. AC9: The header cart badge shows the total item quantity for a logged-in shopper. It is hidden when the count is 0 or the shopper is signed out.
10. AC10: Every cart endpoint requires a session (AuthGuard) and takes the userId only from the session. A shopper can never read or change another shopper's cart: set-quantity or remove on a variant that isn't in the caller's cart returns 404 and changes nothing. Mutations are POST-only and must pass the Origin check.
11. AC11: A line whose product became inactive after it was added stays in the cart and shows on /cart as "No longer available": no stepper, only Remove. It is left out of the subtotal, shipping, total and the header count. checkout-order blocks the order until it is removed. A line whose size or product an admin deletes disappears with it (cascade), without a notice.
12. AC12: Cart endpoints use the existing `AuthGuard`, which never sets or clears the session cookie on a 401. A cart call still in flight with an old token that lands after the shopper logs in again gets a plain 401 and doesn't log them out. A regression test pins this.

## Technical Approach

- **Data (wiring edit to `apps/api/prisma/schema.prisma`):**
  - `Cart { id cuid, userId String @unique → User onDelete Cascade, items CartItem[], createdAt, updatedAt }`
  - `CartItem { id cuid, cartId → Cart onDelete Cascade, variantId → ProductVariant onDelete Cascade, quantity Int, createdAt, updatedAt, @@unique([cartId, variantId]) }`
  - back-relations on User and ProductVariant
  - Migration, following the product-visibility recipe (the shared dev DB is the demo DB, so never `migrate dev`, `migrate reset` or a real DB as `--shadow-database-url`): generate SQL with the read-only `prisma migrate diff --from-schema-datasource … --to-schema-datamodel … --script`, hand-write it as `<timestamp>_cart/migration.sql` with a named `CHECK ("quantity" >= 1)`, apply with `prisma migrate deploy`. `migrate reset` only against a throwaway `TEST_DATABASE_URL`.
- **Shared (`packages/shared/src/cart/`):**
  - request schemas (`z.strictObject`): `addCartItemSchema { slug: productSlugSchema, size, quantity? 1..10 default 1 }` and `setCartItemQuantitySchema { quantity int 1..10 }`. Add takes slug + size, not `variantId`, so product-detail's strict response schema stays untouched and there is no web/API deploy-order hazard.
  - `cartLineSchema` (variantId, slug, name, size, art, imageUrl nullable, priceCents, salePriceCents nullable, unitPriceCents, quantity, lineTotalCents, stock, available), where `unitPriceCents` is `effectivePriceCents` and `available` is false for an inactive product
  - `cartResponseSchema { lines, itemCount, subtotalCents, shippingCents, totalCents, freeShippingRemainingCents }`
  - constants `MAX_LINE_QTY = 10`, `FREE_SHIPPING_THRESHOLD_CENTS = 7500`, `FLAT_SHIPPING_CENTS = 500`
  - a pure `calculateCartTotals(lines)` that skips `available: false` lines, which checkout-order reuses
  - re-export from `packages/shared/src/index.ts` (wiring edit)
- **API (`apps/api/src/cart/`):** `CartModule` imports AuthModule and is registered in `app.module.ts` (wiring edit). The controller is `@Controller("cart") @UseGuards(AuthGuard)` and reads the user with `@CurrentUser()`. No auth-module change: `AuthGuard` already never clears the cookie on a 401 (AC12). Routes:
  - `GET /cart` → `CartResponse`; a missing cart counts as empty
  - `GET /cart/count` → `{ itemCount }`
  - `POST /cart/items`: resolve `{ slug, size }` to a variant via `@@unique([productId, size])`, then add or increment, as an upsert on `[cartId, variantId]`
  - `POST /cart/items/:variantId/quantity`
  - `POST /cart/items/:variantId/remove`

  `CartService` uses `PrismaService`, with `CART_SELECT … satisfies Prisma.CartSelect` (product `effectivePriceCents`, `priceCents`, `salePriceCents`, `imageUrl`, `art`, `isActive`; never write `effectivePriceCents`) and a row mapper, following the catalog service. Validation goes through `ZodBodyPipe`; errors are Nest exceptions or 400 `{ fieldErrors }`; a variant not in the caller's cart is `NotFoundException` (404, per auth-security). `addItem` runs in a `$transaction`: upsert, re-check stock and `isActive`, roll back if over the limit or inactive. POST-only is a cart choice; the standard also allows DELETE.
- **Web (`apps/web/src/features/cart/`, `app/cart/page.tsx`):**
  - `app/cart/page.tsx` keeps a static "Your cart" heading and renders the per-request part inside `<Suspense>` with a skeleton (`cacheComponents: true`). That part loads `GET /cart` via `apiFetch` with `cache: "no-store"`, and treats a 401 as signed out.
  - `/cart` joins `PRIVATE_PREFIXES` in `lib/private-paths.ts` (wiring edit, owned by security-headers), not `PROTECTED_PREFIXES`.
  - Client components (`CartLineItem`, `QuantityStepper`, `RemoveButton`, `OrderSummary`) POST to `/api/cart/…` through a `post-cart.ts` helper, parse the reply with the shared schemas, then call `router.refresh()`. `CartLineItem` renders `ProductImage` and `PriceTag` (a line-sized `PriceTag` variant, if needed, is a wiring edit to `features/pricing`, owned by sale-pricing).
  - `AddToCartButton` takes `{ slug, size, disabled }`. The product page is a Server Component and can't pass the `actions` render prop, so a client wrapper `features/cart/ProductPurchaseWithCart.tsx` renders `ProductPurchasePanel` with `actions={(size) => <AddToCartButton … />}`, and `app/product/[slug]/page.tsx` renders the wrapper instead of `ProductPurchasePanel` + `AddToCartLink` (wiring edit). The `AddToCartLink` placeholder and its test are deleted. On a 401 the button redirects via `buildLoginUrl`.
  - `HeaderSession.tsx` (owned by header-account-menu): after `getCurrentSession()` returns a user, fetch `/cart/count` and pass `cartCount` to `Header`, keeping `account` as is (wiring edit to `features/session`).
  - `formatPriceCents` and `ProductArt` are imported from `features/catalog`, not moved.
- **Tests (TDD):**
  - API: `cart.service.test.ts` and `cart.controller.test.ts` (AppModule over HTTP, fake Prisma, `// covers ACn, Tn`), plus `cart.db.test.ts` (skipIf no `TEST_DATABASE_URL`, unique user, cascade cleanup)
  - Shared: unit tests for `calculateCartTotals` at the 0 / 7499 / 7500 boundaries
  - Web: component tests
  - E2E: Playwright `apps/web/e2e/cart.spec.ts` (stays in the `chromium` project; it changes no products or stock)
  - Update the tests that pin today's placeholder: the product-detail e2e "add to cart goes to the 404 page", `AddToCartLink.test.tsx`, `not-found.spec.ts` (uses `/cart` as an unmatched URL) and `private-paths.test.ts` (asserts `/cart` is public).
- **PRs:** stacked, each ≤ 18 files, per tasks.md: docs first, then shared + API (the API ships first), then the /cart page, then add to cart + header count + e2e.

## Out of Scope

- Guest cookie cart and merge-on-login (guest-cart-merge)
- Checkout, address, payment, order creation and stock decrement (checkout-order). The Checkout button links to `/checkout`, which returns a 404 until that spec ships.
- A cart drawer (page only), wishlist move-to-cart (account-wishlist), taxes, coupons
- Reserving stock while items sit in the cart
- A notice when an admin deletes a carted size or product (the line just disappears)
- Sale styling on cart lines beyond `PriceTag` (the `Cart` design has no sale line; reuse the product page's treatment)

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard on all cart endpoints, userId from the session, 404 for a line the caller doesn't own, POST-only mutations and the Origin check
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): Prisma only in the API, shared Zod in packages/shared, web never imports Prisma, API ships first and stays backward-compatible
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-21 | david-schwartzman | change | AC7 + AC11: inactive products are rejected like unknown variants, and an already-carted inactive line shows "No longer available" with only Remove and is left out of totals; AC12: cart 401s never clear the session cookie (`@KeepSessionCookie()`), settling the tech-plan's stale-response cookie race; T4/T5/T7/T10/T11/T12/T13/T15/T19/T21 updated, T5 and T21 foreign Origin → 401 — PR #58 review | https://github.com/david-schwartzman/Stride/pull/58 |
| 2026-10-25 | david-schwartzman | change | Prices from `effectivePriceCents` with `PriceTag` and `ProductImage` on lines (AC3, AC5, AC6); add sends `{ slug, size }`, T1.1 cancelled (AC1); AC12 reworded and `@KeepSessionCookie()` dropped, since `AuthGuard` never clears the cookie; not-owned line → 404 (AC10); admin-deleted lines vanish (AC11); /cart `Cache-Control: private` (AC2); client wrapper for the `actions` slot, Suspense page, safe migration recipe, placeholder tests, HeaderSession owner, new dependencies, e2e in Covers, stacked PRs — Drift audit 2026-10-25: shaped before sale-pricing, product-discounts, product-visibility, product-images and header-account-menu landed; AuthGuard never cleared the cookie | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
| 2026-10-26 | david-schwartzman | change | AC2: /cart now redirects a signed-out shopper to login like "Add to cart" does, instead of a public empty state with a "Log in to see your cart" link, so both entry points agree for the demo (until guest-cart-merge) | — |
