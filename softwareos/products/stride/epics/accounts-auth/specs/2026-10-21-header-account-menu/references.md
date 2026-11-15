# References for Header Account Menu

## Related Specs

- **[Related]** [2026-10-08-app-foundation](../2026-10-08-app-foundation/spec.md): owns `components/layout/**`. Kept separate because only AC7's utility row changes and that spec has open PRs (#17, #18). This spec supersedes AC7's utility row and `utility` slot only.
- **[Related]** [2026-10-11-protected-routes](../2026-10-11-protected-routes/spec.md) (done): owns `features/session/**`. Kept separate so a done spec isn't reopened. This spec supersedes AC6/AC8's utility-row content; the AC7 no-JS logout form is reused unchanged.
- **[Considered]** [cms / admin-catalog / 2026-10-19-admin-foundation](../../../../../cms/epics/admin-catalog/specs/2026-10-19-admin-foundation/spec.md): matched on its `HeaderSession` wiring edit (AC8 Admin link). Dismissed in Step 4d as a different concern (the admin area), but its AC8 placement moves into the account menu here.
- **[Considered]** [cart-checkout / 2026-10-18-cart](../../../cart-checkout/specs/2026-10-18-cart/spec.md) and [2026-10-18-guest-cart-merge](../../../cart-checkout/specs/2026-10-18-guest-cart-merge/spec.md): `HeaderSession` passes `cartCount`. A different concern; that wiring must keep working.
- **[Considered]** [catalog-search / 2026-10-18-product-catalog](../../../catalog-search/specs/2026-10-18-product-catalog/spec.md): the Header search form. A different concern; untouched.
- **[Considered]** [2026-10-13-auth-api-migration](../2026-10-13-auth-api-migration/spec.md): moved the session code. A different concern.

## Design Reference

- Mockup canvas: https://claude.ai/artifact/YTmNHKvS8NNscF2Jh7Eb4H (frames: Today, Proposed signed out, Proposed signed in menu closed, Proposed signed in admin menu open). See [visuals/README.md](visuals/README.md).
- Competitor check (2026-10-21): Nike keeps a top utility row and has no account icon; Puma, and from memory adidas and New Balance, put account access in an icon next to the wishlist and cart.

## Similar Implementations

### MobileNav

- **Location:** `apps/web/src/components/layout/MobileNav.tsx`
- **Relevance:** the existing client island for a header overlay.
- **Key patterns:** Escape closes and returns focus to the trigger; closes on pathname change (`openedOn` + `usePathname`) and on any `<a>` click inside (catches query-string-only links); `min-h-11` touch targets via child selectors.

### LogoutButton

- **Location:** `apps/web/src/features/session/LogoutButton.tsx`
- **Relevance:** reused as the menu's Log out.
- **Key patterns:** a plain `<form method="post" action="/api/auth/logout">`, so no JS is needed; `className="contents"` keeps the form out of layout.

### HeaderSession / HeaderSessionFallback

- **Location:** `apps/web/src/features/session/HeaderSession.tsx`
- **Relevance:** where the session reaches the Header.
- **Key patterns:** `getCurrentSession().catch(() => null)` shows the signed-out header if the API is down; the Suspense fallback is neutral so signed-in shoppers never see "Log in" flash.

### Header icon buttons

- **Location:** `apps/web/src/components/layout/Header.tsx` (`iconButton`)
- **Relevance:** the account trigger keeps the same 40px visual / 44px touch target and focus ring.
