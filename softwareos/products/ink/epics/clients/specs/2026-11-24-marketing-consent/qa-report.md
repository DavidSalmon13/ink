# QA Report — Marketing Consent

> Spec: spec.md
> Date: 2026-11-24 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | V6: `consent_event` table; `client.marketing_consent` (default none, not null), `consent_updated_at`, `unsubscribe_token` (backfilled, not null, unique); random token on create, never in a response | pass | `ClientIT.everyClientHasAUniqueUnsubscribeTokenThatTheApiNeverSends` (43-char unique tokens, none null, absent from GET / list / consent responses), `ClientIT.theMigrationDefaultsConsentToNoneAndRejectsUnknownStates` (default `none`, the five `consent_event` columns, check constraint); `V6__consent.sql`; token from `SecureRandom` in the constructor `Client.java:65`; `ClientView` has no token `ClientController.java:85` |
| AC2 | GET list / GET one / PUT return `marketingConsent` + `consentUpdatedAt`; PUT ignores them | pass | `ClientIT.getListAndPutCarryConsentAndPutIgnoresIt` (PUT with `granted` stays `none`, no event), `ClientIT.listItemsCarryConsent`; `sameAs` / `set` untouched in `Client.java` |
| AC3 | `POST /clients/{id}/consent`: event (source app) + cached state in one transaction, returns the client; same state = 200 no-op; bad action 400 `validation_failed`; unknown/deleted 404; no token 401 | pass | `ClientIT.grantThenRevokeWritesOneEventEachAndUpdatesTheClient` (`granted/app`, `revoked/app`, cached state = latest event), `theSameStateAgainIsANoOpWithoutAnEvent`, `aBadOrMissingActionIs400ValidationFailed` (`maybe`, `none`, null → `fields.action`), `consentForAnUnknownOrDeletedClientIs404`, `consentRequiresTheOwnerToken`; `ConsentService.java:33,37` (`@Transactional`), `ClientController.java:79,155` |
| AC4 | A consent change bumps `version`; a stale PUT → 409 `version_conflict` | pass | `ClientIT.changingConsentBumpsTheVersionSoAStaleSaveIs409` (version 0 → 1; stale PUT 409 with `details.current.marketingConsent = granted`; current version saves) |
| AC5 | Row under the next-appointment line: granted "ניתנה · dd.MM.yyyy" + "ביטול הסכמה"; revoked "בוטלה · dd.MM.yyyy" + "מתן הסכמה"; none "לא ניתנה" + "מתן הסכמה"; date in Asia/Jerusalem | pass | `clientCard.test.tsx` "consent ›" none / granted / revoked / iPad pane (2026-10-01T22:30Z shows 02.10.2026); `ClientCard.tsx:211`; `formatDayDate` `hebrewDate.ts:36`; observed in the web preview (`visuals/`) |
| AC6 | Confirm dialogs with the exact wording; confirm → POST, cached client updated (new version), lists refreshed, "ההסכמה עודכנה"; offline / other failure toasts, old state kept | pass | `clientCard.test.tsx` "consent ›" grant (POST body, toast, version + 1 in the cache), revoke, "ביטול" closes without a POST, offline, server error; `useConsent.ts:29,31,34`; `ConsentRow.tsx:93–114`; `__tests__/api/clients.test.ts` "postConsent" |
| AC7 | Tokens and `src/ui` only, start/end; matches the mockups on iPhone and iPad; Aya approves | pass | `ConsentRow.tsx` uses theme tokens, `Button`, `Modal`, `Num`, row-direction layout with no left/right; T9 web-preview comparison at 393×852 and 1180×820 with one fix (iPhone hairline edge to edge), Changelog 2026-11-24 T9; Aya's approval, Changelog T10 |

## Checks Run

- build (API): `./gradlew build` — pass
- tests (API): `./gradlew test --rerun-tasks` — pass (115 passed, 0 failed; ClientIT 32 incl. 10 marketing-consent cases, against PostgreSQL 16 via Testcontainers)
- build (mobile): `npx expo export --platform web` — pass
- lint (mobile): `npx expo lint` — pass
- typecheck (mobile): `npx tsc --noEmit` — pass
- tests (mobile): `npx jest` — pass (165 passed, 0 failed, 22 suites)

## Issues Found

(none)

## Notes

- **Device check owed (AC7):** the visual comparison used the Expo web preview, not the iOS Simulator or a device (no Xcode on the dev machine), as for client-card. Recorded in the Changelog (T9).
- **Implementation choices recorded in the Changelog (T9):** the request's `action` is a validated string so a bad value is `validation_failed` (an enum would fail parsing as `bad_request`); revoking from `none` writes a `revoked` event, since AC3 only skips the current state.
- **Hygiene:** T1–T10 are `[x]`; T11 is this run. Work is on `ccr-c978c1e4-v8ehx0` (the session's branch), not the `> Branch:` `feat/clients/marketing-consent`. No PR exists yet. `specs.index.yml` still says `shaped`; run `/refresh-indexes`.
