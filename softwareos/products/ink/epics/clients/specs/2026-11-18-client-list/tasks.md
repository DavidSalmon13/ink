# Tasks — Client List

> Epic: clients
> Spec: 2026-11-18-client-list
> Branch: feat/clients/client-list
> PR: https://github.com/DavidSalmon13/ink/pull/66 · https://github.com/DavidSalmon13/ink/pull/61 · https://github.com/DavidSalmon13/ink/pull/62 · https://github.com/DavidSalmon13/ink/pull/63 · https://github.com/DavidSalmon13/ink/pull/64 · https://github.com/DavidSalmon13/ink/pull/65 · https://github.com/DavidSalmon13/ink/pull/67 · https://github.com/DavidSalmon13/ink/pull/68 (stacked, merge in this order)

## Tests first (TDD)

- [x] T1 Failing ClientSearchTest (unit): Hebrew final letters, niqqud and case; phone `054-381-2290` ≡ `+972 54 381 2290` ≡ `972543812290`; Instagram `@Maya.Lines` → `maya.lines` (AC5)
- [x] T2 Failing ClientIT: name-only create, identical retry no-op, update bumps the version, stale → 409 with details.current, validation_failed fields (AC2), GET by id + soft-deleted → 404, list sorted and excluding deleted, search by name/phone/Instagram, 401 without a token (AC1–AC5, AC9)
- [x] T3 Failing mobile tests: `__tests__/api/clients.test.ts` (PUT with version, list with an encoded `q`) and `__tests__/clients.test.tsx` (list rows + tattoo wording, empty / no-results / error states, debounced search, create sends a UUID, 409 → toast + form refresh, offline save error) (AC1, AC3, AC4, AC6, AC7)

## API

- [x] T4 V5__client.sql: client table, normalized search columns + indexes (AC4, AC5)
- [x] T5 client/ClientSearch normalizer: T1 green (AC5)
- [x] T6 client/ Client entity, ClientRepository (list + search), ClientController PUT/GET/list via VersionedWrites: T2 green (AC1–AC5, AC9)
- [x] T14 Failing ClientIT case: `PUT` with instagram `@Maya.Lines` → 200, stored and returned as `maya.lines`, and found by `?q=MAYA` (AC2, AC5)
- [x] T15 `ClientInput` lowercases the handle via `ClientSearch.instagram` before validation: T14 green (AC2)

## Mobile

- [x] T7 Install TanStack Query + persister + AsyncStorage + expo-crypto; src/query/ (QueryClient, native-only persister, clearQueryCache); provider in app/_layout.tsx; clear on logout (AC7) — dependency install done in T3 (tests needed them to load)
- [x] T8 src/api/clients.ts + src/features/clients/ hooks (useClients, useSaveClient with 409 handling) (AC1, AC3, AC5, AC7)
- [x] T9 ClientsList in (tabs)/clients.tsx per ClientCard.ipad.html list pane: search, rows, states, pull-to-refresh, refetch on focus (AC4–AC6, AC8, AC10)
- [x] T10 ClientFormModal create/edit per the CalendarNewAppointment.html modal pattern; inline errors; T3 green (AC1–AC3, AC10)

## Verification

- [x] T11 Simulator screenshots on iPhone + iPad vs the cited mockups; fix or record each deviation in the Changelog (AC10) — web-preview sizes, simulator check owed (see Changelog)
- [x] T12 HUMAN: Aya approves the derived screens (list, modal create/edit/errors, empty, no results) (AC10) — approved by Aya 2026-11-19 (reported by david-schwartzman)
- [x] T13 Run QA against acceptance criteria (qa skill) — PASS WITH NOTES 2026-11-19 (rerun after the phone LTR hotfix)
