# Header Account Menu

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/accounts-auth/header-account-menu
> Covers: apps/web/src/components/layout/Header.tsx, apps/web/src/components/layout/MobileNav.tsx, apps/web/src/components/layout/AccountMenu.tsx, apps/web/src/components/layout/AccountMenuItems.tsx, apps/web/src/components/layout/UtilityLinks.tsx, apps/web/src/features/session/HeaderSession.tsx, apps/web/src/features/session/LogoutButton.tsx, stride-design/design-system/components/Header/**

## Overview

Replaces the header's grey utility row with an account menu on the account icon. Managers found the row cluttered, and it repeats the account icon that already sits next to the wishlist and bag. Most big sports stores (Puma, and from memory adidas and New Balance) put account access in that icon. Signed in, the shopper sees "Welcome, {name}" next to the icon; the menu holds My orders, Account details, Log out and, for admins only, Admin dashboard. Signed out, it offers Log in and Sign up.

Serves the epic's success criteria: "the header shows logged-in state" (now more visibly) and the sign up → log out → log in Playwright journey (logout moves into the menu). Fits the mission's calm, uncluttered store for beginners.

Supersedes: app-foundation AC7 (the utility row and its `utility` slot), protected-routes AC6/AC8 (the row's signed-in/out contents) and cms admin-foundation AC8 (Admin link placement). protected-routes AC7 (no-JS logout form) is reused unchanged. `UtilityLinks.tsx` is listed in Covers because this spec deletes it. Design reference: [mockup canvas](https://claude.ai/artifact/YTmNHKvS8NNscF2Jh7Eb4H).

## Goals & User Stories

- As a shopper, the header looks clean: logo, categories, search and four clear icons, with no extra grey strip.
- As a signed-out shopper, I tap the account icon and can log in or sign up.
- As a signed-in shopper, I see "Welcome, {name}" and can reach my orders, my account and log out from one menu, on desktop and phone.
- As an admin, I find "Admin dashboard" in the same menu; regular shoppers never see it.

## Acceptance Criteria

1. AC1: The grey utility row is gone at every width: no `nav[aria-label="Help and account"]` above the bar. The main bar keeps its order: menu button (mobile) · logo · nav · search · account · wishlist · cart. The header's height shrinks by the row's height and nothing else in the bar moves.
2. AC2: Signed out, the account icon is a button named "Account menu" that opens a panel containing, in order: "Welcome to Stride" (display-sm), "Log in to see your orders and wishlist." (body-sm, ink-muted), **Log in** (→ `/login`, ink pill) and **Sign up** (→ `/signup`, outline pill). It has no My orders, Log out or Admin.
3. AC3: Signed in, from `bp-md` the trigger shows the account icon with the green signed-in dot and the visible text "Welcome, {name}". Names longer than about 16 characters truncate with an ellipsis, and the trigger's accessible name holds the full name and "account menu". Below `bp-md` the trigger is the icon and dot only.
4. AC4: Signed in, the panel contains, in order: "Signed in as" (label) + the email · **My orders** (→ `/account`) · **Account details** (→ `/account`) · [Admin dashboard, AC5] · divider · **Log out**. Below `bp-md` the panel starts with "Welcome, {name}".
5. AC5: Only when `GET /auth/me` returns `role: "ADMIN"`, the panel shows an **Admin dashboard** item between dividers: a surface-alt row with a dashboard icon, "Admin dashboard" and "Manage products and orders" (body-sm, ink-muted). It is a plain `<a href="/admin">` (full page load into the Angular CMS). Non-admins and signed-out visitors have no `/admin` link anywhere in the header or drawer. The API admin guard stays the real check, and this link is UX only.
6. AC6: Log out is the existing `LogoutButton` form (`POST /api/auth/logout` → 303 to `/`), works without JavaScript, and leaves the header signed out (protected-routes AC7, unchanged).
7. AC7: The menu opens on click, Enter or Space, and its trigger exposes expanded/collapsed state. Escape closes it and returns focus to the trigger. Clicking outside or choosing an item closes it, as does navigating, including to a link that changes only the query string. Tab order follows the visual order; every item shows `focus-ring` on `:focus-visible`; touch targets are ≥ 44px. Without JavaScript the menu still opens and closes, and its links and Log out work.
8. AC8: On phones (375px) the panel is anchored to the right edge, fits the screen with no horizontal scroll, and behaves as in AC7. The hamburger drawer keeps an "Account" section with the same items as the panel for the current state (signed out: Log in, Sign up; signed in: Welcome {name}, My orders, Account details, Admin dashboard if admin, Log out).
9. AC9: While the session is loading (the Suspense fallback), the account icon shows no dot, no "Welcome" text and an empty, non-opening menu, so a signed-in shopper never sees Log in / Sign up flash. Header height doesn't change when the session resolves.
10. AC10: Looks as in the mockup's Proposed frames, using Stride tokens: panel 272px wide, `surface` with a `line` border, `radius-md`, `shadow-raised`, `space-6` padding (the mockup's 20px rounded to the nearest token); dividers use `line`. Volt is not used in the menu, because the menu's buttons are account actions, not order actions.
11. AC11: Playwright passes in CI against a real Postgres: the existing smoke, protected-routes, security-headers and admin-access journeys log in and out through the menu; an admin sees Admin dashboard (menu and drawer) and a shopper and a signed-out visitor don't; the signed-out panel has no My orders.
12. AC12: The design system's Header component README and preview (`stride-design/design-system/components/Header/`) describe the account menu instead of the utility row, and the Stride design-system artifact's "Patterns borrowed" line is updated to match.

## Technical Approach

- **Header API** (`components/layout/Header.tsx`, Server Component): replace `utility?: ReactNode` and `accountName?: string` with `account?: HeaderAccount | "pending"`, where `HeaderAccount = { name: string; email: string; isAdmin: boolean }` (undefined = signed out). `cartCount` stays. Remove the utility `<nav>`. The account `Link` becomes `<AccountMenu account={account} />`.
- **AccountMenuItems** (`components/layout/AccountMenuItems.tsx`, no hooks, server-safe): renders the panel contents for the given state (AC2/AC4/AC5), including `LogoutButton`. It is used by both the menu panel and the drawer's Account section, so the two can't drift.
- **AccountMenu** (`components/layout/AccountMenu.tsx`, `"use client"`): a native `<details>` with a `<summary>` trigger, so it opens without JS (AC7). JS adds Escape (closes and focuses the summary), outside click, closing when an `<a>` inside is clicked, and closing on pathname change, reusing MobileNav's `openedOn`/`usePathname` pattern. `"pending"` renders a summary that doesn't open (`onClick` preventDefault and no panel). The trigger label is "Welcome, {name}" with `hidden md:inline` and `max-w-[16ch] truncate`; the accessible name comes from `aria-label` = "Welcome, {name}, account menu" (signed in) or "Account menu".
- **MobileNav**: the `utility` prop becomes `account: ReactNode` (the Header passes `<AccountMenuItems …/>`), shown in a `role="group" aria-label="Account"` section; the existing min-h-11 child styles stay.
- **LogoutButton**: unchanged form; restyle from utility-link to menu-item (full-width, 14px, semibold).
- **HeaderSession**: signed in → `account={{ name, email, isAdmin: role === "ADMIN" }}`, signed out → no `account`; `HeaderSessionFallback` → `account="pending"`. Keep the cart spec's `cartCount` wiring as is. Remove the `utility` fragment and the Admin `<a>`.
- **Delete** `components/layout/UtilityLinks.tsx`.
- **e2e (wiring edits to other specs' tests):** replace `utilityRow(page)` helpers in `e2e/smoke.spec.ts`, `e2e/protected-routes.spec.ts`, `e2e/security-headers.spec.ts`, `e2e/admin-access.spec.ts` with an `openAccountMenu(page)` helper. Add the admin and shopper visibility checks there.
- PR stays within 18 files and covers one area (header); spec docs go in their own docs PR.

## Out of Scope

- The black "FREE SHIPPING OVER $75" promo strip (possible later spec).
- An orders page: My orders keeps pointing to `/account` until the order-history spec adds `/account/orders`, and then repoints.
- Help / Find a store links (the old row never had them).
- Any change to auth, sessions, the logout endpoint or the admin guard.

## Standards Applied

- [global/tech-stack](../../../../../../standards/global/tech-stack.md): Server Component header with one small client island; Vitest + RTL + Playwright.
- [global/auth-security](../../../../../../standards/global/auth-security.md): POST-only logout; Admin link is UX only, the API admin guard enforces.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch off `develop`, PR to `develop`.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-21 | david-schwartzman | created | Initial shaping: grey utility row → account menu; supersedes app-foundation AC7 (row), protected-routes AC6/AC8, admin-foundation AC8 | https://claude.ai/artifact/YTmNHKvS8NNscF2Jh7Eb4H |
