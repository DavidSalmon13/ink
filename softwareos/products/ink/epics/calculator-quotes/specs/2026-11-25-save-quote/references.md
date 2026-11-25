# References for Save Quote

## Related Specs

- **[Related]** [../2026-11-25-calculator-preview/spec.md](../2026-11-25-calculator-preview/spec.md) — the first
  spec of this epic. It owns `apps/mobile/src/pricing/**`, `apps/mobile/src/features/calculator/**`,
  `apps/mobile/app/(tabs)/calculator.tsx`, and `fixtures/pricing-vectors.json`. `save-quote` is kept **separate**
  (backend + save flow vs. preview + copy) but **reads** the shared pricing vectors from its Java tests and
  **additively mounts** the client/save block into `CalculatorScreen.tsx` through a slot. Those two paths are
  recorded here, not claimed in this spec's `> Covers:`.
- **[Related]** `../../../clients/epic.md` — the `clients` epic is **done**; its client table, `PUT/GET /clients`
  + search, client card and `ClientFormModal` are the foundation the save flow's client picker reuses. The card's
  Quotes **tab shell + empty state** already exist there; the quote **list** inside it belongs to `client-quotes`,
  not this spec.

## Design

- `design/pages/Calculator.html` — the **client-search / "לקוח חדש" / picked-client pill / "שמירת הצעה"** block at
  the top of the mockup (the part `calculator-preview` omitted). No `Calculator.ipad.html` exists — the iPad pane
  reuses the iPhone layout, as `calculator-preview` recorded. The "קביעת תור" entry point in the mockup stays
  hidden until the Calendar epic.

## Similar Implementations

### TypeScript pricing module (the Java copy mirrors this)

- **Location:** `apps/mobile/src/pricing/` — `roundUpTo5.ts`, `estimate.ts` (`estimateItemMinutes`,
  `placementTierOf`), `calc.ts` (`calcQuote`, `applyDiscount`), `types.ts`.
- **Relevance:** `app.ink.api.pricing` reproduces these functions in Java; `fixtures/pricing-vectors.json` is the
  shared contract both test suites read so the copies never drift (architecture.md → Gotchas).

### API: versioned writes + the client package (mirror for the quote package)

- **Location:** `apps/api/src/main/java/app/ink/api/common/VersionedWrites.java` (PUT create/retry/409/404 + soft
  delete rules), `client/ClientController.java` (validated input `record`s, `@PutMapping`/`@GetMapping`/
  `@DeleteMapping`), `client/ClientRepository.java`, `common/SyncedEntity.java`, `common/ApiError.java` /
  `ApiException.java` / `GlobalExceptionHandler.java`, `settings/Settings.java` + `SettingsRepository.java` (the
  seeded row pricing reads).
- **Relevance:** `app.ink.api.quote` (`Quote`, `QuoteItem`, `QuoteController`, `QuoteRepository`, `QuoteService`)
  follows this structure exactly; `QuoteController` delegates to `VersionedWrites`.
- **Tests to mirror:** `apps/api/src/test/java/app/ink/api/client/ClientIT.java` (integration-test shape);
  existing migrations stop at `V6` — this spec adds `V7`.

### Mobile API client + hooks (mirror for `quotes.ts` and `useSaveQuote`)

- **Location:** `apps/mobile/src/api/client.ts` (the `ApiClient.apiFetch` core; parses `ApiError(status, code,
  message, details)`, `version_conflict` carries `details.current`, `validation_failed` carries `details.fields`,
  204 → undefined), `src/api/clients.ts` and `src/api/settings.ts` (plain functions taking `api` first).
- **Relevance:** `src/api/quotes.ts` follows the same module shape. `src/features/clients/useClients.ts` already
  exposes reusable helpers worth borrowing in `useSaveQuote`: `conflictCurrent(error)`, the Hebrew
  conflict/offline/failed **toast** constants, and `replaceInLists`.

### Calculator state → quote input (reuse, don't reinvent)

- **Location:** `apps/mobile/src/features/calculator/calculatorState.ts` and `item.ts`.
- **Relevance:** the state already exposes `toQuoteInput(state)` and `toQuoteItem(item)` (resolving placement →
  tier, parsing text fields → integer agorot / minutes, `priceOverrideAgorot: number | null`). The save flow
  serializes the quote **from these existing converters** — it should not duplicate the mapping. The title
  defaults to the joined item `description`s. The server recomputes `estimatedMinutes` / `computedPriceAgorot` /
  `finalPriceAgorot`, so the client does not send authoritative prices.

## Upstream Meeting

- None.
