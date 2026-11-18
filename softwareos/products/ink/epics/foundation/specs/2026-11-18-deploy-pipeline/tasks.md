# Tasks — Deploy Pipeline

> Epic: foundation
> Spec: 2026-11-18-deploy-pipeline
> Branch: feat/foundation/deploy-pipeline
> PR: https://github.com/DavidSalmon13/ink/pull/56 (spec shaping)

## API on Railway

- [x] T1 apps/api/Dockerfile (multi-stage, non-root, PORT) + apps/api/railway.json (Dockerfile builder, healthcheck /health, watch apps/api/**); `docker build` + run locally against compose Postgres (AC1)
- [x] T2 CorsConfigIT: allowed origin preflight with Authorization on an MVC route + /health, unknown origin rejected; refresh CorsConfig doc comment (AC4)
- [ ] T3 HUMAN: Railway project: Postgres plugin + API service from the repo (root apps/api, branch main, Wait for CI); set DB_*, OWNER_*, APP_CORS_ALLOWED_ORIGINS (placeholder until T6) → first deploy, /health green (AC1, AC2, AC7)
- [ ] T4 Verify the forwarded client IP behind Railway's proxy; set server.tomcat.remoteip.internal-proxies if needed and remove the hand-off comment in application.yml (AC6)

## Web preview

- [x] T5 apps/mobile/Dockerfile.web (expo export --platform web with EXPO_PUBLIC_API_URL build arg) + apps/mobile/Caddyfile (static routes → index.html fallback); build and run locally (AC3)
- [ ] T6 HUMAN: Railway web service (root apps/mobile, Dockerfile.web, watch apps/mobile/**, EXPO_PUBLIC_API_URL); set the API's APP_CORS_ALLOWED_ORIGINS to the web URL; login → home in browser + iPhone Safari (AC3, AC4, AC7)

## Attachments on R2

- [ ] T7 HUMAN: Cloudflare account + R2: private bucket, scoped API token, bucket CORS (PUT/GET from the web origin); set STORAGE_* on the API service (AC5)
- [ ] T8 Verify presigned upload/download against R2 from the deployed API; adjust StorageService (path-style/region) only if needed (AC5)

## Expo Go via EAS Update

- [ ] T9 HUMAN: Expo account; `eas init` locally; create EXPO_TOKEN and add it as a GitHub secret, and API_URL as a GitHub variable (AC8)
- [x] T10 Install expo-updates; app.json runtimeVersion policy sdkVersion + updates.url/projectId; apps/mobile/eas.json with preview channel (AC8) — TODO(T9): `extra.eas.projectId` + `updates.url` are not in app.json yet; `eas init` in T9 writes both (a placeholder ID would make `eas init` fail)
- [x] T11 .github/workflows/eas-update.yml: on push to main touching apps/mobile/**, publish `eas update --channel preview` with EXPO_PUBLIC_API_URL (AC8) — inert (skips with a notice) until T9 adds EXPO_TOKEN + API_URL
- [ ] T12 HUMAN: open the preview channel in Expo Go on Aya's iPhone + iPad, log in (AC8)

## Docs

- [x] T13 README "Deploy" section (services, every variable, one-time human steps, how to roll back) + .env.example production placeholders (AC9)

## Verification

- [~] T14 scripts/smoke-deploy.sh (health + db, CORS preflight, web root + deep route) and run it against the live URLs (testing skill) (AC10) — script done and passing locally against docker-compose.prod.yml (API + web images, Postgres, S3Mock); live run pending (needs T3, T6)
- [ ] T15 Run QA against acceptance criteria (qa skill)
