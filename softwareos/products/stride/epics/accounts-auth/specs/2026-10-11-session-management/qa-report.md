# QA Report — Session Management

> Spec: spec.md
> Date: 2026-10-18 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Run on `feat/accounts-auth/auth-api-demo` at `629ff79` (local demo branch, not the spec's `feat/accounts-auth/session-management`), against the Neon dev database.

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Logged-out `/account/security` → login with callbackUrl and back; page calls `requireUser` | pass | e2e `apps/web/e2e/session-management.spec.ts:69` (passed); `apps/web/src/app/account/security/page.tsx:50`, 401 on the sessions call → login at `page.tsx:74` |
| AC2 | Change password + Your devices sections, `Input`/`Button`, visible labels, works at 375px | pass | e2e `session-management.spec.ts:83` (no horizontal scroll, all buttons visible) |
| AC3 | Form fields, autocomplete, hint, shared Zod on blur and server, per-field errors, no echo | pass | `packages/shared/src/account-security/schemas.test.ts` (6 passed); `account-security.controller.test.ts` "validation (AC3, AC14)"; `ChangePasswordForm.tsx:140-153` |
| AC4 | Wrong current password → inline AC4 error; hash and sessions unchanged | pass | `account-security.controller.test.ts` "wrong current password (AC4)" |
| AC5 | 5 failures in 15 min → "Too many attempts…", 1/2/4/8/15 backoff, `pwchange:<userId>` separate from login, success clears | pass | `throttle.service.test.ts` "password-change throttle"; controller "throttle (AC5)", incl. the parallel-burst regression test (12 parallel guesses → ≤5 verified) |
| AC6 | New Argon2id + pepper hash, every session deleted, new token + cookie, confirmation, old password fails | pass | controller "success (AC6)" (cookie attributes, `pepperVersion`, sessions); e2e `session-management.spec.ts:112` |
| AC7 | Hash update, delete-all and create in one transaction; failure → nothing changes, generic error | pass | controller "updates the hash … inside one transaction (AC7)" and "failure inside the transaction (AC7)" |
| AC8 | One row per session, most recent first, label / Last active / Signed in / This device, only `publicId` leaves | pass | e2e `:112` (2 rows, This device, no Sign out on it, HTML has no token / sha256 / IP); controller "GET /account/sessions (AC8)"; `session.service.test.ts` listSessions; `device-label.test.ts` (25 passed); `DeviceList.tsx:72-86` |
| AC9 | `lastSeenAt` written only when >1h old, merged with renewal | pass | `session.service.test.ts` "lastSeenAt (AC9)" (3 tests) |
| AC10 | Sign out one row; foreign/unknown → 404; current refused; revoked device logged out | pass | controller "POST /account/sessions/revoke (AC10)" (9 tests); no-JS form exercised in e2e `:195` |
| AC11 | Sign out all others (shown with >1 session); no session → 401 and nothing deleted; page → login | pass | controller "revoke-others (AC11)"; e2e `:112`; `DeviceList.tsx:103`; 401 → login in `SignOutOthersButton.tsx:27` (inspection) |
| AC12 | ≤10 sessions after any sign-in; least recently seen evicted in the same transaction | pass | `session.service.test.ts` "session cap (AC12)" (6 tests, in-memory fake; see Notes) |
| AC13 | Bearer cron deletes expired / 90-day sessions and 24h-old attempts, returns counts; 401 cases; daily schedule | pass | `cron.controller.test.ts` (all 401 cases, 24h cutoff); `deleteExpiredSessions` / `pruneAuthAttempts` unit tests; `apps/api/vercel.json:3` |
| AC14 | `CRON_SECRET` placeholder, API only, in secrets lists; no secrets in logs / responses / errors | pass | `apps/api/.env.example:28`; `architecture.md:60`; `standards/global/auth-security.md:28,31`; log and body checks in every controller test's `afterEach` |
| AC15 | `/account/security` private + no-store; both forms submit under the CSP | pass | e2e `session-management.spec.ts:195` |
| AC16 | Playwright two-device journey against real Postgres | pass (local) | e2e `:112` against the Neon dev DB; the CI run is deferred (T23) |

## Checks Run

- build: `npm run build` — pass
- lint: `npm run lint` — fail (Prettier: `packages/shared/src/account-security/index.ts` only; ESLint clean)
- typecheck: `npm run typecheck` — pass
- tests: `TEST_DATABASE_URL=… npm test` — pass (API 237 incl. 8 Postgres db tests, web 236, shared 92; 0 failed)
- e2e: `TEST_DATABASE_URL=1 npm run test:e2e` — pass (25 passed)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `npm run lint` is red: Prettier formatting in `packages/shared/src/account-security/index.ts` (added in T10) | Prettier-only fix commit |
| 2 | low | T24 open findings: current-password check outside the transaction (two concurrent changes, last write wins); concurrent logins can briefly leave 11 sessions; no minimum length for `CRON_SECRET` | user decision; /hotfix if any are wanted |
| 3 | low | Cap eviction (`createSession` skip/delete) and the cron deletes are unit-tested only on the in-memory fake, not on Postgres | add cases to `session.db.test.ts` / `throttle.db.test.ts` |

## Notes

- **Hygiene:** T23 stays open as "Deferred (demo)": the CI env is api-foundation's deferred T22; the local run of every suite is recorded under it. Every other task is `[x]`. No PR, by design: the demo branch isn't PR'd, and this spec gets redone on a fresh branch from `develop`.
- **Status:** spec `> Status:` stays `in-progress` while T23 is open.
- **Spec drift for /spec-changes:**
  - `> Covers:` says `e2e/session-management.spec.ts`; the file lives in `apps/web/e2e/`.
  - T12's order is now parse → record attempt → throttle check (the T24 fix), not "throttle check → safeParse".
  - T5 runs the real `AuthGuard` and cookie writer rather than mocks.
  - Copy not in the spec: "Enter your current password.", "Something went wrong. Try again.", "Use Log out to sign out of this device."
  - T18 created `apps/api/vercel.json` holding only the cron entry (user-approved); the API project's other Vercel settings stay with api-foundation.
- **Design:** `/account/security` has no mockup; built from `AccountOrders.dc.html` styling and flagged to design (T16).
- **Wiring edits outside `> Covers:`:** `AuthGuard` + `@CurrentSession()`, `Session.publicId` in the session type, `AuthModule` exports `ThrottleService`, `AppModule` imports the new modules.
