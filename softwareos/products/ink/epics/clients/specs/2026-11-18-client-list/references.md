# References for Client List

## Related Specs

- **[Considered]** [foundation/2026-11-16-app-shell](../../../foundation/specs/2026-11-16-app-shell/spec.md): matched on
  `apps/mobile/app/(tabs)/**`. Dismissed in Step 4d: app-shell built the tab shell and the placeholder Clients tab;
  this spec fills in that tab's content.
- **[Considered]** [foundation/2026-11-15-monorepo-scaffold](../../../foundation/specs/2026-11-15-monorepo-scaffold/spec.md):
  matched on the scaffold globs `apps/api/** (build, bootstrap, /health)` and `apps/mobile/** (Expo Router scaffold,
  app entry)`. Dismissed in Step 4d: these are scaffold-level claims, not feature areas.

## Upstream Meeting

_None._

## Design

- `design/pages/ClientCard.ipad.html`: the list pane (title "לקוחות", "לקוח חדש" button, "חיפוש לקוח" search, rows
  with an avatar initial, the name, and the tattoo count). The iPhone list is this pane at full width.
- `design/pages/ClientCard.html`: avatar and header style.
- `design/pages/CalendarNewAppointment.html`: the centre-screen modal pattern (`modal-h` title + close, `field`
  inputs, `modal-f` footer with secondary "ביטול" + primary save), copied for the create/edit form.
- `design/design-system/tokens.json` and `design-system.html`: tokens, plus the empty/loading/error component states.
- **No mockup:** the create/edit form and the empty / no-results states. They're built from existing components and
  tokens only (design-fidelity → Specs), and Aya approves them from screenshots (T12).

## Similar Implementations

### Versioned PUT + nested DTOs

- **Location:** `apps/api/src/main/java/app/ink/api/attachment/AttachmentController.java` (`:37` input record,
  `:46` view record, `:70-74` `writes.put(...)`)
- **Relevance:** the same create-or-update with a device UUID.
- **Key patterns:** `version` in the body (nullable on create); entity has a package-private constructor plus
  `sameAs`/`set`; a flat package with entity / repository / controller.

### Shared write semantics

- **Location:** `apps/api/src/main/java/app/ink/api/common/VersionedWrites.java` (`put :43`, `get :77`,
  `softDelete :90`), `common/ApiException.java:49`, `common/GlobalExceptionHandler.java`
- **Relevance:** the identical-retry no-op, the 409 `version_conflict` with `details.current`, and
  `validation_failed` with `details.fields`.

### Migration conventions

- **Location:** `apps/api/src/main/resources/db/migration/V4__attachment.sql`
- **Key patterns:** singular table name, `id uuid primary key` with no default, `text` columns, and
  `created_at/updated_at/deleted_at/version` at the end; indexes named `<table>_<col>`. No extensions enabled.

### Integration-test setup

- **Location:** `apps/api/src/test/java/app/ink/api/settings/SettingsIT.java` (`:35-63` setup, `:69-88` login
  token, `:184` 409 test)
- **Key patterns:** `@SpringBootTest(RANDOM_PORT)` + Testcontainers Postgres `@ServiceConnection`,
  `TestRestTemplate`, `JdbcTemplate` (e.g. to set `deleted_at` directly).

### Mobile API functions

- **Location:** `apps/mobile/src/api/client.ts` (`ApiError` with `code`/`details`, `NetworkError`),
  `src/api/settings.ts:45`, `src/api/attachments.ts:33-38`
- **Key patterns:** `api: ApiClient` first, `version` in the PUT body; screens get the client from
  `useApiClient()` (`src/auth/AuthProvider.tsx:124`).

### Screen tests

- **Location:** `apps/mobile/__tests__/settings.test.tsx:10-34`, `__tests__/api/settings.test.ts`
- **Key patterns:** `jest.mock('@/auth/AuthProvider')`, a `globalThis.fetch` mock, and a `SafeAreaProvider` with fixed metrics.

### UI components

- **Location:** `apps/mobile/src/ui/index.ts`
- **Key patterns:** `Modal {visible,title,onClose,footer}`, `Field {label,error,invalid,helper}`, `Search`,
  `Row`/`Rows`, `Avatar {name}`, `EmptyState`/`LoadingState`/`ErrorState`/`Skeleton`, `useToast().show`,
  `Button {variant,loading}`, `SectionHeader`. `app/(tabs)/clients.tsx` is currently `<PlaceholderScreen title="לקוחות" />`.
