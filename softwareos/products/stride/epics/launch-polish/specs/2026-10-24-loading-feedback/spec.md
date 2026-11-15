# Loading Feedback

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/launch-polish/loading-feedback
> Covers: apps/web/src/components/ui/Spinner.tsx, apps/web/src/features/catalog/catalog-navigation.tsx

## Overview

The first slice of the epic's `error-loading-states` candidate (tech-plan.md, Candidate Specs). It delivers one rule across the storefront: **when a shopper acts and has to wait, they see a spinner; when content is loading, they see its skeleton.** The skeletons already exist (catalog, product, home featured rail) and are unchanged. This spec adds a shared Spinner and uses it where the wait had no feedback: form submits, catalog filter/sort changes, and the account pages' session read.

It serves the brief's success criterion "no page shows a blank screen" and the story "while a page loads, I see a loading state instead of a blank screen". Error, not-found and empty states stay in the rest of `error-loading-states`.

It edits files owned by other specs (see references.md, Related Specs). It owns only the two new modules in Covers.

## Goals & User Stories

- As a shopper, when I submit a form (log in, sign up, change password, sign out other devices), I see that it's working and can't submit twice.
- As a shopper, when I change a filter, search or sort on /catalog, I see that new results are loading instead of wondering if my click registered.
- As a signed-in shopper, when I open /account or /account/security, I see a loading indicator instead of blank space.
- As a screen-reader user, I'm told something is loading. As a reduced-motion user, nothing spins.

## Acceptance Criteria

1. AC1: A shared `Spinner` (lucide `LoaderCircle`, current text color, sizes sm/md/lg) exists in `components/ui`. With a `label` it renders `role="status"` with the label as screen-reader text. Without one it is `aria-hidden`. Under `prefers-reduced-motion` it pulses instead of spinning.
2. AC2: `Button` takes a `loading` prop. While `loading`, the button is disabled, has `aria-busy="true"` and shows a small Spinner in place of the trailing arrow. When `loading` is false it has no `aria-busy` and keeps its own `disabled` value.
3. AC3: The login and sign-up submit buttons, Change password, and "Sign out of all other devices" use `loading` while their request is pending. Existing pending labels ("Changing password…") stay.
4. AC4: On /catalog, a filter toggle, a debounced search or price change, a clear-all, or a sort change runs its navigation in a transition. Until the new results render, the results column (chips + grid / no-results) keeps the old results at 50% opacity with a large Spinner labeled "Loading results" over them, and the column has `aria-busy="true"`. When the results arrive, both are removed.
5. AC5: /account and /account/security show a centered Spinner ("Loading your account" / "Loading your security settings") in place of their session-dependent content while it loads. The static heading stays.
6. AC6: Content-loading skeletons are unchanged: `CatalogSkeleton`, `ProductSkeleton`, `FeaturedSkeleton`, and the shoe finder's typing indicator.

## Technical Approach

- **Spinner** — `apps/web/src/components/ui/Spinner.tsx`: `Spinner({ label?, size?, className? })` plus `SpinnerBlock({ label })` (a centered `min-h-40` wrapper for Suspense fallbacks). `motion-safe:animate-spin motion-reduce:animate-pulse`. No new dependency: lucide-react is already used.
- **Button** — `apps/web/src/components/ui/Button.tsx`: `loading?: boolean`; `disabled={disabled || loading}`, `aria-busy={loading || undefined}`; the Spinner replaces `arrow`.
- **Forms** — replace the hand-rolled `disabled`/`aria-busy` with `loading={pending}` in `features/auth/SubmitButton.tsx`, `features/account-security/ChangePasswordForm.tsx` (its `SubmitButton`) and `features/account-security/SignOutOthersButton.tsx`.
- **Catalog** — new `features/catalog/catalog-navigation.tsx`:
  - `CatalogNavigationProvider`: one `useTransition` + `useRouter`, exposing `{ pending, navigate(mode, url) }` through context.
  - `useCatalogNavigation()` falls back to its own transition outside a provider, for component tests.
  - `CatalogResultsBusy` dims the results and adds the overlay Spinner.
  - `CatalogView` wraps its tree in the provider. `FilterForm.navigate` and `SortSelect` call `navigate` instead of `router[mode]`/`router.push`. `FilterForm` wraps `children` in `CatalogResultsBusy`.
  - Why a transition: search-param changes on the same route don't re-show `catalog/loading.tsx`, so without one there's no pending signal (Next `useTransition` + `router.push` pattern).
- **Account pages** — `app/account/page.tsx` and `app/account/security/page.tsx`: `<Suspense fallback={<SpinnerBlock label=… />}>`.
- The no-JS paths are unchanged: forms still post and the filter form is still a GET form.

## Out of Scope

- Error boundaries, not-found pages and empty-state alignment (the rest of `error-loading-states`).
- Link navigation feedback: active-filter chip links, pager links, header links. A `useLinkStatus` / `loading.tsx` pass belongs to `error-loading-states`.
- The CMS admin app (`apps/cms`).
- Figma design for the spinner: none exists yet. Flagged to design, with lucide `LoaderCircle` as the stand-in.

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — Next.js App Router + Tailwind in apps/web; no new dependencies.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch naming, docs PR before code, small PRs.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-24 | david-schwartzman | created | Initial shaping | — |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob (was repo `/public`) — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
