# Tasks — Calculator Preview

> Epic: calculator-quotes
> Spec: 2026-11-25-calculator-preview
> Branch: feat/calculator-quotes/calculator-preview
> PR: https://github.com/DavidSalmon13/ink/pull/84

## Pricing  (PR 1)

- [x] T1 `fixtures/pricing-vectors.json`: seeded Settings defaults + `cases` (rose M·simple=60, arm XL=180, deer L=120, cherry M≈75, the full mockup scenario → 1,000 ₪, a roundUpTo5 float-error case, the 15-min floor, percent + amount discounts, a price override) (AC2)
- [x] T2 Failing unit tests `apps/mobile/src/pricing/__tests__/pricing.test.ts` reading the vectors: estimate per item, visitMinutes, base/design/extras/discount, computed/final, nearestCalibration (testing skill, TDD) (AC1, AC2, AC3)
- [x] T3 `apps/mobile/src/pricing/` (roundUpTo5, estimate + placementTierOf, calcQuote, applyDiscount, calibration + Hebrew label map) — make T2 pass (AC1, AC3)

## Calculator UI  (PR 2)

- [x] T4 `features/calculator/useSettings.ts` (TanStack Query over `getSettings`) + loading/error states wired in the screen (AC7)
- [x] T5 `features/calculator/ItemEditor.tsx` per `Calculator.html` `.item`: size/detail/shading/design-source segmented controls, placement chips, conditional שעות עיצוב, estimate field + override + "דומה:" hint; live recompute (AC3, AC4)
- [x] T6 `features/calculator/CalculatorScreen.tsx`: multiple items (קעקוע נוסף / remove), "אפשרויות נוספות" (needle stepper, הנחה %/₪, מחיר ידני), `Summary.tsx` card; replace the placeholder in `app/(tabs)/calculator.tsx` (AC4, AC5)
- [x] T7 `features/calculator/copyQuoteText.ts` + "העתקת הצעה" → expo-clipboard + toast "ההצעה הועתקה"; no client, nothing saved, no Save button (AC6)
- [x] T8 Component tests `apps/mobile/__tests__/calculator.test.tsx`: editing controls updates estimate + summary live, override, similar hint, percent/amount discount + manual override, copy-text format (AC4, AC5, AC6)

## Verification  (PR 3)

- [ ] T9 Screenshots iPhone + iPad vs `Calculator.html`; fix or record deviations (no `.ipad.html`; illustrative hint text) in the Changelog (AC7)
- [ ] T10 HUMAN: Aya approves the copy text and prices 3 real past visits with the calculator and accepts the results; confirm the "similar" hint behaviour (AC7)
- [x] T11 Run QA against acceptance criteria (qa skill)
