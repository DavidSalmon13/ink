# Checkout & Order

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/cart-checkout/checkout-order
> Covers: /checkout, /api/orders, apps/api/src/order/**, apps/web/src/features/checkout/**, apps/web/src/app/checkout/page.tsx, packages/shared/src/order/**, apps/web/e2e/checkout.spec.ts

## Overview

The protected checkout. A logged-in shopper with a non-empty cart opens /checkout and sees three numbered sections:

1. A shipping address form, prefilled from their saved address, with a "Save as my shipping address" box.
2. Flat shipping: $5, free at $75 or more.
3. A demo card form. Only the card format is checked; nothing is charged and nothing is stored.

Beside the form, an "In your cart" summary shows the lines and totals, with an Edit link back to /cart.

"Place order" calls `POST /api/orders`. In one DB transaction the API:
- locks the shopper's cart row, so two submits for one user run one after the other
- re-reads the cart at current prices
- decrements each variant's stock with a guard so it can't go below zero, in ascending `variantId` order
- creates the Order and its OrderItems with a price, name and size snapshot and a copy of the shipping address
- saves the address if the box was ticked
- empties the cart

If any line is out of stock, nothing is written and the page shows the design's "just sold out … Nothing was charged" message. On success the shopper is sent to `/checkout/confirmation/[orderId]`. That page belongs to **order-confirmation** and returns 404 until that spec ships, so checkout-order must not be released to production before order-confirmation.

This spec serves these cart-checkout success criteria:
- checkout requires login
- address and card-format validation errors show inline and match Figma
- placing an order creates Order + OrderItems with a price snapshot and reduces stock in one DB transaction
- stock never goes negative, and an out-of-stock line blocks the order with a clear message
- card numbers are never saved or logged

It is the "checkout" step of the mission's landing → … → confirmation flow, which should take under 3 minutes.

This spec also introduces the `Address` model: one saved shipping address per user. account-wishlist's `account-profile` will later edit the same row.

Depends on:
- cart-checkout/cart: Cart/CartItem, `calculateCartTotals` and the cart constants in `@stride/shared`, and the `OrderSummary` Checkout link to `/checkout`
- accounts-auth/api-foundation, auth-api-migration and protected-routes: the Nest API, `apiFetch`, `AuthGuard`, `@CurrentUser()`, `ZodBodyPipe`, the OriginCheck middleware, `requireUser()`, and the `/checkout` proxy guard and login banner
- catalog-search/catalog-foundation: Product.priceCents and ProductVariant.stock, which has a `CHECK (stock >= 0)`

## Goals & User Stories

- As a logged-in shopper, I enter a shipping address and see inline errors for anything invalid.
- As a returning shopper, my saved address is already filled in, and I can choose to save a new one.
- As a shopper, I enter demo card details, see inline format errors, and know nothing is charged or stored.
- As a shopper, I see my items, subtotal, shipping and total before I place the order.
- As a shopper, I place the order and my items are reserved for me: stock goes down and my cart empties.
- As a shopper, if something sold out while I was checking out, I'm told which item, nothing is charged, and I can fix my cart.
- As a signed-out shopper, opening /checkout sends me to log in and then back to checkout.

## Acceptance Criteria

1. AC1: /checkout requires login. A signed-out visit redirects to `/login?callbackUrl=/checkout`, using the existing protected-routes guard and banner. A logged-in shopper whose cart is empty is redirected to /cart.
2. AC2: /checkout matches stride-design `Checkout.dc.html` and `CheckoutErrors.dc.html`, at desktop and at 375px:
   - section 1, Shipping address: Full name, Phone (with the hint "Only used if there's a problem with delivery."), Street address, Apartment/suite (optional), City, State, ZIP code, and a "Save as my shipping address" checkbox
   - section 2, Shipping: "Standard shipping 3–5 working days", showing $5.00 or Free
   - section 3, Payment: Card number, Name on card, Expiry (MM / YY), CVC, plus the demo-payment notice
   - the "In your cart" summary: one line per item with qty, name, size and line total, an Edit link to /cart, and Subtotal / Shipping / Total
   - a "Place order · $<total>" button
3. AC3: If the shopper has a saved Address, the form is prefilled from it and shows "Filled in from your saved address." With no saved address, the fields are empty and the checkbox starts ticked.
4. AC4: The address is checked with one shared Zod schema, on the client (on blur and on submit) and again in the API:
   - all fields are trimmed
   - required fields: full name, phone, street, city, state and ZIP
   - phone has 10 digits once formatting is stripped
   - state is a valid 2-letter US state code
   - ZIP is 5 digits, with the message "Enter a 5-digit ZIP code."

   Errors show inline under each field and set `aria-invalid`.
5. AC5: The card is checked with one shared Zod schema, on the client and again in the API:
   - the card number has 16 digits once spaces are stripped ("Card number should be 16 digits.")
   - name on card is required
   - expiry is MM / YY with a valid month, and it is the current month or later
   - CVC is 3 digits

   Errors show inline. No Luhn check, because this is a demo.
6. AC6: Card data is never stored or logged. It is not written to any DB table, log line, error response, URL or analytics. The API drops the card fields as soon as validation passes. A 400 lists only the field names and messages, never the submitted values. The web form doesn't keep card values in action state.
7. AC7: `POST /api/orders` requires a session (AuthGuard) and takes the userId only from the session. The body is `z.strictObject` and any `userId`, price or line fields are rejected. The endpoint is POST-only and must pass the proxy-secret and Origin checks. Responses are `Cache-Control: private, no-store`.
8. AC8: A successful order runs in one transaction:
   - it first locks the user's `Cart` row (`SELECT … FOR UPDATE`), so concurrent `place` calls for one user can't both read the same cart
   - it reads the user's cart lines at the current DB prices
   - for each line, in ascending `variantId` order so two orders can't deadlock, it decrements `ProductVariant.stock` with a conditional update (`stock >= qty`)
   - it creates an `Order` with:
     - an incrementing order number
     - subtotal, shipping and total in cents from the shared `calculateCartTotals`
     - a copy of the shipping address
   - it creates one `OrderItem` per line, with the variantId and snapshots of the product name, slug, size, unit price in cents, quantity and line total
   - if the box was ticked, it upserts the user's `Address`
   - it deletes the user's CartItems

   The response is 201 `{ orderId, orderNumber }`.
9. AC9: If any line's quantity exceeds current stock, its variant no longer exists, or its product is inactive:
   - the whole transaction rolls back: no Order, stock unchanged, cart unchanged, Address unchanged
   - the API returns 409 `{ code: "out_of_stock", lines: [{ variantId, name, size, available, reason }] }`, one entry per failing line, with `reason` `"sold_out"` or `"unavailable"` (inactive or deleted, `available` 0)
   - the page shows the design's message under the button for each line, for example "Size M of the Aero Knit Running Tee just sold out. Remove it or pick another size in your cart. Nothing was charged." An unavailable line reads "The Aero Knit Running Tee is no longer available. Remove it from your cart. Nothing was charged." The words "your cart" link to /cart

   Stock never goes negative.
10. AC10: When two shoppers race for the last unit, exactly one order succeeds. The other gets the AC9 409, and the final stock is 0.
11. AC11: An empty cart at submit returns 409 `{ code: "cart_empty" }` and the page sends the shopper to /cart. While a submit is in flight the button is disabled, so a double-click places one order.
12. AC12: On success the web app navigates to `/checkout/confirmation/<orderId>` and refreshes, so the header cart badge reads 0. Until order-confirmation ships, that URL returns 404, which is expected and not a QA failure.
13. AC13: Prices come from the DB at order time. If a price changed after the page loaded, the order uses the new price and the snapshot keeps it. Later price changes never alter a placed order's OrderItems.
14. AC14: `POST /api/orders` requires an `Idempotency-Key` header, a UUID the checkout page creates once per page load (missing or malformed → 400). Inside the transaction, after the cart lock, an existing Order for the same user and key is returned as 200 `{ orderId, orderNumber }` with nothing written. A retried request, or a second submit from the same page, never places a second order and never gets `cart_empty`; the page then navigates as on 201.

## Technical Approach

- **Data (wiring edit to `apps/api/prisma/schema.prisma`, `prisma migrate dev --name order`):**
  - `Address { id cuid, userId String @unique → User onDelete Cascade, fullName, phone, street, apartment String?, city, state, zip, createdAt, updatedAt }`
  - `Order { id cuid, number Int @unique @default(autoincrement()), userId → User onDelete Restrict, idempotencyKey String, @@unique([userId, idempotencyKey]), subtotalCents Int, shippingCents Int, totalCents Int, shipFullName, shipPhone, shipStreet, shipApartment String?, shipCity, shipState, shipZip, items OrderItem[], createdAt, @@index([userId, createdAt]) }`
  - `OrderItem { id cuid, orderId → Order onDelete Cascade, variantId String? → ProductVariant onDelete SetNull, productName, productSlug, size, unitPriceCents Int, quantity Int, lineTotalCents Int }`
  - hand-edited CHECKs in migration.sql: `quantity >= 1`, `unitPriceCents > 0`, and all cents columns `>= 0`
  - back-relations on User (`address`, `orders`) and ProductVariant (`orderItems`)
  - no card columns, anywhere
- **Shared (`packages/shared/src/order/`):**
  - `shippingAddressSchema`, a flat `z.strictObject` with keys fullName, phone, street, apartment, city, state, zip. `US_STATE_CODES` is a const list.
  - `mockCardSchema`, flat, with keys cardNumber, cardName, cardExpiry, cardCvc. The expiry check takes an injectable `now` so tests are deterministic.
  - `placeOrderSchema = shippingAddressSchema.merge(mockCardSchema).extend({ saveAddress: z.boolean() })`. Keys are flat because `ZodBodyPipe` / `fieldErrorsOf` produce flat `fieldErrors`.
  - response schemas:
    - `placeOrderResponseSchema { orderId, orderNumber }`
    - `outOfStockErrorSchema`
    - `checkoutViewSchema { cart: cartResponseSchema, savedAddress: savedAddressSchema | null }`
  - re-export from `packages/shared/src/index.ts` (wiring edit)
- **API (`apps/api/src/order/`):** `OrderModule` imports AuthModule and is registered in `app.module.ts` (wiring edit). The controller is `@Controller("orders") @UseGuards(AuthGuard)` and reads the user with `@CurrentUser()`. Routes:
  - `GET /orders/checkout` → `CheckoutView`: the cart, reusing the cart module's read or the same select, plus the saved address
  - `POST /orders` with `ZodBodyPipe(placeOrderSchema)` and the `Idempotency-Key` header parsed by a shared `idempotencyKeySchema` (`z.string().uuid()`) → 201, or 200 on a replay

  `OrderService.place(userId, idempotencyKey, input)`:
  1. Split `input` into address and `saveAddress`. The card fields are never passed further.
  2. Run `prisma.$transaction(async tx => …)`: upsert the user's Cart, then lock it with `` tx.$queryRaw`SELECT id FROM "Cart" WHERE "userId" = ${userId} FOR UPDATE` ``. Look up `Order` by `[userId, idempotencyKey]`; found → return it as a replay. Load CartItems with the variant → product price, name and `isActive`. Empty → `ConflictException({ code: "cart_empty" })`.
  3. Sort the lines by `variantId` ascending. For each active line, run `tx.productVariant.updateMany({ where: { id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })`. Collect inactive lines and lines where `count === 0`, then throw `ConflictException({ code: "out_of_stock", lines })` after the loop so every failing line is reported, and the throw rolls back.
  4. Compute totals with `calculateCartTotals`, then `tx.order.create` with the `idempotencyKey` and the nested `items.create`. If `saveAddress`, run `tx.address.upsert`. Then `tx.cartItem.deleteMany({ where: { cart: { userId } } })`.

  It follows the catalog service's `…_SELECT satisfies Prisma.…Select` and mapper pattern. Nothing logs the request body. Malformed JSON keeps body-parsing.ts's generic, non-echoing 400; no auth wiring edit is needed.
- **Web (`apps/web/src/app/checkout/page.tsx`, `apps/web/src/features/checkout/`):**
  - `page.tsx` is a Server Component titled `Checkout · Stride`. It calls `requireUser("/checkout")`, then `loadCheckout()`, which runs `apiFetch("/orders/checkout", { cache: "no-store" })` and parses with `checkoutViewSchema`. With no lines it calls `redirect("/cart")`.
  - `CheckoutForm.tsx` is a client component using `useActionState`, modelled on `features/auth` (`use-auth-form` blur validation, `FormError`) and `account-security/ChangePasswordForm.tsx`.
    - `submit-order.ts` POSTs `/api/orders` with the page's `Idempotency-Key` (a `crypto.randomUUID()` made once when the form mounts) and maps the responses: 400 → `fieldErrors`, 409 out_of_stock → sold-out and unavailable lines, 409 cart_empty → `router.push("/cart")`, 201 or 200 → `router.push(/checkout/confirmation/<id>)` + `router.refresh()`.
    - The form state keeps address values and never card values.
  - `CheckoutSummary.tsx` shows the "In your cart" list and totals. It reuses `ProductArt` and `formatPriceCents` from features/catalog.
  - Fields use `components/ui/Input.tsx` with its `error` prop.
- **Tests (mode chosen in Step 11):**
  - shared schema tables: ZIP, phone, state, the 16-digit card, expiry around the current month, CVC, strict keys
  - `order.service.test.ts` with a local fake Prisma in `apps/api/src/order/testing/`. The auth fake-db has no variant or order tables and no `decrement`/`gte`.
  - `order.controller.test.ts`: AppModule over real HTTP. It covers 401, 400 without echoed values, 409s, 201, a foreign Origin and the strict body.
  - `order.db.test.ts` (skipIf no `TEST_DATABASE_URL`): the transaction, the rollback on out-of-stock, the concurrent last-unit race, two concurrent `place` calls for one user, an idempotent replay, the price snapshot after a price change, and the CHECKs
  - web RTL for the form and summary
  - Playwright `apps/web/e2e/checkout.spec.ts`: signed-out redirect, inline errors, a successful order (URL is `/checkout/confirmation/<id>`, cart empty, badge 0), and sold-out after lowering stock

## Out of Scope

- The confirmation page `/checkout/confirmation/[orderId]` and the full landing → confirmation Playwright journey (order-confirmation)
- Editing the saved address outside checkout, and order history (account-wishlist)
- Real payments, a Luhn check, storing card last-4, taxes, coupons, guest checkout, order emails
- Reserving stock before "Place order", and warning about price changes since page load (the server price wins, per AC13)
- Multiple saved addresses and address autocomplete
- Order status and cancellation

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): AuthGuard on both order endpoints, userId only from the session, POST + Origin + proxy-secret, Address and Order queries scoped to the session user, card data never logged
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): Prisma and the transaction only in apps/api, shared Zod schemas in packages/shared, web never imports Prisma
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-21 | david-schwartzman | change | AC8: lock the user's Cart row first and decrement in ascending `variantId` order; AC14: required `Idempotency-Key` on `POST /api/orders` returns the existing order on a replay (`Order.idempotencyKey`); AC9: inactive products block the order like out-of-stock lines (`reason: "unavailable"`); Overview: not released before order-confirmation; T2–T8, T11, T13, T14, T16, T21–T23 updated — PR #58 review | https://github.com/david-schwartzman/Stride/pull/58 |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
