# References for Calculator Preview

## Related Specs

- **[Related]** [../../../foundation/specs/2026-11-16-app-shell/spec.md](../../../foundation/specs/2026-11-16-app-shell/spec.md) — owns `apps/mobile/app/(tabs)/**` and scaffolded the `calculator.tsx` placeholder (its AC9) to be replaced by this epic. Kept separate: app-shell is the tab shell; this spec fills the one Calculator tab.
- **[Considered]** [../../../foundation/specs/2026-11-17-api-conventions/spec.md](../../../foundation/specs/2026-11-17-api-conventions/spec.md) — owns `apps/mobile/src/api/settings.ts` and `GET /settings`; dismissed as a different concern: this spec only *reads* settings through a new `useSettings` hook and never edits `settings.ts`.

## Upstream Meeting

_None._

## Design

- `design/pages/Calculator.html` — the Calculator tab (iPhone 393×852): the `.item` card (size / detail /
  shading / design-source segmented controls, placement chips, `שעות עיצוב`, the `זמן משוער … דק׳` field
  with the `דומה:` hint), `קעקוע נוסף`, the `אפשרויות נוספות` `details` (needle stepper, `הנחה` %/₪,
  `מחיר ידני`), the summary card, and `העתקת הצעה`. **No `Calculator.ipad.html` exists** — the iPad pane
  reuses the iPhone layout (deviation, recorded in the Changelog). The client-picker block at the top is
  omitted here (it belongs to `save-quote`).
- `design/design-system/tokens.json` — all styles.

## Similar Implementations

### Clients feature + TanStack Query

- **Location:** `apps/mobile/src/features/clients/**`, `apps/mobile/src/features/clients/useClients.ts`
- **Relevance:** the feature-folder layout and the query-hook + loading/error pattern for `useSettings`
  and the Calculator screen.

### Settings API + pricing types

- **Location:** `apps/mobile/src/api/settings.ts`
- **Relevance:** the `Settings`, `EstimateTables` and `CalibrationPoint` types and `getSettings` — the
  read-only data source for the pricing module. The seed values live in
  `apps/api/src/main/resources/db/migration/V3__settings.sql`.
- **Key patterns:** money is integer agorot; `estimateTables` / `calibrationPoints` are editable JSON;
  the estimate formula is documented in the file's JSDoc.

### UI component library + LTR numbers

- **Location:** `apps/mobile/src/ui/` (`SegmentedControl`, `Chip`/`Chips`, `Field`, `Card`,
  `Button`/`IconButton`, `Toast`/`useToast`, `States`), `apps/mobile/src/theme/Num.tsx`
- **Relevance:** the item-editor controls, the summary card, the copy toast, the shared loading/error
  states, and the isolated LTR runs for every number / ₪ / דק׳.

### Data model — pricing formula

- **Location:** `softwareos/products/ink/data-model.md` (Quote / QuoteItem → Pricing + Time estimate)
- **Relevance:** the authoritative formula and the calibration checks the shared vectors encode.
