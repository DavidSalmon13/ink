# Tasks — Order Confirmation

> Epic: cart-checkout
> Spec: 2026-10-25-order-confirmation
> Branch: feat/cart-checkout/order-confirmation

## Gate

- [ ] T1 Confirm these are merged into `develop`: cart-checkout `checkout-order` (`Order`/`OrderItem` with the `number`, cents and `ship*` snapshot columns, `OrderItem.variantId` SetNull; apps/api/src/order/ with `OrderController` `@Controller("orders") @UseGuards(AuthGuard)` + `@Get("checkout")`, `OrderService`, `OrderModule`, apps/api/src/order/testing/fake-db.ts; packages/shared/src/order/ barrel; the web redirect to `/checkout/confirmation/<orderId>` + `router.refresh()`; apps/web/e2e/checkout.spec.ts) and `cart` (its line image fields and line mapper in apps/api/src/cart/), plus accounts-auth `api-foundation`, `auth-api-migration`, `protected-routes` (`/checkout` in `PROTECTED_PREFIXES`), `security-headers` (`lib/private-paths.ts`) and admin-catalog `product-images` (`ProductImage`). Write down the cart line's image shape and which Playwright project runs checkout.spec.ts; T2, T9 and T7 use them. Then create `feat/cart-checkout/order-confirmation` from the latest `develop`. Stop if any of these exists only on its feature branch

## Tests first (TDD)

- [ ] T2 Write failing Vitest tables in packages/shared/src/order/order-view.test.ts (`// covers AC6, AC7, T2`): `orderIdSchema` accepts a real cuid and rejects `""`, `"checkout"`, `"../x"`, a 200-char string and a UUID; `orderViewSchema` parses a full fixture, accepts `apartment: null` and `image: null`, rejects extra keys (`userId`, `phone`, `idempotencyKey`, `shipPhone`), a non-ISO `createdAt` and negative cents; `formatOrderNumber(1042)` → `"STR-1042"` (testing skill)
- [ ] T3 Extend apps/api/src/order/testing/fake-db.ts (wiring edit, owned by checkout-order): add `order.findFirst({ where: { id, userId }, select })` that returns the order with `items` and, per item, `variant → product` image fields (or `variant: null` when `variantId` is null). Keep its existing behaviour and call log unchanged, and leave apps/api/src/auth/testing/fake-db.ts untouched
- [ ] T4 Add failing `GET /orders/:id` cases to apps/api/src/order/order.controller.test.ts (wiring edit, `// covers AC6, AC7, T4`). Run real HTTP through `AppModule` with the auth fake and the T3 order fake merged by a `Proxy`, and use `sessionFor()`, both as in apps/api/src/admin/stock/stock.controller.test.ts. Cases: no session → 401; the owner → 200 parsed by `orderViewSchema`, and the raw body contains no `userId`, `phone`, `shipPhone` or `idempotencyKey`; a malformed id (with a spy proving no `order.findFirst` call), an unknown cuid and another user's order → 404 with byte-identical bodies and never 403; `GET /orders/checkout` still returns the checkout view; every response is `Cache-Control: private, no-store`. Keep checkout-order's "`GET /orders` not routed" case passing (testing skill)
- [ ] T5 Write failing apps/api/src/order/order-view.db.test.ts (`// covers AC3, AC6, AC7, T5`) with `describe.skipIf(!process.env.TEST_DATABASE_URL)` and a unique user, product and variant per run. Seed an Order + OrderItems directly. `OrderService.findForUser(owner, id)` returns the snapshot view. After `Product.priceCents` changes and the product is deactivated, the view is unchanged. After the variant is deleted, the view is unchanged except `image: null`. `findForUser(otherUser, id)` → null. Clean up in `afterAll` (testing skill)
- [ ] T6 Write failing RTL tests in apps/web/src/features/order-confirmation/OrderConfirmed.test.tsx (`// covers AC2–AC5, T6`) from an `OrderView` fixture:
  - hero h1: "Thanks, Dana. Order placed." for the name "Dana Reyes", and "Thanks. Order placed." when the name is null or blank
  - "Order number #STR-1042 · Placed Oct 24, 2026" for a `createdAt` of `2026-10-25T02:00:00Z`, which checks America/New_York
  - one summary row per item with image, name, "Size M · Qty 2" and the line total
  - Subtotal, Shipping "Free" at 0 (and the formatted amount otherwise) and Total
  - the Shipping-to block with and without the apartment, plus "Standard shipping · $5, free over $75"
  - "Demo card — nothing was charged"
  - a null image renders the placeholder
  - "Keep shopping" → `/catalog`
  - there is no "View in my orders", and no 4-digit card-like run or phone appears in the rendered text

  (testing skill)
- [ ] T7 Write failing apps/web/src/features/order-confirmation/load-order.test.ts and apps/web/src/features/order-confirmation/confirmation-page.test.tsx (`// covers AC1, AC2, AC8, T7`) with `apiFetch`, `requireUser`, `redirect` and `notFound` mocked:
  - `loadOrder` calls `/orders/<id>` with `cache: "no-store"`
  - 200 → a parsed `OrderView`
  - 401 → `redirect(buildLoginUrl("/checkout/confirmation/<id>"))`
  - 404 → null
  - 500 or an invalid body → throws
  - the page calls `requireUser("/checkout/confirmation/<id>")` before loading, calls `notFound()` on null with no order content rendered, renders `OrderConfirmed` on success, and exports the title `Order confirmed · Stride`

  (testing skill)
- [ ] T8 Write failing Playwright apps/web/e2e/purchase-journey.spec.ts (`// covers AC1, AC9, T8`):
  - Helpers: local `uniqueEmail`/`signUp` as in protected-routes.spec.ts. Product names are read off the page as in shopping-journey.spec.ts.
  - Journey: record `Date.now()` at the start; sign up → home → catalog → a seeded in-stock product → pick a size → add to cart → /cart → /checkout → valid address + demo card → Place order. The shopper lands on `/checkout/confirmation/<id>` showing `#STR-`, the item name and the total, and the header badge reads 0. Assert the elapsed time is < 180 000 ms, and set `test.setTimeout` above that.
  - Signed-out case: the same URL redirects to `/login?callbackUrl=…` with the banner.
  - Second-shopper case: another signed-up shopper opening that URL sees the Not Found content and no order data.
  - Put the spec in the same Playwright project as checkout.spec.ts in apps/web/playwright.config.ts (wiring edit only if T1 found checkout.spec.ts in a regex there).

  (testing skill)
- [ ] T9 Edit apps/web/e2e/checkout.spec.ts (wiring edit, owned by checkout-order, `// covers AC10, T9`): in the success case, replace the interim 404-body assertion with the "Order placed." heading and `#STR-` on `/checkout/confirmation/<id>`. Leave the other cases unchanged (testing skill)

## Shared

- [ ] T10 Add packages/shared/src/order/order-view.ts: `orderIdSchema`, `orderViewSchema` as `z.strictObject`, with the `image` shape copied from the cart line schema (imported from ../cart if that schema is exported) and `.nullable()`, plus `formatOrderNumber`; export them from packages/shared/src/order/index.ts (wiring edit). No Prisma imports (AC6, AC7). T2 green

## API

- [ ] T11 Add to apps/api/src/order/order.service.ts (wiring edit): `ORDER_VIEW_SELECT satisfies Prisma.OrderSelect`, which leaves out `userId`, `shipPhone` and `idempotencyKey` and selects items with `variant → product` image fields matching the cart line mapper; `toOrderView(row)`, which maps the `ship*` columns to `shipTo`, sets `createdAt.toISOString()`, and sets `image` to null when `variant` is null; and `findForUser(userId, id)` using `findFirst({ where: { id, userId } })` and returning null when there is no row. Follow apps/api/src/catalog/product-detail.service.ts (AC3, AC6). T5 green
- [ ] T12 Add `@Get(":id")` to apps/api/src/order/order.controller.ts (wiring edit), declared after `@Get("checkout")`. The userId comes only from `@CurrentUser()`. Fail `orderIdSchema.safeParse(id)` → bare `NotFoundException()` before any query; a null from `findForUser` → the same bare `NotFoundException()`. Follow apps/api/src/catalog/catalog.controller.ts `getProduct` and apps/api/src/account-security/account-security.controller.ts (AC6, AC7). T4 green

## Web

- [ ] T13 Add apps/web/src/features/order-confirmation/load-order.ts (`server-only`): `apiFetch(`/orders/${id}`, { cache: "no-store" })`; 401 → `redirect(buildLoginUrl(path))`; 404 → null; other non-200 → throw; 200 → `orderViewSchema.parse`. Follow features/product/load-product.ts (AC1, AC8). T7 loader cases green
- [ ] T14 Add apps/web/src/features/order-confirmation/OrderConfirmed.tsx (Server Component, props `{ order: OrderView, name: string | null }`):
  - dark hero with check icon, h1, and the order number via `formatOrderNumber` with the date formatted by `Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "America/New_York" })`
  - "Order summary" rows using `ProductImage` and `formatPriceCents`
  - totals, with Shipping "Free" at 0
  - aside with Shipping to and Payment
  - "Keep shopping" as a `buttonClassName("outline")` `<Link href="/catalog">`
  - no "View in my orders"
  - must match stride-design `OrderConfirmed.dc.html` at desktop and 375px, with sections stacking on narrow screens

  (AC2–AC5). T6 green
- [ ] T15 Add apps/web/src/app/checkout/confirmation/[orderId]/page.tsx: `metadata = { title: "Order confirmed · Stride" }`, a static shell, and a `<Suspense fallback={<SpinnerBlock/>}>` child that calls `requireUser(path)`, then `loadOrder(orderId)` → `notFound()` on null, otherwise `<OrderConfirmed order={…} name={user.name}/>`. Follow apps/web/src/app/account/security/page.tsx. If the build requires `generateStaticParams`, reuse product-detail's T2 solution. No Prisma import (AC1, AC2, AC8). T7 page cases and T8 green

## Wiring and docs

- [ ] T16 Check that the diff stays within Covers (apps/web/src/app/checkout/confirmation/**, apps/web/src/features/order-confirmation/**, apps/web/e2e/purchase-journey.spec.ts) plus these wiring edits:
  - packages/shared/src/order/order-view.ts, order-view.test.ts and index.ts (T2, T10)
  - apps/api/src/order/testing/fake-db.ts (T3)
  - order.controller.ts and its test (T4, T12)
  - order.service.ts and order-view.db.test.ts (T5, T11)
  - apps/web/e2e/checkout.spec.ts (T9)
  - playwright.config.ts, only if T8 needed it

  Confirm there is no schema.prisma or migration change, and nothing under apps/api/src/cart/**, apps/web/src/features/cart/** or apps/web/src/features/checkout/** changed. Then update the `order-confirmation` candidate line in softwareos/products/stride/epics/cart-checkout/tech-plan.md: owner-only `GET /api/orders/:id` (AuthGuard, query scoped to the session user, the same 404 for malformed, unknown and foreign ids); the page reads only the Order/OrderItem snapshot; the payment box has no card data; "View in my orders" is deferred to account-wishlist; the web Not Found is 200 + noindex under cacheComponents; purchase-journey.spec.ts asserts the journey takes < 3 min; shipping it lifts the checkout-order release block

## Verification

- [ ] T17 Run the full suites green:
  - `npm run lint`, `npm run typecheck`
  - `npm test` (shared + api + web) with `TEST_DATABASE_URL` set so T5 runs
  - `npm run test:e2e` against a seeded DB: purchase-journey.spec.ts, the updated checkout.spec.ts, protected-routes.spec.ts and all existing specs

  Also check that every new or edited test file has its `covers AC<n>, T<n>` comment, that each of AC1–AC10 has at least one test, that `grep -r "@prisma" apps/web/src` finds nothing, and that `grep -rn "shipPhone\|idempotencyKey\|userId" apps/web/src/features/order-confirmation` finds nothing (testing skill)
- [ ] T18 Run QA against acceptance criteria AC1–AC10 (qa skill):
  - signed out, `/checkout/confirmation/<id>` → login with the banner → back on the page; response headers show `private, no-store`
  - compare the page with `OrderConfirmed.dc.html` at desktop and 375px; check the title, the name and no-name hero, and the New York date
  - change the price, deactivate the product and delete a variant in admin, then reload: the values are unchanged and the deleted line shows the placeholder
  - no card digits or phone anywhere on the page; no "View in my orders"; "Keep shopping" → /catalog
  - curl `GET /api/orders/<id>` as the owner → 200 without userId, phone or idempotencyKey; as another user, and with an unknown or malformed id → identical 404 bodies and never 403; `GET /api/orders/checkout` still works
  - a second shopper opening the URL sees Not Found with noindex
  - the e2e journey finishes in under 3 min in CI
  - the diff is limited to Covers + the T16 wiring edits
