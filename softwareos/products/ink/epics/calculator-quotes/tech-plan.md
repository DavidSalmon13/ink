# Calculator & Quotes — Tech Plan

> Epic: epic.md · Product: ../../mission.md

## Approach

A pure pricing module (minutes and agorot, integer money) reads the existing `Settings` row (rates,
`estimate_tables`, `calibration_points`; see `V3__settings.sql`) and is implemented twice: in TypeScript in
`apps/mobile` for the instant preview, and in Java in `apps/api` as the authoritative copy. One shared JSON
test-vector file, read by both test suites, keeps them in agreement (architecture.md → Gotchas). Two new tables,
`quote` and `quote_item` ([data-model.md](../../data-model.md) → Quote, QuoteItem): `Quote` extends
`SyncedEntity` and is written through `VersionedWrites` with `PUT /quotes/{id}` (items inline, device-generated
UUIDs, 409 `version_conflict` on a stale version). The server recomputes and stores `estimatedMinutes`,
`computedPriceAgorot`, `finalPriceAgorot` and `estimatedMinutesTotal`. The API also adds `GET /quotes?clientId=`,
`GET /quotes/{id}` and a soft `DELETE /quotes/{id}`. In the mobile app, the Calculator tab is built per
`design/pages/Calculator.html` (item editor, "אפשרויות נוספות", summary, copy, client picker, save), and the client
card's Quotes tab lists saved quotes and reopens them for editing. "קביעת תור" is a button that hands the quote id
to the Calendar epic.

## Architecture Impact

- **No new services or infrastructure.**
- **Schema:** one Flyway migration, `V7`, adding `quote` and `quote_item`. `quote_item.sketch_id` is nullable with
  no foreign key until the Sketch epic adds the `sketch` table.
- **API:** a new `app.ink.api.quote` package (following `client` and `common/VersionedWrites`) and a pure
  `app.ink.api.pricing` package. The client summary is unchanged: quotes are not income.
- **Mobile:** `src/pricing` (pure TS), `src/features/calculator`, and `src/features/quotes`. The
  `(tabs)/calculator` placeholder is replaced, and the card's Quotes tab shell is filled.
- **Shared test vectors:** a repo-level fixtures file that both test suites read.
- architecture.md itself doesn't need to change.

## Risks & Unknowns

- **Rounding:** 5.5 ₪/min = 550 agorot/min fits integers, but the estimate multipliers (e.g. 0.8 × 1.45 × 1.25)
  are floats. TS and Java must round identically (`roundUpTo5` applied to the float product, watching for
  float error just above a multiple of 5). The shared vectors guard this.
- **Placement gap:** the placement chips in `Calculator.html` show 9 easy/medium spots and none of the "hard" ones
  (ribs, neck, hands, feet, spine, sternum). We need a placement → tier map and a design decision on the
  missing chips.
- **Calibration labels:** `Settings.calibration_points` labels are in English ("rose"), but the hint is in Hebrew
  ("דומה: דובדבן ≈ 80 דק׳"). They need Hebrew labels.
- **Settings changes after save:** stored prices must not change silently when rates change. Recompute only when
  the quote is edited.
- **Copy text format:** the text pasted into WhatsApp/Instagram has not been designed.
- **"קביעת תור" target:** it doesn't exist until the Calendar epic ships. Hide the button or stub it until then.
- **Design gap:** there are no mockups for the card's Quotes tab list or its empty states.
- No spike needed.

## Candidate Specs

- `calculator-preview`: the TS pricing module and the shared test-vector file; the Calculator tab per
  `Calculator.html` with multiple tattoos, estimate + override + similar hint, "אפשרויות נוספות", the summary, and
  copying a quote with no client (nothing saved).
- `save-quote`: the `V7` quote/quote_item migration, Java pricing that passes the same vectors,
  PUT/GET/DELETE `/quotes`, and the client picker (+ new client) and save from the calculator.
- `client-quotes`: the card's Quotes tab list, reopening a quote to edit or delete it, and the "קביעת תור" button
  (hidden until Calendar ships).
