# QA Report — Protected Routes & Session Header

> Spec: spec.md
> Date: 2026-10-15 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on `feat/accounts-auth/auth-api-demo` (local demo branch; it pre-merges PRs #20/#21, api-foundation and auth-api-migration on purpose), at commit `852b6e0`.

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Logged-out /checkout, /account, /wishlist (+ sub-paths, whole segments) → `/login?callbackUrl=<path+query>`; other routes never redirected | pass | `guard.test.ts` (19 cases incl. `/accounting`, `/wishlists`, `/api/*`), `proxy.test.ts` (307 with encoded path+query; matcher runs on pages and `/api/*`, skips static files); `apps/web/src/features/session/guard.ts:4,9`, `apps/web/src/proxy.ts:17-18,32`; e2e `protected-routes.spec.ts:46,68` (`/account`, `/checkout` → login) |
| AC2 | Login (and sign-up carried from "Create an account") lands on safe `callbackUrl`, else `/` | pass | e2e `protected-routes.spec.ts:46` (login from `/login?callbackUrl=%2Faccount` → `/account`); `auth.controller.test.ts` "callbackUrl" suite (signup → `/checkout`, login → `/account/orders?page=2`); `CallbackUrlField.test.tsx`, `LoginForm.test.tsx`, `SignupForm.test.tsx` (hidden field posted, error Log in link keeps it), `CallbackUrl.test.tsx` (`AuthPageLink` carries it); `apps/api/src/auth/auth.controller.ts:60,95,104` |
| AC3 | Only same-origin relative paths; `//`, `/\`, schemes, `javascript:`, encoded, garbage, `/login`/`/signup` → `/` | pass | `callback-url.test.ts` (33 cases incl. `%2F%2Fevil.com`, `/\t/evil.com`, 2048 cap); API re-sanitises the body field (`auth.controller.test.ts` `//evil.com`, `https://evil.com`, `/\evil.com`, `/login`, `42` → `/`); client rejects unsafe `redirectTo` (`submit-auth.test.ts` backslash case); e2e `protected-routes.spec.ts:68` (`//evil.com` → `/`); `packages/shared/src/callback-url.ts:24-45` |
| AC4 | Signed-in shopper on `/login|/signup?callbackUrl=X` → redirected to safe X | pass | `RedirectIfSignedIn.test.tsx` ("sends a signed-in user to the page's sanitised callbackUrl"); `apps/web/src/features/auth/RedirectIfSignedIn.tsx:13`; pages pass the sanitised value (`app/(auth)/login/page.tsx`, `signup/page.tsx` `RedirectToCallback`) |
| AC5 | `/login?callbackUrl=/checkout…` shows the status banner (role=status, volt-soft); not otherwise | pass | `LoginBanner.test.tsx` (`/checkout`, `/checkout/payment`, `/checkout?step=2` shown; `/`, `/account`, `/wishlist`, `/checkouts` hidden); e2e `protected-routes.spec.ts:68` (exact copy) and `:82` (no banner for `//evil.com`); `apps/web/src/features/session/LoginBanner.tsx:13-15` |
| AC6 | Signed in: `accountName` (dot, named label), account icon → `/account`, utility "My orders · Log out" | pass | `HeaderSession.test.tsx` (signed-in state); e2e `protected-routes.spec.ts:46` (`Account, signed in as Ada Lovelace` → `/account`); `apps/web/src/components/layout/Header.tsx:100-107`, `HeaderSession.tsx:17,31` |
| AC7 | Log out = form POST to `/api/auth/logout` → 303 `/`, no JS, mobile drawer, header signed-out after | pass | `LogoutButton.test.tsx`; `LogoutButton.tsx:5`; `HeaderSession.test.tsx` (Log out in the drawer, 44px target via `MobileNav.tsx:146`); e2e `protected-routes.spec.ts` `logOutFromHeader` (lands on `/`, header shows Log in) and `auth.spec.ts:127` (plain form POST: 303 to `/`, cookie cleared) |
| AC8 | Signed out: account → `/login`, default "My orders · Sign up · Log in" row | pass | `HeaderSession.test.tsx` (signed-out and API-down cases); `Header.tsx:40,100`; e2e `smoke.spec.ts` 375px drawer shows Log in |
| AC9 | `requireUser(path)` validates via `GET /auth/me`, returns `{ id, email, name }` or redirects to `/login?callbackUrl=<path>` | pass | `require-user.test.ts` (user returned, redirect with path+query, `no-store` /auth/me); `require-user.ts:14`, `current-session.ts:14`; `/account` placeholder uses it (`app/account/page.tsx`), exercised by e2e `protected-routes.spec.ts:46,87` |
| AC10 | Guard checks cookie presence only; missing/expired/revoked/tampered token treated as logged out downstream | pass | `proxy.test.ts` ("any token passes the guard"); `require-user.test.ts` (revoked/expired/tampered → redirect); e2e `protected-routes.spec.ts:87` (old cookie restored after logout: proxy lets it through, `requireUser` sends to login, header signed-out) |
| AC11 | Playwright journeys pass in CI against real Postgres | pass (local, not CI) | `TEST_DATABASE_URL=1 npx playwright test` → 13/13 passed (also 26/26 with `--repeat-each=2` earlier today), against the Neon dev branch. All three AC11 journeys at `protected-routes.spec.ts:46,68,87`. Not run in CI — see Notes |
| AC12 | GET page request with the cookie re-sends it (same name/value/attributes, Max-Age 30 days); none without cookie or on non-GET | pass | `session-cookie.test.ts` (attributes, Max-Age 2592000, name mirrored); `proxy.test.ts` (refresh on GET `/` and `/account`, `__Host-` + Secure in production, plain name mirrored, none on POST, none without cookie); `proxy.ts:23-24` |

## Checks Run

- build: `npm run build` (shared, api, web) — pass; every page partially prerendered (`/`, `/account`, `/login`, `/signup`)
- lint: `npm run lint` (eslint per workspace + `prettier --check .`) — pass
- typecheck: `npm run typecheck` — pass
- tests: `npm test` — pass (api 158 passed / 8 skipped, web 176 passed, shared 86 passed)
- e2e: `TEST_DATABASE_URL=1 npx playwright test` (apps/web) — pass (13 passed)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | Spec wording no longer matches the code: T9 / Technical Approach say `HeaderSession` passes `accountHref` (the Header has no such prop and `spec.md:71` says its API is unchanged; behaviour per AC6/AC8 is met); `refreshSessionCookie(response, token)` now takes an optional cookie name; the hidden `callbackUrl` field is read client-side (`CallbackUrlField`) rather than passed by the page; the forms do a full page load after sign-in instead of navigating with the router | /spec-changes |
| 2 | low | AC11 says "in CI"; the run was local. CI env for the API is api-foundation's deferred T22, and this branch has no PR | run in CI when the work is ported to a PR |

## Notes

- **Three defects found by the T11 e2e run and fixed before this QA:** the proxy looked for the cookie name from its own `NODE_ENV` while the API had set the other one (`560fc14`); `/login` and `/signup` briefly rendered two forms during streaming; and the client router reused a cached signed-out redirect of `/account` after login (both `e09c1e7`).
- **Skipped tests:** the 8 skipped API tests are the Postgres `*.db.test.ts` suites, which need a real `TEST_DATABASE_URL` connection string. Not part of this spec.
- **Files outside `> Covers:`** (all handed off in references.md): `app/(auth)/login|signup/page.tsx`, `features/auth/{LoginForm,SignupForm,RedirectIfSignedIn,CallbackUrlField,submit-auth,form-state,hard-navigate}`, `apps/api/src/auth/{auth.controller,session-cookie}.ts`, `components/layout/MobileNav.tsx`, `app/account/page.tsx` (unclaimed placeholder), `e2e/smoke.spec.ts`, `packages/shared/src/index.ts`.
- **Demo branch:** no PR by design. Porting to a clean `feat/accounts-auth/protected-routes` branch from `develop` needs api-foundation and auth-api-migration merged first.
- **Test data:** the e2e runs left throwaway `e2e-…@test.stride` users and sessions in the Neon dev branch.
- `> Status:` is `in-progress`; with this QA passing it can be marked `done`.
