# Ink

A private studio-management app for a solo tattoo artist: Hebrew right-to-left UI, iPhone and iPad.

| Path | What |
|---|---|
| `apps/api` | Spring Boot 3 API, Java 21, Gradle (Kotlin DSL), Flyway |
| `apps/mobile` | Expo Router + TypeScript app |
| `docker-compose.yml` | Local PostgreSQL 16 |
| `softwareos/`, `design/` | Product docs, specs, standards and design (start with `CLAUDE.md`) |

## Prerequisites

- **Node LTS** — the version in `.nvmrc` (`nvm use` in the repo root).
- **Java 21** — e.g. [Temurin 21](https://adoptium.net/). Gradle's toolchain resolver can download JDK 21
  for the build, but Gradle itself still needs a JDK on your machine to start.
- **Docker** — Docker Desktop (or compatible), for the local database and the API's Testcontainers tests.
- **Expo Go** from the App Store, to run the app on a real iPhone/iPad. **Xcode** for the iOS Simulator.

## Run locally

### 1. Database

```sh
cp .env.example .env          # then set POSTGRES_PASSWORD and DB_PASSWORD (same value)
docker compose up -d          # Postgres 16 on localhost:5432, data in the ink-pgdata volume
```

### 2. API

```sh
cd apps/api
set -a; source ../../.env; set +a   # DB_URL / DB_USER / DB_PASSWORD
./gradlew bootRun                   # http://localhost:8080 — Flyway migrates on start
curl localhost:8080/health          # {"status":"UP",...}
```

Tests (`./gradlew test`, or `./gradlew build` for compile + tests) start their own Postgres with Testcontainers,
so Docker must be running.

#### Owner login

The app has one user, the owner, created from two env vars when the API starts:

| Variable | Value |
|---|---|
| `OWNER_EMAIL` | The login email (case-insensitive) |
| `OWNER_PASSWORD_HASH` | A bcrypt hash of the password, never the password itself |

Make the hash with the `hashPassword` task. It reads the password from stdin, so it stays out of shell history.
Gradle doesn't give it a real terminal, so typing straight into it would show the password on screen. Read it
silently first and pipe it in:

```sh
cd apps/api
read -rs P && printf '%s\n' "$P" | ./gradlew -q hashPassword; unset P   # type the password (hidden), Enter; prints $2a$12$...
```

Put both in `.env`, with the hash in **single quotes** (it contains `$`):

```sh
OWNER_EMAIL=aya@example.com
OWNER_PASSWORD_HASH='$2a$12$...'
```

On Railway, paste the hash as is (no quotes) into the service's variables.

- **Changing the password:** set a new hash and restart the API. Every signed-in device is logged out.
- **Not set:** the API still starts, logs a warning, and every login fails.

### 3. App

```sh
cd apps/mobile
npm install
npx expo start
```

Then, from the Expo prompt:

- **iOS Simulator:** press `i`. The app reaches the API at `http://localhost:8080`.
- **Web:** press `w` (opens `http://localhost:8081`). The API's dev CORS allows this origin.
- **Expo Go on a phone:** scan the QR code with the Camera app. The phone must be on the same Wi-Fi as the Mac.
  The app finds the API at the Mac's LAN address automatically, so allow incoming connections to Java
  if macOS asks.

To point the app at a different API, set `EXPO_PUBLIC_API_URL` (e.g. `EXPO_PUBLIC_API_URL=http://192.168.1.20:8080 npx expo start`).

Checks: `npm run typecheck`, `npm run lint`, `npm test`.

## CI

GitHub Actions runs `.github/workflows/api.yml` (`./gradlew build` on Temurin 21) when `apps/api/**` changes,
and `.github/workflows/mobile.yml` (typecheck, lint, test) when `apps/mobile/**` changes.
