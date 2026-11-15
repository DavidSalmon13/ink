# Monorepo Scaffold

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/foundation/monorepo-scaffold
> Covers: apps/api/** (build, bootstrap, /health), apps/mobile/** (Expo Router scaffold, app entry), docker-compose.yml, .github/workflows/**, README.md, .gitignore, .nvmrc

## Overview

The empty but runnable monorepo every later Foundation spec builds on: a Spring Boot 3 / Java 21 API
with Flyway on a local Docker Compose Postgres, and an Expo Router + TypeScript app that reaches
the API's health endpoint, with GitHub Actions CI building and testing both. Everything runs
locally (Mac, iOS Simulator, web browser, Expo Go on the same Wi-Fi). Deploying is the epic's last spec
(`deploy-pipeline`). Theme, RTL, tabs and Home.html belong to `app-shell`. This spec ships a plain placeholder screen.

Serves the epic's success criterion "Aya can open the app … connected to the API" by
proving the app → API path locally first.

## Goals & User Stories

- As David, I can clone the repo and run Postgres, the API and the app locally with a few documented commands.
- As David, I open the app in the iOS Simulator, the browser and Expo Go on my iPhone and see that it reaches my local API.
- As David, every push runs CI for both apps, so a broken build is caught before review.

## Acceptance Criteria

1. AC1: `docker compose up -d` starts Postgres 16 locally with a named volume; credentials come from `.env` (with `.env.example` committed).
2. AC2: `./gradlew bootRun` in `apps/api` starts the API on Java 21; Flyway runs on start and applies the baseline migration.
3. AC3: `GET /health` returns 200 with `{"status":"UP"}` including DB status, without authentication.
4. AC4: `./gradlew test` passes, including a Testcontainers test that boots the context against real Postgres and asserts `/health` is UP.
5. AC5: `npx expo start` in `apps/mobile` opens the app in the iOS Simulator, web and Expo Go (same Wi-Fi). The placeholder screen shows "Ink" and the API status (connected / unreachable).
6. AC6: The app finds the API URL from `EXPO_PUBLIC_API_URL`, falling back to the dev machine's LAN host from Expo's `hostUri`, so Expo Go on a phone reaches the Mac without code edits.
7. AC7: The web preview can call `/health` locally (dev CORS allows the Expo web origin); the web build doesn't crash.
8. AC8: Mobile `npm run typecheck`, `npm run lint` and `npm test` (Jest, jest-expo) pass.
9. AC9: GitHub Actions runs API build+test and mobile typecheck+lint+test on push and PR, each job only when its app (or the workflow) changed. Both are green on the spec branch.
10. AC10: Expo SDK is the one the current App Store Expo Go supports; only Expo Go–compatible dependencies.
11. AC11: The root README documents prerequisites (Node LTS via `.nvmrc`, Java 21, Docker) and the run commands for all three environments.

## Technical Approach

**Layout:** `apps/api`, `apps/mobile`, `docker-compose.yml` at root, `.github/workflows/{api,mobile}.yml`.
No JS workspace tooling at root: the two apps are independent (Gradle vs npm).

**API (`apps/api`):** Spring Initializr-equivalent Gradle (Kotlin DSL) project with the wrapper
committed. Package `app.ink.api`, main class `InkApiApplication`. Deps: web, data-jpa, validation,
actuator, flyway-core + flyway-database-postgresql, postgresql driver; test: spring-boot-starter-test,
Testcontainers (postgresql, junit-jupiter). Spring Security is **not** added yet (owner-auth-lock).
- `application.yml`: datasource from env (`DB_URL`, `DB_USER`, `DB_PASSWORD`) with local defaults
  matching Compose; `spring.jpa.hibernate.ddl-auto=validate`; `spring.jpa.open-in-view=false`;
  JDBC/Hibernate time zone UTC (`hibernate.jdbc.time_zone=UTC`).
- Actuator: expose only `health` at base path `/` → `GET /health`, `show-details` limited to status components.
- `db/migration/V1__baseline.sql`: comment-only baseline proving the Flyway pipeline. Real tables come in later specs.
- Dev CORS: a `WebMvcConfigurer` that allows origins from `app.cors.allowed-origins` (default `http://localhost:8081`), plus the actuator CORS property. deploy-pipeline sets the production origin.
- Test: `HealthIT` with `@SpringBootTest(webEnvironment=RANDOM_PORT)` + `@Testcontainers` + `@ServiceConnection` Postgres → asserts 200/UP and the Flyway baseline applied.

**Mobile (`apps/mobile`):** `create-expo-app` (TypeScript, Expo Router), cleaned to a single
`app/index.tsx` placeholder + `app/_layout.tsx` (Stack). `src/config/api.ts` resolves the base URL
(`EXPO_PUBLIC_API_URL` → `Constants.expoConfig.hostUri` host + `:8080` → `http://localhost:8080`).
`src/api/health.ts` does a `fetch` with a timeout. The placeholder screen shows the result. No TanStack Query yet; that arrives with the first real data.
Placeholder styles use logical props (`paddingStart`, not `Left`) so app-shell has nothing to undo.
Tooling: ESLint (`eslint-config-expo`), `tsc --noEmit`, Jest with `jest-expo` + `@testing-library/react-native`
(test: placeholder renders and shows "unreachable" when fetch fails).

**CI:** two workflows with `paths` filters. API: `actions/setup-java` (Temurin 21, Gradle cache)
→ `./gradlew build` (Testcontainers uses the runner's Docker). Mobile: `actions/setup-node` from
`.nvmrc` with npm cache → `npm ci` → typecheck → lint → test.

## Out of Scope

- Theme/tokens, RTL, tabs, Home screen, design components (app-shell).
- Spring Security, JWT, Face ID (owner-auth-lock).
- Entity conventions, error format, Settings, R2 (api-conventions).
- Railway, web hosting, EAS Update channel, production CORS (deploy-pipeline).
- Dev builds / Simulator Face ID setup (owner-auth-lock).

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch `feat/foundation/monorepo-scaffold`, `feat(foundation): …` commits, PR via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-15 | david-schwartzman | created | Initial shaping | — |
