# Client List

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/clients/client-list
> Covers: PUT /clients/{id}, GET /clients, GET /clients/{id}, apps/api/src/main/java/app/ink/api/client/**, apps/api/src/main/resources/db/migration/V5__client.sql, apps/mobile/src/api/clients.ts, apps/mobile/src/query/**, apps/mobile/app/(tabs)/clients.tsx, apps/mobile/src/features/clients/**, QueryClientProvider in apps/mobile/app/_layout.tsx

## Overview

The first Clients slice: the `client` record, its API (create/update with a device UUID, get, list with search), and
the Clients tab with a searchable list and a create/edit modal. It serves the epic's success criteria "create a
client with only a name in under 10 seconds, visible on the other device after a refresh", "search by name /
phone (any formatting) / Instagram, in Hebrew and Latin text" and "concurrent iPhone/iPad edits get a 409". It's the
root of the mission's client → quote → appointment chain. It also introduces TanStack Query and its persisted read
cache (architecture.md → Data Flow) for every later list.

The card, delete, the iPad list + card split, and marketing consent belong to the next specs (`client-card`,
`marketing-consent`).

**Design:** `design/pages/ClientCard.ipad.html` holds the list pane (title "לקוחות", "לקוח חדש", "חיפוש לקוח", rows).
The form and the empty / no-results states have no mockup. They're built from existing components and tokens only
(design-fidelity → Specs) and approved by Aya from screenshots.

## Goals & User Stories

- As Aya, I add a client with just a name, and fill in phone, email, Instagram and notes later.
- As Aya, I search by part of a name, a phone number (with or without dashes) or an Instagram handle, and the list
  narrows as I type.
- As Aya, I fix a client's details, and if I changed them on the other device in the meantime, I'm told and see the
  latest version instead of overwriting it.
- As Aya, I can still read my client list when the connection drops.

## Acceptance Criteria

1. AC1: Create: `PUT /clients/{id}` with a device-generated UUID and no `version` creates a client from just `name`;
   `phone`, `email`, `instagram`, `notes` are optional. An identical retry returns the same record (no duplicate, no
   version bump). In the app, "לקוח חדש" opens the modal, and "שמירה" is enabled once the name is non-blank.
2. AC2: Validation: `name` trimmed, 1–100 chars; `email` valid format; `phone` 9–15 digits once normalized;
   `instagram` 1–30 of `[a-z0-9._]` after removing a leading `@`; `notes` ≤ 2000 chars. Violations → 400
   `validation_failed` with `details.fields`, shown inline under the matching field in Hebrew.
3. AC3: Edit: tapping a row opens the same modal ("עריכת לקוח") prefilled. `PUT` with the current `version` saves and
   bumps it. A stale version → 409 `version_conflict` with `details.current`; the app shows the toast
   "הלקוח עודכן במכשיר אחר. הנתונים רועננו." and reloads the form with the current values.
4. AC4: List: `GET /clients` returns non-deleted clients sorted by name (Hebrew alphabetical, then Latin), each with
   `id, version, name, phone, email, instagram, notes, tattooCount` (`tattooCount` is 0 until the Completed tattoos
   epic). Rows follow the ClientCard.ipad.html list pane: avatar initial, name, and "N קעקועים" / "קעקוע אחד" /
   "אין עדיין קעקועים". `GET /clients/{id}` returns one client; unknown or soft-deleted → 404 `not_found`.
5. AC5: Search: `GET /clients?q=` matches (a) a substring of the name, ignoring case, niqqud and Hebrew final
   letters (ך ם ן ף ץ ≡ כ מ נ פ צ); (b) when `q` has ≥ 3 digits, a substring of the phone digits, with
   `+972`/`972` treated as a leading `0`; (c) a substring of the Instagram handle, ignoring case and a leading `@`.
   The app searches server-side, 250 ms after typing stops.
6. AC6: States: loading skeleton; empty "עדיין אין לקוחות" with a "לקוח חדש" action; no results
   "לא נמצאו לקוחות עבור ״<q>״"; error state with "נסו שוב". All are built from `src/ui` States.
7. AC7: Cache: data is fetched through TanStack Query. On iPhone/iPad the last client list is persisted and readable
   offline. On web nothing is persisted. Logout clears the cache and the persisted copy. Saving while offline shows an
   error toast and keeps the modal open (no queued writes).
8. AC8: Other device: a client created on one device appears on the other on pull-to-refresh or when the
   Clients tab regains focus.
9. AC9: Every `/clients` endpoint requires the owner bearer token (401 `unauthorized` without it).
10. AC10: Design: the list and modal match `ClientCard.ipad.html` (list pane) and the `CalendarNewAppointment.html`
    modal pattern on iPhone and iPad; styles come only from tokens, with logical start/end; phone numbers render as
    isolated LTR runs. Aya approves screenshots of the list, the modal (create/edit/errors), and the empty and
    no-results states.

## Technical Approach

- **Schema (`V5__client.sql`)**: `client` (`id uuid pk`, `name text not null`, `phone`, `email`, `instagram`,
  `notes` text null, `search_name text not null`, `phone_digits text`, `instagram_norm text`, plus the
  SyncedEntity columns `created_at/updated_at/deleted_at/version`), following V4's conventions. Indexes:
  `client_search_name`, `client_phone_digits`, `client_instagram_norm`. No extensions.
- **Normalization (`client/ClientSearch`)**: pure functions. `name` → lowercase, strip niqqud (U+0591–U+05C7), map
  final letters, collapse spaces. `phone` → digits only, `972…` → `0…`. `instagram` → lowercase, without `@`. They run
  on every write (entity `set`) and on the query string. Unit-tested on its own.
- **API (`client/`)**, following `attachment/`: a `Client` entity extends `SyncedEntity` (package-private constructor
  + `sameAs`/`set`); `ClientRepository` (`findByIdAndDeletedAtIsNull`; list sorted by `search_name`, then `name`;
  a search query with `LIKE %…%` on the three normalized columns, the phone clause only when `q` has ≥ 3 digits);
  `ClientController` with nested `ClientInput` / `ClientView` records. `PUT /clients/{id}` goes through
  `VersionedWrites.put`; `GET /clients/{id}` through `VersionedWrites.get`. Bean Validation on `ClientInput`, so
  errors come out as `validation_failed` via `GlobalExceptionHandler`. `tattooCount` is a constant 0 in `ClientView`
  for now (the Completed tattoos epic replaces it with a computed count; the contract doesn't change).
- **Mobile data**: `src/api/clients.ts` (`listClients(api, q?)`, `getClient`, `putClient`, using the
  `settings.ts` / `attachments.ts` style: `api` first, `version` in the body). `src/query/` holds the `QueryClient`,
  the AsyncStorage persister (native only, `Platform.OS !== 'web'`), and `clearQueryCache()`, which logout calls.
  `QueryClientProvider` goes in `app/_layout.tsx`. New dependencies (installed with `npx expo install`):
  `@tanstack/react-query`, `@tanstack/react-query-persist-client`, `@tanstack/query-async-storage-persister`,
  `@react-native-async-storage/async-storage`, `expo-crypto`.
- **Mobile UI (`src/features/clients/`)**: `useClients(q)` / `useSaveClient()` hooks (a 409 → `setQueryData` with
  `details.current` + toast); `ClientsList` (Search, Rows with Avatar, the States, pull-to-refresh, refetch on
  focus); `ClientFormModal` (Modal + Field × 5, Button footer "ביטול" / "שמירה"). `app/(tabs)/clients.tsx` swaps the
  `PlaceholderScreen` for the list. On iPad the list is full-width until `client-card` adds the split view.
- **Tests (TDD)**: `ClientIT` follows `SettingsIT` (TestRestTemplate, Testcontainers Postgres, login for the token).
  Mobile tests go in `__tests__/api/clients.test.ts` and `__tests__/clients.test.tsx` (mocked fetch + providers, as in
  `settings.test.tsx`).
- **PRs**: stacked, ≤ 8 files each.

## Out of Scope

- The client card, delete, the iPad list + card split view (`client-card`).
- Marketing consent and `unsubscribe_token` (`marketing-consent`).
- The real tattoo count (Completed tattoos & gallery epic).
- Duplicate-client detection, importing phone contacts, pagination, offline writes.

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch `feat/clients/client-list`,
  commits scoped `clients`, stacked PRs via the pr skill.
- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md): copy the cited pages; screens
  without a mockup come from existing components + tokens only; screenshot comparison on iPhone and iPad.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-18 | david-schwartzman | created | Initial shaping | — |
