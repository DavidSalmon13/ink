# References for Client Card

## Related Specs

- **[Related]** [2026-11-18-client-list](../2026-11-18-client-list/spec.md). Overlaps on
  `apps/api/src/main/java/app/ink/api/client/**`, `apps/mobile/src/features/clients/**`,
  `apps/mobile/src/api/clients.ts` and `apps/mobile/app/(tabs)/clients.tsx`. Kept separate because client-list is
  done; the card adds new endpoints and files beside it and changes the row tap (AC1), recorded in client-list's
  Changelog.
- **[Related]** [foundation / 2026-11-16-app-shell](../../../foundation/specs/2026-11-16-app-shell/spec.md). Overlaps on
  `apps/mobile/app/(tabs)/**`, `apps/mobile/src/ui/**` and `apps/mobile/app/_layout.tsx`. The card adds a route
  registration, `Tabs`, six icons and `formatMonthYear` to the shell's shared UI.

## Design

- `design/pages/ClientCard.html`: the iPhone card. Header with "עריכת פרטים" / "עוד פעולות" icon buttons, a 64px
  avatar, name and "לקוחה מאז" line (the app uses "לקוח/ה מאז", decided while shaping), phone and Instagram chips,
  two stat tiles, the next-appointment line, consent row (out of scope), tabs and the tattoo list (out of scope).
- `design/pages/ClientCard.ipad.html`: the list pane (rows 60px, 8px × 20px padding) beside the card. Its stats grid
  has 3 columns, and the next appointment is a tile there.
- `design/design-system/design-system.html`: `.tabs` (44px items, 15px/500, underline on the current tab),
  `.chip`, `.iconbtn` (44px), `.stat`.
- No mockup: the contact sheet, the more-actions sheet, the delete confirmation, the card's empty states, "הלקוח לא
  נמצא", and the iPad "בחרו לקוח מהרשימה" pane. Build these from `src/ui` components and tokens, then get Aya's approval.

## Similar Implementations

### Soft delete

- **Location:** `apps/api/src/main/java/app/ink/api/attachment/AttachmentController.java` (`delete`),
  `apps/api/src/main/java/app/ink/api/common/VersionedWrites.java` (`softDelete`)
- **Relevance:** `DELETE /clients/{id}` is the same pattern.
- **Key patterns:** `@DeleteMapping("/{id}") @ResponseStatus(NO_CONTENT)` → `writes.softDelete(type, id)`. It is
  idempotent, and `get` / `put` already 404 on deleted rows.

### Clients data and list

- **Location:** `apps/mobile/src/features/clients/useClients.ts`, `ClientsList.tsx`, `ClientFormModal.tsx`,
  `apps/mobile/app/(tabs)/clients.tsx`
- **Relevance:** the card reuses the query keys (`clientsKey`), the toast and offline handling, the edit modal, and
  `WIDE_MIN_WIDTH` (768).
- **Key patterns:** detail and summary keys go under `clientsKey` so save invalidation refreshes them. The modal is
  keyed per open.

### Shared UI

- **Location:** `apps/mobile/src/ui/Modal.tsx` (sheets and confirmations; avoid `Alert`, which does nothing on web),
  `Chip.tsx`, `Button.tsx` (`IconButton`, `destructive`), `Avatar.tsx` (`size`, `fontSize`), `States.tsx`,
  `Icon.tsx`, `hebrewDate.ts` (`MONTHS`, `APP_TIME_ZONE`)
- **Relevance:** the card is built from these. `Tabs` and the new icons are added here.

### Numbers and money

- **Location:** `apps/mobile/src/theme/Num.tsx`, `apps/mobile/src/theme/numeric.ts` (`formatMoney`, `ltrIsolate`)
- **Relevance:** the phone, handle and money values render as isolated LTR runs.

### Routing and guard

- **Location:** `apps/mobile/app/_layout.tsx` (`Stack.Protected guard={status === 'signedIn'}`, `AppLockGate`)
- **Relevance:** `clients/[id]` must be registered inside the signed-in guard.

### Linking

- **Location:** `expo-linking` (installed, unused so far)
- **Relevance:** `Linking.openURL` for `tel:`, `https://wa.me/…` and `https://instagram.com/…`.
