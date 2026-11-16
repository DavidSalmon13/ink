# QA Report — Monorepo Scaffold

> Spec: spec.md
> Date: 2026-11-16 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | `docker compose up -d` starts Postgres 16, named volume, creds from `.env` | pass | Observed: `ink-postgres` healthy, `PostgreSQL 16.15`, volume `ink_ink-pgdata`; `.env` made from `.env.example` (POSTGRES_PORT=5434, see Notes) |
| AC2 | `./gradlew bootRun` on Java 21; Flyway applies the baseline | pass | Observed bootRun log: "Starting InkApiApplication using Java 21.0.13", "Successfully applied 1 migration … now at version v1"; `flyway_schema_history` row `1 / baseline / t`. Test: `HealthIT.flywayAppliedTheBaselineMigration` |
| AC3 | `GET /health` → 200 `{"status":"UP"}` incl. DB, no auth | pass | Observed: `HTTP/1.1 200`, `{"status":"UP","components":{"db":{"status":"UP"},…}}`; `/actuator/health` and `/env` → 404. Test: `HealthIT.healthIsUpWithDatabaseWithoutAuthentication`, `healthIsNotServedUnderActuatorPrefix` |
| AC4 | `./gradlew test` passes incl. Testcontainers `/health` test | pass | `./gradlew build` green (local JDK 21 container, 3/3 HealthIT) and CI "API / Build & test" green on PR #12 |
| AC5 | `npx expo start` → Simulator, web, Expo Go; screen shows "Ink" + API status | pass (web) · not verifiable (Simulator, Expo Go) | Web: exported build loaded in headless Chrome showed "Ink" and "API: connected", then "API: unreachable" with the API stopped. Test: `__tests__/index.test.tsx` (4 cases). Simulator/Expo Go: see Notes |
| AC6 | API URL from `EXPO_PUBLIC_API_URL` → `hostUri` LAN host → localhost | pass | Test: `__tests__/api-config.test.ts` (4 cases); `apps/mobile/src/config/api.ts:14-25`. Real-phone LAN path not observed (see Notes) |
| AC7 | Web preview can call `/health` (dev CORS); web build doesn't crash | pass | Preflight from `Origin: http://localhost:8081` → 200 with `Access-Control-Allow-Origin: http://localhost:8081`; other origin → 403. `npx expo export --platform web` succeeded; web app reached the API (AC5 evidence) |
| AC8 | Mobile `typecheck`, `lint`, `test` pass | pass | `npm run typecheck` ok, `npm run lint` ok, `npm test` 13/13 |
| AC9 | CI runs API build+test and mobile checks on push/PR with paths filters; green on spec branch | pass | `.github/workflows/{api,mobile}.yml`; PR #12 runs: API success (1m40s), Mobile success (1m16s); push runs also green |
| AC10 | Expo SDK is the one App Store Expo Go supports; Expo Go–compatible deps only | pass | `expo ~58.0.25`; api.expo.dev latest SDK 58.0.0 with Expo Go iOS 58.0.7 (not beta); `expo-doctor` 20/20 checks passed |
| AC11 | Root README documents prerequisites and run commands for all three environments | pass | `README.md` → Prerequisites (Node via `.nvmrc`, Java 21, Docker, Expo Go/Xcode) and Run locally (Compose, bootRun, Simulator / web / Expo Go) |

## Checks Run

- build (API): `./gradlew build` (JDK 21 in `eclipse-temurin:21-jdk` container) — pass; CI — pass
- lint: `npm run lint` (apps/mobile) — pass
- typecheck: `npm run typecheck` (apps/mobile) — pass
- tests: `./gradlew test` — pass (3 passed); `npm test` — pass (13 passed, 0 failed)
- `npx expo export --platform web` — pass · `npx expo-doctor` — pass (20/20)

## Issues Found

(none)

## Notes

- **AC5 / AC6, not verifiable on this machine:** Xcode isn't installed (no `simctl`), so the iOS Simulator run wasn't observed. Expo Go on an iPhone over the LAN wasn't tried because no device was available. The logic is covered by unit tests and the web run. Do a manual check on a phone before relying on it.
- **Port clash:** another local project's Postgres already listens on 5432. QA used `POSTGRES_PORT=5434` and a matching `DB_URL` in the git-ignored `.env`. The defaults in `.env.example` and `application.yml` (5432) are unchanged.
- **No local Java:** the API was built and run inside the `eclipse-temurin:21-jdk` Docker image. Testcontainers was pinned to 1.21.4 because Boot 3.5.3's 1.21.2 is rejected by Docker Engine 29.
- **Hygiene:** all 16 tasks done once T16 is ticked. PR #12 is recorded in `tasks.md`. Spec `> Status:` is still `in-progress`, to be set to done when the PR merges.
