# Tasks — Guest Cart Merge

> Epic: cart-checkout
> Spec: 2026-10-18-guest-cart-merge
> Branch: feat/cart-checkout/guest-cart-merge

## Gate

- [ ] T1 Confirm these are merged into `develop`:
  - cart-checkout `cart`: Cart/CartItem models and migration, the apps/api/src/cart/ module and endpoints, `calculateCartTotals` and the cart schemas in packages/shared/src/cart/, the apps/web/src/features/cart/ components, apps/web/src/app/cart/page.tsx, apps/web/e2e/cart.spec.ts
  - accounts-auth `auth-api-migration`: `signInHooks` / `runOnSignedIn` in apps/api/src/auth/on-signed-in.ts, `ClientInfo`, `signedIn()`, `AuthGuard`, `@CurrentUser()`
  - accounts-auth `protected-routes`: `LoginBanner.tsx` and `HeaderSession.tsx` in apps/web/src/features/session/

  Then create `feat/cart-checkout/guest-cart-merge` from the latest `develop`. Stop if any of them is still only on its feature branch (AC1, AC5, AC9)
- [ ] T1.1 Run /spec-changes on cart-checkout/2026-10-18-cart to amend it for guests, with guest-cart-merge as the Ref (AC1, AC7, AC9):
  - AC2: a signed-out add goes to the guest cart, not to login
  - AC9: the badge shows the guest count when signed out
  - AC10: cart endpoints serve guests through `OptionalAuthGuard`; DB writes still need a session
  - T18: `HeaderSession` fetches `/cart/count` when signed out too

## Tests first (TDD)

- [ ] T2 Write failing Vitest tables in packages/shared/src/guest-cart/guest-cart.test.ts (`// covers AC3, AC4, AC8, T2`) (testing skill):
  - `guestCartPayloadSchema` accepts `{ id, lines }` with `lines` of `[]`, one `[variantId, 1]` and 50 lines
  - it rejects a missing or non-UUID `id`, 51 lines, qty 0, 11, 1.5 or `"2"`, an empty variantId, objects instead of tuples, extra tuple items and extra keys
  - `GUEST_CART_MAX_LINES === 50`
  - `guestCartCookieName()` gives `__Host-stride_guest_cart` when `NODE_ENV=production` and `stride_guest_cart` otherwise
  - `guestCartCookieAttributes()` is HttpOnly, SameSite=Lax, path `/`, Max-Age 30 days, Secure only in production, with no `Domain`, matching the shape of packages/shared/src/session-cookie.ts:12-25
- [ ] T3 Write failing apps/api/src/guest-cart/guest-cart-cookie.test.ts (`// covers AC4, AC8, T3`) with `GUEST_CART_SECRET` stubbed through `vi.stubEnv` (testing skill). Cases:
  - `sign` then `verify` round-trips, and the value is `base64url(JSON).base64url(hmac)`
  - these all read as `[]`: a flipped payload byte, a flipped signature byte, a missing `.`, an empty signature, a signature of the wrong length (no `timingSafeEqual` throw), non-base64url input, non-JSON input, and a payload signed with another secret
  - `read(req)` drops wrong-shape entries, qty outside 1..10, duplicate variantIds (keeps the first one) and anything past 50 lines, and keeps the cart id
  - `read(req)` with no cookie gives an empty cart with no id
  - `write(res, cart)` sets the cookie with the shared name and attributes, keeps an existing cart id and creates one when there is none, and 50 lines of cuids plus the id stay under 4096 bytes
  - a spy on `Logger` shows the cookie value is never logged
- [ ] T4 Add apps/api/src/guest-cart/testing/fake-db.ts, a fake `PrismaService` in the style of apps/api/src/auth/testing/fake-db.ts. Leave the auth fake alone. It has:
  - `product` (with `isActive`), `productVariant`, `cart`, `cartItem` and `guestCartMerge` tables (a duplicate `cartId` insert throws a P2002-shaped error) with `findMany`/`findUnique`/`upsert`/`update`/`delete`
  - a `$transaction` that rolls back from a snapshot
  - a call log that records `inTransaction`
  - an injectable "fail on next write" switch, so T5 can test rollback
- [ ] T5 Write failing apps/api/src/guest-cart/guest-cart.service.test.ts and guest-cart.module.test.ts (`// covers AC2, AC3, AC4, AC5, AC6, AC8, T5`) on the T4 fake (testing skill):
  - `view(lines)` re-prices from `product.priceCents`, leaves out unknown or deleted variants, and parses with the shared `cartResponseSchema`. Its totals equal `calculateCartTotals`.
  - `add` puts in a new line at qty 1, and adding the same variant again increments it.
  - `setQuantity` / `remove` edit only the named line.
  - Going over min(10, stock), adding a 51st distinct line or naming an unknown variant or an inactive product throws `BadRequestException({ fieldErrors })`.
  - `view` marks a line whose product is inactive `available: false`, left out of the totals.
  - `mergeIntoUser`:
    - a new variant is added at min(qty, 10, stock)
    - an existing variant becomes min(guest + db, 10, stock)
    - sold-out or unknown variants and inactive products are skipped
    - one row per variant
    - the cart id is recorded in `guestCartMerge`, and merging the same cart id again changes nothing and returns `{ merged: true }`
    - every write is logged `inTransaction`
    - a forced failure leaves the DB cart unchanged
  - `mergeFromCookie` with no cookie makes no DB call and returns `{ merged: false }`.
  - Module: `onModuleInit` throws a message naming `GUEST_CART_SECRET` when it is unset or empty, as in apps/api/src/auth/auth.module.test.ts. After init, `signInHooks.onSignedIn` is the guest-cart hook.
- [ ] T6 Update the auth tests for the new hook signature (wiring edits, owned by auth-api-migration) (`// covers AC5, AC6, T6`) (testing skill):
  - apps/api/src/auth/on-signed-in.test.ts:18 becomes `(userId, ctx)` → `{ merged }`. A throw returns `{ merged: false }` and logs the userId only, never `ctx.guestCart`.
  - apps/api/src/auth/auth.controller.test.ts:243-260 and 326-360 assert `toHaveBeenCalledWith("user_1", expect.objectContaining({ guestCart: <cookie value> }))`.
  - New controller cases for login and sign-up:
    - hook returns `merged: true` → `res.headers.getSetCookie()` holds the session cookie and a guest-cookie clear (Max-Age 0)
    - hook throws → 200, session cookie set, no guest-cookie clear
    - no guest cookie → `guestCart` undefined
- [ ] T7 Add failing `OptionalAuthGuard` cases to apps/api/src/auth/auth.guard.test.ts (wiring edit) (`// covers AC7, AC8, T7`) (testing skill):
  - no cookie → `true` with `req.user` undefined
  - an invalid or expired token → `true` with `req.user` undefined, no 401 and no session-cookie clear
  - a valid token → `req.user` set the same way `AuthGuard` sets it, and the renewed cookie re-sent
  - `Cache-Control: private, no-store` is set every time
  - the existing `AuthGuard` cases still pass
- [ ] T8 Write failing apps/api/src/guest-cart/guest-cart.http.test.ts (`// covers AC1–AC4, AC7, AC8, T8`) (testing skill). Setup: real HTTP through `AppModule` on `app.listen(0)` with native `fetch`, `PrismaService` overridden with the T4 fake, `GUEST_CART_SECRET` stubbed, and `app.use(cookieParser())` added because AppModule tests don't register it (catalog.controller.test.ts:72-82). Cases:
  - Signed out, `POST /cart/items` → 200 `CartResponse` plus a guest `Set-Cookie`. Sending that cookie back on a second add gives one line at qty 2.
  - `GET /cart` and `GET /cart/count` re-price and count from the cookie, and set no cookie.
  - The quantity and remove POSTs work for guests.
  - Over min(10, stock), a 51st line, an unknown variant or an inactive product → 400 `{ fieldErrors }` and no `Set-Cookie`.
  - A tampered cookie → `GET /cart` 200 with an empty cart. The next add replaces it with a valid cookie.
  - Signed in with a guest cookie → DB cart only, and the guest cookie is neither read nor written.
  - A foreign Origin on a guest mutation → 401.
  - PUT/PATCH/DELETE are not routed.
  - Every response has `Cache-Control: private, no-store`.
- [ ] T9 Edit apps/api/src/cart/cart.controller.test.ts (wiring edit, owned by cart). Leave every signed-in case as it is (AC7):
  - replace the "every route without a session → 401" case, and the expired-cookie 401 case, with "signed-out routes reach the guest path and never clear the session cookie" (the T8 coverage)
- [ ] T10 Write failing apps/api/src/guest-cart/guest-cart.db.test.ts (`// covers AC5, AC6, T10`) with `describe.skipIf(!process.env.TEST_DATABASE_URL)` and a unique user per run (testing skill):
  - merge sums an existing line, caps at 10 and at stock, skips a sold-out variant and an inactive product, and leaves no duplicate rows
  - a failure forced mid-merge (for example a deleted variant between read and write) rolls back to the pre-merge DB cart and leaves no `GuestCartMerge` row, so the next login retries
  - two concurrent `mergeIntoUser` calls with the same cookie cart give exactly `min(guest + db, 10, stock)` on one row, one `GuestCartMerge` row, and both return `{ merged: true }`
  - replaying the same cookie after a successful merge changes nothing
  - two concurrent `mergeIntoUser` calls with different cookie carts for the same user at the stock limit leave qty ≤ stock and one row
  - clean up in `afterAll`
- [ ] T11 Update the failing RTL tests in apps/web/src/features/cart/ (wiring edits, owned by cart) (`// covers AC1, AC2, T11`) (testing skill):
  - AddToCartButton: a signed-out 200 calls `router.refresh()` and never redirects to `buildLoginUrl`.
  - CartEmpty: the `Log in to see your cart` variant is removed.
  - load-cart.test.ts: a guest 200 parses to a cart. Remove the `401 → { signedOut: true }` case, or turn it into "401 throws" if the loader keeps a 401 branch.
- [ ] T12 Update apps/web/src/features/session/HeaderSession.test.tsx (wiring edit, owned by protected-routes) (`// covers AC9, T12`) (testing skill):
  - signed out with count 2 → fetches `/cart/count` and passes `cartCount={2}`
  - signed out with count 0 → badge hidden
  - a count fetch failure → 0
  - apps/web/src/features/session/LoginBanner.test.tsx still asserts "Your cart is saved and will be added to your account."
- [ ] T13 Edit apps/web/e2e/cart.spec.ts (wiring edit, owned by cart). Guests now have a cart and guest-cart.spec.ts covers it, so drop these assertions (AC1, AC2):
  - "signed out, Add to cart → `/login?callbackUrl=…`"
  - "signed-out /cart shows `Log in to see your cart`"
- [ ] T14 Write failing Playwright tests in apps/web/e2e/guest-cart.spec.ts (`// covers AC1, AC2, AC4, AC5, AC8, AC9, T14`) against the seeded DB (testing skill):
  - A guest adds a size twice → one line at qty 2, and the header badge shows 2 without a full reload.
  - /cart shows the lines, stepper, Remove, totals and free-shipping hint. Remove-all → empty state with no login link, and the badge is hidden.
  - `context.cookies()` shows the guest cookie is HttpOnly and SameSite=Lax, and its decoded value holds only `[variantId, qty]`.
  - A hand-tampered cookie → /cart shows an empty cart with no error page.
  - The merge flow:
    1. Sign up user U and add variant A to the DB cart, then log out.
    2. As a guest, add A and B.
    3. Click Checkout → land on `/login?callbackUrl=/checkout` with the "Your cart is saved" banner.
    4. Log in as U → URL `/checkout`.
    5. /cart shows one line per variant, A summed and capped, and the guest cookie is gone.

## Shared

- [ ] T15 Add packages/shared/src/guest-cart/, then add `export * from "./guest-cart";` to packages/shared/src/index.ts (wiring edit). T2 green:
  - `cookie.ts`: `guestCartCookieName()`, `guestCartCookieAttributes()` and a clear variant, mirroring session-cookie.ts
  - `schemas.ts`: `guestCartPayloadSchema` (`z.strictObject({ id: uuid, lines })`) and `GUEST_CART_MAX_LINES = 50`, with qty 1..`MAX_LINE_QTY` imported from ../cart
  - a barrel `index.ts`

## API

- [ ] T16 Add apps/api/src/guest-cart/guest-cart-cookie.ts. It never logs the cookie value (AC4, AC8). T3 green:
  - `getGuestCartSecret()`, which throws when the secret is unset or empty
  - `sign` / `verify` with `createHmac("sha256")`, then a length check and `timingSafeEqual` as in apps/api/src/common/proxy-secret.middleware.ts:25-31
  - a lenient `read(req)` per AC4, with no exceptions escaping
  - `write(res, cart)` / `clear(res)` using the shared name and attributes, keeping the cart id or creating one with `randomUUID()`
- [ ] T17 Add apps/api/src/guest-cart/guest-cart.service.ts with `view`, `add`, `setQuantity`, `remove` (AC2, AC3, AC4). T5 view/edit cases green:
  - they are pure line edits validated against `ProductVariant.stock`, read through `PrismaService`
  - `view` maps to the shared `CartResponse` with `calculateCartTotals`
  - over the limit, an unknown variant or an inactive product → `BadRequestException({ fieldErrors })`; `view` marks inactive lines `available: false`
- [ ] T18 Edit apps/api/prisma/schema.prisma (wiring edit): add `GuestCartMerge { cartId String @id, userId → User onDelete Cascade, createdAt }` and the `User.guestCartMerges` back-relation; run `prisma migrate dev --name guest_cart_merge`. Then add `mergeIntoUser(userId, cart)` and `mergeFromCookie(userId, rawCookie)` to the same service (AC5, AC6). T5 merge cases and T10 green:
  - `mergeIntoUser` runs one `$transaction`: insert `GuestCartMerge { cartId, userId }` first, upsert the Cart, re-read stock and `isActive`, then upsert each item on `[cartId, variantId]` at min(guest + db, 10, stock), skipping sold-out or unknown variants and inactive products. A P2002 on the `GuestCartMerge` insert returns `{ merged: true }` with nothing else written. It writes Prisma directly, with no CartService import.
  - `mergeFromCookie` returns `{ merged }`. It runs `verify` + `read`, then the merge, and returns `merged: true` only after a commit. Errors propagate to `runOnSignedIn`.
- [ ] T19 Add apps/api/src/guest-cart/guest-cart.module.ts (AC8). T5 module cases green:
  - it provides and exports `GuestCartService` and imports no Cart or Auth module
  - `onModuleInit` calls `getGuestCartSecret()` (the AuthModule pepper pattern at auth.module.ts:17-20) and sets `signInHooks.onSignedIn = (userId, ctx) => service.mergeFromCookie(userId, ctx.guestCart)`
  - add `GUEST_CART_SECRET` to the CI env in .github/workflows/ci.yml next to `PASSWORD_PEPPER` (wiring edit). apps/api/.env.example:13 already has it.
- [ ] T20 Edit apps/api/src/auth/on-signed-in.ts and apps/api/src/auth/auth.service.ts (wiring edits). AuthService stays HTTP-free (AC5, AC6). T6 on-signed-in cases green:
  - `onSignedIn(userId, ctx: ClientInfo)` and `runOnSignedIn` return `Promise<{ merged: boolean }>`. The catch returns `{ merged: false }` and keeps the existing userId-only log.
  - Pass the `ClientInfo` at auth.service.ts:93 (signup) and :130 (login, still inside the 1500ms padding).
  - Add `merged` to `SignedIn`.
- [ ] T21 Edit apps/api/src/auth/auth.controller.ts (wiring edit) (AC5, AC6). T6 controller cases green:
  - `clientInfo(req)` at :37-43 adds `guestCart: req.cookies?.[guestCartCookieName()]`, the same way as `previousToken`
  - `signedIn(res, …)` at :50-62 also clears the guest cookie with the shared clear attributes when `merged` is true
- [ ] T22 Add `OptionalAuthGuard` to apps/api/src/auth/auth.guard.ts, factoring the shared validate / renew / no-store steps out of `AuthGuard` (:30-53) so they are not copied. Add `@CurrentUserOrNull()` to apps/api/src/auth/current-user.decorator.ts, and export the guard from apps/api/src/auth/auth.module.ts:14 (wiring edits) (AC7, AC8). T7 green
- [ ] T23 Edit apps/api/src/cart/cart.controller.ts and cart.module.ts (wiring edits) (AC1–AC4, AC7, AC8). T8 and T9 green, and T6 from the cart spec still green:
  - switch to `@UseGuards(OptionalAuthGuard)` with `@CurrentUserOrNull()`
  - with a user, use `CartService` as before and ignore the guest cookie
  - without one, use `GuestCartService`. On the three POSTs only, call `write(res, lines)` after a successful edit, with no write on a 400
  - `CartModule` imports `GuestCartModule`
  - keep the SecurityHeaders → ProxySecret → OriginCheck chain unchanged

## Web

- [ ] T24 Edit apps/web/src/features/cart/AddToCartButton.tsx (wiring edit): remove the 401 → `buildLoginUrl` redirect. A guest 200 follows the same `router.refresh()` + `aria-live` path as a signed-in 200 (AC1). T11 AddToCartButton cases green
- [ ] T25 Edit apps/web/src/features/cart/load-cart.ts, apps/web/src/features/cart/CartEmpty.tsx and apps/web/src/app/cart/page.tsx (wiring edits) (AC2). T11 loader/CartEmpty cases green:
  - remove the `signedOut` branch and prop
  - a guest with no lines gets the plain `CartEmpty`
  - a guest with lines gets lines + `OrderSummary`, whose Checkout link to `/checkout` is unchanged
  - no Prisma in apps/web
- [ ] T26 Edit apps/web/src/features/session/HeaderSession.tsx (wiring edit): call `apiFetch("/cart/count", { cache: "no-store" })` when signed out too, with the same 0 fallback. Leave the LoginBanner.tsx:16-17 copy unchanged (AC9). T12 green

## Wiring and docs

- [ ] T27 Check the diff stays within Covers (apps/api/src/guest-cart/**, packages/shared/src/guest-cart/**, apps/web/e2e/guest-cart.spec.ts) plus these wiring edits:
  - packages/shared/src/index.ts (T15)
  - apps/api/prisma/schema.prisma + the guest_cart_merge migration (T18)
  - .github/workflows/ci.yml (T19)
  - apps/api/src/auth/on-signed-in.ts, auth.service.ts, auth.controller.ts, auth.guard.ts, current-user.decorator.ts, auth.module.ts and their tests (T6, T7, T20–T22)
  - apps/api/src/cart/cart.controller.ts, cart.module.ts, cart.controller.test.ts (T9, T23)
  - apps/web/src/features/cart/AddToCartButton.tsx, load-cart.ts, CartEmpty.tsx and their tests, apps/web/src/app/cart/page.tsx, apps/web/e2e/cart.spec.ts (T11, T13, T24, T25)
  - apps/web/src/features/session/HeaderSession.tsx + test (T12, T26)

  Also confirm `GUEST_CART_SECRET` never appears in apps/web or packages/shared
- [ ] T28 Update softwareos/products/stride/epics/cart-checkout/tech-plan.md:
  - Make the `guest-cart-merge` candidate line say: HMAC-signed `[variantId, qty]` cookie, re-priced server-side, full guest cart, merge on login/sign-up at min(guest + db, 10, stock) in one transaction, cookie cleared only after a successful merge.
  - Fix the stale hook description in Risks (~line 21, still `src/features/auth/hooks.ts` / Server Actions) to `signInHooks.onSignedIn(userId, ctx)` in apps/api/src/auth/on-signed-in.ts, returning `{ merged }`.

  Then check softwareos/products/stride/architecture.md. The guest cart line (~32) and the endpoint exception (~52) already exist. Add:
  - the cookie name, attributes and 30-day Max-Age
  - `OptionalAuthGuard` as the guard for the cart endpoints
  - the rule that only browser `/api/cart/*` POSTs and sign-in responses set or clear the guest cookie

## Verification

- [ ] T29 Run the full suites green (testing skill):
  - `npm run lint`, `npm run typecheck`, and `npm test` (shared + api + web) with `TEST_DATABASE_URL` and `GUEST_CART_SECRET` set so T10 runs
  - `npm run test:e2e` against a seeded DB: guest-cart.spec.ts, the updated cart.spec.ts, auth.spec.ts, protected-routes.spec.ts and all existing specs

  Then check:
  - every new or edited test has its `covers AC<n>, T<n>` comment
  - each of AC1–AC9 has at least one test
  - `grep -r "@prisma" apps/web/src` finds nothing
- [ ] T30 Security review of the guest cookie and the unauthenticated mutation path (security-reviewer agent). Check:
  - HMAC sign/verify, the constant-time compare and the length check before it
  - lenient parsing can't throw a 5xx
  - the cookie size cap
  - no secret or cookie value in logs, including `runOnSignedIn`'s catch
  - `OptionalAuthGuard` can't skip the session check on a signed-in path
  - guest POSTs make no DB writes and pass ProxySecret + OriginCheck
  - userId at merge comes only from the session
  - a failed merge can't block sign-in or leak timing beyond the 1500ms login padding
  - the guest cookie is cleared only on `merged: true`
- [ ] T31 Run QA against acceptance criteria AC1–AC9 (qa skill):
  - as a guest, add from `/product/stride-glide-road-shoe` and check the badge updates without a reload
  - /cart as a guest (filled and empty) against the Cart/CartEmpty designs at desktop and 375px
  - stepper cap, the 51st line and an unknown variant with curl → 400 and the cookie unchanged
  - a tampered cookie → empty cart, no 5xx
  - log in and sign up with a guest cookie → merged lines and cookie cleared; replaying the same cookie on a second login adds nothing
  - an inactive product in the guest cart shows "No longer available" and is skipped by the merge
  - a forced merge failure → sign-in succeeds and the cookie is kept
  - signed in, the guest cookie is ignored
  - foreign Origin → 401, and `Cache-Control: private, no-store` on every cart response
  - the API refuses to boot without `GUEST_CART_SECRET`
  - the diff is limited to Covers + the T27 wiring edits
