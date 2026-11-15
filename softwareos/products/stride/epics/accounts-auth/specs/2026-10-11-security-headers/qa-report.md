# QA Report — Security Headers

> Spec: spec.md
> Date: 2026-10-15 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on `feat/accounts-auth/auth-api-demo` (local demo branch; it pre-merges PRs #20/#21, api-foundation, auth-api-migration and protected-routes on purpose), at commit `d05c75f` (T8 `141d0d9`, T9 `d05c75f`). This run re-verifies AC1–AC8 and adds AC9 after the 2026-10-15 spec change.

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Every response (pages, redirects, `/_next/static/*`, `/public`) carries HSTS (1 week, includeSubDomains), nosniff, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY, CSP; no X-Powered-By | pass | e2e `security-headers.spec.ts` "pages, a redirect, a static asset and a public file carry them" (`/`, a `/_next/static/*.js`, `/file.svg`, `/login`, the signed-out `/account` 307); `security-headers.test.ts` exact header list; `apps/web/next.config.ts` `headers()` on `/:path*` + `poweredByHeader: false` |
| AC2 | Production CSP is exactly the AC2 string; no nonce, no `'unsafe-eval'`, no `vercel.live` | pass | `security-headers.test.ts` "is exactly the AC2 policy in production"; e2e compares the served header to the exact string |
| AC3 | `/`, `/login`, `/signup` load with zero CSP violations; sign-up, login back to `callbackUrl` and header logout work; protected-routes' journey still passes | pass | e2e "`/`, `/login`, `/signup` load with zero CSP violations" and "sign-up, logout and login back to callbackUrl work under the CSP"; `protected-routes.spec.ts` passes (full suite 21/21) |
| AC4 | Private paths, `/login`, `/signup`: `Cache-Control` with `private` and `no-store`, signed in or out, redirect included; no `no-store` on public pages from this spec | pass | e2e "private caching (AC4)" (both tests); `proxy.test.ts` "proxy private caching"; `private-paths.test.ts` matrix; `apps/web/src/proxy.ts` `isPrivatePath` → `PRIVATE_CACHE_CONTROL` |
| AC5 | Headers don't change rendering: `/` stays static/PPR; no page reads headers or a nonce | pass | `npm run build`: `/`, `/_not-found`, `/account`, `/login`, `/signup` all `◐` (Partial Prerender); headers are static config; no nonce in `buildCsp` (unit-tested) |
| AC6 | `next dev` works (Fast Refresh, error overlay); only the dev CSP adds `'unsafe-eval'` | pass | `security-headers.test.ts` "adds only 'unsafe-eval' to script-src in dev"; runtime check from T6 (Fast Refresh kept window state with zero CSP violations). No web code changed since, so it was not repeated |
| AC7 | Vercel preview adds exactly the toolbar sources (incl. `frame-src https://vercel.live`), no `'unsafe-eval'`; production/local never include them | pass | `security-headers.test.ts` pins the exact preview CSP and asserts production and dev contain none of the preview origins. Not observed on a real Vercel preview (see Notes) |
| AC8 | Vitest covers the builder, the private-path matrix and the API middleware (AC9); Playwright `security-headers.spec.ts` covers AC1, AC3, AC4 and a direct API response (AC9) against the built apps in CI | pass (local, not CI) | `security-headers.test.ts`, `private-paths.test.ts` and `apps/api/src/common/security-headers.middleware.test.ts` (3 tests) pass; `e2e/security-headers.spec.ts` 8/8 against `next start` + the built API locally. Not run in CI (see Notes) |
| AC9 | Every API response, incl. the proxy-secret 401 and 404s, carries nosniff, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, no `X-Powered-By`; JSON only, pages keep AC1/AC2 | pass | `security-headers.middleware.test.ts` (exactly the four headers, no HSTS, every path incl. `/cron/*`, calls `next`); e2e "a direct API call without the proxy secret is 401 with the API headers"; `apps/api/src/app.module.ts` registers `SecurityHeadersMiddleware` first; `apps/api/src/main.ts:20` disables `x-powered-by`. Runtime: `curl :4000/nope` → 401 and `curl` with the secret → 404, both with the four headers and no `X-Powered-By` or HSTS. Pages unchanged (AC1/AC2 e2e) |

## Checks Run

- build: `npm run build` (shared, api, web) — pass (all routes `◐`)
- lint: `npm run lint` (eslint per workspace + `prettier --check .`) — pass
- typecheck: `npm run typecheck` — pass
- tests: `npm test` — pass (api 161 passed / 8 skipped, web 211 passed, shared 86 passed)
- e2e: `TEST_DATABASE_URL=1 npx playwright test` (apps/web) — pass (21 passed)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | Through the web's `/api/*` rewrite, the API's values now replace the web's for the four overlapping headers: `/api/auth/me` returns `Referrer-Policy: no-referrer` and `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`, while HSTS and Permissions-Policy still come from `next.config.ts`. That's stricter and fits AC9 ("the API's JSON responses"). But the Overview (spec.md:21) still says the web's headers cover `/api/*` through the rewrite | /spec-changes (wording only) |
| 2 | low | AC8 says "in CI" and AC7 is about Vercel previews; both verified locally only (CI env for the API is api-foundation's deferred T22; this branch has no PR or preview deploy) | run in CI / on a preview when ported to a PR |

## Notes

- **Resolved since the last report:** the previous issue #1 (the directly-called API sent only `Cache-Control`) is fixed by AC9 / T8–T9.
- **Skipped tests:** the 8 skipped API tests are the Postgres `*.db.test.ts` suites (need a real `TEST_DATABASE_URL` connection string). Not part of this spec.
- **Files outside `> Covers:`** (wiring edits the spec allows): `apps/web/next.config.ts` (app-foundation), `apps/web/src/proxy.ts` and `proxy.test.ts` (protected-routes), `apps/api/src/app.module.ts` (api-foundation).
- **HSTS** is at one week (`HSTS_MAX_AGE = 604800`); raising it to two years is a `/spec-changes` follow-up after a clean week in production.
- **Test data:** e2e runs leave throwaway `e2e-…@test.stride` users in the Neon dev branch.
- All tasks T1–T10 are done; with this QA passing, `> Status:` can be marked `done`.
