# QA Report — Owner Auth & App Lock

> Spec: spec.md
> Date: 2026-11-16 · QA by: David Schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | `owner` + `owner_session` schema, no hard deletes | pass | `apps/api/src/main/resources/db/migration/V2__owner_and_session.sql:4-30` — soft-delete via `deleted_at`, case-insensitive unique email, `token_hash` unique, owner_id index |
| AC2 | Seeder upsert from env; revoke all sessions on hash change; warn + all-logins-fail when unset | pass | `OwnerSeeder.java:41-83`; covered by `OwnerSeederIT` (green in CI; not run locally — see Notes) |
| AC3 | `hashPassword` reads stdin only (not args), prints bcrypt | pass | `HashPasswordCli.java:25-50`; `HashPasswordCliTest` passed locally |
| AC4 | Login returns `{token, sessionId}`; 32 random bytes base64url; only SHA-256 stored; raw token never logged/stored | pass | `SessionTokenService.java:44-50,94-101`; `AuthController.LoginRequest.toString():38-41` redacts password; `BearerTokenFilter` never logs token |
| AC5 | Wrong email/password → identical 401 (no enumeration); 5 failures / 15 min → 429 | pass | `LoginService.java:49-67` (dummy-hash timing equalizer); `LoginRateLimiter.java`; covered by `AuthIT`/`LoginRateLimitIT` (CI) |
| AC6 | Every endpoint but `/health`, `/auth/login`, preflight → 401; missing/malformed/unknown/revoked/expired all rejected the same | pass | `SecurityConfig.java:44-51`; `BearerTokenFilter.java:36-43` |
| AC7 | 90-day sliding expiry on `last_used_at`; touch at most hourly | pass | `SessionTokenService.java:57-66`; `SessionTokenServiceTest` passed locally |
| AC8 | `POST /auth/logout` revokes caller's session; token 401 afterward | pass | `AuthController.java:66-70`; `SessionTokenService.revoke:77-85` |
| AC9 | `GET /auth/sessions` lists active (with current flag); `DELETE /auth/sessions/{id}` revokes; others → 404 | pass | `AuthController.java:72-87` |
| AC10 | No-token app opens Login (Hebrew, logical props, states, error copy); success stores token → home; wrong pw + rate-limit messages | pass | `app/login.tsx` — "אימייל או סיסמה שגויים" + rate-limit message; `login.test.tsx`. RTL deferred to app-shell (changelog 2026-11-16) |
| AC11 | iOS token in secure-store survives restart; web memory-only, reload → Login | pass | `tokenStore.ts:14-37`; `tokenStore.test.ts` |
| AC12 | Lock on cold start + every background return; unlock via local-auth; inactive → privacy cover | pass | `useAppLock.ts:81-104`; `_layout.tsx:22-38`; `useAppLock.test.tsx`. Face ID on Simulator dev build is T19 (manual) |
| AC13 | No biometrics/passcode → Lock offers password sign-in | pass | `useAppLock.ts` `unavailable` → `_layout.tsx:34` onUsePassword → signOut |
| AC14 | `my-data` requires fresh auth every open even when unlocked; cancel → back | pass | `my-data.tsx:22-41`; `requireReauth.ts`; `my-data.test.tsx` |
| AC15 | Any API 401 clears token → Login; logout button calls `/auth/logout`, clears, shows Login | pass | `client.ts:96-100`; `AuthProvider.tsx:93-104` (stale-token guard); `index.tsx:61-69` (התנתקות); `sessionExpiry.test.tsx` |
| AC16 | Web: no Lock / re-auth, nothing crashes | pass | `_layout.tsx:24` (web disables lock); `requireReauth.ts:11`, `tokenStore.ts:15` web no-ops |
| AC17 | API + mobile tests cover AC2–AC15; build/typecheck/lint/test pass; CI green | pass | Mobile: 84/84 jest, typecheck + lint clean. API: unit tests pass; integration tests green in CI (not runnable locally — see Notes) |

## Checks Run

- build (API): `./gradlew build` — **fail locally** (15 tests, 4 failed) — the 4 are Testcontainers `initializationError` (Docker not running); unit tests pass
- typecheck (mobile): `npm run typecheck` (`tsc --noEmit`) — pass
- lint (mobile): `npx expo lint` — pass
- tests (mobile): `npx jest --ci` — pass (84 passed, 0 failed; 13 suites)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | API integration tests (HealthIT, AuthIT, LoginRateLimitIT, OwnerSeederIT) cannot run in this environment — Docker/Testcontainers unavailable | Environmental — verified green in CI at merge (PRs #15–#26); no action |
| 2 | low | T19 manual device check (Face ID on Simulator dev build, passcode fallback, re-lock, app-switcher cover, web preview) still open | Human-only — run T19 to close |

## Notes

- **Mode: setup.** Verdict capped at PASS WITH NOTES by two environmental/human-only gaps, not code defects.
- The API's Docker-backed integration tests exercise AC2, AC5, AC6, AC8, AC9 end-to-end. They were green in CI when PRs #15–#26 merged to `main`; locally they error at container startup because no Docker daemon is present. The non-Docker unit tests (`SessionTokenServiceTest`, `HashPasswordCliTest`) pass. All of these ACs are additionally confirmed by code inspection above.
- **AC10 RTL** was descoped to app-shell (which owns `I18nManager.forceRTL`); these screens use logical start/end only and their RTL rendering is verified in app-shell's QA. Recorded in the spec changelog (2026-11-16) and Out of Scope.
- **T19** is the only remaining spec task and requires a physical/simulator device — it cannot be automated here. Face ID verification on a Simulator dev build (AC12) depends on it.
- Code reviewed on 2026-11-16 (1 HIGH, 3 MEDIUM, 2 LOW) and security reviewed (2 MEDIUM, 3 LOW); all fixed in PRs #24–#26 except the AC10 RTL dependency, which was recorded via the changelog.
