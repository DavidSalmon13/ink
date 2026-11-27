# QA Report — Client Quotes

> Spec: spec.md
> Date: 2026-11-27 · QA by: David Schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Quotes tab list: newest-first, title + final ₪ (LTR) + meta; loading / error(retry) / empty states | pass | `__tests__/client-quotes.test.tsx` ("client quotes list (AC1)") renders loading/error/empty/list; `ClientQuotes.tsx:42-57` wires the states; `QuoteRow.tsx:30-41` shows title + `Num` price + meta |
| AC2 | Delete via per-row action behind a confirm; row leaves the list; idempotent soft delete | pass | `__tests__/client-quotes.test.tsx` ("delete a quote (AC2)") passes in isolation and under `--runInBand` (both exit 0); `ClientQuotes.tsx:32-40,59-78` confirm Modal → `deleteQuote` mutation invalidates `quoteListKey` |
| AC3 | Reopen prefills the Calculator with the quote's items + options, client pre-picked; totals reproduce | pass | `__tests__/reopen-quote.test.ts` ("fromQuote — hydrate the calculator (AC3)") round-trips items+options+overrides; `client-quotes.test.tsx` ("reopen a quote (AC3)") asserts `router.push({pathname:'/(tabs)/calculator', params:{quoteId}})`; `QuoteRow.tsx:26` + `ClientQuotes.tsx:29-30` |
| AC4 | Edit saves in place via versioned PUT: reuses id + item ids, sends version; stale → conflict toast; title/notes prefilled | pass | `__tests__/reopen-quote.test.ts` (edit-mode `buildQuoteInput` + `resolveItemIds`) and `__tests__/edit-quote-cache.test.tsx` (detail cache refreshed on save — regression for the 2026-11-27 review fix) all pass |
| AC5 | No appointment created; income unchanged (quotes ≠ income); no "קביעת תור" button | pass | Inspection: no "קביעת תור" button in `src/features/quotes/**` (only comments noting it is deferred); `QuoteSave.tsx:103` copy "שמירת הצעה אינה יוצרת תור"; no `income`/`הכנס` references in the quotes feature |
| AC6 | Fidelity: `src/ui` + theme tokens only, logical start/end, isolated LTR ₪ runs, light+dark; no-mockup gap recorded | pass | `QuoteRow.tsx` / `ClientQuotes.tsx` use `Card`/`IconButton`/`EmptyState`/`ErrorState`/`LoadingState`/`Modal`/`Num`/`Text` from `@/ui` + `useTheme()` tokens only (no hard-coded colors/spacing); no-mockup deviation recorded in spec.md Changelog (2026-11-27) |

## Checks Run

- build: n/a — Expo/React Native app has no standalone build step in QA; typecheck + lint + tests cover it
- lint: `npx expo lint` — pass (exit 0)
- typecheck: `npx tsc --noEmit` — pass (exit 0)
- tests: `npx jest --runInBand --testTimeout=20000` — 235 passed, 1 failed (236 total). The single failure is `__tests__/theme/gen-theme.test.ts`, unrelated to this spec (see Notes). All client-quotes ACs' tests pass, including the new `edit-quote-cache.test.tsx` regression.

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `__tests__/theme/gen-theme.test.ts` fails locally — a CRLF-vs-LF line-ending artifact, not a code defect (see Notes) | Environment only — no action for this spec; `git config core.autocrlf input` + re-checkout locally if desired |

## Code Review

- A high-effort `/code-review` of the branch diff (2026-11-27) found one correctness bug in AC4: editing a reopened quote twice within the 30s query `staleTime` spuriously raised `version_conflict`, because `useSaveQuote` refreshed only the client list, not the per-quote detail cache. **Fixed on this branch** (commit `655271f`): `onSuccess` now writes the saved quote into `quoteDetailKey`, with a regression test (`edit-quote-cache.test.tsx`). Recorded as the 2026-11-27 `fix` Changelog row. No other blocking findings.

## Notes

- **The one test failure is a Windows line-ending artifact, not a regression.** `gen-theme.test.ts` asserts the committed `src/theme/tokens.generated.ts` matches freshly rendered tokens. `file` reports the on-disk file has **CRLF** terminators (git `autocrlf` checked it out that way on this Windows machine), while the generator emits **LF** — the diff is exactly one `\r` per line (238 lines → 238-char delta) with otherwise identical text. This branch touches **no** theme/tokens/gen-theme files (`git diff --name-only main...HEAD` confirms), so it would pass in CI with LF endings. Treated as lint-noise-equivalent on untouched files per the QA rules.
- **T11 (screenshots) and T12 (HUMAN on-device pass) were waived in setup mode** (recorded as a `waiver` row in spec.md Changelog, 2026-11-27): this machine has no iOS simulator for iPhone/iPad screenshots, and no on-device human pass was recorded. The no-mockup `deviation` row and this report's AC evidence stand in their place. If/when device access is available, capture the Quotes-tab + reopened-quote screenshots and have Aya run the edit/delete/reopen pass to close the loop.
- **AC2's delete test can flake on a 5s timeout under parallel CPU load** (it renders + opens a Modal + runs the delete mutation + two `waitFor` loops). It passed cleanly in isolation (exit 0) and in the serial `--runInBand` full run; no code change needed.
- All 13 tasks are `[x]` (T11/T12 via the recorded waiver). PR #86 is open for this branch.
