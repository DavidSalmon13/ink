# References for Deploy Pipeline

## Related Specs

- **[Related]** [2026-11-15-monorepo-scaffold](../2026-11-15-monorepo-scaffold/spec.md): overlaps on `.github/workflows/**`, `apps/api/**` (build) and `README.md`. Kept separate because scaffold owns the CI workflows (`api.yml`, `mobile.yml`) and the dev CORS default. This spec only adds deploy files next to them (`eas-update.yml`, Dockerfiles, `railway.json`) and a README "Deploy" section.
- **[Related]** [2026-11-17-api-conventions](../2026-11-17-api-conventions/spec.md): built attachments against local S3Mock and handed off the real Cloudflare R2 bucket and Railway env vars to this spec (T7, T8).
- **[Related]** [2026-11-16-owner-auth-lock](../2026-11-16-owner-auth-lock/spec.md): owner seeding from `OWNER_EMAIL` / `OWNER_PASSWORD_HASH`, and the per-IP login limit whose forwarded-IP check behind Railway's proxy is handed off here (T4).

## Upstream Meeting

_None._

## Similar Implementations

### Env-driven API config

- **Location:** `apps/api/src/main/resources/application.yml`
- **Relevance:** every production setting (`DB_*`, `OWNER_*`, `STORAGE_*`, `app.cors.allowed-origins`) is already a placeholder with a local default.
- **Key patterns:** set Railway variables, don't add profiles. The `forward-headers-strategy` comment is the T4 hand-off.

### CORS path

- **Location:** `apps/api/src/main/java/app/ink/api/config/CorsConfig.java`, `apps/api/src/main/java/app/ink/api/auth/SecurityConfig.java`
- **Relevance:** MVC CORS reads `app.cors.allowed-origins`, and actuator `/health` uses the same property. Security calls `.cors()` and permits preflights.
- **Key patterns:** production = `APP_CORS_ALLOWED_ORIGINS`. `CorsConfigIT` proves it (T2).

### API base URL on the device

- **Location:** `apps/mobile/src/config/api.ts`
- **Relevance:** `EXPO_PUBLIC_API_URL` wins over LAN/localhost fallbacks. It's inlined at bundle time, so it's set for `expo export` (web) and `eas update`.

### CI workflow pattern

- **Location:** `.github/workflows/mobile.yml`
- **Relevance:** template for `eas-update.yml` (setup-node from `.nvmrc`, npm cache, `working-directory: apps/mobile`).

### Integration-test pattern

- **Location:** `apps/api/src/test/java/app/ink/api/HealthIT.java`
- **Relevance:** Testcontainers + MockMvc setup to copy for `CorsConfigIT`.
