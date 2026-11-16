# Owner Auth & App Lock

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/foundation/owner-auth-lock
> Covers: POST /auth/login, POST /auth/logout, GET /auth/sessions, DELETE /auth/sessions/{id}, apps/api/src/main/java/app/ink/api/auth/**, apps/api/src/main/resources/db/migration/V2__owner_and_session.sql, apps/mobile/src/auth/**, apps/mobile/src/api/client.ts, apps/mobile/app/login.tsx, apps/mobile/app/my-data.tsx (placeholder), lock screen + auth guard in apps/mobile/app/_layout.tsx

## Overview

Aya signs in once per device with email and password. The API issues an opaque, per-device session
token (stored only as a hash in `owner_session`, sent as `Authorization: Bearer`, kept in
`expo-secure-store`). After that she opens the app with Face ID, falling back to the device passcode.
The app locks every time it goes to the background, and "My Data" asks her to authenticate again even
when the app is already unlocked. A lost device can be logged out on the server. Every API endpoint
except `/health` and `/auth/login` now requires a valid session.

Serves the epic's success criteria "The app is always locked when reopened or brought back from the
background" and "Face ID is verified on an iOS Simulator dev build", plus the brief's stories "sign in
once per device, then only Face ID" and "My Data asks me to authenticate again". It follows the
mission: Aya is the only real user, and clients must never see client data.

This spec settles the two auth risks in the tech plan: tokens use a sliding 90-day expiry, and a lost
device is handled through the list/revoke API, whose UI arrives with the Settings screen. Login and
Lock have no page mockups, so they are built only from design-system components and tokens.

## Goals & User Stories

- As Aya, I sign in once per device with my email and password, and after that only use Face ID or my passcode.
- As Aya, when I open the app it asks for Face ID, falling back to my device passcode, so nobody else can see my clients.
- As Aya, the app locks again whenever it goes to the background, and the app switcher never shows my data.
- As Aya, opening "My Data" asks me to authenticate again, even when the app is unlocked.
- As Aya, if I lose a device I can log it out from the server, and it can no longer reach my data.
- As David, I set or reset Aya's password by changing an env var and restarting the API, without a database console.

## Acceptance Criteria

1. AC1: Flyway `V2__owner_and_session.sql` creates `owner` (id uuid, email unique case-insensitive, password_hash, created_at, updated_at, deleted_at) and `owner_session` (id uuid, owner_id FK, token_hash unique, device_name, platform, created_at, last_used_at, deleted_at = revoked). No hard deletes.
2. AC2: On startup, if `OWNER_EMAIL` and `OWNER_PASSWORD_HASH` are set, the API creates the owner, or updates their hash if it changed. When the hash changes, every existing session is revoked. If neither is set and no owner exists, the API starts and logs a warning, and every login fails.
3. AC3: `./gradlew hashPassword` reads a password from stdin (not from args, so it stays out of shell history) and prints its bcrypt hash.
4. AC4: `POST /auth/login {email, password, deviceName, platform}` with correct credentials returns 200 `{token, sessionId}`. The token is 32 random bytes, base64url-encoded. Only its SHA-256 hash is stored, and the raw token never appears in logs or the database.
5. AC5: A wrong email or wrong password returns the same 401 with the same message (no account enumeration). After 5 failed attempts within 15 minutes, login returns 429 for 15 minutes, even with the correct password.
6. AC6: Every endpoint except `GET /health`, `POST /auth/login` and CORS preflight returns 401 without a valid Bearer token. Missing, malformed, unknown, revoked and expired tokens are all rejected the same way.
7. AC7: A session expires 90 days after `last_used_at`. Using the token extends it. `last_used_at` is written at most once per hour per session.
8. AC8: `POST /auth/logout` revokes the calling session, and the token returns 401 immediately afterwards.
9. AC9: `GET /auth/sessions` lists active sessions (id, deviceName, platform, createdAt, lastUsedAt, current flag). `DELETE /auth/sessions/{id}` revokes that session. Its token returns 401 on the next request.
10. AC10: The app with no stored token opens on the Login screen (Hebrew, laid out with logical start/end properties so it renders right-to-left once app-shell forces RTL; design-system inputs and primary button, plus loading, error and disabled states). On success it stores the token and goes to the home placeholder. A wrong password shows "אימייל או סיסמה שגויים". Rate limiting shows a "try again later" message.
11. AC11: On iOS the token is kept in `expo-secure-store` and survives an app restart. On web it is kept in memory only, and a reload returns to Login.
12. AC12: On iOS, the app shows the Lock screen on cold start and every time it returns from `background`, and unlocks only after `expo-local-authentication` succeeds (Face ID, then the passcode). On `inactive` (app switcher), a privacy cover hides the content. In Expo Go the passcode fallback works. Face ID is verified on a Simulator dev build.
13. AC13: If the device has no biometrics and no passcode, the Lock screen offers signing in again with the password instead of unlocking.
14. AC14: The `my-data` route (placeholder) requires a fresh local authentication every time it's opened, even when the app is unlocked. A cancelled or failed check goes back without showing the screen.
15. AC15: Any API 401 clears the stored token and returns the app to Login. Logout (a temporary button on the home placeholder until Settings exists) calls `/auth/logout`, clears the token, and shows Login.
16. AC16: On web there's no Lock screen or re-auth prompt (preview only), and nothing crashes.
17. AC17: The API tests (JUnit + Testcontainers) and the mobile tests (Jest) cover AC2 to AC15. `./gradlew build`, `npm run typecheck`, `npm run lint` and `npm test` all pass, and CI is green.

## Technical Approach

**API (`app.ink.api.auth`)**
- Add `spring-boot-starter-security`. A `SecurityFilterChain` with stateless sessions, CSRF disabled (header auth, no cookies), CORS from the existing `CorsConfig`, `permitAll` for `GET /health`, `POST /auth/login` and `OPTIONS /**`, and `authenticated` for everything else. The 401 response comes from a custom `AuthenticationEntryPoint`.
- Entities and repositories: `Owner` and `OwnerSession` (JPA, `ddl-auto=validate` against V2).
- `SessionTokenService`: issue (32 bytes from `SecureRandom`, base64url), hash with SHA-256 (fast hashing is fine for a high-entropy token), look up an active session (`deleted_at IS NULL AND last_used_at > now() - 90d`), touch `last_used_at` at most once per hour, and revoke.
- `BearerTokenFilter` (`OncePerRequestFilter`): parse `Authorization: Bearer`, look up by hash, and put an `OwnerPrincipal(ownerId, sessionId)` in the `SecurityContext`.
- `AuthController`: login, logout, sessions list and revoke. Revoking only affects the caller's own owner's sessions; any other id returns 404.
- `LoginRateLimiter`: an in-memory window keyed by lowercased email and by client IP. That's enough for a single Railway instance; the note goes in Out of Scope.
- `OwnerSeeder` (`ApplicationRunner`): upsert from env and revoke all sessions when the hash changes. Passwords use `BCryptPasswordEncoder` (strength 12).
- `hashPassword` Gradle task: a `JavaExec` that runs a small `HashPasswordCli` main class, reading stdin.
- Errors: a minimal JSON body `{ "error": { "code": "...", "message": "..." } }` returned by the entry point and the controller's exception handlers. `api-conventions` owns the final error format and will align these handlers.
- `application.yml`: `app.auth.owner-email`, `app.auth.owner-password-hash` (env), `app.auth.session-ttl: 90d`, `app.auth.touch-interval: 1h`.

**Mobile**
- Dependencies (all work in Expo Go): `expo-secure-store`, `expo-local-authentication`, `expo-device` (for the device name).
- `src/auth/tokenStore.ts`: secure-store on iOS, an in-memory variable on web (`Platform.OS`).
- `src/api/client.ts`: an `apiFetch` wrapper that reuses `API_BASE_URL` and the timeout pattern from `health.ts`, adds `Authorization: Bearer`, and calls `onUnauthorized` (clear token → Login) on 401.
- `src/auth/AuthProvider.tsx`: state `loading | signedOut | signedIn` with `signIn`, `signOut` and `locked`.
- `src/auth/useAppLock.ts`: listens to `AppState`. `background` → locked. `inactive` → privacy cover only, because the Face ID prompt itself triggers `inactive` and locking there would loop. `active` while locked → prompt. Web is a no-op.
- `src/auth/requireReauth.ts`: a one-off `authenticateAsync` used by the `my-data` route guard.
- `app/_layout.tsx`: wrap in `AuthProvider`. When signed out, redirect to `/login`. When signed in and locked, render `LockScreen` as a full-screen overlay above the Stack, so the navigation state is kept.
- Screens: `app/login.tsx`, `src/auth/LockScreen.tsx` and `app/my-data.tsx` (placeholder). Styles come only from tokens, using logical properties. If app-shell's theme has landed, use it. Otherwise read the few needed tokens from a small `src/auth/tokens.ts`, marked for app-shell to replace. Forced RTL also comes from app-shell; until it lands, these screens render left-to-right.

**Docs:** add `Owner` and `OwnerSession` to `data-model.md` (they're internal, not synced entities). Add `OWNER_EMAIL` and `OWNER_PASSWORD_HASH` to `.env.example` and the README.

**Risk:** api-conventions also plans early migrations. Whichever spec lands second renumbers to the next free `V<n>`, because Flyway versions must stay unique.

## Out of Scope

- A "connected devices" screen (lists and revokes sessions). It comes with Settings; only the API ships here.
- Sign-up, password change or reset UI, email verification, and 2FA. Password reset happens through the env var plus a restart (AC2).
- `Settings.autoLockSeconds`, a grace period before re-locking. This spec locks immediately. The setting is wired up when the Settings table and screen exist (api-conventions and Settings).
- Client mode and its exit authentication (sketches epic). It will reuse `requireReauth`.
- Distributed or persistent rate limiting. In-memory is enough for one instance.
- Real My Data content (the My Data epic), and the Home.html tile linking to it (app-shell).
- The final shared error format and the entity conventions (api-conventions).
- Forcing the app into right-to-left layout (`I18nManager.forceRTL`). app-shell owns it (foundation tech-plan). This spec's screens use logical start/end only, and their RTL rendering is verified in app-shell's QA.

## Standards Applied

- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md): Login, Lock and the My Data placeholder have no mockup, so they are built from design-system components and tokens only, use logical sides, Hebrew text, and light and dark mode.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch `feat/foundation/owner-auth-lock`, commits scoped `feat(foundation)`, PR via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-16 | david-schwartzman | created | Initial shaping | — |
| 2026-11-16 | david-schwartzman | change | AC10: RTL layout depends on app-shell's forced RTL; added to Out of Scope — forced RTL is app-shell's per the tech plan, found in the code review of #21–#23 | PR #21–#23 review |
