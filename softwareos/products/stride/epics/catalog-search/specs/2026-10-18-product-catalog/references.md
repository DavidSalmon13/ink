# References for Product Catalog

## Related Specs

- **[Considered]** [2026-10-18-catalog-foundation](../2026-10-18-catalog-foundation/spec.md): its globs `apps/api/src/catalog/**` and `packages/shared/src/catalog/**` match this spec's `catalog.*` and `query*.ts` files. The overlap was dismissed in Step 4d. Foundation owns the data layer (models, enums, size sets, catalog data, loader, seed), and its Out of Scope section hands "Catalog API endpoints and response schemas" and the pages and ProductCard/ProductArt to product-catalog. This spec adds files next to foundation's in those folders and makes a one-line barrel export as a wiring edit.

## Upstream Meeting

None.

## Similar Implementations

### Design handoff: the catalog page

- **Location:** `stride-design/pages/Catalog.dc.html`, `CatalogEmpty.dc.html`, `CatalogLoading.dc.html`, `MobileCatalog.dc.html`. Per `stride-design/HANDOFF.md`, these are visual references to rebuild in Next.js + Tailwind, not code to copy.
- **Relevance:** the layout, copy, controls, empty state and loading state that AC6–AC12 are checked against.
- **Key patterns:**
  - **Filter logic** (Catalog.dc.html, around L174–198):
    - Search matches the name only, case-insensitive and trimmed.
    - Values are OR'd within a group and AND'd across groups.
    - Price is inclusive on both ends.
    - Each facet's counts exclude that facet's own group.
    - Sort is by price only, with Featured as the default.
    - `clearAll` keeps the sort.
  - **URL params comment** (L64): `?category=&run=&gender=&min=&max=`.
  - **Active chips** (L195–198) and the **price chip format** (L197).
  - **Empty state:** suggestions are `shoe`/`socks`/`tee`, plus a 3-product "Popular with beginners" grid (CatalogEmpty L112–117, L218–220).
  - **Loading state:** `aria-busy`, a hidden status, and skeletons for the title, tiles and a 6-card grid. The pulse is off under reduced motion.
  - **Mobile:** MobileCatalog embeds Catalog at 375px. Filters stack above the grid at ≤760px; there is no drawer.

### Design handoff: components

- **Location:** `stride-design/design-system/components/index.d.ts`, `bundle.js`, `bundle.css`. The ones used here are ProductCard (L42–68), ProductArt (L69–81), Badge (L13) and Price (L16–24). The CSS variables are in `tokens.css`, which already maps to `apps/web/src/styles/tokens.css`.
- **Relevance:** ProductCard and ProductArt are rebuilt as Server Components in `apps/web/src/features/catalog/`. Later, product-detail and home-page reuse them.
- **Key patterns:**
  - **Card:** a 4:5 art well, then the guide badge with the tag, an h3 name, a meta line and the price (`Intl.NumberFormat` en-US).
  - **Sold-out:** the card shows an `Out of stock` badge, the art drops to 0.6 opacity, and the card stays clickable.
  - **Wishlist:** the design shows a `WishlistButton`, but it is omitted here (see Out of Scope).
  - **Missing primitives:** the design system has no FilterChip, SearchInput, Select, Checkbox or Skeleton, so the catalog builds them inline.

### Web: server-rendered page reading the API

- `apps/web/src/app/account/security/page.tsx`: static shell, `<Suspense>` around an async Server Component, and a page-local loader. The loader uses `apiFetch(..., { cache: "no-store" })`, throws on non-200 and does a Zod `parse`.
- `apps/web/src/lib/api-client.ts`: `apiFetch(path, init)`. It's server-only, reads `headers()`, and forwards the cookie and trusted proxy headers. `next.config.ts` has `cacheComponents: true`, so the dynamic parts go inside Suspense.
- `apps/web/src/features/account-security/**`: Server Components plus small `"use client"` components. Pure helpers have co-located tests.

### API: module, validation, tests

- `apps/api/src/account-security/account-security.controller.ts` and `.module.ts`: controller/module layout and registration in `apps/api/src/app.module.ts`.
- `apps/api/src/auth/zod-body.pipe.ts`: `ZodBodyPipe` returns 400 `{ fieldErrors }`. It is reused on `@Query()`.
- `apps/api/src/prisma/prisma.service.ts`: `@Global()` PrismaService. Queries use an explicit `select`.
- `apps/api/src/common/proxy-secret.middleware.ts`: the public GET still needs the secret.
- `apps/api/src/auth/testing/fake-db.ts`: the in-memory fake Prisma. `account-security.controller.test.ts` shows the HTTP test pattern (`createNestApplication` + `fetch`), and `auth/session.db.test.ts` the `TEST_DATABASE_URL` pattern.

### Shared Zod

- `packages/shared/src/auth/` and `packages/shared/src/account-security/`: schema naming (`…Schema`, `…ResponseSchema`, `z.infer` types) and per-folder barrels.

### Header, footer and e2e

- `apps/web/src/components/layout/Header.tsx`: the placeholder search `div role="search"` (marked "catalog-search wires search to the URL") and the nav links `/catalog?category=…`. `Header.test.tsx` mocks `next/navigation`.
- `apps/web/src/components/layout/Footer.tsx`: links to `/catalog?run=road|trail|race-day` and `?category=…`, which fixes the URL slugs this spec uses.
- `apps/web/e2e/` and `apps/web/playwright.config.ts`: the e2e location. Tests that need the database skip without `TEST_DATABASE_URL`.

## Wiring edits (files other specs own)

- `packages/shared/src/catalog/index.ts` (catalog-foundation)
- `apps/api/src/app.module.ts` (api-foundation)
- `apps/web/src/components/layout/Header.tsx` and `Header.test.tsx` (app-foundation)
- `softwareos/products/stride/epics/catalog-search/tech-plan.md`
- `softwareos/products/stride/architecture.md` (only if needed, see T21)

## Known design-doc drift

- **Grid columns:** `design-system/README.md` says at most 3 per row. The ProductCard README and `tokens.json` say 2/3/4 columns at 640/960/1280. The pages use auto-fill with a 280px minimum (400px when filters are hidden). This spec follows the pages.
- **Header nav:** the Header README lists 3 links (Shoes · Apparel · Gear), but the pages pass 6 (plus Road, Trail, Race day). This spec leaves the nav unchanged.
- **Search placeholders:** the header uses `Search shoes, apparel, gear` and the catalog uses `Search by name, e.g. trail shoe`. Both are kept as designed.
- **Wishlist and cart buttons:** `tech-plan.md` says to "place" the add-to-cart and wishlist buttons now. This spec doesn't (no dead buttons), and T20 updates the tech plan to match.
