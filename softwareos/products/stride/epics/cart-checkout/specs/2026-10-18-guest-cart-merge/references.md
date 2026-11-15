# References for Guest Cart Merge

## Related Specs

<!-- Populated by /shape-spec Step 4 (Pre-Flight Integrity Check). -->

- **[Related]** [cart-checkout / 2026-10-18-cart](../2026-10-18-cart/spec.md): overlaps on `apps/api/src/cart/**`, `apps/web/src/features/cart/**`, `apps/web/src/app/cart/**`, `apps/web/e2e/cart.spec.ts`. Kept separate because the guest cookie, its signing and the merge live in their own folders, and the cart's controller, module, web components and e2e change only as wiring edits (T9, T11, T13, T23–T25). T1.1 amends that spec's AC2, AC9, AC10 and T18 for guests via /spec-changes.
- **[Related]** [accounts-auth / 2026-10-13-auth-api-migration](../../../accounts-auth/specs/2026-10-13-auth-api-migration/spec.md): overlaps on `apps/api/src/auth/**`. Kept separate because the edits are wiring only (T6, T7, T20–T22): `onSignedIn(userId, ctx)` returns `{ merged }`, `ClientInfo.guestCart`, `signedIn()` clears the guest cookie, and `OptionalAuthGuard` / `@CurrentUserOrNull()` sit next to `AuthGuard`. The standard says only auth/ touches session tokens.
- **[Related]** [accounts-auth / 2026-10-11-protected-routes](../../../accounts-auth/specs/2026-10-11-protected-routes/spec.md): overlaps on `apps/web/src/features/session/**`. Kept separate because the edit is wiring only: `HeaderSession` fetches the count for guests (T12, T26). The `LoginBanner` copy ("Your cart is saved and will be added to your account.") becomes true unchanged.
- **[Considered]** [accounts-auth / 2026-10-08-signup-login](../../../accounts-auth/specs/2026-10-08-signup-login/spec.md), [2026-10-08-app-foundation](../../../accounts-auth/specs/2026-10-08-app-foundation/spec.md), [2026-10-13-api-foundation](../../../accounts-auth/specs/2026-10-13-api-foundation/spec.md): weak body-scan hits on "guest cart". Dismissed in Step 4d as hand-offs: they define the no-op `onSignedIn` hook and list `GUEST_CART_SECRET` in `.env.example`, deferring the merge to this spec.

## Upstream Meeting

_None._

## Visuals

None new. Guests see the same stride-design pages the cart spec references: `Cart.dc.html`, `CartEmpty.dc.html`, `MobileCart.dc.html`.

## Similar Implementations

### Cookie helpers

- **Location:** `packages/shared/src/session-cookie.ts:12-54`, `apps/api/src/auth/session-cookie.ts:14-29`
- **Relevance:** Name and attribute pattern for the guest cookie.
- **Key patterns:**
  - the `__Host-` name in production only
  - `{ httpOnly, secure: isProduction(), sameSite: "lax", path: "/" }`
  - `clearCookie` needs the same attributes
  - the readers accept both names, because e2e runs the web in production mode and the API in test mode

### Sign-in hook

- **Location:** `apps/api/src/auth/on-signed-in.ts`, `auth.service.ts:93` and `:130`, `auth.controller.ts:37-62`
- **Relevance:** Where the merge plugs in.
- **Key patterns:**
  - `runOnSignedIn` swallows errors and logs only the userId
  - AuthService is HTTP-free, and cookie values reach it through `ClientInfo` (like `previousToken`)
  - `signedIn()` is the one place the response cookies are set
  - the login padding (1500ms) hides the merge time

### Guards

- **Location:** `apps/api/src/auth/auth.guard.ts:30-53`, `current-user.decorator.ts`, `auth.module.ts:11-20`
- **Relevance:** `OptionalAuthGuard` is factored out of `AuthGuard`. The module's `onModuleInit` pepper check is the pattern for the `GUEST_CART_SECRET` boot check.

### Constant-time compare

- **Location:** `apps/api/src/common/proxy-secret.middleware.ts:25-31`, `apps/api/src/cron/cron.controller.ts`
- **Key patterns:** a Buffer length check, then `timingSafeEqual`. No HMAC helper exists yet.

### Read path vs. write path

- **Location:** `apps/web/src/lib/api-client.ts:27-40`, `apps/web/src/lib/api-proxy.ts:51-69`, `apps/web/src/proxy.ts:22-24`
- **Relevance:** `apiFetch` forwards the Cookie header, so a Server Component can read the guest cart, but its Set-Cookie never reaches the browser. All guest cookie writes happen on browser `/api/cart/*` POSTs and the login/sign-up fetch.

### Tests

- **Location:** `apps/api/src/auth/testing/fake-db.ts`, `apps/api/src/auth/auth.controller.test.ts`, `apps/api/src/catalog/catalog.controller.test.ts:72-82`
- **Key patterns:**
  - the fake DB's `$transaction` rolls back from a snapshot and logs `inTransaction`, but has no upsert
  - tests use native `fetch` on `app.listen(0)` and `res.headers.getSetCookie()` for several cookies
  - AppModule tests must add `app.use(cookieParser())` themselves

### Middleware facts

- `apps/api/src/app.module.ts:32-38`: SecurityHeaders → ProxySecret → OriginCheck on `forRoutes("*")`
- `origin-check.middleware.ts`: returns 401, not 403, on a foreign Origin
