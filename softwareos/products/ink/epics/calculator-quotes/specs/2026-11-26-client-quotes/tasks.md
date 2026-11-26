# Tasks — Client Quotes

> Epic: calculator-quotes
> Spec: 2026-11-26-client-quotes
> Branch: feat/calculator-quotes/client-quotes

## Quotes tab list  (PR 1)

- [x] T1 Failing tests (testing skill, TDD): `useClientQuotes` lists newest-first + delete invalidates; `ClientQuotes` renders loading/error/empty/list; `QuoteRow` shows title + final ₪ (AC1, AC2)
- [x] T2 `apps/mobile/src/features/quotes/useClientQuotes.ts`: TanStack query over `listQuotes` keyed by `quoteListKey(clientId)` + `deleteQuote` mutation invalidating it — make the hook tests pass (AC1, AC2)
- [ ] T3 `apps/mobile/src/features/quotes/ClientQuotes.tsx` + `QuoteRow.tsx`: list with loading/error(retry)/empty(reuse `EmptyState`), each row title + final ₪ (isolated LTR) + meta line; `src/ui` + tokens only (AC1, AC6)
- [ ] T4 Wire `ClientQuotes` into `ClientCard.tsx` `הצעות מחיר` tab (replace the `EmptyState` branch; additive touch) (AC1)
- [ ] T5 Delete-with-confirm from a `QuoteRow` → `deleteQuote`; row leaves the list on confirm (AC2)

## Reopen to edit  (PR 2)

- [ ] T6 Failing tests (testing skill, TDD): `fromQuote` round-trips a saved quote back to calculator state (items + options + overrides); edit-mode `buildQuoteInput` reuses ids + sends `version` (AC3, AC4)
- [ ] T7 `apps/mobile/src/features/quotes/fromQuote.ts`: `fromQuote(quote) → CalculatorState` reversing `toQuoteInput`/`toQuoteItem`/`toQuoteOptions` — make T6 hydrator tests pass (AC3)
- [ ] T8 Calculator edit mode: `quoteId` param on `app/(tabs)/calculator.tsx`; `CalculatorScreen` fetches `getQuote`+client, seeds state via `fromQuote`, pre-picks the client, carries `{id, version}` edit context (additive touch) (AC3)
- [ ] T9 Edit-mode save: `SaveQuoteSheet`/`buildQuoteInput`/`useSaveQuote` reuse quote id + item ids, send `version`, prefill title/notes when editing (create path unchanged) — make T6 edit tests pass (additive touch) (AC4)
- [ ] T10 Reopen navigation: `QuoteRow` press → `router.push('/(tabs)/calculator', { quoteId })` (AC3)

## Verification  (PR 3)

- [ ] T11 Screenshots iPhone + iPad of the Quotes tab list + a reopened quote; record the no-mockup deviation in the Changelog (AC6)
- [ ] T12 HUMAN: Aya reopens a saved quote, edits it and saves (confirms it updates in place, totals reproduce), and deletes one from the list (AC3, AC4)
- [ ] T13 Run QA against acceptance criteria (qa skill)

> `CalculatorScreen.tsx` + `app/(tabs)/calculator.tsx` (calculator-preview) and `SaveQuoteSheet.tsx` /
> `useSaveQuote.ts` / `quoteInput.ts` (save-quote) and `ClientCard.tsx` (clients epic) are additively edited but
> owned by other specs — recorded in references.md, not claimed in `> Covers:`.
