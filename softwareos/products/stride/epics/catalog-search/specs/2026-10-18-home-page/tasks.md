# Tasks — Home Page

> Epic: catalog-search
> Spec: 2026-10-18-home-page
> Branch: feat/catalog-search/home-page

## Gate

- [x] T1 (demo branch: auth stack, catalog-foundation, product-catalog and product-detail are on feat/accounts-auth/auth-api-demo, with the seed + CI "Seed database" step, `loadCatalogProducts`, `catalogQueryToSearchParams`, `ProductCard`, `ProductArt` and `/product/[slug]`; built there. product-catalog T22 is still [~] and product-detail QA is open) Check that these are merged into `develop`:
  - accounts-auth `api-foundation` and `auth-api-migration`
  - catalog-search `catalog-foundation`, `product-catalog` and `product-detail`

  In particular, check for:
  - the seed and the CI "Seed database" step
  - `loadCatalogProducts`, `catalogQueryToSearchParams`, `ProductCard` and `ProductArt` in `apps/web/src/features/catalog/` and `packages/shared/src/catalog/query.ts`
  - `/product/[slug]` with its size picker

  Then create `feat/catalog-search/home-page` from the latest `develop`. Stop if any of these is still only on its feature branch (AC4, AC9).

## Tests first (TDD)

- [x] T2 Write failing apps/web/src/features/home/load-featured.test.ts, starting with `// covers AC4, AC7, T2`. Mock `loadCatalogProducts` and check that:
  - there are exactly four calls: `{ sort: "featured" }`, then `{ sort: "featured", category: ["shoes"] }`, `["apparel"]` and `["gear"]`
  - it returns `{ picks, shoes, apparel, gear }`, each sliced to at most 3 in API order
  - if any call rejects, the result is `null` and nothing is thrown (testing skill)
- [x] T3 Write failing RTL apps/web/src/features/home/FeaturedTabs.test.tsx, starting with `// covers AC4, T3`. Check that:
  - there is a `role="group"` named "Show products for", with four buttons: Beginner picks, Shoes, Apparel and Gear
  - Beginner picks is `aria-pressed="true"` by default
  - clicking Shoes flips `aria-pressed` and shows only the shoes list
  - each tab shows at most 3 cards, and each card links to `/product/<slug>`
  - there is no wishlist button
  - the "Shop all" link goes to `/catalog` (testing skill)
- [x] T4 Write failing RTL apps/web/src/features/home/Tiles.test.tsx (`// covers AC2, AC3, AC6, T4`) and apps/web/src/features/home/FeaturedSection.test.tsx (`// covers AC7, T4`). Check that:
  - the Road, Trail and Race day tiles each have one link, to `/catalog?run=road|trail|race-day`, with the text "Shop {name}"
  - the category tiles link to `/catalog?category=shoes|apparel|gear`
  - the hero CTAs link to `/catalog` and `#shop-by-run`, and the run section has `id="shop-by-run"`
  - when the loader returns `null`, FeaturedSection renders "Browse the full range in the catalog" → `/catalog` and no tabs (testing skill)
- [x] T5 Write failing Playwright apps/web/e2e/shopping-journey.spec.ts, starting with `// covers AC1, AC9, T5`, with `test.skip(!process.env.TEST_DATABASE_URL, …)`.
  - `request.get("/")`: the raw HTML already contains the hero H1 and the Beginner picks product names.
  - Journey on `/`:
    - click the Shoes tab, and the cards change
    - click the Trail tile → `/catalog?run=trail`
    - tick the Shoes category → `category=shoes` is in the URL and the count updates
    - click the first card → `/product/<slug>`, and its H1 equals the card name
    - select an in-stock size, and the stock line updates
  - At 375px there is no horizontal scroll, and the hero art is hidden. (testing skill)

## Web

- [x] T6 Add apps/web/src/features/home/home-content.ts: typed copy and art for the hero, run tiles, "Smaller on purpose" pillars, "No jargon" rows, category tiles and trust perks, taken from Main.dc.html. Leave out the wishlist perk, and give each perk a matching icon. Add apps/web/src/features/home/load-featured.ts (AC4, AC7). T2 goes green.
- [x] T7 Add these Server Components in apps/web/src/features/home/: Hero.tsx, RunTiles.tsx, CategoryTiles.tsx, SmallerOnPurpose.tsx, NoJargon.tsx and TrustStrip.tsx (AC2, AC3, AC5, AC6, AC8). The tile half of T4 goes green.
  - Build tile hrefs with `catalogQueryToSearchParams`.
  - Pass ProductArt only `kind`, `color` and `accent`.
  - Style with Tailwind and the tokens.
  - Apply the ≤760px rules from Main.dc.html line 20: 16px padding, hidden hero art, single-column grids, and the trust strip using `min(100%, 220px)`.
- [x] T8 Add these to apps/web/src/features/home/ (AC4, AC7). T3 and the fallback half of T4 go green.
  - FeaturedTabs.tsx (`"use client"`)
  - FeaturedSection.tsx: an async Server Component that calls `loadFeatured()` and renders FeaturedTabs, or the fallback when the result is `null`
  - FeaturedSkeleton.tsx
- [x] T9 Replace apps/web/src/app/page.tsx (AC1, AC7). T5 goes green.
  - Render the sections in design order, with `<Suspense fallback={<FeaturedSkeleton/>}>` around `FeaturedSection`.
  - Add no `<main>`; the layout already provides one.
  - Delete the placeholder comment.
  - Check that `e2e/smoke.spec.ts` and `security-headers.spec.ts` still pass without a database.

## Docs

- [x] T10 Edit softwareos/products/stride/epics/catalog-search/tech-plan.md and update the `home-page` candidate line:
  - no new endpoint
  - the featured rail uses `GET /catalog/products?sort=featured` plus `category=`
  - static tiles link into `/catalog?run=` and `?category=`
  - a fallback when the API fails
  - the journey e2e runs in CI

## Verification

- [~] T11 (2026-10-18, demo branch, rerun after the product-catalog AC7 change: typecheck green; npm test 815/815 against the apps/api/.env DB; e2e 45/45 on the seeded dev DB, smoke green without it; covers comments present; `@prisma` grep hits only the ESLint rule test string; prettier red only on packages/shared/src/account-security/index.ts (accounts-auth, 7daebd4; waived for product-catalog T22). Open: the PR's GitHub Actions run — no PR for this branch) Run the full suites green (testing skill):
  - `npm run lint`, `npm run typecheck` and `npm test`
  - `npm run test:e2e` locally against a seeded DB, then again without `TEST_DATABASE_URL`, so smoke still passes

  Then check that:
  - the PR's GitHub Actions run passed `shopping-journey.spec.ts` (not skipped)
  - every new test file has its `covers` comment
  - `grep -r "@prisma" apps/web/src` finds nothing
- [ ] T12 Run QA against AC1–AC9 (qa skill):
  - compare `/` at desktop and at 375px against Main.dc.html and MobileHome.dc.html
  - check that every tile and CTA lands on the right URL
  - check that the diff touches only the Covers list plus tech-plan.md
