# Calculator Preview

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/calculator-quotes/calculator-preview
> Covers: apps/mobile/src/pricing/**, apps/mobile/src/features/calculator/**, apps/mobile/app/(tabs)/calculator.tsx, fixtures/pricing-vectors.json

## Overview

Aya prices a visit on the Calculator tab and sees the time and price update instantly, then copies the
quote to send on WhatsApp/Instagram — all without choosing a client and without saving anything. A pure
TypeScript pricing module computes the minutes and the agorot from the seeded `Settings` row; a shared
JSON test-vector file pins every number so the authoritative Java copy (next spec) can match it exactly.

This is the first spec of the Calculator & Quotes epic and implements the "instant preview + copy" half
of it. It serves brief goals 1–3 (one consistent price from the formula; several tattoos per visit with
an overridable estimate; copy to send with no client) and the success criteria "the preview and the API
agree on a shared set of test vectors (rose M simple = 60, arm XL = 180)", "the summary breakdown
matches `Calculator.html` in RTL on iPhone and iPad", "copying works with no client and saves nothing",
and "all money is integer agorot".

Saving a quote, the client picker, the `quote`/`quote_item` tables and the Java pricing copy are the
next spec (`save-quote`); the card's Quotes tab and "קביעת תור" are `client-quotes`. This spec replaces
the app-shell placeholder at `app/(tabs)/calculator.tsx` and consumes the existing `GET /settings`
(api-conventions) read-only.

**Design:** `design/pages/Calculator.html` (iPhone) is the source of truth; there is no
`Calculator.ipad.html`, so the iPad layout reuses the iPhone composition centered in the pane (recorded
as a deviation). The client-picker block at the top of the mockup is intentionally omitted here (it is
`save-quote`). The copy-to-clipboard text has no mockup and uses the itemized format in AC6, which Aya
approves from a screenshot.

## Goals & User Stories

As Aya:

- I add one or more tattoos (size, detail, shading, placement, design source) and see the visit's time
  and price update instantly.
- I can override any tattoo's estimated minutes, and I see a hint such as "דומה: ורד ≈ 60 דק׳".
- I can add a custom-design fee by hours, extra needles, a % or ₪ discount, or a manual final price.
- I copy the quote text to paste into WhatsApp or Instagram, with no client chosen and nothing saved.

## Acceptance Criteria

1. AC1 (pure pricing module): a dependency-free `src/pricing` computes, from a `Settings` value:
   - per item `estimatedMinutes = roundUpTo5( max(15, sizeBase × detail × shading × placement) )`,
     reading `estimateTables`; `roundUpTo5` rounds **up** to the next multiple of 5 and is guarded
     against float error just above a multiple (a product of 60.0000001 → 60, not 65);
   - `visitMinutes = Σ items (override ?? estimated)`;
   - `base = minimumPriceAgorot + max(0, visitMinutes − minimumMinutes) × (hourlyRateAgorot / 60)`
     (550 agorot/min with the seed; the minimum/needle-opening fee is charged once per visit);
   - `design = Σ custom_design items round(designHours × designHourlyRateAgorot)`; artist-sketch and
     client-reference items add no design fee;
   - `extras = extraNeedles × extraNeedleCostAgorot`;
   - `subtotal = base + design + extras`; `computed = applyDiscount(subtotal)` where percent subtracts
     `round(subtotal × value/100)` and amount subtracts `min(subtotal, valueAgorot)` (never below 0);
   - `final = priceOverrideAgorot ?? computed`.

   All money is integer agorot and all minutes integer; nothing uses floating money.
2. AC2 (shared vectors): `fixtures/pricing-vectors.json` holds the seeded `Settings` defaults plus a
   `cases` array (input → expected minutes per item, `visitMinutes`, base/design/extras/discount,
   `computed`, `final`). It includes the calibration checks (rose M·simple = 60, arm XL = 180,
   deer L = 120, cherry M ≈ 75), the full mockup scenario (→ 1,000 ₪), a `roundUpTo5` float-error case,
   the 15-minute floor, percent and amount discounts, and a price override. The `src/pricing` unit tests
   read this file and pass every case; the file is the contract the `save-quote` Java tests will reuse.
3. AC3 (similar hint): `nearestCalibration(estimatedMinutes, calibrationPoints)` returns the point whose
   `minutes` is closest to the item's estimated (pre-override) minutes (ties → fewer minutes), rendered
   with a client-side English→Hebrew label map (rose→ורד, cherry→דובדבן, arm→זרוע, back→גב, deer→צבי,
   "figure with book"→דמות עם ספר) as "דומה: &lt;label&gt; ≈ &lt;minutes&gt; דק׳".
4. AC4 (item editor): each tattoo card matches `Calculator.html`'s `.item` — size (XS–XL with the cm
   sublabels), detail (פשוטה/בינונית/גבוהה), shading (ללא/עדינות/מלאות) and design-source
   (סקיצה קיימת / רפרנס לקוח / עיצוב מותאם חדש) segmented controls, the placement chips, a "שעות עיצוב"
   field shown only for עיצוב מותאם חדש, and a "זמן משוער … דק׳" field prefilled with the estimate,
   editable to set the override, with the hint and "אפשר לערוך ידנית" beside it. Changing any control
   recomputes live. "קעקוע נוסף" adds an item; items can be removed; descriptions are per item.
5. AC5 (options + summary): "אפשרויות נוספות" holds the extra-needles stepper ("50 ₪ למחט נוספת"), the
   הנחה %/₪ selector + value ("ההנחה חלה על כל הביקור, כולל דמי העיצוב."), and the "מחיר ידני" override.
   The summary card lists משך ביקור / מחיר בסיס / דמי עיצוב / תוספת מחטים / הנחה / סה״כ exactly as the
   mockup (the design, needles and discount rows are hidden when zero), with the minimum-fee helper line.
   Numbers and ₪ are isolated LTR runs.
6. AC6 (copy, no client): "העתקת הצעה" copies itemized Hebrew text to the clipboard —
   `הצעת מחיר` / blank line / one line per tattoo `<description> · <size> · <shading?> · <minutes> דק׳` /
   blank line / `משך ביקור: <n> דק׳` / `סה״כ: <total> ₪` — and shows the toast "ההצעה הועתקה". No client
   is chosen, nothing is saved, and no "שמירת הצעה" button appears in this spec.
7. AC7 (fidelity): the screen uses only `src/ui` components and theme tokens, with logical start/end and
   light+dark support, and matches `Calculator.html` on iPhone. There being no `.ipad.html`, the iPad
   pane reuses the iPhone layout (recorded in the Changelog). The settings load shows the shared loading
   and error states; an error offers retry. Aya approves the copy text and prices 3 real past visits and
   accepts the results.

## Technical Approach

- **`src/pricing` (pure TS, no React, no network).** `types.ts` (`Size`, `Detail`, `Shading`,
  `PlacementTier`, `DesignSource`, `QuoteItemInput`, `QuoteOptionsInput`, `QuoteBreakdown`);
  `roundUpTo5.ts` (ceil to the next 5 with an `EPS ≈ 1e-6` to absorb float error just over a multiple);
  `estimate.ts` (`estimateItemMinutes`, `placementTierOf` via a placement-id → tier map); `calc.ts`
  (`calcQuote(input, settings) → QuoteBreakdown` with every agorot line); `calibration.ts`
  (`nearestCalibration` + the English→Hebrew label map). It takes a `Settings` value in; it does not
  fetch. Mirrors how the Java `app.ink.api.pricing` package will be structured in `save-quote`.
- **`fixtures/pricing-vectors.json`** at the repo root: `{ "settings": {…seed defaults…}, "cases": [ … ] }`,
  consumed by `src/pricing/__tests__` now and the Java suite later (architecture.md → Gotchas: both
  pricing copies must agree via shared vectors).
- **`src/features/calculator`.** `useSettings.ts` — a TanStack Query hook wrapping `getSettings`
  (`src/api/settings.ts`), so the feature never touches api-conventions' file. `calculatorState.ts` — a
  `useReducer` over the items + options. `ItemEditor.tsx` — one `.item` card built from
  `SegmentedControl`, `Chip`/`Chips`, `Field`, and the theme `Num`; the estimate field is prefilled from
  `estimateItemMinutes` and becomes the override when edited; the hint comes from `nearestCalibration`.
  `Summary.tsx` — the breakdown `Card`, derived from `calcQuote`. `copyQuoteText.ts` — builds the AC6
  string. `CalculatorScreen.tsx` — composes the items + "קעקוע נוסף", the "אפשרויות נוספות" `details`
  (needle stepper from `IconButton` + `Num` inline, discount `SegmentedControl` + `Field`, manual-price
  `Field`), the summary, and the "העתקת הצעה" button (expo-clipboard `setStringAsync` + `useToast`).
  `app/(tabs)/calculator.tsx` replaces `PlaceholderScreen` with `<CalculatorScreen/>`.
- **Numbers/RTL** per the design-fidelity standard: every number / ₪ / דק׳ in its own isolated LTR
  `Text` (`theme/Num`), logical start/end only, tokens only, light+dark.
- **New dependency:** `expo-clipboard` (added to `apps/mobile`). No other new deps.

## Out of Scope

- Saving quotes, the `quote`/`quote_item` tables, the V7 migration, the Java authoritative pricing copy,
  and `PUT`/`GET`/`DELETE /quotes` — `save-quote`.
- The client search / "לקוח חדש" / "שמירת הצעה" block at the top of the mockup — `save-quote`.
- The card's Quotes tab, reopening a saved quote, and the "קביעת תור" button — `client-quotes`.
- Editing the rates and estimate tables in Settings (uses the seeded row as is).
- The "hard" placement tier chips (ribs/neck/hands/feet/spine/sternum); the tier exists in
  `estimateTables` but has no MVP chips.

## Standards Applied

- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md) — the Calculator
  tab copies `Calculator.html`; tokens only; logical start/end; isolated LTR number runs; light+dark;
  the no-`.ipad.html` and copy-text gaps are recorded, not invented.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch
  `feat/calculator-quotes/calculator-preview`, conventional commits scoped `calculator-quotes`, PRs via
  the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-25 | david-schwartzman | created | Initial shaping (role: Both, mode: setup, test mode: TDD). Decisions: client section deferred to save-quote; client-side Hebrew calibration-label map with nearest-by-estimated-minutes; itemized copy text. Noted deviations: no `Calculator.ipad.html` (iPad reuses the iPhone layout); the mockup's sample hint "דומה: דובדבן ≈ 80" is illustrative — the implementation uses the data-model nearest-point rule, to confirm with Aya in T10. | — |
