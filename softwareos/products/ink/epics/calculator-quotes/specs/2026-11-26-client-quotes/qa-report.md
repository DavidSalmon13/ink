# QA Report — Client Quotes

> Spec: spec.md
> Date: 2026-11-26 · QA by: David Schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Quotes tab lists client's quotes newest-first (title + final ₪) with loading/empty/error-retry states | pass | `__tests__/client-quotes.test.tsx` (loading, empty, newest-first order + ₪, error→retry all green); `ClientQuotes.tsx:42-80`, `QuoteRow.tsx:20-49`, `useClientQuotes.ts:16-22` |
| AC2 | Delete a quote behind a confirm; soft-delete, idempotent, row leaves list | pass | `client-quotes.test.tsx` "deletes a quote after confirm and drops it from the list"; `useClientQuotes.ts:48-57` (`deleteQuote` + list invalidation), confirm `Modal` in `ClientQuotes.tsx:59-78` |
| AC3 | Tapping a quote prefills the Calculator (items + options + overrides), client pre-picked, totals reproduce | pass | `reopen-quote.test.ts` `fromQuote` reconstruction + round-trip through `buildQuoteInput`; nav test in `client-quotes.test.tsx:194`; `fromQuote.ts:52-80`, `CalculatorScreen.tsx:366-408` (fetch quote+client, seed, pre-pick) |
| AC4 | Saving a reopened quote updates in place via versioned PUT (id+version+reused item ids); conflict toast; title/notes prefilled | pass | `reopen-quote.test.ts` "sends the quote version and reuses the existing item ids"; `SaveQuoteSheet.tsx:32-55`, `quoteInput.ts:39-73`, `useSaveQuote.ts:40-44` (`version_conflict` → `CONFLICT_MESSAGE`) |
| AC5 | No appointment created; income unchanged; no "קביעת תור" button | pass | Inspection: no appointment code in the touched paths; `QuoteSave.tsx:76-104` helper "שמירת הצעה אינה יוצרת תור" and the "קביעת תור" button deliberately dropped; no client-summary/income change in the diff |
| AC6 | New UI uses only src/ui + tokens, logical start/end, isolated LTR ₪ runs, light+dark; reopened Calculator unchanged in layout | pass | Inspection: `ClientQuotes.tsx`/`QuoteRow.tsx` use `Card`/`Num`/`Text`/`EmptyState`/`ErrorState`/`LoadingState` + `useTheme` tokens only, `Num` renders the isolated-LTR ₪ run; `expo lint` clean. Visual confirmation (T11 screenshots) still pending. |

## Checks Run

- build: n/a (Expo app — no separate build step; typecheck is the compile gate)
- lint: `npx expo lint` — pass (no findings)
- typecheck: `npx tsc --noEmit` — pass (exit 0; the earlier TS2322 in `client-quotes.test.tsx:192` was fixed during this QA — see Notes)
- tests: scoped `npx jest client-quotes reopen-quote calculator save-quote clientCard` — pass (52/52). Full `npx jest` — 232 passed, 1 failed; the only failure is `theme/gen-theme.test.ts` (pre-existing/environmental — see Issue 1).

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `theme/gen-theme.test.ts` fails on a CRLF↔LF line-ending diff across all of `tokens.generated.ts`. No theme files are in this branch's diff, so it fails on `main` identically — a Windows `autocrlf` checkout artifact, not this spec. | note (pre-existing/environmental) |

## Notes

- **Typecheck fix applied during this QA.** The initial run found `tsc --noEmit` red on `__tests__/client-quotes.test.tsx:192` — `beforeEach(() => mockRouter.push.mockClear())` implicitly returned the `Mock` (TS2322). It was fixed by wrapping the callback in a block (`beforeEach(() => { mockRouter.push.mockClear(); })`); typecheck now exits 0 and `client-quotes`/`reopen-quote` stay green (13/13). T1 reflects the fix.
- **Issue 1 is not this spec's doing.** The generated-theme test compares the committed `tokens.generated.ts` against freshly rendered output; the whole-file diff is a line-ending mismatch (CRLF in the checkout vs LF from the generator). It reproduces on `main` and should be resolved at the repo level (`.gitattributes` / `autocrlf`), not here.
- **Verification phase still open:** T11 (iPhone + iPad screenshots of the list + a reopened quote; record the no-mockup deviation) and T12 (HUMAN: Aya reopens/edits/saves + deletes) are not yet done — expected, this QA is T13. AC6's visual fidelity and AC3/AC4's end-to-end behaviour are confirmed by tests and inspection but not yet by screenshots/human run.
- **Design deviation recorded:** no mockup exists for the Quotes tab list; built from existing `src/ui` components + tokens, noted in the spec Changelog and `references.md` (same pattern as the missing `Calculator.ipad.html`).
- **Pre-PR code review (2026-11-26) found + fixed an AC4 edit-path bug** not covered by the QA tests: adding a tattoo while editing a reopened quote sent the reducer's counter id (`"2"`) as the item id, which the API's `UUID` item id rejects → the entire edit-save 400'd with the generic "ההצעה לא נשמרה". Fixed by `resolveItemIds` (`quoteInput.ts`) — reuses server UUIDs, mints a fresh UUID for items added during an edit — wired into `SaveQuoteSheet`, with a regression test in `reopen-quote.test.ts`. Recorded as a `fix` row in the spec Changelog.
- This report reflects the latest run only.
