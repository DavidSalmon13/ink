# Tasks — App Shell

> Epic: foundation
> Spec: 2026-11-16-app-shell
> Branch: feat/foundation/app-shell
> PR: https://github.com/DavidSalmon13/ink/pull/29 (spec shaping) · https://github.com/DavidSalmon13/ink/pull/30 (T1) · https://github.com/DavidSalmon13/ink/pull/31 (T2) · https://github.com/DavidSalmon13/ink/pull/32 (T3–T4) · https://github.com/DavidSalmon13/ink/pull/33 (T5) · https://github.com/DavidSalmon13/ink/pull/34 (T6–T7) · https://github.com/DavidSalmon13/ink/pull/35 (T8) · https://github.com/DavidSalmon13/ink/pull/36 (T9–T11) · https://github.com/DavidSalmon13/ink/pull/37 (T12a) · https://github.com/DavidSalmon13/ink/pull/38 (T12b) · https://github.com/DavidSalmon13/ink/pull/39 (T13a) · https://github.com/DavidSalmon13/ink/pull/40 (T13b) · https://github.com/DavidSalmon13/ink/pull/41 (T14)

## Theme & foundations

- [x] T1 Add deps (npx expo install @expo-google-fonts/heebo expo-font react-native-svg); scripts/gen-theme.ts generating src/theme/tokens.generated.ts from design/design-system/tokens.json; add `gen:theme` npm script
- [x] T2 src/theme: useTheme()/useColors() over useColorScheme; typography component mapping the scale
- [x] T3 Load Heebo (400/500/600/700) in app/_layout.tsx, hold splash until fonts + auth ready
- [x] T4 RTL bootstrap (I18nManager allowRTL/forceRTL) in app/_layout.tsx + Num/money helper (tabular-nums, LTR isolation)

## Core components (src/ui/, from design-system.html)

- [x] T5 Button (primary/secondary/destructive/ghost/icon + disabled) and Icon set (react-native-svg)
- [x] T6 Field/Input, Search, helper/error
- [x] T7 SegmentedControl, Chip, StatusDot-with-label
- [x] T8 Card, Row/Rows, Avatar, Badge, SectionHeader
- [x] T9 Centered Modal + scrim backdrop (iPhone/iPad maxWidth, accessible)
- [x] T10 Toast (default+error) + toast host at toast z-index
- [x] T11 Empty / loading (skeleton) / error state components

## Navigation & Home

- [x] T12 expo-router tab group app/(tabs)/ + custom 5-tab bar (RTL order, icons, active color) + 4 placeholder tab screens
- [x] T13 Home screen app/(tabs)/index.tsx per design/pages/Home.html (header, 4 tiles, empty "התורים הקרובים", "עוד" grid; no money)
- [x] T14 Wire "הנתונים שלי" → /my-data; other "עוד"/settings → placeholder routes

## Hand-off from owner-auth-lock

- [x] T15 Delete src/auth/tokens.ts; migrate login/LockScreen/my-data imports to src/theme + src/ui (no visual regression); preserve AuthProvider/AppLock behavior in _layout.tsx

## Web & verification

- [x] T16 Web fallbacks: guard forceRTL against reload loop; ensure tab bar + Home render under react-native-web
- [x] T17 Write tests (testing skill): gen-theme generator diff, RTL/numeric helper, web fallback logic; typecheck/lint/test green
- [x] T18 Run QA against acceptance criteria (qa skill)
