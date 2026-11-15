# References for Checkout & Order

## Related Specs

<!-- Populated by /shape-spec Step 4 (Pre-Flight Integrity Check). -->

- **[Related]** [cart-checkout / 2026-10-18-cart](../2026-10-18-cart/spec.md): no Covers overlap. This spec imports `calculateCartTotals`, `cartResponseSchema` and the cart constants from `packages/shared/src/cart/`, reads CartItem rows and deletes them at order time, and relies on `OrderSummary`'s Checkout link to `/checkout`. Nothing under the cart spec's Covers is edited (T20 checks this).
- **[Related]** [accounts-auth / 2026-10-13-api-foundation](../../../accounts-auth/specs/2026-10-13-api-foundation/spec.md): overlaps on `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts` and `packages/shared/src/index.ts`. These are wiring edits only (T2, T11, T14): the new models + migration, `OrderModule` registration and the shared barrel export.
- **[Considered]** [accounts-auth / 2026-10-11-protected-routes](../../../accounts-auth/specs/2026-10-11-protected-routes/spec.md), [2026-10-11-security-headers](../../../accounts-auth/specs/2026-10-11-security-headers/spec.md), [2026-10-08-signup-login](../../../accounts-auth/specs/2026-10-08-signup-login/spec.md), [cart-checkout / 2026-10-18-cart](../2026-10-18-cart/spec.md), [2026-10-18-guest-cart-merge](../2026-10-18-guest-cart-merge/spec.md): weak body-scan hits on `/checkout`. Dismissed in Step 4d as hand-offs: they guard /checkout, set no-store on it, show the "Log in to check out" banner or link to it, and all defer the real page to cart-checkout.

## Upstream Meeting

_None._

## Visuals

- `stride-design/pages/Checkout.dc.html`: the three numbered sections (Shipping address, Shipping, Payment), field labels, the phone hint, the demo-payment notice, the "Place order · $<total>" button, the sold-out message and the "In your cart" summary with Edit.
- `stride-design/pages/CheckoutErrors.dc.html`: the error state. It renders Checkout with `errors` set (ZIP "Enter a 5-digit ZIP code.", card "Card number should be 16 digits."). The file itself is a shell, so take other messages from the rendered design.

## Similar Implementations

### Form with inline errors

- **Location:** `apps/web/src/features/auth/` (`submit-auth.ts`, `form-state.ts`, `use-auth-form.ts`, `FormError.tsx`, `LoginForm.tsx`), `apps/web/src/features/account-security/ChangePasswordForm.tsx`, `apps/web/src/components/ui/Input.tsx`
- **Relevance:** The checkout form follows the same pattern.
- **Key patterns:**
  - a client `useActionState` whose action `fetch`es `/api/...` with JSON (no Server Action)
  - blur + submit validation with the same shared Zod schema; `errorFor(field)` prefers client errors over server ones
  - form state never keeps sensitive values (the password there, card fields here)
  - `Input`'s `error` prop replaces the hint and sets `aria-invalid` / `aria-describedby`

### Body validation and errors

- **Location:** `apps/api/src/auth/zod-body.pipe.ts`, `packages/shared/src/auth/schemas.ts` (`fieldErrorsOf`), `apps/api/src/common/body-parsing.ts`
- **Key patterns:**
  - `@Body(new ZodBodyPipe(schema))` → 400 `{ fieldErrors: Record<string,string> }` with flat keys and schema messages only, never the submitted values
  - malformed JSON on non-auth routes gets a generic 400 that never echoes the body

### Guards and middleware

- **Location:** `apps/api/src/auth/auth.guard.ts`, `apps/api/src/auth/current-user.decorator.ts`, `apps/api/src/common/proxy-secret.middleware.ts`, `apps/api/src/common/origin-check.middleware.ts`, `apps/api/src/app.module.ts`
- **Key patterns:**
  - `AuthGuard` sets `Cache-Control: private, no-store` and a generic 401
  - `@CurrentUser()` gives `{ id, email, name }`
  - OriginCheck returns 401 on a foreign Origin for writes
  - SecurityHeaders → ProxySecret → OriginCheck apply to `"*"`, so a new module is covered once it's in `imports`

### Service select + mapper

- **Location:** `apps/api/src/catalog/catalog.service.ts`, `apps/api/src/catalog/product-detail.service.ts`
- **Key patterns:** `const X_SELECT = {...} satisfies Prisma.XSelect`, `Prisma.XGetPayload<{ select: typeof X_SELECT }>` row types, and an exported row → shared-type mapper.

### Tests

- **Location:** `apps/api/src/auth/testing/fake-db.ts`, `apps/api/src/catalog/catalog.controller.test.ts`
- **Key patterns:**
  - the auth fake has tables only for user/session/authAttempt and no numeric `decrement` / `gte`, so the order tests get their own fake (T4)
  - its `$transaction` snapshots and rolls back on throw, and it logs `inTransaction`
  - controller tests run `AppModule` on `app.listen(0)` with native `fetch` and Prisma overridden

### Web plumbing

- **Location:** `apps/web/src/lib/api-client.ts` (`apiFetch`), `apps/web/src/features/session/require-user.ts`, `apps/web/src/features/session/guard.ts`, `apps/web/src/features/product/load-product.ts`
- **Key patterns:**
  - `/checkout` is already in `PROTECTED_PREFIXES` and is private / no-store via `lib/private-paths.ts`
  - protected pages call `requireUser(path)`
  - loaders are `server-only` and use `apiFetch(..., { cache: "no-store" })`; they map 404, throw on other non-200s and parse with a shared schema

### Logging

- There is no pino and no redaction config. Nest `Logger` is used only in `auth/on-signed-in.ts` and `prisma/prisma.service.ts`, and `lib/api-proxy.ts` has one `console.error`.
- Card data stays out of logs by design: it is validated, then dropped, and never logged. T5, T6 and T22 enforce this.

### Data facts

- `apps/api/prisma/schema.prisma`: `Product.priceCents Int` (CHECK > 0) and `ProductVariant.stock Int` (CHECK >= 0, `@@unique([productId, size])`). No Address, Order or OrderItem models exist before this spec.
