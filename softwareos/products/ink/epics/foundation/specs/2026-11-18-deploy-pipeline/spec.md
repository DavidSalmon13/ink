# Deploy Pipeline

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/foundation/deploy-pipeline
> Covers: apps/api/Dockerfile, apps/api/railway.json, apps/mobile/Dockerfile.web, apps/mobile/Caddyfile, apps/mobile/eas.json, expo-updates settings in apps/mobile/app.json, .github/workflows/eas-update.yml, apps/api/src/main/java/app/ink/api/config/CorsConfig.java (production origins), README.md "Deploy" section

## Overview

The first deploy, and the last spec of Foundation. The API and Postgres run on Railway. A static web build of the
Expo app is the preview URL Aya opens. Attachments move from local S3Mock to a private Cloudflare R2 bucket.
Expo Go loads the app through an EAS Update channel. Merging to `main` redeploys everything automatically:
Railway's GitHub integration redeploys the API and the web preview, and a GitHub Action publishes the EAS Update.
This delivers the epic success criterion "Aya can open the app on her iPhone and iPad through Expo Go,
connected to the deployed API". No app features change.

## Goals & User Stories

- As Aya, I open a link in my browser and see the app (login → home), connected to real data.
- As Aya, I open the app in Expo Go on my iPhone and iPad and sign in to the same account.
- As David, merging to `main` updates the API, the web preview and Expo Go without manual steps.
- As David, secrets live only in Railway, GitHub and Cloudflare, never in the repo.

## Acceptance Criteria

1. AC1: The API runs on Railway from `apps/api/Dockerfile` (multi-stage Gradle build → Java 21 JRE) against Railway
   Postgres. Flyway migrates on start, and `GET https://<api>/health` returns 200 with `db` UP.
2. AC2: The owner is seeded from `OWNER_EMAIL` / `OWNER_PASSWORD_HASH` Railway variables, and login works against the
   deployed API.
3. AC3: The web preview (the output of `expo export --platform web`, built with `EXPO_PUBLIC_API_URL` set to the API URL) is served
   by Caddy on Railway at a public HTTPS URL. Deep links and refreshes on routes work (static route HTML, falling back to
   index.html), and login → home works in a desktop browser and in iPhone Safari.
4. AC4: CORS: the API accepts requests from the web preview origin (preflight with `Authorization` included) on MVC
   routes and `/health`, and rejects other origins. This is proven by `CorsConfigIT`. Production origins come only from
   `APP_CORS_ALLOWED_ORIGINS`.
5. AC5: Attachments use a private Cloudflare R2 bucket via the `STORAGE_*` variables. Uploading via a presigned PUT and then
   downloading via a presigned GET works against the deployed API, and the bucket's CORS policy allows PUT/GET from the
   web preview origin.
6. AC6: The per-IP login rate limit sees the real client IP behind Railway's proxy (Railway's proxy hop is
   inside Tomcat's trusted internal-proxy ranges, or the ranges are configured to include it), and spoofed
   `X-Forwarded-For` headers from clients are ignored.
7. AC7: Merging to `main` redeploys the API (on changes under `apps/api/**`) and the web preview (on changes under
   `apps/mobile/**`) through Railway's GitHub integration. Deploys wait for CI to pass, and the API's healthcheck path is `/health`.
8. AC8: Expo Go: `expo-updates` is configured (`runtimeVersion` policy `sdkVersion`, which Expo Go requires; the EAS project
   ID is in app.json). `.github/workflows/eas-update.yml` publishes `eas update --channel preview` with
   `EXPO_PUBLIC_API_URL` set on pushes to `main` that touch `apps/mobile/**`, and Aya's iPhone and iPad open the preview channel in Expo Go and log in.
9. AC9: No secrets in the repo. `.env.example` and the README "Deploy" section list every production variable with
   a placeholder, along with the one-time human steps (Railway services, R2 bucket + token + CORS, Expo account + `EXPO_TOKEN`).
10. AC10: `./gradlew build` (including `CorsConfigIT`) and the mobile typecheck/lint/test pass, CI is green, and
    `scripts/smoke-deploy.sh <api-url> <web-url>` passes against the live deploy.

## Technical Approach

- **API image:** `apps/api/Dockerfile` has a `gradle:jdk21` build stage that runs `./gradlew bootJar -x test`, followed by an
  `eclipse-temurin:21-jre` runtime stage running as a non-root user that binds `server.port=${PORT:8080}`.
  `apps/api/railway.json` sets the Dockerfile builder, the healthcheck path `/health`, the restart policy, and watch paths `apps/api/**`.
- **Database:** Railway Postgres plugin. `DB_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}`,
  `DB_USER` and `DB_PASSWORD` come from Railway reference variables (the API needs JDBC form, not `DATABASE_URL`).
- **Web preview:** `apps/mobile/Dockerfile.web` has a Node build stage that runs `npm ci` and then `npx expo export --platform web`, with
  `EXPO_PUBLIC_API_URL` as a build arg (a Railway variable). The Caddy runtime stage serves `dist/` with
  `try_files {path} {path}.html /index.html`. It's a second Railway service pointing at the same repo, with root `apps/mobile` and watch
  paths `apps/mobile/**`. The web build stays a preview: no device lock, and the token is kept in memory (as already built).
- **CORS:** no code change. Set `APP_CORS_ALLOWED_ORIGINS=https://<web>.up.railway.app` on the API service (Spring's relaxed
  binding maps it to `app.cors.allowed-origins`, which feeds both `CorsConfig` and actuator CORS). Add `CorsConfigIT`
  (Testcontainers, `@TestPropertySource` with a test origin): the preflight to `/settings` with `Authorization` from the allowed origin
  gets 200 + ACAO, `/health` from the allowed origin gets ACAO, and an unknown origin gets 403. Update the CorsConfig doc comment.
- **R2:** create the bucket (private), an R2 API token scoped to it, and a bucket CORS policy (PUT/GET from the web origin).
  Set `STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com`, `STORAGE_REGION=auto`, and `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`,
  `STORAGE_SECRET_KEY`. Check that the presigner works against R2 (path-style vs virtual-host); adjust `StorageService` only if needed.
- **Forwarded IP:** after the first deploy, log/inspect `request.getRemoteAddr()` behind Railway's proxy (temporarily, or via the
  smoke script hitting the login limiter). If the proxy hop isn't in Tomcat's default `internalProxies` (10/8, 172.16/12,
  192.168/16, 100.64/10, 127/8), set `server.tomcat.remoteip.internal-proxies` to include it. Remove the hand-off comment in
  `application.yml`.
- **Auto-redeploy:** connect both Railway services to the GitHub repo on `main`, with "Wait for CI" on.
- **EAS:** `npx expo install expo-updates`, `eas init` (adds `extra.eas.projectId` + `updates.url`), `runtimeVersion: { policy: "sdkVersion" }`,
  and `eas.json` with a `preview` channel. `.github/workflows/eas-update.yml`: on push to `main` (paths `apps/mobile/**`), setup-node
  from `.nvmrc`, `expo/expo-github-action` with the `EXPO_TOKEN` secret, `npm ci`, then
  `EXPO_PUBLIC_API_URL=${{ vars.API_URL }} npx eas update --channel preview --message "${{ github.event.head_commit.message }}" --non-interactive`.
- **Smoke:** `scripts/smoke-deploy.sh` curls `/health` (200 + db UP), runs a CORS preflight from the web origin, and checks that the web root
  plus a deep route return 200 HTML.
- **PRs:** stacked, each changing at most 8 files.

## Out of Scope

- TestFlight / App Store / EAS Build (after MVP acceptance, see roadmap → Release).
- Custom domain, staging environment (architecture: "Staging: TBD"), database backups/PITR policy beyond Railway defaults.
- Monitoring/alerting and log aggregation.
- Making the web build a supported platform (it stays a preview).

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch `feat/foundation/deploy-pipeline`, conventional commits scoped `foundation`, PRs via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-18 | david-schwartzman | created | Initial shaping | — |
