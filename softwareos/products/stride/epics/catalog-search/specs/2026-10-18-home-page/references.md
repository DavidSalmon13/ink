# References for Home Page

## Related Specs

- **[Considered]** [accounts-auth / 2026-10-08-app-foundation](../../../accounts-auth/specs/2026-10-08-app-foundation/spec.md): its spec mentions `src/app/page.tsx`, but only as a throwaway placeholder that it "is **not** claimed — `catalog-search` owns `/`". This was dismissed in Step 4d. app-foundation owns the layout, header and footer, and this spec doesn't touch any of them. The candidate `/` was matched exactly, not as a prefix, because a prefix match on the root route would hit every route.
- **[Related]** [2026-10-18-product-catalog](../2026-10-18-product-catalog/spec.md): the source of `loadCatalogProducts`, `catalogQueryToSearchParams`, `ProductCard`, `ProductArt` and the `/catalog` URL params. This spec reuses them and doesn't edit them.
- **[Related]** [2026-10-18-product-detail](../2026-10-18-product-detail/spec.md): the last step of the journey e2e (the size picker and stock line). This spec reuses it and doesn't edit it.

## Upstream Meeting

None.

## Similar Implementations

### Design handoff: the home page

- **Location:** `stride-design/pages/Main.dc.html` and `MobileHome.dc.html`. MobileHome embeds Main at 375px. `HANDOFF.md:21-23` maps Main to `/`.
- **Relevance:** the section order, copy and layout that AC2–AC8 are checked against.
- **Key patterns:**
  - **Section order** (L24–156): hero, Shop by run, Smaller on purpose, Featured for beginners, No jargon, Shop by category, trust strip.
  - **Hero** (L29–50): eyebrow, H1, body, two CTAs, and a ProductArt shoe positioned on the right.
  - **≤760px rules** (L20): hide the hero art, set the hero min-height to 520, and use 16px padding.
  - **Run tiles** (L53–68, data L200–204): each tile is a single link with a 4:3 ProductArt, a name, a description and a "Shop {name}" button that fills on hover.
  - **Featured rail** (L88–105, logic L185):
    - Tabs are `aria-pressed` buttons in a `role="group"` labelled "Show products for".
    - The filter is `tab === 'Beginner picks' ? p.pick : p.cat === tab`, then `.slice(0, 3)`.
    - "Shop all" links to the catalog.
  - **Static bands:** "Smaller on purpose" (L71–85) and "No jargon" (L108–126).
  - **Category tiles** (L129–140).
  - **Trust strip** (L143–152): two of the design's icons are swapped (clock and lock). This spec gives each perk a matching icon.
  - **Unused data:** `drops`, `steps`, and the carousel paging state (`page`, `prev`, `next`, …) at L177–220 are never rendered. Ignore them.

### Codebase

- `apps/web/src/app/page.tsx`: the current placeholder, which this spec replaces.
- `apps/web/src/app/layout.tsx`:
  - It already renders `<main id="main" tabIndex={-1}>` (L44–50), so the page must not add another.
  - Its default metadata is `title: "Stride"`, which stays.
- `apps/web/playwright.config.ts`: production builds of the API (port 4000) and web (port 3000). Specs that need the database use the file-level skip from `e2e/auth.spec.ts:7-10`.
- `apps/web/e2e/smoke.spec.ts:4-9`: loads `/` without a database. AC7's fallback exists so this keeps passing.
- `apps/web/src/components/layout/Footer.tsx:9-19`: already links to `/catalog?run=…` and `/catalog?category=…` with the same param names the tiles use.
- product-catalog: `apps/web/src/features/catalog/load-catalog-products.ts`, `ProductCard.tsx`, `ProductArt.tsx`, and `packages/shared/src/catalog/query.ts` (`catalogQueryToSearchParams`).
- product-detail: `apps/web/src/features/product/ProductPurchasePanel.tsx` (the size picker and stock line the journey ends on).

## Wiring edits (files other specs own)

- `softwareos/products/stride/epics/catalog-search/tech-plan.md` (the `home-page` candidate line)

## Deliberate deviations and design drift

- **Link query strings:** every catalog link in the design is a bare `Catalog.dc.html`. The tiles use product-catalog's params (`?run=` and `?category=`). The "Shop beginner picks" CTAs go to `/catalog`, whose default sort is featured-first, because the catalog has no "picks" filter.
- **"Shop by run" hero CTA:** it goes to `#shop-by-run` on the page instead of the catalog.
- **Trust strip:** the "Save it for later" wishlist perk is left out until account-wishlist ships, and the swapped icons are fixed.
- **ProductArt:** `view="angle"` / `view="full"` and `sole` are dropped, because product-catalog's ProductArt supports only `kind`, `color` and `accent`.
- **Featured cards:** they show no wishlist heart. The design's card defaults to showing one.
- **Header nav:** the design shows six links (Road, Trail, Race day, Shoes, Apparel, Gear); the current header has three. That's unchanged here, because app-foundation owns the header.
- **Mobile trust strip:** the design's trust strip overflows at 375px (`minmax(220px)` without `min(100%, …)`). AC8 fixes it.
