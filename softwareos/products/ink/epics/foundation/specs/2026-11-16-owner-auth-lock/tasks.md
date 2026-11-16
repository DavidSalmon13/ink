# Tasks — Owner Auth & App Lock

> Epic: foundation
> Spec: 2026-11-16-owner-auth-lock
> Branch: feat/foundation/owner-auth-lock
> PR: https://github.com/DavidSalmon13/ink/pull/15 (API, T1+T3–T6) · https://github.com/DavidSalmon13/ink/pull/16 (mobile, T2) · https://github.com/DavidSalmon13/ink/pull/17 (API, T7+T8) · https://github.com/DavidSalmon13/ink/pull/18 (API, T9) · https://github.com/DavidSalmon13/ink/pull/19 (tests, review fixes) · https://github.com/DavidSalmon13/ink/pull/20 (T9 + review-fix tests → main) · https://github.com/DavidSalmon13/ink/pull/21 (mobile, T10–T12) · https://github.com/DavidSalmon13/ink/pull/22 (mobile, T13–T14) · https://github.com/DavidSalmon13/ink/pull/23 (mobile + docs, T15–T18)

## Tests first (TDD)

- [x] T1 Write failing API tests: AuthIT (Testcontainers) for login ok/401/429, Bearer required on a protected probe endpoint, /health stays public, logout, list/revoke, expired + revoked tokens, seeder upsert + revoke-on-hash-change; SessionTokenServiceTest (hashing, sliding expiry, touch throttle) (testing skill)
- [x] T2 Write failing mobile tests: tokenStore (native vs web), apiFetch (Bearer header, 401 → onUnauthorized), AuthProvider transitions, useAppLock (background locks, inactive only covers, active prompts), my-data reauth guard, Login screen states (testing skill)

## API (apps/api)

- [x] T3 Add spring-boot-starter-security; V2__owner_and_session.sql (owner, owner_session, indexes on token_hash and owner_id)
- [x] T4 Owner + OwnerSession entities and repositories
- [x] T5 SessionTokenService (issue, SHA-256 hash, active lookup with 90d sliding window, hourly touch, revoke) + app.auth.* config
- [x] T6 BearerTokenFilter + SecurityFilterChain (stateless, no CSRF, CORS, permitAll /health, /auth/login, OPTIONS) + JSON 401 entry point
- [x] T7 AuthController: POST /auth/login, POST /auth/logout, GET /auth/sessions, DELETE /auth/sessions/{id}
- [x] T8 LoginRateLimiter (5 failures / 15 min per email and per IP → 429)
- [x] T9 OwnerSeeder (env upsert, revoke all sessions on hash change, warn when unset) + hashPassword Gradle task (HashPasswordCli, stdin)

## Mobile (apps/mobile)

- [x] T10 Add expo-secure-store, expo-local-authentication, expo-device (Expo Go–compatible versions via `npx expo install`)
- [x] T11 src/auth/tokenStore.ts + src/api/client.ts (apiFetch with Bearer + 401 handler)
- [x] T12 src/auth/AuthProvider.tsx + auth guard in app/_layout.tsx (redirect to /login when signed out)
- [x] T13 app/login.tsx: Hebrew Login screen from design-system components/tokens (no mockup), loading/error/disabled states, iPhone + iPad
- [x] T14 src/auth/useAppLock.ts + LockScreen overlay + privacy cover on inactive; no-biometrics fallback to password sign-in; web no-op
- [x] T15 src/auth/requireReauth.ts + app/my-data.tsx placeholder guarded by fresh authentication
- [x] T16 Temporary logout button on the home placeholder (calls /auth/logout, clears token)

## Docs

- [x] T17 data-model.md: add Owner + OwnerSession; .env.example + README: OWNER_EMAIL, OWNER_PASSWORD_HASH, hashPassword usage

## Verification

- [x] T18 Make all T1/T2 tests pass; ./gradlew build, npm run typecheck/lint/test green (testing skill)
- [ ] T19 Manual device check: Face ID on a Simulator dev build, passcode fallback in Expo Go, background re-lock, app-switcher cover, web preview login/reload; screenshots compared against design-system.html
- [ ] T20 Run QA against acceptance criteria (qa skill)
