# Save Quote

> Epic: ../../epic.md
> Status: shaped
> Branch: feat/calculator-quotes/save-quote
> Covers: apps/api/src/main/resources/db/migration/V7__quote.sql, apps/api/src/main/java/app/ink/api/quote/**, apps/api/src/main/java/app/ink/api/pricing/**, apps/mobile/src/api/quotes.ts, apps/mobile/src/features/quotes/**

## Overview

The second spec of the Calculator & Quotes epic. `calculator-preview` (done) built the pure-TS `src/pricing`
module and the Calculator tab that prices a visit and **copies** a quote with no client and nothing saved. It
deliberately left two things to this spec, recorded in its Changelog: the top **client-picker / "שמירת הצעה"**
block of `design/pages/Calculator.html`, and everything server-side.

This spec delivers the **save** half of the epic (brief goal 4 — "save quotes to the client card; quotes never
expire, so they can be booked later"). It adds the `V7` `quote`/`quote_item` migration, an **authoritative Java
pricing copy** in `apps/api` that reproduces the shared `fixtures/pricing-vectors.json` agorot-for-agorot (the
contract `calculator-preview` set up), the full **`PUT`/`GET`/`DELETE /quotes`** REST surface, and the **client
picker (+ new client) and save** from the calculator. It serves the success criteria "the app's preview and the
API agree on a shared set of test vectors", "a saved quote shows on the client card with its total, and reopening
it reproduces the same numbers", "saving a quote never creates an appointment", and "all money is integer agorot".

Every dependency is satisfied: the `clients` epic is **done**, so the picker reuses the existing client
search (`useClients`) and "לקוח חדש" (`ClientFormModal`); the server mirrors the existing `app.ink.api.client`
package and `common/VersionedWrites`; and the shared pricing vectors already exist as a ready failing-test
contract. The client summary is **unchanged** — quotes are not income.

Mounting the save block needs one **additive** edit to `apps/mobile/src/features/calculator/CalculatorScreen.tsx`
(owned by `calculator-preview`): the new UI lives in `src/features/quotes/**` and `CalculatorScreen` renders it
through a slot. This is recorded as a related-spec touch, not an ownership claim. The card's Quotes tab list,
reopening a quote to edit/delete, and the "קביעת תור" button are the next spec, `client-quotes`.

**Design:** `design/pages/Calculator.html` — specifically the client-search / "לקוח חדש" / picked-client pill /
"שמירת הצעה" block at the top that `calculator-preview` omitted. There is no `Calculator.ipad.html`, so the iPad
pane reuses the iPhone composition (same deviation `calculator-preview` recorded). The "קביעת תור" entry point in
the mockup stays hidden until the Calendar epic ships (tech-plan: "hide the button or stub it until then").

## Goals & User Stories

As Aya:

- I pick an existing client (searching by name/phone/Instagram) or add a new one, then save the quote I just
  priced, and it is stored under that client. The saved price is exactly what the preview showed me.
- I can save several times (editing the same quote) without creating duplicates; if my other device saved first,
  I'm told rather than silently overwriting.
- Saving a quote never books an appointment.
- I can still copy a quote to send without choosing a client (unchanged from `calculator-preview`).

## Acceptance Criteria

1. AC1 (authoritative Java pricing): a dependency-free `app.ink.api.pricing` package mirrors `src/pricing` and
   reproduces **every** case in `fixtures/pricing-vectors.json`:
   - `roundUpTo5` rounds **up** to the next multiple of 5 with the float-error guard (a product of
     60.0000001 → 60, not 65);
   - `estimateItemMinutes = roundUpTo5( max(15, sizeBase × detail × shading × placement) )` reading
     `estimateTables`;
   - `visitMinutes = Σ items (override ?? estimated)`;
   - `base = minimumPriceAgorot + max(0, visitMinutes − minimumMinutes) × (hourlyRateAgorot / 60)`;
   - `design = Σ custom_design items round(designHours × designHourlyRateAgorot)`;
   - `extras = extraNeedles × extraNeedleCostAgorot`; `subtotal = base + design + extras`;
   - `applyDiscount`: percent subtracts `round(subtotal × value/100)` **round-half-up**, amount subtracts
     `min(subtotal, valueAgorot)` — never below 0; `computed = applyDiscount(subtotal)`;
   - `final = priceOverrideAgorot ?? computed`.

   All money is integer agorot and all minutes integer. A JUnit 5 test reads the **same** fixture file (not a
   copy) and passes `roundUpTo5[]`, `estimateFromProduct[]`, and every `cases[]` entry. The calibration/hint
   vectors stay UI-only and are not ported to Java.
2. AC2 (V7 schema): a Flyway `V7__quote.sql` adds `quote` and `quote_item` per `data-model.md`, mirroring the
   existing migration style. `quote` extends the synced-entity shape (id uuid PK, version, created_at, updated_at,
   deleted_at) with `client_id` (uuid, **NOT NULL**, FK → `client(id)`), `title`, `notes` (nullable),
   `discount_type` (`none|percent|amount`), `discount_value`, `extra_needles`, `price_override_agorot` (nullable),
   `computed_price_agorot`, `final_price_agorot`, `estimated_minutes_total`. `quote_item` has `id` uuid PK,
   `quote_id` FK → `quote(id)`, `position`, `description`, `size`, `detail_level`, `shading`, `body_placement`,
   `design_source` (`artist_sketch|client_reference|custom_design`), `sketch_id` (**nullable, no FK** until the
   Sketch epic), `design_hours` (nullable), `estimated_minutes`, `estimated_minutes_override` (nullable). Money is
   integer agorot; soft delete only (no hard deletes).
3. AC3 (`PUT /quotes/{id}` with authoritative recompute): create/update under the `VersionedWrites` rules — no row
   → insert at version 0; row equals the payload → return unchanged (idempotent retry, no version bump); version
   matches → apply + 1; otherwise → **409 `version_conflict`** carrying the current record; soft-deleted → 404.
   Items are sent inline with device-generated UUIDs. The server **recomputes** each item's `estimatedMinutes`
   and the quote's `computedPriceAgorot`, `finalPriceAgorot`, `estimatedMinutesTotal` from the seeded `Settings`
   row via `app.ink.api.pricing` — **client-sent prices are ignored**. `client_id` is required and must reference
   a live client (else `validation_failed` / 404 per the existing convention). Stored prices do **not** change when
   Settings rates change later (recompute happens only on an edit). Invalid input → `validation_failed` with
   `fields`.
4. AC4 (read + delete): `GET /quotes?clientId=<id>` lists that client's live quotes newest-first;
   `GET /quotes/{id}` returns one (404 when unknown or soft-deleted); `DELETE /quotes/{id}` soft-deletes and is
   idempotent (repeats and unknown ids → 204). The quote view carries the stored computed/final prices,
   `estimatedMinutesTotal`, and the items inline (position-ordered).
5. AC5 (mobile quotes API client): `src/api/quotes.ts` wraps the four endpoints following the `clients.ts` /
   `api.apiFetch` pattern — `putQuote`, `getQuote`, `listQuotes(clientId)`, `deleteQuote` — with `Quote`,
   `QuoteItem`, and `QuoteInput` types mirroring the server views. `version_conflict` (with `details.current`)
   and `validation_failed` (with `details.fields`) surface as `ApiError`.
6. AC6 (client picker + save from the calculator): the top block of `Calculator.html` that `calculator-preview`
   omitted is built in `src/features/quotes` — a client **search/select** reusing `useClients`, a **"לקוח חדש"**
   path reusing `ClientFormModal`, a picked-client **pill**, and a **"שמירת הצעה"** button. Saving builds the
   quote from the calculator state (items + options), **defaults the title to the joined item descriptions**
   (shown pre-filled and **editable** in the save sheet) plus an optional notes field, generates a device UUID,
   `PUT`s it, and on success shows a toast. Save is **disabled while no client is chosen**; copying still works
   with no client (unchanged). No "קביעת תור" button appears in this spec (deferred to Calendar/`client-quotes`).
7. AC7 (fidelity + agreement): the new UI uses only `src/ui` components and theme tokens, with logical start/end,
   isolated LTR number/₪ runs, light+dark support, matching `Calculator.html`'s client/save block on iPhone (the
   iPad pane reuses the iPhone layout, per `calculator-preview`'s recorded deviation). The saved quote's totals
   **equal** what the preview displays for the same input (both read the shared vectors), a refetched quote
   reproduces the same numbers, and **saving never creates an appointment**. Aya saves 1–2 real quotes end-to-end
   and accepts the results.

## Technical Approach

- **`app.ink.api.pricing` (pure Java, no Spring).** Mirrors `apps/mobile/src/pricing`: `RoundUpTo5` (ceil to the
  next 5 with an `EPS` to absorb float error just over a multiple), `Estimate` (`estimateItemMinutes`,
  `placementTierOf`), `PricingCalculator.calcQuote(input, settings) → QuoteBreakdown` with every agorot line,
  and `applyDiscount` (percent round-half-up; amount clamp to subtotal, ≥ 0). Takes a `Settings` value in; it does
  not fetch. `nearestCalibration` / the Hebrew label map are UI-only and are **not** ported.
- **Shared-vector test.** A JUnit 5 test (`pricing/PricingVectorsTest`) reads `fixtures/pricing-vectors.json` from
  the repo root (path resolved relative to the `apps/api` module) with Jackson and asserts `roundUpTo5[]`,
  `estimateFromProduct[]`, and `cases[]` — the same file `src/pricing/__tests__` reads, so the two copies can
  never drift (architecture.md → Gotchas).
- **`app.ink.api.quote`.** `Quote extends SyncedEntity`; `QuoteItem` as a child collection (orphan removal,
  ordered by `position`). `QuoteRepository.findLiveByClientId(...)` for the list. `QuoteService` maps the seeded
  `Settings` row → a pricing input, recomputes via `app.ink.api.pricing`, and stores the results on the entity.
  `QuoteController` (`@PutMapping("/{id}")`, `@GetMapping` list + `/{id}`, `@DeleteMapping("/{id}")`) uses
  `VersionedWrites`, mirroring `ClientController`. `QuoteInput`/`QuoteView` are validated `record`s with items
  inline; the view returns server-computed prices only.
- **`V7__quote.sql`.** Follows the existing migration style; FK `quote.client_id → client(id)`,
  `quote_item.quote_id → quote(id)`, `sketch_id` nullable with no FK.
- **Mobile.** `src/api/quotes.ts` mirrors `clients.ts`. `src/features/quotes` holds the client `ClientPicker`
  (reusing `useClients` + `ClientFormModal`), the save sheet (title default from items, notes), and
  `useSaveQuote` (a TanStack mutation over `putQuote`). `CalculatorScreen` renders the picker/save block through
  an additive slot; the calculator state (items + options) is serialized to `QuoteInput`.
- **Numbers/RTL** per the design-fidelity standard: every number / ₪ / דק׳ in its own isolated LTR `Text`
  (`theme/Num`), logical start/end only, tokens only, light+dark.
- **New dependency:** none. Jackson ships with Spring; `expo-clipboard` and the pricing module already exist.

## Out of Scope

- The card's Quotes tab list, reopening a saved quote to edit or delete it, and the "קביעת תור" button —
  `client-quotes`.
- The booking flow: the appointment modal, pre-fill from a quote, several appointments per quote — the
  Calendar & appointments epic. This spec provides neither the button nor the flow.
- Editing the rates and estimate tables in Settings (uses the seeded `Settings` row as is).
- The `sketch` foreign key: `quote_item.sketch_id` stays nullable with no FK until the Sketch epic adds the table.
- The "hard" placement tier chips (ribs/neck/hands/feet/spine/sternum) — same deferral as `calculator-preview`.

## Standards Applied

- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md) — the client/save block
  copies `Calculator.html`; tokens only; logical start/end; isolated LTR number runs; light+dark; the
  no-`.ipad.html` gap is reused from `calculator-preview`, not reinvented.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch
  `feat/calculator-quotes/save-quote`, conventional commits scoped `calculator-quotes`, PRs via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-25 | david-schwartzman | created | Initial shaping (role: Both, mode: setup, test mode: TDD). Decisions: quote title auto-derived from item descriptions and editable in the save sheet; full quotes backend (PUT + GET list/single + soft DELETE) built here, client-quotes consumes it; the client picker reuses the done clients epic; the save block mounts into CalculatorScreen (calculator-preview's covers) via an additive slot, recorded as a related touch; "קביעת תור" stays hidden until the Calendar epic. | — |
