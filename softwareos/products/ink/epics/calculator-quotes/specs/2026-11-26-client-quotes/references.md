# References for Client Quotes

## Related Specs

- **[Related]** [../2026-11-25-save-quote/spec.md](../2026-11-25-save-quote/spec.md) — owns
  `apps/mobile/src/features/quotes/**` and the quotes backend. `client-quotes` **shares that directory** but
  owns distinct new files (`ClientQuotes.tsx`, `QuoteRow.tsx`, `useClientQuotes.ts`, `fromQuote.ts`) and
  **additively extends** `SaveQuoteSheet.tsx` / `useSaveQuote.ts` / `quoteInput.ts` for an edit mode (send
  `version`, reuse ids, prefill title/notes). Kept **separate** (save-quote is merged, PR #85) because this is
  the card-side **list + reopen** concern, not the save flow. It consumes save-quote's API unchanged
  (`listQuotes` / `getQuote` / `putQuote` / `deleteQuote`) and reuses `quoteListKey(clientId)`.
- **[Related]** [../2026-11-25-calculator-preview/spec.md](../2026-11-25-calculator-preview/spec.md) — owns
  `apps/mobile/src/features/calculator/**` and `apps/mobile/app/(tabs)/calculator.tsx`. Those are **additively
  extended** here for the `quoteId` edit-mode seed (fetch + hydrate + pre-pick client). `fromQuote.ts` imports
  its state types and `newItem` but is a **new file owned by this spec** — `calculatorState.ts` / `item.ts` are
  not edited. The hydrator reverses that spec's forward mapping (`toQuoteInput` / `toQuoteItem` /
  `toQuoteOptions`).
- **[Related]** `../../../clients/epic.md` — the `clients` epic owns the client card. `ClientCard.tsx`'s
  `הצעות מחיר` tab (which currently renders an `EmptyState`) is **additively wired** to render `ClientQuotes`.

## Design

- **No mockup** exists for the client-card Quotes tab list or its loading/empty/error states. Per
  `frontend/design-fidelity`, the list is built from existing `src/ui` components + theme tokens only, and the
  gap is recorded in the spec Changelog (AC6) — the same way `calculator-preview` / `save-quote` recorded the
  missing `Calculator.ipad.html`. The reopened Calculator reuses the existing `Calculator.html`-based screen.

## Upstream Meeting

- None.

## Similar Implementations

### Quotes API client + hooks (mirror for the list hook and edit-mode save)

- **Location:** `apps/mobile/src/api/quotes.ts` (`listQuotes` / `getQuote` / `putQuote` / `deleteQuote`),
  `apps/mobile/src/features/quotes/useSaveQuote.ts` (TanStack mutation shape + `quoteListKey` + Hebrew toasts),
  `apps/mobile/src/features/clients/useClients.ts` (query/search hook shape to mirror).
- **Relevance:** `useClientQuotes.ts` follows the same module shape; the save-flow invalidation already targets
  `quoteListKey(clientId)`, so a fresh save/delete refreshes the list.

### Calculator state ↔ quote mapping (the hydrator reverses this)

- **Location:** `apps/mobile/src/features/calculator/calculatorState.ts` (`toQuoteInput`, `toQuoteOptions`,
  `OptionsState`, `CalculatorState`) and `item.ts` (`toQuoteItem`, `newItem`, `ItemState`).
- **Relevance:** `fromQuote.ts` is the inverse — a saved `Quote` back to `CalculatorState`. Parse agorot →
  shekels text, `estimatedMinutesOverride` → the item override field, `discountType`/`discountValue` →
  `discountKind` + text.

### Client card tab + states

- **Location:** `apps/mobile/src/features/clients/card/ClientCard.tsx` (the `קעקועים / הצעות מחיר / הערות` tabs;
  the `quotes` tab currently renders `<EmptyState title="עדיין אין הצעות מחיר" />`).
- **Relevance:** `ClientQuotes` renders inside that tab; reuse the existing `EmptyState` for the empty case.
