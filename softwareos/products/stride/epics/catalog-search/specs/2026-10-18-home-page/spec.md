# Home Page

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/catalog-search/home-page
> Covers: /, apps/web/src/app/page.tsx, apps/web/src/features/home/**, apps/web/e2e/shopping-journey.spec.ts

## Overview

The last catalog-search spec. It replaces the placeholder `/` with the home page from `stride-design/pages/Main.dc.html`. The sections, in order:
- hero
- "Shop by run" tiles
- "Smaller on purpose" band
- "Featured for beginners" rail with tabs
- "No jargon" band
- "Shop by category" tiles
- trust strip

It also lands the epic's journey e2e (landing → catalog → filter → product detail), which must pass in the existing GitHub Actions CI. `ci.yml` already runs `npm run test:e2e` against its Postgres service, and catalog-foundation's seed step provides the data. Vercel being deferred only affects preview deploys, not this criterion.

This spec adds no API endpoint and edits no product-catalog or product-detail file:
- **Featured rail:** uses product-catalog's `loadCatalogProducts` with `GET /catalog/products?sort=featured`, adding `category=` for the Shoes/Apparel/Gear tabs. It renders product-catalog's `ProductCard` and `ProductArt`.
- **Run and category tiles:** static links into `/catalog?run=…` / `/catalog?category=…`, using product-catalog's URL param names, with no counts.

It depends on catalog-foundation (seed), product-catalog, and product-detail (the journey's last step). The mission's "confirmed order in under 3 minutes" is out of scope: the journey e2e stops at product detail.

Covers note: app-foundation's spec mentions `src/app/page.tsx`, but it explicitly leaves the file unclaimed and says catalog-search owns `/`. The pre-flight check reviewed and dismissed that match (see references.md).

## Goals & User Stories

- As a beginner runner landing on Stride, I immediately understand what the store is for and where to start.
- As a beginner, I can jump straight to the kind of running I'll do (Road, Trail, Race day) or the kind of product (Shoes, Apparel, Gear).
- As a shopper, I see a few featured picks right on the home page, overall or per category, and I can open one.
- As a shopper, I learn that every product explains itself in plain words, so I don't need running-shop jargon.

## Acceptance Criteria

1. AC1: `/` is server-rendered. The first HTML response already contains the hero, both tile sets and the "Beginner picks" products. The page renders inside the layout's existing `<main id="main">` and adds no second `<main>`.
2. AC2: The hero follows Main.dc.html:
   - eyebrow "For first-time runners"
   - H1 "Your first 5K starts here"
   - the body copy
   - a decorative ProductArt shoe, hidden at ≤760px
   - two CTAs: "Shop beginner picks" goes to `/catalog`, and "Shop by run" goes to `#shop-by-run`
3. AC3: The "Shop by run" section has `id="shop-by-run"`, the eyebrow "Start with where you'll run" and the H2 "Shop by run". It has three tiles: Road, Trail and Race day. Each tile has:
   - the design's copy and a ProductArt shoe
   - a "Shop {name}" affordance
   - a single link to `/catalog?run=road|trail|race-day`
4. AC4: The "Featured for beginners" section has:
   - an H2
   - a `role="group"` labelled "Show products for", with four `aria-pressed` tab buttons: Beginner picks (default), Shoes, Apparel and Gear
   - at most 3 ProductCards per tab:
     - Beginner picks shows the first 3 of `sort=featured`.
     - Shoes, Apparel and Gear each show the first 3 of `sort=featured&category=<slug>`.
   - all four lists fetched on the server. Switching tabs swaps the list on the client without navigation.
   - a "Shop all" link to `/catalog`
   - cards that link to `/product/<slug>` and show no wishlist heart
5. AC5: The static bands follow Main.dc.html, with the copy as designed:
   - **"Smaller on purpose":** an inverse tile and three pillars.
   - **"No jargon":** jargon terms with a strikethrough → a plain guide badge, and a "Shop beginner picks" CTA to `/catalog`.
   - **Trust strip** (`aria-label="Why Stride"`): "$5 shipping", "Stock shown per size" and "Hand-picked for beginners", each with a matching icon. The wishlist perk is left out until account-wishlist ships.
6. AC6: The "Shop by category" section has the H2 "Shop by category" and three tiles: Shoes, Apparel and Gear. Each tile has the design's copy and ProductArt and a single link to `/catalog?category=shoes|apparel|gear`.
7. AC7: If the catalog API call fails, the rest of the home page still renders. The featured section shows a short fallback, "Browse the full range in the catalog" → `/catalog`, instead of erroring. The existing `smoke.spec.ts` keeps passing without a database.
8. AC8: At 375px:
   - every grid collapses to one column
   - side padding is 16px
   - the hero art is hidden
   - there's no horizontal scroll, including in the trust strip
9. AC9: A Playwright test, `apps/web/e2e/shopping-journey.spec.ts`, runs on the seeded database and passes in GitHub Actions CI. Like the other DB specs, it skips without `TEST_DATABASE_URL`. The journey:
   1. Land on `/`; the raw HTML contains the Beginner picks product names.
   2. Switch to the Shoes tab.
   3. Click the Trail tile → `/catalog?run=trail`.
   4. Apply the Shoes category filter.
   5. Open a product card → `/product/<slug>` with its H1.
   6. Select an in-stock size.

   All existing tests still pass, and `apps/web` imports no Prisma.

## Technical Approach

- **Page:** `apps/web/src/app/page.tsx` replaces the placeholder. It's a Server Component that renders the static sections, with `<Suspense>` around the async `FeaturedSection`. The Suspense is needed because `apiFetch` reads `headers()` under `cacheComponents`. The layout's default metadata stays.
- **Featured data:** `features/home/load-featured.ts` makes four `loadCatalogProducts` calls in `Promise.all`: `{ sort: "featured" }`, plus `{ sort: "featured", category }` for each category. It keeps `.products.slice(0, 3)` from each and returns `{ picks, shoes, apparel, gear }`. Any rejection is caught and becomes `null`, which triggers the AC7 fallback.
- **Components (`features/home/`):**
  - Server Components: `Hero`, `RunTiles`, `SmallerOnPurpose`, `NoJargon`, `CategoryTiles`, `TrustStrip`, `FeaturedSection` (fetches, then renders `FeaturedTabs` or the fallback) and `FeaturedSkeleton`.
  - Client Component: `FeaturedTabs` (`"use client"`) holds the active tab and renders the 4 server-provided lists with ProductCard.
  - Tile and band copy lives in a typed `home-content.ts`.
  - Tile links are built with product-catalog's `catalogQueryToSearchParams`, so the param names stay in one place.
  - ProductArt is used with only the props product-catalog's version supports (`kind`, `color`, `accent`). The design's `view="angle"` and `sole` are dropped.
- **Tests:**
  - RTL tests:
    - `FeaturedTabs`: aria-pressed, switching, at most 3 cards, no heart
    - `RunTiles` and `CategoryTiles`: hrefs
    - `load-featured`: four calls, slicing, failure → null
    - `FeaturedSection`: the fallback
  - Playwright: `shopping-journey.spec.ts`
  - Every test file starts with a `// covers AC…, T…` comment.

## Out of Scope

- Any API endpoint, and any change to product-catalog or product-detail files.
- Add to cart, the rest of the journey to a confirmed order, and the "under 3 minutes" timing (cart-checkout, launch-polish).
- Wishlist hearts and the wishlist trust perk (account-wishlist).
- A "beginner picks" catalog filter. Both "Shop beginner picks" CTAs go to `/catalog`, whose default sort already puts featured products first.
- Counts on tiles, and the design's unused data (`drops`, `steps`, carousel paging).
- A hero background SVG beyond simple decoration.
- Header nav changes. The design has six links and the current header has three; app-foundation owns the header.
- Vercel preview checks (deferred).

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md): server-rendered by default with small Client Components, no Prisma in the web app, data through the API via `apiFetch`, and Vitest + RTL + Playwright for tests
- [global/auth-security](../../../../../../standards/global/auth-security.md): Server Components call the API with the proxy secret, and GET never changes state
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch, commits and PR

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-18 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
