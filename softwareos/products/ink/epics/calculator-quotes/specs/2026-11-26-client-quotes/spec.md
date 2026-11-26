# Client Quotes

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/calculator-quotes/client-quotes
> Covers: apps/mobile/src/features/quotes/ClientQuotes.tsx, apps/mobile/src/features/quotes/QuoteRow.tsx, apps/mobile/src/features/quotes/useClientQuotes.ts, apps/mobile/src/features/quotes/fromQuote.ts

## Overview

The third and final spec of the Calculator & Quotes epic. `calculator-preview` built the pricing preview +
copy; `save-quote` (merged, PR #85) built the quotes backend (`PUT`/`GET`/`DELETE /quotes`) and the client
picker + save from the calculator. This spec delivers the **client card's Quotes tab**: it lists a client's
saved quotes, lets Aya **reopen one to edit** (prefilling the Calculator and saving the update via the
versioned PUT) or **delete** it. It serves the epic success criterion "a saved quote shows on the client card
with its total, and reopening it reproduces the same numbers".

Everything server-side already exists in `save-quote`: `listQuotes(clientId)` (newest-first), `getQuote(id)`,
`putQuote` (versioned create/update), `deleteQuote` (idempotent soft delete). The client card already shows a
`הצעות מחיר` tab with an empty state (`ClientCard.tsx`); this spec replaces that empty branch with the real
list and keeps the empty state when the client has no quotes.

Reopen-to-edit reuses the Calculator and save flow additively: a new `fromQuote` hydrator reverses the
calculator-state mapping, the Calculator accepts a `quoteId` to fetch + seed the quote and pre-pick its client,
and the save sheet gains an edit mode that sends the quote's `version` (so a stale version surfaces the
existing conflict toast rather than silently overwriting). These touch files owned by `calculator-preview` and
`save-quote` additively — recorded in `references.md`, not claimed here.

**Design:** there is no mockup for the Quotes tab list or its states. Per the design-fidelity standard it is
built from existing `src/ui` components and theme tokens only (reusing the existing `EmptyState`), with the
no-mockup gap recorded in the Changelog — the same way `calculator-preview`/`save-quote` recorded the missing
`Calculator.ipad.html`. The client summary is **unchanged** — quotes are not income. The **"קביעת תור"** button
stays out until the Calendar epic ships (its target doesn't exist yet).

## Goals & User Stories

As Aya:

- On a client's card I open the **הצעות מחיר** tab and see every quote I saved for them, newest first, each
  with its title and total, so I can find one to send or book later.
- I **tap a quote to reopen it** in the Calculator exactly as I saved it — same tattoos, options and total — so
  I can tweak it and save the change back onto the same quote without creating a duplicate.
- If my other device edited that quote first, I'm **told** rather than silently overwriting it.
- I can **delete** a quote I no longer need, with a confirm so I don't lose one by accident.
- Reopening or editing a quote never books an appointment, and quotes never show up as income.

## Acceptance Criteria

1. AC1 (Quotes tab list): the client card's **הצעות מחיר** tab lists that client's live quotes **newest-first**
   (via `listQuotes(clientId)`), each row showing the quote **title** and **final price** (₪, isolated LTR run)
   plus a secondary meta line (e.g. saved date and/or estimated minutes). The existing empty state
   ("עדיין אין הצעות מחיר") shows when there are none; a loading state and an error state (with retry) show for
   those query states. Built from existing `src/ui` components + tokens (no mockup — recorded deviation).
2. AC2 (delete): a quote can be **deleted** from the list via a per-row action behind a **confirm**; on confirm
   it is soft-deleted (`deleteQuote`) and the row leaves the list (the list is invalidated/refetched). Deleting
   is idempotent and never hard-deletes.
3. AC3 (reopen prefills the Calculator): tapping a quote **navigates to the Calculator prefilled** with that
   quote — its items (size/detail/shading/placement/design source/design hours/minute override) and its options
   (extra needles, discount, manual price) — via a new `fromQuote` hydrator, with the quote's **client
   pre-picked**. The summary reproduces the **saved totals** for the same input.
4. AC4 (edit saves in place): saving a reopened quote **updates the same quote** through the versioned
   `PUT /quotes/{id}` — it sends the quote's `id` and `version` and reuses the existing item ids, so it is an
   update, not a new quote. A stale version surfaces the existing `version_conflict` toast. Title and notes are
   prefilled from the saved quote and editable. The server recompute is unchanged (client-sent prices ignored).
5. AC5 (no appointment, not income, no "קביעת תור"): reopening, editing, or deleting a quote **never creates an
   appointment**; the client summary/income is **unchanged** (quotes are not income); **no "קביעת תור" button**
   appears in this spec (deferred to the Calendar epic — recorded).
6. AC6 (fidelity): the new UI uses only `src/ui` components and theme tokens, with logical start/end, isolated
   LTR number/₪ runs, and light+dark support. No mockup exists for the list, so it is built from existing
   components (recorded deviation); the reopened Calculator reuses the existing screen unchanged in layout.

## Technical Approach

- **List hook — `useClientQuotes.ts` (new).** A TanStack query over `listQuotes(api, clientId)` keyed by
  `quoteListKey(clientId)` (already defined in `save-quote`'s `useSaveQuote.ts`, so the save flow's
  invalidation already refreshes it) plus a `deleteQuote` mutation that invalidates that key. Mirrors the
  `useClients`/`useSaveQuote` hook shape.
- **List UI — `ClientQuotes.tsx` + `QuoteRow.tsx` (new).** `ClientQuotes` takes a `clientId`, renders
  loading / error (retry) / empty (reuse the existing `EmptyState` "עדיין אין הצעות מחיר") / list. Each
  `QuoteRow` shows the title and final price (`Num`/`theme` LTR run) + a meta line, and exposes reopen (row
  press) and delete (confirm → mutation). Styled from `src/ui` + tokens only.
- **Card wiring (additive touch).** In `ClientCard.tsx`, replace the `tab === 'quotes'` `EmptyState` branch
  with `<ClientQuotes clientId={client.id} />` (which itself renders the empty state when the list is empty).
- **Reverse hydrator — `fromQuote.ts` (new).** `fromQuote(quote: Quote): CalculatorState` reconstructs
  `items: ItemState[]` and `options: OptionsState` from a `Quote` — the inverse of `toQuoteInput`/`toQuoteItem`/
  `toQuoteOptions`: placement id, size/detail/shading/design source straight across; `designHours` → text;
  `estimatedMinutesOverride` → the item's override field; `discountType`/`discountValue` → `discountKind` +
  text; `priceOverrideAgorot` → shekels text. Imports the types/`newItem` from calculator-preview but is a new
  file this spec owns (keeps editing of `calculatorState.ts`/`item.ts` out of scope).
- **Calculator edit mode (additive touch).** `app/(tabs)/calculator.tsx` reads an optional `quoteId` route
  param and passes it to `CalculatorScreen`. When present, the screen fetches `getQuote(quoteId)` (+ the
  client via `clientId`), seeds the reducer from `fromQuote(quote)`, pre-picks the client in
  `QuoteSaveProvider`, and carries an **edit context** (`{ id, version }`) so the save path is an update.
  `useCalculatorState` gains an optional initial-state argument (or the screen seeds via `useReducer` init).
- **Edit-mode save (additive touch).** `SaveQuoteSheet` + `buildQuoteInput` + `useSaveQuote` accept an optional
  edit context: when editing, reuse the quote's `id` + item ids and send `version`, and prefill title/notes
  from the saved quote instead of minting fresh UUIDs. Create (no client / fresh) behaviour is unchanged.
- **Reopen navigation.** `QuoteRow`'s press calls
  `router.push({ pathname: '/(tabs)/calculator', params: { quoteId } })`.
- **Numbers/RTL** per the design-fidelity standard: every ₪ / דק׳ / date in its own isolated LTR `Text`,
  logical start/end only, tokens only, light+dark.
- **No new dependency.** All four quote endpoints, the pricing module, and `expo-router` already exist.

## Out of Scope

- The **"קביעת תור"** button and the booking flow — the Calendar & appointments epic.
- Any change to the quotes **API** (schema, endpoints, recompute) — delivered in `save-quote`; this spec only
  consumes it.
- Editing the **rates/estimate tables** in Settings.
- A **design mockup** for the Quotes tab list — deliberately built from existing components instead (recorded).
- The **sketch** foreign key on `quote_item` — still nullable, no FK, until the Sketch epic.

## Standards Applied

- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md) — tokens only; logical
  start/end; isolated LTR number runs; light+dark; the no-mockup list is built from existing components and the
  gap recorded in the Changelog (same pattern as the no-`.ipad.html` deviation).
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch
  `feat/calculator-quotes/client-quotes`, conventional commits scoped `calculator-quotes`, PRs via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-26 | David Schwartzman | created | Initial shaping (role: Both, mode: setup, test mode: TDD). Decisions: full reopen-to-edit (prefill Calculator + versioned-PUT update); Quotes tab list built from existing components (no mockup — recorded gap); kept a separate spec from the merged save-quote, sharing the src/features/quotes/ dir but owning distinct files; "קביעת תור" stays out until the Calendar epic. | — |
