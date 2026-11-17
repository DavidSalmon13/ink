# References for API Conventions

## Related Specs

- **[Related]** [2026-11-16-owner-auth-lock](../2026-11-16-owner-auth-lock/spec.md) — planned hand-off: its interim error writer (`auth/ApiErrorWriter.java`, `auth/AuthExceptionHandler.java`) moves to the shared format, and the mobile `src/api/client.ts` gains `ApiError.details`. Those files stay in owner-auth-lock's Covers; login's codes and statuses don't change.
- **[Considered]** [2026-11-15-monorepo-scaffold](../2026-11-15-monorepo-scaffold/spec.md) — matched on its broad `apps/api/**`, `apps/mobile/**` and `docker-compose.yml` claims, dismissed in Step 4d: those are the scaffold's bootstrap claim ("build, bootstrap, /health"); this spec adds new modules and one compose service on top.

## Similar Implementations

### Owner auth (API)

- **Location:** `apps/api/src/main/java/app/ink/api/auth/`
- **Relevance:** the only existing API feature module.
- **Key patterns:** JPA entity style (`OwnerSession.java`: explicit `@Column` names, `Instant` timestamps, `deletedAt` = revoked); fixed, non-echoing error messages (`AuthExceptionHandler.java`); the interim `{"error": {"code","message"}}` body (`ApiErrorWriter.java`).

### Migrations

- **Location:** `apps/api/src/main/resources/db/migration/V2__owner_and_session.sql`
- **Key patterns:** comment header naming the spec, `timestamptz` columns, `deleted_at` instead of deletes, partial unique indexes `where deleted_at is null`.

### Integration tests

- **Location:** `apps/api/src/test/java/app/ink/api/auth/AuthIT.java`, `HealthIT.java`
- **Key patterns:** Spring Boot + Testcontainers Postgres; log in to get a Bearer token for protected calls.

### Mobile API client

- **Location:** `apps/mobile/src/api/client.ts`, `apps/mobile/src/auth/authApi.ts`
- **Key patterns:** `ApiError` (status + `code`), `NetworkError`, `parseErrorBody` reading `{ error: { code, message } }`; feature APIs built on the shared `ApiClient`.
