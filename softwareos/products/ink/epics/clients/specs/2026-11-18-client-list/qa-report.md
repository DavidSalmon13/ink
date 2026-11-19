# QA Report — Client List

> Spec: spec.md
> Date: 2026-11-19 · QA by: david-schwartzman · Mode: setup
> Verdict: FAIL

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Create with a device UUID, name only; identical retry is a no-op; "שמירה" enabled once a name is typed | pass | ClientIT `createWithOnlyANameReturnsTheClientAtVersion0`, `createWithAllFieldsKeepsThem`, `identicalCreateRetryReturnsTheSameRecordWithoutADuplicate` (ClientIT.java:180); clients.test.tsx "opens "לקוח חדש", enables "שמירה" once a name is typed, and PUTs a new device UUID" |
| AC2 | Validation rules → 400 `validation_failed` with `details.fields`, inline Hebrew errors; Instagram lowercased first | pass | ClientIT `blankOrTooLongNameIsValidationFailed`, `invalidOptionalFieldsAreValidationFailedPerField`, `boundaryValuesAreAccepted`, `mixedCaseInstagramIsSavedLowercaseAndFound` (T14); clients.test.tsx "shows server validation errors inline in Hebrew and keeps the modal open" |
| AC3 | Edit with current version bumps it; stale → 409 with `details.current`, toast, form reloads | pass | ClientIT `updateWithCurrentVersionSavesAndBumpsIt`, `staleVersionIs409WithTheCurrentRecord` (ClientIT.java:244); api/clients.test.ts "surfaces a stale version as ApiError version_conflict"; clients.test.tsx "on a 409 shows the conflict toast and reloads the form" |
| AC4 | List sorted Hebrew then Latin with the client fields + `tattooCount`; tattoo wording; GET by id, 404 for unknown/deleted | pass | ClientIT `listIsSortedHebrewAlphabeticallyThenLatin` (ClientIT.java:281), `listItemsCarryTheClientFieldsAndTattooCount`, `unknownOrSoftDeletedClientIs404`; clients.test.tsx "shows the header, search and one row per client with the tattoo wording" |
| AC5 | Search by name (case, niqqud, final letters), phone (≥ 3 digits, 972 → 0), Instagram; server-side after 250 ms | pass | ClientSearchTest (8 tests); ClientIT `searchByNameIgnoresFinalLettersNiqqudAndCase`, `searchByPhoneIgnoresFormattingAndCountryCode`, `searchByInstagramIgnoresCaseAndAt`, `searchExcludesNonMatchesAndDeletedClients`; clients.test.tsx "searches server-side once typing stops, not per keystroke" |
| AC6 | Loading, empty, no-results and error states from `src/ui` | pass | clients.test.tsx "shows the empty state…", "shows an error state whose "נסו שוב" refetches", "shows the no-results state with the query"; loading by inspection, ClientsList.tsx:88 |
| AC7 | TanStack Query; persisted on native, not on web; logout clears; offline save → toast, modal stays | pass | query.test.tsx "persists on iPhone/iPad and not on web", "drops cached queries and the persisted copy", "clears the cache when the session ends"; clients.test.tsx "shows an error toast when offline and keeps the modal open (no queued write)" |
| AC8 | Other device's changes appear on pull-to-refresh or when the tab regains focus | pass | Inspection only: refetch on focus, ClientsList.tsx:64; pull-to-refresh, ClientsList.tsx:128 |
| AC9 | Every `/clients` endpoint needs the owner bearer token | pass | ClientIT `everyClientEndpointRequiresTheOwnerToken` (ClientIT.java:369); runtime: `GET /clients` without a token → 401 on the local API |
| AC10 | Matches the mockups on iPhone and iPad; tokens only; phone numbers render as isolated LTR runs; Aya approves | fail | Phone numbers are not isolated LTR: the phone field (ClientFormModal.tsx:109) is a `Field` whose `TextInput` (Field.tsx:51) sets no LTR direction, so in the RTL app a number typed with spaces ("054 381 2290") is expected to display reversed. The rest holds: Aya approved the screens (T12, 2026-11-19); web-preview comparison in the T11 Changelog row |

## Checks Run

- build + tests (API): `./gradlew build` in `apps/api` — pass (includes ClientIT and ClientSearchTest; run on this branch's code after T15)
- lint (mobile): `npx expo lint` — pass
- typecheck (mobile): `npm run typecheck` (`tsc --noEmit`) — pass
- tests (mobile): `npm test` (jest) — pass (21 suites, 135 passed, 0 failed)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | med | The phone field doesn't render the number as an isolated LTR run (AC10); a phone typed with spaces is expected to display in reversed groups in the RTL app | /hotfix |

## Notes

- AC10's reversal is from inspection plus Unicode bidi rules (spaces between digit groups resolve right-to-left in an RTL paragraph; dashes don't). It wasn't observed on a device. Phones typed with dashes, as in the tests, display correctly.
- AC8 is verified by inspection only; there was no second device to exercise it.
- The iPhone/iPad simulator or device check is still owed (Changelog, T11); AC10's visual comparison so far is from web-preview screenshots.
- Hygiene: all tasks except T13 (this run) are `[x]`. The T11 Instagram finding is resolved by the 2026-11-19 change (T14–T15). Spec `> Status: in-progress` is accurate. PRs #61–#68 are merged into `main`; the T14–T15 branch `feat/clients/client-list--instagram-case` has no PR yet.
