# Admin Foundation

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/admin-catalog/admin-foundation
> Covers: /admin, /admin/*, /api/admin/*, apps/cms/**, apps/api/src/admin/**, apps/api/prisma/migrations/*_admin_role/**, apps/api/scripts/grant-admin.ts, apps/web/public/admin/**, apps/web/e2e/admin-access.spec.ts

## Overview

This spec sets up the access-control base that the rest of the Admin Catalog CMS builds on:
- an admin role on `User`, and a script to grant it
- an API `AdminGuard` and an empty admin module
- the role in `GET /auth/me`
- an Angular 22 shell (`apps/cms`) served by the web app at `/admin/*`
- an admin-only nav link

It delivers all of the epic's access-control success criteria (401/403 on `/api/admin/*`, the hidden nav link, the login redirect and the access-denied page), plus an empty dashboard styled with Stride's tokens. Catalog features come in later specs (`category-management`, `product-management`, `stock-management`, `product-images`).

## Goals & User Stories

- As an admin, I see an "Admin" link after I log in, so I can reach the CMS
- As a shopper, I never see that link, and visiting `/admin` shows me an access-denied page
- As a logged-out visitor, visiting `/admin` sends me to login and then back to where I was going
- As a developer, I can grant or revoke the admin role on an existing account with one command, and there is no API or UI path that changes a role

## Acceptance Criteria

1. AC1: `User` has a `role` (`USER` | `ADMIN`, default `USER`). Existing users migrate to `USER`.
2. AC2: `GET /auth/me` returns `role`, and so does the `user` object in the login and signup responses.
3. AC3: `npm run admin:grant -- <email>` sets an existing user to `ADMIN`, and `--revoke` sets them back to `USER`. An unknown email exits non-zero and changes nothing. No API endpoint changes a role.
4. AC4: `GET /api/admin/status` returns 401 when logged out, 403 for a logged-in non-admin, and 200 for an admin. The role comes from the session's `User` row, never from the request.
5. AC5: A logged-out visit to `/admin` or any `/admin/*` path redirects to `/login?callbackUrl=<that path>`, and after login the visitor lands back there.
6. AC6: A logged-in non-admin at `/admin` sees an access-denied page with a link back to the store.
7. AC7: An admin at `/admin` sees the CMS shell (layout and empty dashboard) with Stride's colors and fonts. Reloading a deep link such as `/admin/products` serves the shell, not a 404.
8. AC8: Admins see an "Admin" link in the header's utility links on desktop and in the mobile drawer. Non-admins and logged-out visitors never see it.
9. AC9: `npm run build` runs shared → api → cms → web. `lint`, `typecheck` and `test` include `apps/cms`, and CI passes.
10. AC10: `/admin` page responses carry `Cache-Control: private, no-store` and the existing security headers and CSP, and the shell loads with no CSP violations.

## Technical Approach

- **Role (API):**
  - The Prisma migration `*_admin_role` adds `enum Role { USER ADMIN }` and `User.role Role @default(USER)`. It is additive, so it stays compatible with the previous deploy (expand only)
  - Add `role` to the user select in `session.service.ts:117`, to `SessionUser`, and to `req.user` in `auth.guard.ts:46`
  - Add `role` to `meResponseSchema` (`packages/shared/src/auth/responses.ts`). `authSuccessSchema.user` reuses it, so login and signup return it too
  - The API ships before the web app, per the deploy-order rule
- **AdminGuard + module:**
  - `apps/api/src/admin/admin.guard.ts` runs after `AuthGuard`. It reads `req.user.role` (loaded from the database through the session) and throws `ForbiddenException` unless the role is `ADMIN`
  - `AdminModule` imports `AuthModule` (same pattern as `account-security.module.ts`)
  - `@Controller("admin") @UseGuards(AuthGuard, AdminGuard)` with `GET /admin/status` returning `{ ok: true }`. This gives the guard a real endpoint to test, and later specs add their controllers under the same guards
  - The proxy-secret and Origin middleware already cover `/admin/*`
- **Grant script:**
  - The testable logic lives in `apps/api/src/admin/grant-admin.ts`. It finds the user with `normalizeEmail` and updates `role`. It only promotes existing accounts (it never creates users or touches passwords)
  - `apps/api/scripts/grant-admin.ts` is a thin `tsx` entry point that runs the same way `prisma/seed.ts` does (loads `.env`)
  - It is exposed as the root script `admin:grant`
- **Web:**
  - Add `"/admin"` to `PROTECTED_PREFIXES` (`features/session/guard.ts`). That gives the login redirect with `callbackUrl` and the private `Cache-Control` through `private-paths.ts`
  - In `proxy.ts`, for `/admin` and `/admin/*` paths with no file extension, after the guard passes, return `NextResponse.rewrite("/admin/index.html")`. Assets with a file extension already skip the proxy and are served from `public/admin/`
  - `HeaderSession.tsx` adds a plain `<a href="/admin">Admin</a>` to the signed-in `utility` fragment when `user.role === "ADMIN"`, so it appears on desktop and in `MobileNav`
- **CMS (`apps/cms`, `@stride/cms`):**
  - Angular 22 standalone app, TypeScript strict, `base href` `/admin/`, with build `outputPath` → `apps/web/public/admin/` (gitignored)
  - Tailwind 4 with the design-system `tokens.css` and a copy of the web `@theme` block. Barlow Condensed and Inter are self-hosted, because the CSP has `font-src 'self'` and the `--font-*` variables from next/font don't exist in Angular
  - On startup, a functional route guard calls `GET /api/auth/me`:
    - 401 → `location.assign(/login?callbackUrl=…)`
    - non-admin → the `access-denied` route
    - admin → a layout (Stride wordmark, "Back to store", account name) with an empty dashboard that calls `/api/admin/status`
  - The Angular guard is UX only
  - Unit tests run on Vitest through `@angular/build`
- **Build:**
  - Root `build`: `build:shared` → api → `@stride/cms` → web
  - The CMS workspace defines `lint`, `typecheck` and `test`, so the existing `--workspaces` scripts and CI pick it up with no workflow change
- **E2E:** `apps/web/e2e/admin-access.spec.ts` covers logged out → login redirect, a non-admin → access denied, an admin → the shell and a deep-link reload, and whether the nav link is visible. The admin test user is promoted with the grant script in setup

## Out of Scope

- Any catalog management: categories, products, stock or images (later specs in this epic)
- A UI or API for managing roles
- Vercel build config for the web project. Its root is `apps/web`, so it doesn't run the root build; Vercel tasks are deferred. Until that's settled, the CMS is built by the root build and in CI
- A server-rendered access-denied page. Only the API knows the role; the proxy checks only whether a session cookie exists
- Revalidating storefront pages after edits (settled in `category-management`)

## Standards Applied

- [global/auth-security](../../../../../../standards/global/auth-security.md) — the admin guard after AuthGuard, the role read from the session's User row, proxy, nav and Angular guard as UX only, no secrets in the CMS bundle
- [global/tech-stack](../../../../../../standards/global/tech-stack.md) — Angular CMS in apps/cms served at /admin/*, CMS builds before web, no Prisma in web or cms, expand-only migration
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch and commit conventions

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-10-19 | david-schwartzman | created | Initial shaping | — |
| 2026-10-20 | david-schwartzman | change | AC7's empty dashboard is replaced by the landing page in 2026-10-20-admin-dashboard; the shell, "Dashboard" heading and `/api/admin/status` call stay | [admin-dashboard](../2026-10-20-admin-dashboard/spec.md) |
| 2026-10-21 | david-schwartzman | change | AC8: the Admin link moves from the header utility row into the account menu ("Admin dashboard", admins only, desktop and mobile drawer) | [header-account-menu](../../../../../stride/epics/accounts-auth/specs/2026-10-21-header-account-menu/spec.md) |
| 2026-10-25 | david-schwartzman | change | Wiring edit from product-management (Changelog 2026-10-25, AC15): the admin layout (layout.component.ts) mounts the CMS toast (`<app-toast />`, apps/cms/src/app/toast/) after `<main>`, bottom-right in a polite live region. AC7's shell is otherwise unchanged | [product-management](../2026-10-19-product-management/spec.md) |
| 2026-10-25 | david-schwartzman | change | standards.md copy: product images in Vercel Blob; one dev store now, preview/prod deferred; `onUploadCompleted` skipped — architecture change cascaded by /update-arch: images moved to Vercel Blob, decided in cms `product-images` 2026-10-19/20 | softwareos/products/stride/architecture.md |
