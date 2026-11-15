# References for Cart

## Related Specs

<!-- Populated by /shape-spec Step 4 (Pre-Flight Integrity Check). -->

- **[Considered]** [catalog-search / 2026-10-18-product-detail](../../../catalog-search/specs/2026-10-18-product-detail/spec.md) — matched on `apps/web/src/features/product/**`, `apps/web/e2e/product-detail.spec.ts`; dismissed in Step 6 recheck: wiring only (AddToCartButton goes in `ProductPurchasePanel`'s `actions` slot; its no-cart-button tests change). `variantId` on variants is added via /spec-changes on that spec (T1.1).
- **[Considered]** [accounts-auth / 2026-10-11-protected-routes](../../../accounts-auth/specs/2026-10-11-protected-routes/spec.md) — matched on `apps/web/src/features/session/**`; dismissed: wiring only (`HeaderSession` passes `cartCount` to `Header`).
- **[Considered]** [accounts-auth / 2026-10-13-api-foundation](../../../accounts-auth/specs/2026-10-13-api-foundation/spec.md) — matched on `apps/api/prisma/schema.prisma`, `apps/api/src/app.module.ts`, `packages/shared/src/index.ts`; dismissed: wiring only (Cart models, module registration, re-export).
- **[Considered]** [catalog-search / 2026-10-18-product-catalog](../../../catalog-search/specs/2026-10-18-product-catalog/spec.md) — matched on `apps/web/src/features/catalog/**`; dismissed: wiring only (imports `formatPriceCents`, `ProductArt`).

## Upstream Meeting

_None._

## Visuals

Referenced in place (not copied):

- `stride-design/pages/Cart.dc.html` — filled cart, order summary, free-shipping hint
- `stride-design/pages/CartEmpty.dc.html` — empty state
- `stride-design/pages/MobileCart.dc.html` — 375px layout
- `stride-design/design-system/components/CartItem/` — line anatomy, "Low stock" note when capped
- `stride-design/design-system/components/QuantityStepper/` — min 1, max 10 or stock; remove via link, not qty 0

## Similar Implementations

### Catalog API module

- **Location:** `apps/api/src/catalog/`
- **Relevance:** Closest Nest module with Prisma reads and shared Zod DTOs.
- **Key patterns:** module/controller/service split; `X_SELECT satisfies Prisma.*Select` + row mapper; controller tests over real HTTP via `AppModule` with `PrismaService` overridden; `*.db.test.ts` with `describe.skipIf(!process.env.TEST_DATABASE_URL)`.

### Guarded endpoints

- **Location:** `apps/api/src/auth/auth.guard.ts`, `apps/api/src/auth/current-user.decorator.ts`, `apps/api/src/account-security/account-security.controller.ts`
- **Relevance:** Every cart route is private.
- **Key patterns:** `@UseGuards(AuthGuard)` on the class, `@CurrentUser() user: SessionUser`; module imports `AuthModule`; guard sets `Cache-Control: private, no-store`.

### Validation and merge hook

- **Location:** `apps/api/src/auth/zod-body.pipe.ts`, `apps/api/src/auth/on-signed-in.ts`
- **Relevance:** Body validation → 400 `{ fieldErrors }`; `onSignedIn(userId)` is where guest-cart-merge plugs in later.

### Shared schemas

- **Location:** `packages/shared/src/catalog/`
- **Key patterns:** camelCase `*Schema`, `z.strictObject`, `z.infer` types, constants beside schemas, barrel `index.ts` re-exported from the root.

### Web data access

- **Location:** `apps/web/src/lib/api-client.ts` (`apiFetch`), `apps/web/src/features/session/current-session.ts`, `apps/web/src/features/account-security/ChangePasswordForm.tsx`
- **Key patterns:** server components use `apiFetch` with `cache: "no-store"` and treat 401 as signed out; client components POST to `/api/...` and parse with shared schemas.

### Existing hooks for the cart

- `apps/web/src/components/layout/Header.tsx` — already takes `cartCount?: number` (badge hidden at 0).
- `apps/web/src/features/session/guard.ts` — `/cart` is not in `PROTECTED_PREFIXES` and must stay public.
- `apps/web/src/features/catalog/format-price.ts` — `formatPriceCents`.
