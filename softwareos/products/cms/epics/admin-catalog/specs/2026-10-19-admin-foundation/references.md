# References for Admin Foundation

## Related Specs

- **[Considered]** [stride / catalog-search / 2026-10-18-home-page](../../../../../stride/epics/catalog-search/specs/2026-10-18-home-page/spec.md) — `/` matched `/admin` by route prefix. Dismissed in Step 4d because home-page owns only the `/` page.
- **[Related]** [stride / accounts-auth / 2026-10-13-auth-api-migration](../../../../../stride/epics/accounts-auth/specs/2026-10-13-auth-api-migration/spec.md) — this spec adds `role` to `SessionUser`, `AuthGuard`'s `req.user` and `meResponseSchema` (`apps/api/src/auth/**`, `packages/shared/src/auth/**`). Kept separate because the change is a small admin-specific addition to a finished auth module.
- **[Related]** [stride / accounts-auth / 2026-10-11-protected-routes](../../../../../stride/epics/accounts-auth/specs/2026-10-11-protected-routes/spec.md) — this spec adds `/admin` to `PROTECTED_PREFIXES`, adds the `/admin` index rewrite to `apps/web/src/proxy.ts`, and adds the admin link to `HeaderSession.tsx`. Kept separate because these are minimal admin-specific edits; that spec keeps ownership.
- **[Related]** [stride / accounts-auth / 2026-10-08-app-foundation](../../../../../stride/epics/accounts-auth/specs/2026-10-08-app-foundation/spec.md) — `.gitignore` gets `apps/web/public/admin/`. A one-line edit.
- **[Related]** [stride / accounts-auth / 2026-10-13-api-foundation](../../../../../stride/epics/accounts-auth/specs/2026-10-13-api-foundation/spec.md) — the root `package.json` build order (shared → api → cms → web) and the `admin:grant` script, `apps/api/prisma/schema.prisma` (`User.role`) and the `apps/api/package.json` script. Wiring edits only.

## Similar Implementations

### API auth guard and module wiring

- **Location:** `apps/api/src/auth/auth.guard.ts:26-54`, `apps/api/src/auth/session.service.ts:26,117`, `apps/api/src/auth/current-user.decorator.ts`, `apps/api/src/auth/auth.controller.ts:123-127`
- **Relevance:** `AdminGuard` runs after `AuthGuard` and reads the `req.user` it sets; `/auth/me` returns `SessionUser`
- **Key patterns:** guards are applied per controller (no `APP_GUARD`); a feature module imports `AuthModule` (`apps/api/src/account-security/account-security.module.ts:7-11`, `account-security.controller.ts:70-71`); middleware order in `app.module.ts:32-38` is SecurityHeaders → ProxySecret → OriginCheck on `"*"`

### Shared auth schemas

- **Location:** `packages/shared/src/auth/responses.ts:6-20`, `packages/shared/src/auth/index.ts`
- **Relevance:** `meResponseSchema` gets `role`; `authSuccessSchema.user` reuses it

### Web proxy and protected pages

- **Location:** `apps/web/src/proxy.ts` (matcher line 62, `pageResponse` 35-57), `apps/web/src/features/session/guard.ts:4-27`, `apps/web/src/lib/private-paths.ts:5`, `packages/shared/src/callback-url.ts:24,51-55`
- **Relevance:** `/admin` joins `PROTECTED_PREFIXES` to get the login redirect with `callbackUrl` and `private, no-store`; the index rewrite goes in `proxy.ts`
- **Key patterns:** paths with a file extension skip the proxy (served from `public/`); the guard checks only that a session cookie is present

### Trusted API proxy

- **Location:** `apps/web/src/lib/api-proxy.ts:12-70`, `apps/api/src/common/proxy-secret.middleware.ts`, `apps/api/src/common/origin-check.middleware.ts`
- **Relevance:** `/api/admin/*` → `${API_URL}/admin/*` with no proxy change; both middlewares already cover `/admin/*`

### Header session and nav

- **Location:** `apps/web/src/features/session/HeaderSession.tsx:14-53`, `apps/web/src/components/layout/Header.tsx`, `MobileNav.tsx`, `UtilityLinks.tsx`
- **Relevance:** the signed-in `utility` fragment in `HeaderSession` renders on desktop and in the mobile drawer, so the admin link goes there (a plain `<a>`, since `/admin` isn't a Next route)

### Security headers / CSP

- **Location:** `apps/web/src/lib/security-headers.ts:27-79`, `apps/web/next.config.ts:7-25`
- **Relevance:** `script-src`/`style-src 'self' 'unsafe-inline'` should allow a standard Angular prod bundle; `font-src 'self'` means the fonts must be self-hosted. The T1 spike confirms this

### Prisma, seed and scripts

- **Location:** `apps/api/prisma/schema.prisma:11-20` (User), `apps/api/prisma/migrations/<YYYYMMDDHHMMSS>_<name>/`, `apps/api/prisma/seed.ts:9-20`, `apps/api/src/catalog/seed-guard.ts`, `scripts/generate-password-keys.mjs`
- **Relevance:** the migration naming convention; `seed.ts` is the model for the tsx entry point of the grant script
- **Key patterns:** users are only created through `AuthService.signup` (`auth.service.ts:76-77`); emails are normalized with `normalizeEmail` (`packages/shared/src/auth/email.ts`)

### Build, CI and tests

- **Location:** root `package.json:9-22`, `.github/workflows/ci.yml`, `apps/web/vitest.config.ts`, `apps/api/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/protected-routes.spec.ts`
- **Relevance:** the `--workspaces --if-present` scripts pick up `apps/cms`; the build order needs the CMS before web; e2e tests live in `apps/web/e2e/`
- **Note:** the Vercel web project's root is `apps/web` (`INFRA_PLAN.md:147`), so the CMS build will need a web `prebuild` or a build command there later (deferred)

### Design tokens

- **Location:** `stride-design/design-system/tokens.css`, `apps/web/src/styles/tokens.css`, `apps/web/src/app/globals.css:9-46`
- **Relevance:** the CMS reuses the tokens and the Tailwind 4 `@theme` mapping; the fonts must be defined by the CMS because the next/font variables don't exist there
