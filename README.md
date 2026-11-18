# Ink

A private studio-management app for a solo tattoo artist: Hebrew right-to-left UI, iPhone and iPad.

| Path | What |
|---|---|
| `apps/api` | Spring Boot 3 API, Java 21, Gradle (Kotlin DSL), Flyway |
| `apps/mobile` | Expo Router + TypeScript app |
| `docker-compose.yml` | Local PostgreSQL 16 and S3Mock (attachment storage) |
| `docker-compose.prod.yml`, `scripts/smoke-deploy.sh` | Local prod-like rehearsal of the deploy, and the deploy smoke test (see "Deploy") |
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
                              # S3Mock on localhost:9090 with the ink-attachments bucket
```

S3Mock keeps attachments in memory: they're gone when its container is removed. The API's `STORAGE_*`
variables point at it by default; production sets them to Cloudflare R2.

### 2. API

```sh
cd apps/api
set -a; source ../../.env; set +a   # DB_* and STORAGE_* variables
./gradlew bootRun                   # http://localhost:8080 — Flyway migrates on start
curl localhost:8080/health          # {"status":"UP",...}
```

Tests (`./gradlew test`, or `./gradlew build` for compile + tests) start their own Postgres and S3Mock with Testcontainers,
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

## Deploy

Merging to `main` deploys everything. Nothing is deployed by hand, and secrets live only in Railway, GitHub and
Cloudflare, never in this repo.

| Service | Where | Built from | Redeploys when |
|---|---|---|---|
| API | Railway service, root `apps/api` | `apps/api/Dockerfile` + `apps/api/railway.json` (healthcheck `/health`) | `apps/api/**` changes on `main`, after CI passes |
| Database | Railway Postgres plugin | — (Flyway migrates on API start) | — |
| Web preview | Railway service, root `apps/mobile` | `apps/mobile/Dockerfile.web` (static `expo export` served by Caddy) | `apps/mobile/**` changes on `main`, after CI passes |
| Attachments | Cloudflare R2, private bucket | — | — |
| Expo Go | EAS Update, channel `preview` | `.github/workflows/eas-update.yml` | `apps/mobile/**` changes on `main` |

### Variables

**API service (Railway):**

| Variable | Value |
|---|---|
| `DB_URL` | `jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}` (JDBC form, not `DATABASE_URL`) |
| `DB_USER` / `DB_PASSWORD` | `${{Postgres.PGUSER}}` / `${{Postgres.PGPASSWORD}}` |
| `OWNER_EMAIL` | Aya's login email |
| `OWNER_PASSWORD_HASH` | bcrypt hash from `./gradlew -q hashPassword` (paste as-is; Railway doesn't expand `$`) |
| `APP_CORS_ALLOWED_ORIGINS` | the web preview origin, e.g. `https://<web>.up.railway.app` (comma-separated for more) |
| `STORAGE_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
| `STORAGE_REGION` | `auto` |
| `STORAGE_BUCKET` | the R2 bucket name |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | the R2 API token's access key ID and secret |
| `PORT` | set by Railway; don't set it yourself |

**Web service (Railway):** `EXPO_PUBLIC_API_URL` = the API's public URL (e.g. `https://<api>.up.railway.app`). It is
baked into the bundle at build time (a Docker build arg), so changing it needs a redeploy.

**GitHub (repo → Settings → Secrets and variables → Actions):** secret `EXPO_TOKEN` (an Expo access token), and
variable `API_URL` = the API's public URL. Until both exist, the EAS Update workflow skips with a notice.

All of these are listed with placeholders in `.env.example`.

### One-time setup (human steps)

1. **Railway — API.** New project → add the **Postgres** plugin → **New service → GitHub repo**, root directory
   `apps/api`, branch `main`, turn on **Wait for CI**. Set the API variables above (for `APP_CORS_ALLOWED_ORIGINS`
   use a placeholder until step 2 gives you the web URL). **Generate a domain**, deploy, and check
   `https://<api>/health` returns `{"status":"UP", … "db":{"status":"UP"}}`.
2. **Railway — web preview.** **New service → same repo**, root `apps/mobile`, branch `main`, **Wait for CI** on,
   Dockerfile path `Dockerfile.web` (or variable `RAILWAY_DOCKERFILE_PATH=Dockerfile.web`), watch paths
   `/apps/mobile/**`. Set `EXPO_PUBLIC_API_URL`, generate a domain, then set the API's `APP_CORS_ALLOWED_ORIGINS`
   to that web origin.
3. **Cloudflare R2.** Create a private bucket, an R2 API token scoped to it (Object Read & Write), and a bucket
   CORS policy allowing `PUT` and `GET` from the web origin. Set the `STORAGE_*` variables on the API service.
4. **Expo.** Create an Expo account, then in `apps/mobile`: `npx eas-cli login` and `npx eas-cli init`. This writes
   `extra.eas.projectId` and `updates.url` into `app.json`; commit that. Create an access token (expo.dev →
   Account settings → Access tokens) and add it as the `EXPO_TOKEN` secret, plus the `API_URL` variable, in GitHub.
5. **Expo Go.** After the first EAS Update run, open the `preview` channel in Expo Go on the iPhone and iPad
   (expo.dev → project → Updates → the update's QR code) and log in.
6. **Smoke test.** `scripts/smoke-deploy.sh https://<api> https://<web>` must pass.

### Rehearse locally

`docker-compose.prod.yml` builds the same API and web images Railway does and runs them with Postgres and S3Mock
(standing in for R2), in a separate project from the dev database. Stop the dev API first (port 8080).

```bash
docker compose -f docker-compose.prod.yml up -d --build --wait
scripts/smoke-deploy.sh http://localhost:8080 http://localhost:8081   # web preview at http://localhost:8081
docker compose -f docker-compose.prod.yml down -v
```

### Roll back

- **API or web preview:** Railway → the service → **Deployments** → pick the last good deployment →
  **Redeploy**. Then revert the bad commit on `main`, or the next merge ships it again.
  Database migrations only go forward: rolling back the API image doesn't undo a Flyway migration, so a migration
  that breaks things needs a new fixing migration.
- **Expo Go:** `npx eas-cli update:rollback` (choose the `preview` branch), or republish a good update group with
  `npx eas-cli update:republish --group <group-id>`. Then revert the commit on `main`.
- **A leaked secret:** rotate it at the source (R2 token, Expo token, owner password hash) and update the variable;
  Railway redeploys on variable changes.
