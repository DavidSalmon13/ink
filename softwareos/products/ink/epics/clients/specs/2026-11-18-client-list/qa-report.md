# QA Report — Client List

> Spec: spec.md
> Date: 2026-11-19 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
| AC1 | Create with a device UUID, name only; identical retry is a no-op; "שמירה" enabled once a name is typed | pass | ClientIT `createWithOnlyANameReturnsTheClientAtVersion0`, `createWithAllFieldsKeepsThem`, `identicalCreateRetryReturnsTheSameRecordWithoutADuplicate` (ClientIT.java:180); clients.test.tsx "opens "לקוח חדש", enables "שמירה" once a name is typed, and PUTs a new device UUID" |
| AC2 | Validation rules → 400 `validation_failed` with `details.fields`, inline Hebrew errors; Instagram lowercased first | pass | ClientIT `blankOrTooLongNameIsValidationFailed`, `invalidOptionalFieldsAreValidationFailedPerField`, `boundaryValuesAreAccepted`, `mixedCaseInstagramIsSavedLowercaseAndFound` (T14); clients.test.tsx "shows server validation errors inline in Hebrew and keeps the modal open" |
| AC3 | Edit with current version bumps it; stale → 409 with `details.current`, toast, form reloads | pass | ClientIT `updateWithCurrentVersionSavesAndBumpsIt`, `staleVersionIs409WithTheCurrentRecord` (ClientIT.java:244); api/clients.test.ts "surfaces a stale version as ApiError version_conflict"; clients.test.tsx "on a 409 shows the conflict toast and reloads the form" |
| AC4 | List sorted Hebrew then Latin with the client fields + `tattooCount`; tattoo wording; GET by id, 404 for unknown/deleted | pass | ClientIT `listIsSortedHebrewAlphabeticallyThenLatin` (ClientIT.java:281), `listItemsCarryTheClientFieldsAndTattooCount`, `unknownOrSoftDeletedClientIs404`; clients.test.tsx "shows the header, search and one row per client with the tattoo wording" |
| AC5 | Search by name (case, niqqud, final letters), phone (≥ 3 digits, 972 → 0), Instagram; server-side after 250 ms | pass | ClientSearchTest (8 tests); ClientIT `searchByNameIgnoresFinalLettersNiqqudAndCase`, `searchByPhoneIgnoresFormattingAndCountryCode`, `searchByInstagramIgnoresCaseAndAt`, `searchExcludesNonMatchesAndDeletedClients`; clients.test.tsx "searches server-side once typing stops, not per keystroke" |
| AC6 | Loading, empty, no-results and error states from `src/ui` | pass | clients.test.tsx "shows the empty state…", "shows an error state whose "נסו שוב" refetches", "shows the no-results state with the query"; loading by inspection, ClientsList.tsx:88 |
| AC7 | TanStack Query; persisted on native, not on web; logout clears; offline save → toast, modal stays | pass | query.test.tsx "persists on iPhone/iPad and not on web", "drops cached queries and the persisted copy", "clears the cache when the session ends"; clients.test.tsx "shows an error toast when offline and keeps the modal open (no queued write)" |
| AC8 | Other device's changes appear on pull-to-refresh or when the tab regains focus | pass | Inspection only: refetch on focus, ClientsList.tsx:64; pull-to-refresh, ClientsList.tsx:128 |
| AC9 | Every `/clients` endpoint needs the owner bearer token | pass | ClientIT `everyClientEndpointRequiresTheOwnerToken` (ClientIT.java:369); runtime: `GET /clients` without a token → 401 on the local API |
| AC10 | Matches the mockups on iPhone and iPad; tokens only; phone numbers render as isolated LTR runs; Aya approves | pass | Phone field is LTR: `Field ltr` (Field.tsx), used at ClientFormModal.tsx:109; clients.test.tsx "renders the phone as a left-to-right run, unlike the Hebrew fields (AC10)" (clients.test.tsx:215). Aya approved the screens (T12, 2026-11-19); web-preview comparison in the T11 Changelog row |

## Checks Run

- build + tests (API): `./gradlew build` in `apps/api` — pass (includes ClientIT and ClientSearchTest; run after T15; no API change since)
- lint (mobile): `npx expo lint` — pass
- typecheck (mobile): `npm run typecheck` (`tsc --noEmit`) — pass
- tests (mobile): `npx jest` — pass (21 suites, 136 passed, 0 failed), rerun after the hotfix (b620a4b)

## Issues Found

(none) — the first run's AC10 issue (phone field not LTR) was fixed by the 2026-11-19 hotfix (b620a4b) and verified in this rerun.

## Notes

- This is a rerun. The first run (same day) failed AC10 because the phone field wasn't LTR; the hotfix recorded in the spec Changelog fixed it with a regression test, and `frontend/design-fidelity.md` now requires `Field ltr` for number inputs.
- With `ltr`, the phone input's base direction is LTR. On iOS its alignment still follows the RTL layout (start edge); on web a left-to-right input aligns to the left. Neither was observed on a device.
- AC8 is verified by inspection only; there was no second device to exercise it.
- The iPhone/iPad simulator or device check is still owed (Changelog, T11); AC10's visual comparison so far is from web-preview screenshots plus Aya's approval.
- Hygiene: all tasks are `[x]` after this run (T13). The T11 Instagram finding is resolved by the 2026-11-19 change (T14–T15). PRs #61–#68 are merged into `main`; the follow-up commits (T14–T15, T12, this QA and the hotfix) are on `hotfix/clients/phone-field-ltr` (stacked on `feat/clients/client-list--instagram-case`), not yet in a PR.
