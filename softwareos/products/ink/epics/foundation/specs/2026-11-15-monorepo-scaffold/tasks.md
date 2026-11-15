# Tasks — Monorepo Scaffold

> Epic: foundation
> Spec: 2026-11-15-monorepo-scaffold
> Branch: feat/foundation/monorepo-scaffold

## Repo & local infra

- [x] T1 Root files: .gitignore (Gradle, Node, Expo, .env), .nvmrc (Node LTS), .env.example
- [x] T2 docker-compose.yml: Postgres 16, named volume, healthcheck, env from .env

## API (apps/api)

- [ ] T3 Gradle Kotlin DSL project + wrapper, Java 21 toolchain, deps (web, jpa, validation, actuator, flyway, postgres, testcontainers); package app.ink.api, InkApiApplication
- [ ] T4 application.yml: env-driven datasource, ddl-auto=validate, open-in-view=false, UTC JDBC time zone
- [ ] T5 Flyway V1__baseline.sql
- [ ] T6 Actuator health exposed at GET /health (only endpoint exposed)
- [ ] T7 Dev CORS config (app.cors.allowed-origins, default http://localhost:8081)

## Mobile (apps/mobile)

- [x] T8 create-expo-app (TS + Expo Router) on the SDK the current Expo Go supports; strip template to app/_layout.tsx + app/index.tsx
- [x] T9 src/config/api.ts base-URL resolution (EXPO_PUBLIC_API_URL → hostUri → localhost) + src/api/health.ts fetch with timeout
- [x] T10 Placeholder screen: "Ink" + API status (connected/unreachable), logical styles only
- [x] T11 Tooling scripts: typecheck (tsc --noEmit), lint (eslint-config-expo), test (jest-expo + RNTL)

## CI & docs

- [ ] T12 .github/workflows/api.yml: Temurin 21, Gradle cache, ./gradlew build; paths filter apps/api/**
- [ ] T13 .github/workflows/mobile.yml: Node from .nvmrc, npm ci, typecheck, lint, test; paths filter apps/mobile/**
- [ ] T14 Root README: prerequisites + run commands (Compose, bootRun, Expo: Simulator / web / Expo Go on LAN)

## Verification

- [ ] T15 Write tests: API HealthIT (Testcontainers, /health UP, Flyway applied); mobile placeholder render + unreachable state (testing skill)
- [ ] T16 Run QA against acceptance criteria (qa skill)
