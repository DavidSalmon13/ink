# QA Report — Save Quote

> Spec: spec.md
> Date: 2026-11-26 · QA by: David Schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

Interim QA: run while the Verification group is still open (T10 screenshots `[~]`, T11 HUMAN
real-quote save `[ ]`). The code-side of every AC is verified; the visual-fidelity and
hands-on halves of AC7 remain for T10/T11. Re-run QA after those close for the report of record.

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Authoritative Java pricing reproduces every `fixtures/pricing-vectors.json` case | pass | `PricingVectorsTest` 3/3 green (`build/test-results/.../PricingVectorsTest.xml`: tests=3, failures=0) — reads the shared fixture, asserts `roundUpTo5[]`, `estimateFromProduct[]`, `cases[]` |
| AC2 | V7 `quote`/`quote_item` schema per data-model | pass (inspection) | `apps/api/.../db/migration/V7__quote.sql:8-51` — `client_id` uuid NOT NULL FK → client; synced cols (id/version/created/updated/deleted); money `bigint` agorot; `quote_item.sketch_id` nullable, no FK; soft-delete only |
| AC3 | `PUT /quotes/{id}` with authoritative recompute under VersionedWrites | pass (inspection) | `QuoteService.java:42-60` recomputes computed/final/minutes from the seeded Settings row via `app.ink.api.pricing`, stores via `writes.put` (create@0 / idempotent sameAs / +1 / 409 / 404); `requireLiveClient` :71-76; client-sent prices absent from `QuoteController.QuoteInput` (:61-75). Behavioural coverage in `QuoteIT` (not run — see Notes) |
| AC4 | `GET ?clientId=` newest-first, `GET /{id}`, idempotent soft `DELETE` | pass (inspection) | `QuoteController.java:101-116`; `QuoteRepository.findLiveByClientId`; `QuoteView` carries stored prices + inline position-ordered items. Behavioural coverage in `QuoteIT` (not run — see Notes) |
| AC5 | Mobile `quotes.ts` wraps the four endpoints, mirrors `clients.ts` | pass | `apps/mobile/src/api/quotes.ts:87-104` putQuote/getQuote/listQuotes/deleteQuote + `Quote`/`QuoteItem`/`QuoteInput` types; `version_conflict` (`details.current`) / `validation_failed` (`details.fields`) surface as `ApiError` via `apiFetch`; typecheck green |
| AC6 | Client picker (+ new client) + save from calculator | pass | `QuoteSave.tsx:71` save disabled while `client === null`, copy works without one (:65); `quoteInput.ts:11` title defaults to joined item descriptions (editable); `buildQuoteInput` reuses `toQuoteItem`/`toQuoteOptions`, device UUIDs, no prices sent; `useSaveQuote` success toast `SAVED_MESSAGE`; `save-quote.test.tsx` green (part of 219 passing) |
| AC7 | Fidelity + agreement; never creates an appointment; Aya accepts | partial | Code-side verified: preview/API agree on the shared vectors (AC1); save flow calls only `putQuote` → `/quotes` with the helper "שמירת הצעה אינה יוצרת תור" (`QuoteSave.tsx:77`) and no appointment code; no "קביעת תור" button (deferred). **Pending:** iPhone+iPad screenshot comparison vs `Calculator.html` (T10) and Aya's real-quote acceptance (T11) |

## Checks Run

- build: `./gradlew.bat test` (API, compiles) — partial (unit pass; integration not run, Docker unavailable)
- lint: `npm run lint` (mobile, `expo lint`) — pass
- typecheck: `npm run typecheck` (mobile, `tsc --noEmit`) — pass
- tests (mobile): `npm test` (jest) — 219 passed, 1 failed (`__tests__/theme/gen-theme.test.ts`)
- tests (API unit): `app.ink.api.pricing.PricingVectorsTest` — pass (3/3)
- tests (API integration): `*IT` (QuoteIT, ClientIT, SettingsIT, …) — not run; Testcontainers could not reach a Docker daemon (`DockerClientProviderStrategy` init error)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `gen-theme.test.ts` fails on `src/theme/tokens.generated.ts` (whitespace/line-ending mismatch). Untouched by this spec (`git diff main...HEAD` empty for `src/theme/`); pre-existing CRLF artifact on this Windows checkout | Note — not this spec; `npm run gen:theme` / line-ending normalisation outside this branch |
| 2 | med | API integration tests (incl. `QuoteIT`, the AC3/AC4 behavioural coverage) could not run — no Docker daemon on this host | Re-run `./gradlew test` on a host with Docker to confirm QuoteIT green before merge |

## Notes

- **Mode is setup.** AC3/AC4 are verified by code inspection because their integration tests (`QuoteIT`) need
  Docker/Testcontainers, unavailable on this Windows host. `QuoteIT` was authored (T5) and made to pass (T6) at
  commit time per tasks.md; it should be re-run on a Docker-capable host before the PR merges.
- **AC7 is intentionally partial here.** The visual-fidelity screenshot pass (T10, iPhone + iPad vs
  `Calculator.html`) and Aya's end-to-end acceptance (T11, HUMAN) are still open. The agreement and
  "no appointment" halves are verified. Re-run QA once T10/T11 close for a clean report of record.
- The one failing mobile test (#1) is on code this spec does not touch; it does not reflect on the save-quote work.
