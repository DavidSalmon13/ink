# App Shell

> Epic: ../../epic.md
> Status: done
> Branch: feat/foundation/app-shell
> Covers: apps/mobile/src/theme/**, apps/mobile/src/ui/**, apps/mobile/scripts/gen-theme.*, apps/mobile/app/_layout.tsx, apps/mobile/app/index.tsx, apps/mobile/app/(tabs)/**, apps/mobile/src/auth/tokens.ts (removed)

## Overview

The visual and navigational shell for Ink: a theme generated from `design/design-system/tokens.json`,
forced right-to-left layout, the core design-system components, the five-tab bar, and the Home screen
per `design/pages/Home.html`, with web fallbacks so the preview never crashes. It replaces the
temporary scaffolding owner-auth-lock shipped (hand-copied `src/auth/tokens.ts`, the `app/index.tsx`
placeholder) and closes owner-auth-lock's deferred RTL (AC10): app-shell owns `I18nManager.forceRTL`.
Feature tabs other than Home render placeholder screens; real feature content and Home's live
"next appointments" data arrive in later epics.

## Goals & User Stories

- As Aya, I open the app and move around the five tabs (בית, מחשבון, סקיצות, לקוחות, יומן) in the final look.
- As Aya, every screen reads right-to-left, including Hebrew mixed with numbers and ₪.
- As Aya, the Home screen matches the design in both light and dark mode.
- As Aya, from Home I reach the four main actions and the "עוד" links, and "הנתונים שלי" still asks me to re-authenticate.
- As David, the app theme is generated from tokens.json (not hand-copied), so a token change flows through by regenerating.
- As David, the web preview renders the shell without crashing, so I can review it in a browser.

## Acceptance Criteria

1. AC1: A generator (`scripts/gen-theme`) reads `design/design-system/tokens.json` and writes the
   theme module under `src/theme/` (colors light+dark, typography scale, spacing, radii, borderWidth,
   shadows as RN props, zIndex, touch, layout). The committed theme equals the generator's output —
   a test regenerates and diffs, so hand-edits are caught. No token value is hand-copied elsewhere.
2. AC2: Heebo (400/500/600/700) loads via `@expo-google-fonts/heebo`; the splash is held until fonts
   are ready; the `Text`/typography components apply the scale (display…caption/overline/price) from AC1.
3. AC3: The app forces right-to-left (`I18nManager.allowRTL(true)` + `forceRTL(true)`) and renders RTL
   on a device; all shell styles use logical `start/end`. Mixed Hebrew + numbers/₪ render correctly via
   a shared numeric helper (tabular-nums, LTR isolation) — verified on Home and in the component set.
4. AC4: Light and dark mode follow `useColorScheme`; every shell surface and component uses the AC1
   tokens for both, matching `design-system.html`'s light and dark palettes.
5. AC5: Core components exist in `src/ui/`, each matching `design-system.html`: Button
   (primary/secondary/destructive/ghost/icon + disabled, 44px min target), Field/Input (label, error,
   helper), Search, SegmentedControl, Chip, StatusDot-with-label, Card, Row/Rows, Avatar, Badge,
   SectionHeader.
6. AC6: A centered Modal (never a bottom sheet) renders over a scrim, identical on iPhone and iPad
   (maxWidth 353 / 460), with header/body/footer, and is accessible (`role="dialog"`, modal semantics,
   dismiss control).
7. AC7: A Toast (default + error) shows through a host at the toast z-index and auto-dismisses.
8. AC8: Empty, loading (skeleton), and error state components match the `design-system.html` states
   section and are reusable by later screens.
9. AC9: A fixed bottom tab bar has the five tabs in RTL order (בית, מחשבון, סקיצות, לקוחות, יומן) with
   the design's icons, 44px targets, and the active tab in the primary color. The four non-Home tabs
   render placeholder screens (titled, themed, RTL). Routing uses expo-router.
10. AC10: The Home screen matches `design/pages/Home.html`: header (date overline + "AYA INK" wordmark
    + settings icon button), the four action tiles (מחשבון, ספריית סקיצות, לקוחות, יומן), the
    "התורים הקרובים · היום" section rendered as an empty state (no live appointment data yet), and the
    "עוד" secondary grid (גלריית עבודות, הנתונים שלי, שיווק והודעות, הגדרות). No money or income appears
    anywhere on Home. Matches light and dark.
11. AC11: Home's "הנתונים שלי" routes to the existing `my-data` screen (its owner-auth-lock reauth guard
    still fires); the other "עוד" links and the settings button route to themed placeholder screens.
12. AC12: The temporary `src/auth/tokens.ts` is removed and the auth screens (login, lock, my-data)
    import from `src/theme`/`src/ui` with no visual regression; `app/index.tsx` is the designed Home;
    `app/_layout.tsx` keeps the existing AuthProvider/AppLock behavior.
13. AC13: On web (`expo start --web`) the shell renders without crashing — RTL is applied without a
    reload loop, the tab bar and Home render, and the device-only lock stays a no-op (owner-auth-lock).
14. AC14: Content respects safe-area insets (status bar / notch / home indicator) on iPhone and iPad
    via `react-native-safe-area-context`.
15. AC15: `./gradlew build` is unaffected; `npm run typecheck`, `npm run lint`, `npm test` pass, and CI
    is green. Tests cover the AC1 generator, the AC3 RTL/numeric helper, and the AC13 web fallbacks.

## Technical Approach

**Theme (`src/theme/`)** — `scripts/gen-theme.ts` (a `node`/`ts-node`-run script, also wired as an npm
script) reads `tokens.json` and emits `src/theme/tokens.generated.ts` (typed constants) + a small
`useTheme()`/`useColors()` hook over `useColorScheme`. Shadows map to RN iOS props + `elevation`.
A Jest test re-runs the generator in-memory and asserts the committed file matches (guards hand-edits).

**Fonts & type** — `@expo-google-fonts/heebo` loaded in `app/_layout.tsx` with `expo-font`; splash held
via the existing `expo-splash-screen` call until both fonts and auth state are ready. A `Text`/typography
component maps the scale names to styles.

**RTL** — `I18nManager.allowRTL(true)+forceRTL(true)` at the top of `app/_layout.tsx` (module scope, like
the existing splash call); logical `start/end` only. A `Num`/money helper wraps digits/₪ with
`tabular-nums` and LTR isolation. The one-time reload requirement (dev build) is documented in the QA notes.

**Components (`src/ui/`)** — one file per component, copied value-for-value from `design-system.html`
using theme tokens (no literals). Icons via `react-native-svg` with the exact paths from the design
(an `Icon` set covering the tab/action/nav glyphs). Centered Modal uses a themed backdrop + RN `Modal`
(or an absolute overlay at the backdrop/modal z-indices). Toast via a context host mounted in the layout
at the toast z-index.

**Navigation & Home** — migrate to an expo-router tab group `app/(tabs)/` with `index` (Home) + four
placeholder tab screens; the tab bar is a custom bar matching the design (icons, RTL order, active
color). `app/index.tsx` becomes the designed Home. Keep `my-data` and `login` outside the tab group,
guarded as today. Home's "הנתונים שלי" → `/my-data`; other "עוד"/settings links → placeholder routes.

**Hand-off** — delete `src/auth/tokens.ts`; update `app/login.tsx`, `src/auth/LockScreen.tsx`,
`app/my-data.tsx` imports to `src/theme`/`src/ui`. Preserve owner-auth-lock behavior in `_layout.tsx`.

**Web** — guard `forceRTL` so a web reload doesn't loop; ensure the tab bar/Home render under
`react-native-web`; device-lock already no-ops on web.

## Out of Scope

- Live "next appointments" data on Home (Calendar epic) — app-shell shows the empty state only.
- Real feature screens for the four non-Home tabs, Settings, gallery, and marketing (later epics) —
  placeholders only.
- API/entity conventions, Settings endpoint, attachments (api-conventions).
- Deploy / web hosting / EAS (deploy-pipeline).
- Client mode and its exit auth (sketches epic).
- Any money, income, or pricing UI (explicitly kept off Home; Calculator epic owns pricing).

## Standards Applied

- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md) — the shell copies
  `design/` exactly; styles come only from the generated tokens; logical start/end; "done" means
  matching Home.html + design-system.html on iPhone and iPad, light and dark.
- [global/git-workflow](../../../../../../standards/global/git-workflow.md) — branch
  `feat/foundation/app-shell`, commits scoped `feat(foundation)`, PR via the pr skill.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-16 | David Schwartzman | created | Initial shaping (role: Both, tests-after) | — |
| 2026-11-17 | David Schwartzman | deviation | T13 Home compared with `design/pages/Home.html` from **web-preview** screenshots (`visuals/home-*`), not the iOS Simulator (no Xcode on the dev machine): layout, type, text and light/dark palettes match. Known differences: the web preview renders mirrored (LTR) until T16's web RTL fallback; "התורים הקרובים" shows the empty state per AC10; no notch inset on web. **Owed:** an iPhone simulator/device screenshot before QA (T18). | T13 |
| 2026-11-17 | David Schwartzman | note | owner-auth-lock's temporary logout and API-status line moved from the placeholder Home to the Settings placeholder (`app/(tabs)/settings.tsx`, hidden from the tab bar), per the user's decision, until the Settings epic. | T13 |
