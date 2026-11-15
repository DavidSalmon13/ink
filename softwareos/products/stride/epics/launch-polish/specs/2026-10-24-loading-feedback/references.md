# References for Loading Feedback

## Related Specs

- **[Related]** [accounts-auth / 2026-10-08-app-foundation](../../../accounts-auth/specs/2026-10-08-app-foundation/spec.md) — owns `src/components/ui/**`. This spec adds a `loading` prop to Button and a new Spinner beside it. Kept separate because loading feedback is a launch-polish concern that spans epics.
- **[Related]** [catalog-search / 2026-10-18-product-catalog](../../../catalog-search/specs/2026-10-18-product-catalog/spec.md) — owns `apps/web/src/features/catalog/**`. Its FilterForm/SortSelect navigation moves into the shared transition; its `CatalogSkeleton` is unchanged.
- **[Related]** [catalog-search / 2026-10-23-catalog-pagination](../../../catalog-search/specs/2026-10-23-catalog-pagination/spec.md) — shaped, and also edits `CatalogView.tsx`. Whichever PR lands second rebases. Its pager links are `<Link>`s, out of scope here.
- **[Related]** [accounts-auth / 2026-10-13-auth-api-migration](../../../accounts-auth/specs/2026-10-13-auth-api-migration/spec.md) — owns `apps/web/src/features/auth/**`. Its `SubmitButton` switches to `loading`.
- **[Related]** [accounts-auth / 2026-10-11-session-management](../../../accounts-auth/specs/2026-10-11-session-management/spec.md) — owns `/account/security` and `apps/web/src/features/account-security/**`. The page gets a spinner fallback and its buttons use `loading`.
- **[Considered]** [accounts-auth / 2026-10-11-protected-routes](../../../accounts-auth/specs/2026-10-11-protected-routes/spec.md) — `/account` is its unclaimed placeholder (account-wishlist replaces it). Only the page's Suspense fallback changes.

## Upstream Meeting

_None._

## Similar Implementations

### Demo-branch reference diff

- **Location:** commit `2d9b9f0` on `feat/accounts-auth/auth-api-demo`: `components/ui/Spinner.tsx`, `Button.tsx`, `features/catalog/catalog-navigation.tsx`, the account pages and the three submit buttons.
- **Relevance:** a working version of this spec — port it to the canonical branch.
- **Key patterns:** typecheck, lint and all 449 web unit tests passed against it.

### Skeletons

- **Location:** `apps/web/src/features/home/FeaturedSkeleton.tsx`, `apps/web/src/features/catalog/CatalogSkeleton.tsx`, `apps/web/src/features/shoe-finder/TypingIndicator.tsx`
- **Relevance:** the existing content-loading states this spec leaves alone (AC6).
- **Key patterns:** `role="status"` with `sr-only` text; `motion-safe:animate-pulse` for reduced motion.

### Next.js pending-state docs

- **Location:** `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-link-status.md`
- **Relevance:** the deferred Link-navigation feedback (Out of Scope); prefers `loading.js` and prefetching over inline hints.
