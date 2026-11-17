# QA Report — App Shell

> Spec: spec.md
> Date: 2026-11-17 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Theme generator; committed theme equals its output | pass | `__tests__/theme/gen-theme.test.ts` regenerates from `tokens.json` and diffs against `src/theme/tokens.generated.ts`; no hex literal in `app/` or `src/` outside the generated file |
| AC2 | Heebo 400–700, splash held, Text applies the scale | pass | `app/_layout.tsx:27,63,87` (`preventAutoHideAsync` → `useFonts` → `hideAsync`); `src/theme/typography.ts` maps the scale to Heebo faces; `src/theme/Text.tsx` |
| AC3 | Forced RTL on device, logical start/end, numeric helper | not verifiable | `src/theme/rtl.ts` + `__tests__/theme/rtl.test.ts` (forces once on native); `__tests__/theme/numeric.test.ts` (LTR isolation, agorot); no `left`/`right` styles in `app/` or `src/`. Not observed on a device; `Num` isn't yet used on Home or in components (Home's date has no mixed-direction run) |
| AC4 | Light/dark from `useColorScheme`, tokens only | pass | `src/theme/useTheme.ts`; all components read `useTheme()`/`useColors()`; `visuals/home-web-light.png`, `visuals/home-web-dark.png` |
| AC5 | Core components in `src/ui/` | pass | `src/ui/index.ts` exports Button/IconButton (44px `touch.buttonHeight`/`minTarget`), Field, Search, SegmentedControl, Chip, StatusDot, Card, Row/Rows, Avatar, Badge, SectionHeader |
| AC6 | Centered modal, scrim, 353/460, accessible | pass | `src/ui/Modal.tsx:30-31` (width caps), `:66-68` (`accessibilityViewIsModal`, `aria-modal`, `role="dialog"`), close control `:19,41` |
| AC7 | Toast default+error at toast z-index, auto-dismiss | pass | `src/ui/Toast.tsx:48-49` (timer per kind), `:77-78` (`zIndex.toast`); host mounted in `app/_layout.tsx` |
| AC8 | Empty / loading / error states | pass | `src/ui/States.tsx` (`EmptyState`, `Skeleton`, `LoadingState`, `ErrorState`); used by Home |
| AC9 | Five-tab bar in RTL order, placeholders, expo-router | pass | `src/ui/TabBar.tsx` (`tabs` order, active `primary`); `app/(tabs)/_layout.tsx`; placeholder screens in `app/(tabs)/*.tsx` |
| AC10 | Home matches Home.html, no money | pass | `app/(tabs)/index.tsx` (header, 4 tiles `:12-17`, empty "התורים הקרובים · היום" `:112-117`, "עוד" grid `:20-26`); no ₪/money/income references; web screenshots in `visuals/` |
| AC11 | "הנתונים שלי" → my-data (reauth), others → placeholders | pass | `app/(tabs)/index.tsx:20-25,65`; `__tests__/my-data.test.tsx` (reauth guard) |
| AC12 | `tokens.ts` removed; auth screens on theme/ui; layout keeps auth/lock | not verifiable | `src/auth/tokens.ts` deleted (commit 28dccf1), no references remain; `__tests__/login.test.tsx`, `my-data.test.tsx`, `useAppLock.test.tsx` pass; `_layout.tsx` AuthProvider/AppLockGate unchanged. "No visual regression" not checked by eye |
| AC13 | Web renders, no RTL reload loop, lock no-op | not verifiable (partial) | `npx expo export --platform web` rendered all 20 routes; `rtl.test.ts` (web never calls forceRTL across repeated loads); lock disabled on web `app/_layout.tsx:37`. Signed-in tab bar + Home not observed in a browser |
| AC14 | Safe-area insets on iPhone/iPad | not verifiable | `useSafeAreaInsets` in `app/(tabs)/index.tsx:35`, `src/ui/Toast.tsx:66`, `src/ui/PlaceholderScreen.tsx:22`; tab bar uses `insets.bottom`. Not observed on a device |
| AC15 | gradle unaffected; typecheck/lint/test pass; CI green; tests cover AC1/AC3/AC13 | pass | see Checks Run; tests in `__tests__/theme/`. No `apps/api` commits on the branch vs `origin/main` |

## Checks Run

- build (mobile, web): `npx expo export --platform web` — pass (20 static routes)
- build (api): `./gradlew build` — not run (no Java runtime locally); branch has no `apps/api` changes
- lint: `npm run lint` — pass (0 warnings)
- typecheck: `npm run typecheck` — pass
- tests: `npm test` — pass (16 suites, 103 passed, 0 failed)
- CI: Mobile workflow green on the T13–T14 PRs; T15–T17 commits not yet pushed

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | `app/login.tsx`, `app/my-data.tsx`, `src/auth/LockScreen.tsx` changed by T15 but not in `> Covers:` | /spec-changes |
| 2 | low | Exported web HTML ships `<html lang="en">` without `dir`; `applyRTL()` fixes it on hydration. A fix needs `app/+html.tsx` (outside Covers) | /spec-changes |
| 3 | low | AC12 and `> Covers:` name `app/index.tsx`; Home lives at `app/(tabs)/index.tsx` | /spec-changes |

## Notes

Device/browser checks still owed (setup mode allows PASS WITH NOTES):

1. **AC3** — on an iPhone: first launch, restart once, confirm RTL layout; check numbers/₪ in mixed text.
2. **AC10** — iPhone simulator/device screenshot of Home (owed per the 2026-11-17 changelog deviation).
3. **AC12** — login, lock and my-data look as before (now Heebo from the type scale; error line/lock message use the scale's line height; lock pill dims on press).
4. **AC13** — `npm run web`, sign in, confirm the tab bar and Home render right-to-left with no reload loop.
5. **AC14** — notch/home-indicator insets on iPhone and iPad.
6. **AC15** — CI green on the T15–T17 PRs.
