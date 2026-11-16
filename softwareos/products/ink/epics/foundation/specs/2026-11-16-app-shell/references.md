# References for App Shell

## Related Specs

- **[Related]** [2026-11-16-owner-auth-lock](../2026-11-16-owner-auth-lock/spec.md): kept separate, with
  a **planned hand-off**. owner-auth-lock shipped temporary UI scaffolding that app-shell replaces:
  - `apps/mobile/src/auth/tokens.ts` — its own comment says *"TEMPORARY: app-shell's theme module
    replaces this file"*. app-shell **deletes** it; the auth screens re-import from `src/theme`/`src/ui`.
  - `apps/mobile/app/index.tsx` — the developer Home placeholder, **replaced** by the designed Home.
  - `apps/mobile/app/_layout.tsx` — **extended** with RTL bootstrap + the tab navigator, preserving the
    existing `AuthProvider` / `AppLockGate` behavior unchanged.
  - owner-auth-lock AC10 explicitly deferred forced RTL (`I18nManager.forceRTL`) to app-shell; this spec
    closes that deferral.

## Design

- `design/pages/Home.html` — the Home screen this spec implements (header with date overline +
  "AYA INK" wordmark + settings icon; four action tiles מחשבון / ספריית סקיצות / לקוחות / יומן; the
  "התורים הקרובים · היום" section, rendered here as an **empty state** until the Calendar epic;
  the "עוד" secondary grid; and the five-tab bar).
- `design/design-system/design-system.html` — the exact look and states for every core component:
  buttons (primary/secondary/destructive/ghost/icon + disabled), fields/inputs/search, segmented
  control, chips, status dots with labels, cards/rows/avatars/badges, centered modal, toasts, and the
  empty/loading/error states.
- `design/design-system/tokens.json` — the single source for all colors (light+dark), typography scale
  (Heebo), spacing, radii, borderWidth, shadows, zIndex, touch sizes and layout. The theme is
  **generated** from this file, not hand-copied.
- `design/design-system/README.md` — React Native build notes for the tokens.
- Other `design/pages/*.html` (Calculator, SketchLibrary, ClientCard, Calendar…) are **out of scope**
  here — their tabs render placeholders; those pages belong to later epics.

## Similar Implementations

### Temporary theme tokens (to replace)

- **Location:** `apps/mobile/src/auth/tokens.ts`
- **Relevance:** the shape of the values the generated theme must expose (palette light/dark, spacing,
  radii, type scale, shadows). app-shell generalizes this into `src/theme` generated from tokens.json
  and deletes this file.

### Existing layout wiring (to preserve)

- **Location:** `apps/mobile/app/_layout.tsx`
- **Relevance:** `AuthProvider`, `AppLockGate`, `expo-splash-screen` hold, and the signed-in/out
  `Stack.Protected` routing must keep working. app-shell adds the RTL bootstrap and swaps the signed-in
  stack for the `(tabs)` group without changing auth behavior.

### Screen built from tokens (pattern to follow)

- **Location:** `apps/mobile/app/login.tsx`, `apps/mobile/app/my-data.tsx`
- **Relevance:** the established pattern of building a screen purely from tokens + logical styles with
  Hebrew copy and light/dark support. These screens migrate to the new `src/theme`/`src/ui` imports.
