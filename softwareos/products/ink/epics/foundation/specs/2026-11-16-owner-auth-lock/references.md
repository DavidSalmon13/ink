# References for Owner Auth & App Lock

## Related Specs

- **[Considered]** [2026-11-15-monorepo-scaffold](../2026-11-15-monorepo-scaffold/spec.md): matched on its `apps/api/**` and `apps/mobile/**` globs and was dismissed in Step 4d as a different concern. The scaffold owns the build, bootstrap, `/health` and the app entry; auth is new code inside the same apps. This spec edits `apps/mobile/app/_layout.tsx` only to add the auth provider, guard and lock overlay.

## Design

- **No page mockup** exists for the Login, Lock or My Data placeholder screens. Per design-fidelity they are built only from existing components and tokens:
  - `design/design-system/design-system.html`: inputs, primary button, and the loading, error and disabled states
  - `design/design-system/tokens.json`: every color, size, spacing and radius, in light and dark
  - `design/pages/ClientMode.html`: the `lock-pill` pattern and the Face ID / passcode wording ("דורש Face ID או קוד")
  - `design/pages/Home.html`: the "הנתונים שלי" tile, the future entry point for the My Data re-auth (wired by app-shell)

## Similar Implementations

### API health check (mobile)

- **Location:** `apps/mobile/src/api/health.ts`, `apps/mobile/src/config/api.ts`
- **Relevance:** the existing fetch pattern
- **Key patterns:** `AbortController` timeout, an injectable `baseUrl` for tests, and `API_BASE_URL` resolution. `src/api/client.ts` reuses them.

### Dev CORS (API)

- **Location:** `apps/api/src/main/java/app/ink/api/config/CorsConfig.java`
- **Relevance:** the Spring Security chain must keep this CORS config, so `http.cors()` picks up the MVC mappings. The `Authorization` header must be allowed for the web preview.

### Integration test (API)

- **Location:** `apps/api/src/test/java/app/ink/api/HealthIT.java`
- **Relevance:** the template for `AuthIT`
- **Key patterns:** `@SpringBootTest(webEnvironment = RANDOM_PORT)`, `@Testcontainers` with `@ServiceConnection` Postgres
