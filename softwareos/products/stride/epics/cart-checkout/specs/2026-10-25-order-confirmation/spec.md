# Order Confirmation

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/cart-checkout/order-confirmation
> Covers: /checkout/confirmation/[orderId], /api/orders/:id, apps/web/src/app/checkout/confirmation/**, apps/web/src/features/order-confirmation/**, apps/web/e2e/purchase-journey.spec.ts

## Overview

The last step of the purchase. After "Place order", checkout-order sends the shopper to `/checkout/confirmation/[orderId]`. This spec builds that page and the owner-only API read behind it. The page shows the order number, the items, the totals and where the order ships, all read from the snapshot checkout-order wrote, so later price or catalog changes never alter it. It also adds the Playwright journey from landing to confirmation that the brief requires.

Until this spec ships, that URL returns 404. That's why checkout-order must not go to production first. Shipping this spec lifts that block.

This spec serves these cart-checkout success criteria:
- the confirmation page `/checkout/confirmation/[orderId]` is only viewable by its owner
- Playwright: landing → add to cart → checkout → confirmation passes in CI, well under 3 minutes

It also covers the mission's "confirmation page with order number and summary", the final step of landing → … → confirmation.

Depends on:
- cart-checkout/checkout-order: the `Order` / `OrderItem` models and their snapshot columns, the `apps/api/src/order` module (`OrderController`, `OrderService`, its fake DB), `packages/shared/src/order`, the redirect to `/checkout/confirmation/<orderId>` and the cart refresh that sets the badge to 0, and `apps/web/e2e/checkout.spec.ts`
- cart-checkout/cart: add to cart, /cart, and the cart's product-image line display
- accounts-auth/api-foundation, auth-api-migration and protected-routes: the Nest API, `AuthGuard`, `@CurrentUser()`, `apiFetch`, `requireUser()`, the `/checkout` prefix in `PROTECTED_PREFIXES` (which already covers `/checkout/confirmation/*`), and the login banner
- accounts-auth/security-headers: `lib/private-paths.ts`, so the page is already `private, no-store`
- admin-catalog/product-images: `ProductImage`, which falls back to `ProductArt`

## Goals & User Stories

- As a shopper who just placed an order, I see that it worked, my order number, and when it was placed.
- As a shopper, I see what I bought (name, size, quantity, line price) and the subtotal, shipping and total I paid.
- As a shopper, I see where my order ships and am reminded that nothing was charged.
- As a shopper, I can go straight back to shopping.
- As a shopper, nobody else can open my confirmation page, even with its link.
- As the team, we have one CI test proving a new shopper gets from landing to a confirmed order in well under 3 minutes.

## Acceptance Criteria

1. AC1: `/checkout/confirmation/[orderId]` requires login. A signed-out visit redirects to `/login?callbackUrl=/checkout/confirmation/<orderId>` (the protected-routes guard and banner). After login the shopper lands back on the page. The page is served `Cache-Control: private, no-store`.
2. AC2: For the order's owner, the page matches stride-design `OrderConfirmed.dc.html` at desktop and at 375px, with sections stacking on narrow screens:
   - a dark hero band with a check icon, the h1 "Thanks, <first name>. Order placed.", or "Thanks. Order placed." when the account has no name
   - "Order number #STR-<number> · Placed <Mon D, YYYY>". The number is `Order.number`. The date is `Order.createdAt` in America/New_York.
   - the page title is `Order confirmed · Stride`
3. AC3: An "Order summary" lists one row per OrderItem: the product image, product name, "Size <size> · Qty <qty>" and the line total. Below the rows are Subtotal, Shipping ("Free" when 0) and Total. Every value comes from the Order and OrderItem snapshot columns, never from current product data. After an admin changes the price, deactivates the product, or deletes the variant, the page shows exactly what was ordered. A line whose variant was deleted shows the image placeholder.
4. AC4: The aside shows:
   - **Shipping to**: full name; street and apartment (when set); "City, ST ZIP"; then "Standard shipping · $5, free over $75"
   - **Payment**: "Demo card — nothing was charged"

   No card digits, phone number or other card data appear anywhere on the page.
5. AC5: A "Keep shopping" button links to /catalog. The design's "View in my orders" button is not rendered until account-wishlist ships order history.
6. AC6: `GET /api/orders/:id` requires a session (AuthGuard) and takes the userId only from the session. It returns 200 with the order view: id, number, createdAt, the three cents totals, the shipping name and address, and the items with their snapshots plus image data. It never returns userId, phone or idempotencyKey. Responses are `private, no-store`.
7. AC7: An unknown id, a malformed id (rejected before any DB query) and another shopper's order all get the same 404, never 403. The response body is identical, so it can't reveal that an order exists. `GET /api/orders/checkout` still reaches checkout-order's handler.
8. AC8: When the API returns 404, the web page renders the standard Not Found content and nothing of the order. With cacheComponents this has status 200 + noindex, which is accepted. A 401 from the API redirects to login as in AC1.
9. AC9: `apps/web/e2e/purchase-journey.spec.ts` runs in CI. A new shopper:
   1. signs up and lands on home
   2. opens the catalog and then a seeded in-stock product
   3. picks a size and adds it to the cart, then opens /cart
   4. goes to /checkout, fills a valid address and demo card, and places the order
   5. lands on the confirmation page, which shows `#STR-`, the item and the total, with the header badge at 0

   The measured time for the whole journey is asserted under 3 minutes. A second shopper opening the same URL sees Not Found.
10. AC10: checkout-order's `checkout.spec.ts` success case now asserts the confirmation page instead of the interim 404.

## Technical Approach

- **Shared (`packages/shared/src/order/`, wiring edit in checkout-order's folder):**
  - `orderIdSchema`: the cuid shape used for path params
  - `orderViewSchema`: `{ id, number, createdAt (ISO string), subtotalCents, shippingCents, totalCents, shipTo: { fullName, street, apartment: string | null, city, state, zip }, items: [{ productName, productSlug, size, quantity, unitPriceCents, lineTotalCents, image: <the cart's line image shape> | null }] }`
  - `formatOrderNumber(n)` returns `STR-${n}`
  - all re-exported from the shared index
- **API (`apps/api/src/order/`, wiring edit to checkout-order's controller and service):**
  - `@Get(":id")` on `OrderController`, declared after `@Get("checkout")` so the static route wins
  - `if (!orderIdSchema.safeParse(id).success) throw new NotFoundException()` runs before any query
  - `OrderService.findForUser(userId, id)`: `ORDER_VIEW_SELECT satisfies Prisma.OrderSelect`, then `findFirst({ where: { id, userId } })`, so a foreign or unknown order is null, which becomes a bare `NotFoundException()`
  - `toOrderView` maps the row. The image comes from `item.variant?.product` with the same fields the cart's line mapper uses, or null when `variantId` is null.
  - patterns: `account-security.controller.ts` for the guarded GET and the "never 403" 404; catalog's `product-detail.service.ts` for the select and mapper
- **Web:**
  - `app/checkout/confirmation/[orderId]/page.tsx`: `metadata = { title: "Order confirmed · Stride" }`, a static shell and a `<Suspense fallback={<SpinnerBlock/>}>` child that calls `requireUser(path)`. It follows the `app/account/security/page.tsx` shape. If the build demands `generateStaticParams` for the dynamic segment, use product-detail's T2 solution.
  - `features/order-confirmation/load-order.ts`: `apiFetch(`/orders/${id}`, { cache: "no-store" })`. 401 → `redirect(buildLoginUrl(path))`; 404 → null → `notFound()`; any other non-200 throws; 200 → `orderViewSchema.parse`.
  - `OrderConfirmed.tsx` (hero, summary, aside, actions):
    - the first name is the first word of `MeResponse.name`
    - the date uses `Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" })`
    - amounts use `formatPriceCents`, line images use `ProductImage`, and the CTA is a `buttonClassName("outline")` `<Link>`
- **E2E:**
  - `purchase-journey.spec.ts` defines its own `uniqueEmail` / `signUp` helpers like `protected-routes.spec.ts`, and reads product names off the page as `shopping-journey.spec.ts` does. It runs in the same Playwright project as `checkout.spec.ts`, because it reduces stock.
  - In `checkout.spec.ts`, swap the 404 assertion for the confirmation heading (wiring edit).
- **Tests (TDD):**
  - shared: `orderIdSchema` / `orderViewSchema` / `formatOrderNumber` tables
  - `order.controller.test.ts` over HTTP (AppModule with the auth plus order fake DB, `sessionFor()`): 401, 200 for the owner (no userId, phone or idempotencyKey), and an identical 404 for a malformed, unknown or foreign id. Also checks that `/orders/checkout` isn't swallowed.
  - `order-view.db.test.ts` (skipIf no `TEST_DATABASE_URL`; kept separate from checkout-order's `order.db.test.ts`): the owner reads the snapshot. After a price change, product deactivation or variant deletion the view stays the same, with image null after the delete. A foreign user gets null.
  - web RTL for `OrderConfirmed`: hero copy with and without a name, rows, "Free" shipping, the address with and without an apartment, no "View in my orders", and no card digits
  - the Playwright journey (AC9) and the `checkout.spec.ts` update (AC10)

## Out of Scope

- Order history, the "View in my orders" button and `OrderDetail.dc.html` (account-wishlist)
- Card last-4 or any card data on the page. checkout-order stores none.
- Order confirmation emails, order status, cancellation and reorder
- A true HTTP 404 status for a foreign or unknown order on the web page (the Not Found page renders with 200 + noindex)
- The guest → login → merge path in the journey (covered by guest-cart-merge's e2e)

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard on `GET /orders/:id`, userId only from the session, the order query scoped to the session user, an identical 404 that never reveals another user's order, private no-store, no card data
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): Prisma only in apps/api, the shared Zod view schema in packages/shared, web never imports Prisma
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-25 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
