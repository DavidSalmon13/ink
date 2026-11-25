# QA Report — Calculator Preview

> Spec: spec.md
> Date: 2026-11-25 · QA by: David Schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Pure, dependency-free `src/pricing` computes estimate/visitMinutes/base/design/extras/subtotal/computed/final in integer agorot | pass | `src/pricing/__tests__/pricing.test.ts` (reads the shared vectors) — 42 pricing tests green; `src/pricing/calc.ts:30` (`calcQuote`), `roundUpTo5.ts`, float-guard case passes |
| AC2 | `fixtures/pricing-vectors.json` holds seeded settings + `cases` incl. calibration checks, mockup→1,000 ₪, float-error, 15-min floor, %/₪ discounts, override; unit tests read it | pass | `fixtures/pricing-vectors.json:1` (settings + 10 cases + round/estimate/calibration/hint vectors); pricing tests iterate every case and pass |
| AC3 | `nearestCalibration` (ties→fewer minutes) + English→Hebrew label map renders "דומה: … ≈ … דק׳" | pass | `src/pricing/calibration.ts:7`,`:35`; hint vectors in fixture pass; `__tests__/calculator.test.tsx` "similar hint" asserts "דומה: ורד ≈ 60 דק׳" from the pre-override estimate |
| AC4 | Item card matches `Calculator.html` `.item` — size/detail/shading/design-source segmented controls, placement chips, conditional שעות עיצוב, estimate field + override + hint; live recompute; add/remove | pass | `src/features/calculator/ItemEditor.tsx:70`; `__tests__/calculator.test.tsx` "item editor" — prefill 60, recompute to 105 on detail change, override drives visit time, add/remove via "קעקוע נוסף"/"הסרת הקעקוע" |
| AC5 | "אפשרויות נוספות" (needle stepper, %/₪ discount + helper, manual price) + Summary card with rows hidden at zero, minimum-fee helper, LTR number runs | pass | `src/features/calculator/CalculatorScreen.tsx` (`MoreOptions`/`Stepper`/`UnitInput`), `Summary.tsx`; calculator tests: amount discount (−95 ₪ → 420 ₪), percent (463.50 ₪), manual price (300 ₪); numbers via `Num`/`ltrIsolate` |
| AC6 | "העתקת הצעה" copies itemized Hebrew text + toast "ההצעה הועתקה"; no client, nothing saved, no "שמירת הצעה" | pass | `src/features/calculator/copyQuoteText.ts:24`; calculator test "copy quote" asserts the exact multi-line string, the toast, and `queryByRole('button',{name:'שמירת הצעה'})` absent |
| AC7 | Fidelity: `src/ui` + tokens only, logical start/end, light+dark, matches `Calculator.html` on iPhone; iPad reuses capped/centered layout; loading/error+retry; **Aya approves copy + prices 3 real visits** | not verifiable | Code parts pass by inspection: no hex/left/right in `CalculatorScreen.tsx`/`Summary.tsx` (grep clean), components from `@/ui` + theme, `CalculatorScreen.tsx:~230` loading/`ErrorState` with retry, iPad `CALC_MAX_WIDTH` cap. **Pending: the screenshot comparison (T9) and Aya's human sign-off (T10) are not yet done.** |

## Checks Run

- build: n/a — Expo app has no separate build step for QA (lint + typecheck + tests are the gates)
- lint: `npx expo lint` — pass
- typecheck: `npx tsc --noEmit` — pass
- tests: `npx jest` — **213 passed, 1 failed** (214 total). The single failure is `__tests__/theme/gen-theme.test.ts`, a pre-existing CRLF/whitespace mismatch in the committed `tokens.generated.ts`; confirmed failing on the pre-change (stashed) tree, unrelated to this spec. Scoped `src/pricing` + `__tests__/calculator.test.tsx`: 49 passed.

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | AC7 visual-fidelity screenshot pass not done | complete T9 (needs simulator) |
| 2 | low | AC7 human sign-off (Aya approves copy + prices 3 real visits) not done | complete T10 (human) |
| 3 | low | Pre-existing `gen-theme.test.ts` failure (CRLF in `tokens.generated.ts`), outside this spec | note only — not this spec's defect |

## Notes

- Verdict is **PASS WITH NOTES** under setup-mode rules: every testable AC (AC1–AC6) passes with test or inspection evidence; AC7 is `not verifiable` only in its screenshot (T9) and human-approval (T10) parts — its code-level requirements (tokens-only, logical edges, loading/error+retry, iPad layout) pass by inspection.
- Open tasks remaining: **T9** (screenshots iPhone+iPad vs `Calculator.html`, record deviations), **T10** (HUMAN — Aya's approval), **T11** (this QA run).
- Known/pre-recorded deviations to confirm during T9: no `Calculator.ipad.html` (iPad reuses the capped, centered iPhone layout) and the mockup's illustrative "דומה: דובדבן ≈ 80" hint vs the data-model nearest-point rule.
- During QA, a per-minute-rate bug in the summary helper found while writing T8 was fixed (`7c7a9a9`: `hourlyRateAgorot/100` → `/6000`, so it reads "5.5 ₪ לדקה").
- One file touched outside `> Covers:` — `src/ui/Icon.tsx` gained a shared `minus` glyph for the needle stepper.
- No PR open for this branch yet.
