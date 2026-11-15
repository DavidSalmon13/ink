# Guest Cart Merge

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/cart-checkout/guest-cart-merge
> Covers: apps/api/src/guest-cart/**, packages/shared/src/guest-cart/**, apps/web/e2e/guest-cart.spec.ts

## Overview

Signed-out shoppers get the same cart as logged-in ones: add from the product page, /cart, quantity, remove and the header count. Their cart lives in an HttpOnly, HMAC-signed cookie that holds only a random cart id and `[variantId, qty]` pairs. The server always re-prices those pairs from the DB. When a guest logs in or signs up, the API merges the cookie cart into their DB cart in one transaction and clears the cookie in the same response. That makes the login banner's "Your cart is saved and will be added to your account" true.

This spec serves the cart-checkout success criteria for guests:
- add, quantity and remove work in the guest cookie cart
- the guest cart merges on login without duplicate lines: for the same variant, qty = min(guest + db, 10, stock)
- guest lines are capped at stock
- totals use the cart spec's shared `calculateCartTotals`

Guests can now shop before logging in, which serves the mission's flow from landing to confirmation in under 3 minutes. Guest *checkout* stays post-launch: the Checkout button sends guests to `/login?callbackUrl=/checkout`, and the merge runs there.

Depends on:
- cart-checkout/cart: the Cart/CartItem models, the `cart` module and its endpoints, shared cart schemas and `calculateCartTotals`, and the web cart components
- accounts-auth/auth-api-migration: `signInHooks` / `runOnSignedIn`, `ClientInfo`, `signedIn()`, `AuthGuard`
- accounts-auth/protected-routes: `LoginBanner`, `HeaderSession`

## Goals & User Stories

- As a guest, I can add a product in a chosen size to my cart without logging in.
- As a guest, I can see /cart, change quantities, remove items and see subtotal, shipping and total, the same as a logged-in shopper.
- As a guest, I see my cart's item count in the header.
- As a guest who logs in or signs up, everything in my guest cart is in my account cart, with no duplicate lines and nothing over stock.
- As a shopper, a broken or tampered cart cookie never breaks the site or my login.

## Acceptance Criteria

1. AC1: On /product/[slug], a signed-out shopper who picks an in-stock size and clicks "Add to cart" gets that variant added to the guest cart cookie with qty 1, and is not sent to login. Adding the same variant again increases its quantity; it does not create a second line. The header badge updates without a full reload.
2. AC2: Signed out, /cart shows the guest cart's lines, stepper, Remove, totals, free-shipping hint and empty state, exactly as in the cart spec (cart AC3–AC5, AC8 and AC11, so a line whose product became inactive shows "No longer available" with only Remove). Prices, names, stock and `isActive` are read from the DB at request time. The cookie holds only a random cart id plus variantId and qty.
3. AC3: Guest quantities stay between 1 and min(10, stock). A guest cart holds at most 50 distinct lines. Breaking either limit, or naming an unknown variant or an inactive product, returns 400 `{ fieldErrors }` and leaves the cookie unchanged.
4. AC4: A cookie with a bad or missing signature, or a value that won't decode, counts as an empty cart. Invalid entries are dropped on read: wrong shape, qty out of range, duplicates. Unknown or deleted variants are left out of the response. None of these returns a 5xx, and the next guest write replaces the cookie with a valid one.
5. AC5: On successful login or sign-up with a valid guest cookie, the API merges the guest lines into the user's DB cart in one transaction:
   - A new variant is added at min(qty, 10, stock).
   - A variant already in the DB cart becomes min(guest + db, 10, stock).
   - Sold-out or unknown variants, and inactive products, are skipped.
   - No duplicate lines are created.
   - The merge is idempotent. The same transaction records the cookie's cart id in `GuestCartMerge`, and a cart id that is already recorded is skipped as already merged. A replayed cookie (the clear-cookie response was lost, or two tabs log in at once) never adds the guest lines twice: the result is exactly min(guest + db, 10, stock).

   The same response clears the guest cookie. The shopper lands on the callbackUrl with the merged cart and badge.
6. AC6: If the merge fails, sign-in still succeeds. The transaction rolls back, so the DB cart is unchanged. The error is logged with the userId only, and the guest cookie is kept, so the next login retries.
7. AC7: For a signed-in shopper, every cart read and write uses the DB cart only, and any guest cookie is ignored. The cart spec's session rules still hold: userId only from the session, no cross-user access, and a cart endpoint never clears the session cookie (cart AC12). `OptionalAuthGuard` treats an invalid session as a guest and leaves the session cookie alone.
8. AC8: The guest cookie:
   - is `__Host-stride_guest_cart` in production and `stride_guest_cart` otherwise
   - is HttpOnly, Secure in production, SameSite=Lax, path `/`, Max-Age 30 days
   - is signed with HMAC-SHA256 using `GUEST_CART_SECRET` and verified in constant time
   - is never logged

   The API refuses to start without `GUEST_CART_SECRET`. Guest mutations are POST-only and pass the proxy-secret and Origin checks. Every cart response is `Cache-Control: private, no-store`.
9. AC9: The header badge shows the guest cart's item count, which counts only valid lines. It is hidden at 0. Playwright covers this flow:
   1. A guest adds two items.
   2. They click Checkout, are sent to login and see the "Your cart is saved" banner.
   3. They log in as a user who already has one of those items in their DB cart.
   4. They land on /checkout with one merged line per variant, summed and capped.

## Technical Approach

- **Cookie format (`packages/shared/src/guest-cart/`):**
  - `guestCartCookieName()` and `guestCartCookieAttributes()` mirror `session-cookie.ts`. The API sets and clears the cookie with them, and auth's `signedIn()` uses them to clear it.
  - `guestCartPayloadSchema`: `{ id, lines }`, where `id` is a random cart id (`randomUUID()`, set on the first guest write and kept on later writes) and `lines` is an array of `[variantId, qty]` tuples, qty 1..10, at most `GUEST_CART_MAX_LINES = 50`.
  - Encoding is `base64url(JSON) + "." + base64url(hmac)`. Fifty lines of cuids fit under 4 KB.
  - Re-export from `packages/shared/src/index.ts` (wiring edit).
- **API (`apps/api/src/guest-cart/`):**
  - `guest-cart-cookie.ts`: `sign` / `verify` with `createHmac("sha256")`, then a length check and `timingSafeEqual`, like `proxy-secret.middleware.ts`. Also `read(req)` → lines (lenient per AC4) and `write(res, lines)`.
  - `GuestCartService`:
    - `view(lines)` → `CartResponse`. It re-prices through Prisma and drops unknown variants, so the response shape is identical to the DB cart's.
    - `add`, `setQuantity`, `remove` are pure line edits validated against DB stock.
    - `mergeIntoUser(userId, cart)` runs one `$transaction`: first insert `GuestCartMerge { cartId, userId }`, then upsert the Cart, then upsert each item at the capped quantity. A unique violation on `cartId` (P2002) means the cart was already merged, by this tab or a concurrent one: the transaction rolls back and the call returns `{ merged: true }` so the cookie is still cleared. It writes Prisma directly and doesn't call CartService, to avoid a module cycle.
- **Data (wiring edit to `apps/api/prisma/schema.prisma`, `prisma migrate dev --name guest_cart_merge`):** `GuestCartMerge { cartId String @id, userId → User onDelete Cascade, createdAt }`. It stores only merged cart ids, never lines.
  - `GuestCartModule.onModuleInit` checks `GUEST_CART_SECRET`, the way `AuthModule` checks the pepper. It also registers `signInHooks.onSignedIn = (userId, ctx) => service.mergeFromCookie(userId, ctx.guestCart)`.
  - `CartModule` imports `GuestCartModule`. GuestCartModule imports no Cart or Auth module.
- **Auth wiring edits (`apps/api/src/auth/`, owned by auth-api-migration):**
  - Add `guestCart?: string` to `ClientInfo`, read in `clientInfo(req)`, the same pattern as `previousToken`.
  - Change `onSignedIn(userId, ctx)` and `runOnSignedIn` to return `{ merged: boolean }`. A throw is caught and returns `{ merged: false }`.
  - Return `merged` on `SignedIn`. `signedIn()` clears the guest cookie when `merged` is true.
  - Add `OptionalAuthGuard` and `@CurrentUserOrNull()`, factored out of `AuthGuard`. It sets the same no-store header and re-sets the renewed cookie, and it leaves `req.user` undefined instead of returning 401. It never clears the session cookie (cart AC12). Export it from `AuthModule`.
  - Update `on-signed-in.test.ts` and `auth.controller.test.ts` for the new signature. Use `res.headers.getSetCookie()` when a response carries two cookies.
- **Cart wiring edits (`apps/api/src/cart/`, `apps/web/src/features/cart/`, owned by cart):**
  - The controller moves to `OptionalAuthGuard`. With a user, it delegates to `CartService` as before. Without one, it delegates to `GuestCartService` and writes the cookie on mutations. Cookie writes happen only on browser `/api/cart/*` POSTs, because a Server Component's `apiFetch` can read the cookie (it forwards Cookie) but can't set it.
  - `AddToCartButton` no longer redirects on 401. A guest 200 refreshes the page the same way a logged-in 200 does.
  - `load-cart.ts` and `CartEmpty`: signed out with no guest lines shows the empty state without a "Log in to see your cart" link. Guests now have a cart.
- **Session wiring edit (`apps/web/src/features/session/`, owned by protected-routes):** `HeaderSession` fetches `/cart/count` for guests too. The `LoginBanner` copy stays as it is, because it is now true.
- **Tests (TDD):**
  - Shared payload and encoding tables.
  - API: unit tests for `guest-cart-cookie` (tamper, bad signature, oversize, duplicates) and `GuestCartService`, using a fake DB with Cart/CartItem plus upsert.
  - Controller tests over real HTTP with `cookieParser()` added, since AppModule tests don't register it.
  - `guest-cart.db.test.ts`: merge sum/cap/sold-out/inactive, rollback on failure, concurrency at the stock limit, and two concurrent merges of one cookie.
  - Auth tests: `merged` → cookie cleared, a throw → sign-in 200 with the cookie kept.
  - Playwright `apps/web/e2e/guest-cart.spec.ts`.

## Out of Scope

- Guest checkout (post-launch roadmap). Checkout still requires login.
- Merging on any event other than login or sign-up, such as a session renewal.
- Persisting guest carts server-side, or across devices or browsers. `GuestCartMerge` holds merged cart ids only.
- Notifying the shopper which lines were capped or skipped during the merge. /cart's "Only N left" note covers the capped case.
- Changes to the logged-in DB cart's behaviour, apart from the endpoints now also serving guests.

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md): `GUEST_CART_SECRET` stays API-only, the cookie is never logged, mutations are POST-only with the Origin and proxy-secret checks, and userId comes only from the session at merge. One documented exception: guest cart mutations run without `AuthGuard`. They change only the shopper's own signed cookie and never write to the DB, apart from the merge, which runs inside an authenticated sign-in.
- [global/tech-stack](../../../../../../standards/global/tech-stack.md): signing, re-pricing and the merge stay in apps/api, Prisma is used only in the API, and the cookie payload schema lives in packages/shared.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch and commit conventions.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-21 | david-schwartzman | change | AC5 + Technical Approach: the cookie carries a random cart id and the merge records it in a new `GuestCartMerge` table in the same transaction, so a replayed cookie is skipped (idempotent merge); AC2/AC3/AC5: inactive products are rejected or skipped like unknown variants; AC7: `OptionalAuthGuard` never clears the session cookie (cart AC12); T2–T5, T7–T10, T15, T16, T18, T27, T31 updated, T9 drops the 403 → 401 fix now done in the cart spec — PR #58 review | https://github.com/david-schwartzman/Stride/pull/58 |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
