# Foundation — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

A monorepo with an Expo Router app (`apps/mobile`) and a Spring Boot 3 / Java 21 API (`apps/api`).
The app gets a theme module generated from `design/design-system/tokens.json`, the core
design-system components and the tab shell, all right-to-left. The API sets the shared rules
every later epic uses: device-generated UUIDs with safe-to-retry writes, soft delete, version numbers
(optimistic locking), one error format, Flyway migrations, a Settings table, and R2 attachments
through presigned URLs. Owner login uses JWT access + refresh tokens stored in `expo-secure-store`, with
a local Face ID/passcode lock on top.

## Architecture Impact

- **New:** `apps/mobile` and `apps/api`, the first Flyway migrations (`owner`, `settings`, `attachment`),
  Docker Compose Postgres for local development, CI for both apps.
- **Infra:** Railway service + managed Postgres, Cloudflare R2 bucket, EAS project with EAS Update for Expo Go demos (no paid Apple account needed).
- Matches `../../architecture.md`; no changes to the documented components.

## Risks & Unknowns

- Forced RTL (`I18nManager.forceRTL`) needs an app reload, and Expo Go can differ from real builds, so verify on a dev build.
- Face ID fallback and re-lock timing behave differently on iPad (no Face ID on some models → Touch ID / passcode).
- **No paid Apple account during the MVP.** Use only Expo Go–compatible libraries (no custom native modules) so Aya can demo it in Expo Go; keep the project on the SDK version the current Expo Go supports. Face ID doesn't work in Expo Go (passcode fallback), so verify Face ID on a Simulator dev build, which is free. TestFlight and the App Store move to the Release step after the MVP; budget Apple's account review lead time then.
- Keeping the token pipeline (tokens.json → RN theme) in sync with design changes. Generate it, don't hand-copy.
- JWT refresh with a single owner: decide the token lifetimes and how to revoke a lost device.

## Candidate Specs

- `monorepo-scaffold` — `apps/api` (Spring Boot, health endpoint, Flyway, Docker Compose Postgres) + `apps/mobile` (Expo Router, TypeScript); CI builds and tests both
- `app-shell` — theme from tokens.json, forced RTL, core components (buttons, inputs, rows, centered modal, toast, empty/loading/error states), the 5-tab bar, home screen per `design/pages/Home.html`
- `owner-auth-lock` — owner login, JWT refresh, secure storage, Face ID/passcode lock on open and on return from background, re-authentication before My Data
- `api-conventions` — shared entity rules (UUID, soft delete, version), safe-to-retry writes, error format, Settings endpoint, attachments with R2 presigned URLs
- `deploy-pipeline` — Railway (API + Postgres), environment variables, EAS Update channel so Aya can open the latest build in Expo Go (QR/link)
