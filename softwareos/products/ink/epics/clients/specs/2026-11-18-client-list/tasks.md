# Tasks — Client List

> Epic: clients
> Spec: 2026-11-18-client-list
> Branch: feat/clients/client-list

## Tests first (TDD)

- [x] T1 Failing ClientSearchTest (unit): Hebrew final letters, niqqud and case; phone `054-381-2290` ≡ `+972 54 381 2290` ≡ `972543812290`; Instagram `@Maya.Lines` → `maya.lines` (AC5)
- [x] T2 Failing ClientIT: name-only create, identical retry no-op, update bumps the version, stale → 409 with details.current, validation_failed fields (AC2), GET by id + soft-deleted → 404, list sorted and excluding deleted, search by name/phone/Instagram, 401 without a token (AC1–AC5, AC9)
- [x] T3 Failing mobile tests: `__tests__/api/clients.test.ts` (PUT with version, list with an encoded `q`) and `__tests__/clients.test.tsx` (list rows + tattoo wording, empty / no-results / error states, debounced search, create sends a UUID, 409 → toast + form refresh, offline save error) (AC1, AC3, AC4, AC6, AC7)

## API

- [x] T4 V5__client.sql: client table, normalized search columns + indexes (AC4, AC5)
- [x] T5 client/ClientSearch normalizer: T1 green (AC5)
- [x] T6 client/ Client entity, ClientRepository (list + search), ClientController PUT/GET/list via VersionedWrites: T2 green (AC1–AC5, AC9)

## Mobile

- [x] T7 Install TanStack Query + persister + AsyncStorage + expo-crypto; src/query/ (QueryClient, native-only persister, clearQueryCache); provider in app/_layout.tsx; clear on logout (AC7) — dependency install done in T3 (tests needed them to load)
- [ ] T8 src/api/clients.ts + src/features/clients/ hooks (useClients, useSaveClient with 409 handling) (AC1, AC3, AC5, AC7)
- [ ] T9 ClientsList in (tabs)/clients.tsx per ClientCard.ipad.html list pane: search, rows, states, pull-to-refresh, refetch on focus (AC4–AC6, AC8, AC10)
- [ ] T10 ClientFormModal create/edit per the CalendarNewAppointment.html modal pattern; inline errors; T3 green (AC1–AC3, AC10)

## Verification

- [ ] T11 Simulator screenshots on iPhone + iPad vs the cited mockups; fix or record each deviation in the Changelog (AC10)
- [ ] T12 HUMAN: Aya approves the derived screens (list, modal create/edit/errors, empty, no results) (AC10)
- [ ] T13 Run QA against acceptance criteria (qa skill)
