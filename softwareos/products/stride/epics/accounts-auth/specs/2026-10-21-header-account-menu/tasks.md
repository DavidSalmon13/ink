# Tasks — Header Account Menu

> Epic: accounts-auth
> Spec: 2026-10-21-header-account-menu
> Branch: feat/accounts-auth/header-account-menu

## Tests first

- [x] T1 Write failing tests (testing skill): RTL for AccountMenu (signed out items, signed in items, admin-only item, Welcome label + truncation + accessible name, pending state doesn't open, Escape returns focus, outside click / link click / pathname change close); Header (no "Help and account" nav, icon order); HeaderSession (account prop from /auth/me, isAdmin only for ADMIN, fallback = pending); update Header.test.tsx / HeaderSession.test.tsx / LogoutButton.test.tsx for the removed utility slot
- [x] T2 Update Playwright (wiring edits): openAccountMenu helper replacing utilityRow in e2e/smoke, protected-routes, security-headers, admin-access; add admin/shopper/signed-out visibility checks and the mobile drawer Account section check (AC8, AC11)

## Account menu

- [x] T3 Add apps/web/src/components/layout/AccountMenuItems.tsx (signed out / signed in / admin contents, LogoutButton) per AC2, AC4, AC5, AC10
- [x] T4 Add apps/web/src/components/layout/AccountMenu.tsx (client; details/summary, Welcome label, Escape/outside/link/pathname close, pending state) per AC3, AC7, AC9
- [x] T5 Header.tsx: remove the utility row and `utility`/`accountName` props, add `account` prop, render AccountMenu (AC1)
- [x] T6 MobileNav.tsx: `utility` → `account` section labelled "Account" rendering AccountMenuItems (AC8)
- [x] T7 HeaderSession.tsx: pass `account` (name, email, isAdmin) and `account="pending"` in the fallback; drop the utility fragment and Admin link; keep cartCount wiring. Restyle LogoutButton as a menu item. Delete UtilityLinks.tsx

## Design system

- [x] T8 Update stride-design/design-system/components/Header/README.md + preview.html: account menu replaces the utility row (AC12)
- [x] T9 Update the Stride design-system artifact README "Patterns borrowed" line to match (AC12)

## Verification

- [~] T10 Run tests and Playwright green in CI (testing skill)
- [ ] T11 Run QA against acceptance criteria (qa skill)
