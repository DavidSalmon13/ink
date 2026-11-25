# Tasks — Save Quote

> Epic: calculator-quotes
> Spec: 2026-11-25-save-quote
> Branch: feat/calculator-quotes/save-quote

## Schema & pricing  (PR 1)

- [x] T1 `apps/api/src/main/resources/db/migration/V7__quote.sql`: `quote` + `quote_item` per `data-model.md` (client_id FK NOT NULL, synced-entity columns, agorot integers, soft delete; `quote_item.sketch_id` nullable/no FK) (AC2)
- [x] T2 Failing Java pricing tests reading the shared `fixtures/pricing-vectors.json` — `app/ink/api/pricing/PricingVectorsTest.java` covering `roundUpTo5[]`, `estimateFromProduct[]`, and every `cases[]` entry (testing skill, TDD) (AC1)
- [x] T3 `app.ink.api.pricing` (RoundUpTo5 + EPS guard, Estimate incl. placementTierOf, PricingCalculator.calcQuote, applyDiscount round-half-up + amount clamp) — make T2 pass (AC1)

## Quotes API  (PR 2)

- [x] T4 `app.ink.api.quote` entities + repository: `Quote extends SyncedEntity`, `QuoteItem` child (orphan removal, position-ordered), `QuoteRepository.findLiveByClientId` (AC2, AC4)
- [x] T5 Failing `app/ink/api/quote/QuoteIT.java`: PUT create / identical-retry no-bump / version-match +1 / stale 409 `version_conflict` / deleted 404; authoritative recompute from Settings (client-sent prices ignored); `GET ?clientId=` newest-first; `GET /{id}`; idempotent soft `DELETE`; missing/dead client validation (testing skill, TDD) (AC3, AC4)
- [x] T6 `QuoteController` + `QuoteService` (map seeded Settings → pricing input, recompute, store) via `VersionedWrites`, mirroring `ClientController` — make T5 pass (AC3, AC4)

## Save from calculator  (PR 3)

- [x] T7 `apps/mobile/src/api/quotes.ts` + types (`putQuote` / `getQuote` / `listQuotes(clientId)` / `deleteQuote`, `Quote` / `QuoteItem` / `QuoteInput`) mirroring `clients.ts`; surface `version_conflict` / `validation_failed` as `ApiError` (AC5)
- [x] T8 `apps/mobile/src/features/quotes/`: client picker (reuse `useClients` search) + "לקוח חדש" (reuse `ClientFormModal`) + picked-client pill + save sheet (title default from item descriptions, editable; optional notes) + "שמירת הצעה" (`useSaveQuote` → `putQuote`, device UUID, success toast); mount in `CalculatorScreen` via an additive slot; build `QuoteInput` from calculator state; save disabled with no client (AC6, AC7)
- [x] T9 Component tests `apps/mobile/__tests__/save-quote.test.tsx`: pick existing client, add new client, title defaults from items, `QuoteInput` built from calculator state, save disabled without a client, success toast (testing skill) (AC6)

## Verification  (PR 4)

- [ ] T10 Screenshots iPhone + iPad of the client/save block vs `Calculator.html`; fix or record deviations (no `.ipad.html`; hidden "קביעת תור") in the Changelog (AC7)
- [ ] T11 HUMAN: Aya saves 1–2 real quotes end-to-end; confirm the saved totals reproduce the preview numbers and the quote persists under the client (AC7)
- [ ] T12 Run QA against acceptance criteria (qa skill)

> `fixtures/pricing-vectors.json` (T2) is read and `CalculatorScreen.tsx` (T8) is additively edited, but both are
> owned by `calculator-preview` — recorded in references.md, not claimed in `> Covers:`.
