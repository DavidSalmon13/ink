# References for Order Confirmation

## Related Specs

- **[Considered]** [2026-10-18-checkout-order](../2026-10-18-checkout-order/spec.md): matched by route prefix (`/checkout/confirmation/[orderId]` under `/checkout`, `/api/orders/:id` under `/api/orders`). It was dismissed in Step 4d as a different concern. checkout-order's Out of Scope hands the confirmation page and the landing → confirmation e2e to this spec. This spec still makes wiring edits to its planned `apps/api/src/order/**`, `packages/shared/src/order/**` and `apps/web/e2e/checkout.spec.ts`.
- **[Related]** account-wishlist (not shaped yet): owns order history and `stride-design/pages/OrderDetail.dc.html`. It adds the design's "View in my orders" button to this page when order history ships.

## Upstream Meeting

_None._

## Design

- `stride-design/pages/OrderConfirmed.dc.html`. The two departures from it:
  - the Payment box reads "Demo card — nothing was charged" with no last-4, because no card data is stored
  - "View in my orders" is hidden
- The `#STR-` prefix is built from `Order.number`.

## Similar Implementations

### Guarded GET with a "never 403" 404

- **Location:** `apps/api/src/account-security/account-security.controller.ts`
- **Relevance:** `AuthGuard` + `@CurrentUser()`. An unknown or foreign row is a bare `NotFoundException()`.
- **Key patterns:** userId only from the session; the same 404 for "missing" and "not yours".

### Path-param pre-validation, select + mapper

- **Location:** `apps/api/src/catalog/catalog.controller.ts` (`getProduct`), `apps/api/src/catalog/product-detail.service.ts`
- **Relevance:** rejects a malformed param before querying; `…_SELECT satisfies Prisma.…Select` with `findFirst` and a mapper.
- **Key patterns:** `ORDER_VIEW_SELECT` + `toOrderView`; `findFirst({ where: { id, userId } })`.

### API tests

- **Location:** `apps/api/src/admin/stock/stock.controller.test.ts`, `apps/api/src/catalog/product-detail.db.test.ts`
- **Relevance:** an HTTP test through `AppModule` with a Proxy-merged fake DB and `sessionFor()`; a DB test gated on `TEST_DATABASE_URL`.

### Protected server page + loader

- **Location:** `apps/web/src/app/account/security/page.tsx`, `apps/web/src/features/product/load-product.ts`, `apps/web/src/features/session/require-user.ts`, `apps/web/src/lib/api-client.ts`
- **Relevance:** static shell + `Suspense` + `requireUser(path)`; `apiFetch` with 401 → login redirect and 404 → null → `notFound()`.
- **Key patterns:** titles `"<Name> · Stride"`. With cacheComponents, `notFound()` renders as 200 + noindex (see `features/product/product-page-proxy.ts`), which is accepted here.

### Route protection

- **Location:** `apps/web/src/features/session/guard.ts` (`PROTECTED_PREFIXES` includes `/checkout`), `apps/web/src/lib/private-paths.ts`
- **Relevance:** `/checkout/confirmation/*` is already protected and no-store; no proxy change is needed.

### E2E

- **Location:** `apps/web/e2e/shopping-journey.spec.ts`, `apps/web/e2e/protected-routes.spec.ts`, `apps/web/playwright.config.ts`
- **Relevance:** the journey style that reads names off the page; local `uniqueEmail`/`signUp` helpers; the `chromium` / `admin-writes` projects.

### UI pieces

- **Location:** `apps/web/src/features/catalog/format-price.ts` (`formatPriceCents`), `ProductImage` (product-images), `apps/web/src/components/ui/` (`buttonClassName`, `SpinnerBlock`)
