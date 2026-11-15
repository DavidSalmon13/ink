# References for Shoe Finder Chat

## Related Specs

- **[Related]** [2026-10-18-home-page](../2026-10-18-home-page/spec.md) — owns `apps/web/src/app/page.tsx`; this spec adds only the one-line `<ShoeFinderLauncher />` mount there.
- **[Related]** [2026-10-18-product-catalog](../2026-10-18-product-catalog/spec.md) — owns `apps/web/src/app/catalog/page.tsx` (one-line mount) and `GET /catalog/products`, which this spec reads unchanged; "See all matching shoes" reuses its `catalog-href.ts`.
- **[Related]** [2026-10-21-sale-pricing](../2026-10-21-sale-pricing/spec.md) — result cards reuse its `features/pricing/PriceTag`, and the budget filter relies on its effective-price `min`/`max`.

## Upstream Meeting

_None._

## Similar Implementations

### Product card

- **Location:** `apps/web/src/features/catalog/ProductCard.tsx`
- **Relevance:** The result card is a compact version of it.
- **Key patterns:** `ProductImage` for image/art fallback, `PriceTag size="card"`, link to `/product/${slug}`, beginner tag styling.

### Chip / pill buttons in a client component

- **Location:** `apps/web/src/features/home/FeaturedTabs.tsx`
- **Relevance:** Same pill look and `aria-pressed` buttons for answer chips.
- **Key patterns:** `rounded-pill`, `border-line-strong`, `focus-visible:shadow-focus`.

### Browser fetch to the API

- **Location:** `apps/web/src/features/auth/submit-auth.ts`, `apps/web/src/features/catalog/load-catalog-products.ts`
- **Relevance:** The browser calls same-origin `/api/*` (no Server Actions); the server loader shows the parse with `catalogProductsResponseSchema`.

### Catalog query helpers

- **Location:** `packages/shared/src/catalog/query.ts`, `apps/web/src/features/catalog/catalog-href.ts`
- **Relevance:** `catalogQueryToSearchParams` builds the fetch URL and the "See all matching shoes" link; `min`/`max` are dollars.
