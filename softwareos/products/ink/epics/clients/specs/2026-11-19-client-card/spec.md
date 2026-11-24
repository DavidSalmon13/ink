# Client Card

> Epic: ../../epic.md
> Status: in-progress
> Branch: feat/clients/client-card
> Covers: DELETE /clients/{id}, GET /clients/{id}/summary, apps/api/src/main/java/app/ink/api/client/ClientSummary*, apps/mobile/app/clients/[id].tsx, apps/mobile/src/features/clients/card/**, the iPad split in apps/mobile/app/(tabs)/clients.tsx, apps/mobile/src/ui/Tabs.tsx, the phone/whatsapp/instagram/edit/more/trash icons in apps/mobile/src/ui/Icon.tsx, formatMonthYear in apps/mobile/src/ui/hebrewDate.ts

## Overview

The client card, which is the hub that later epics hang quotes, appointments and tattoos on. It shows:
- a header with contacts that you can tap to call, WhatsApp or open Instagram;
- the computed summary (tattoo count, "הכנסות לפי תורים שהסתיימו", next appointment), all empty until those epics land;
- tab shells for tattoos, quotes and notes;
- edit and soft delete.

On the iPad the list and the card sit side by side.

The spec serves these success criteria from the epic brief:
- the card matches `ClientCard.html` / `ClientCard.ipad.html`, with summary empty states until the later epics;
- a deleted client disappears from the list and search but stays in the database;
- concurrent edits get a 409;
- it works in Expo Go on the iPhone and iPad.

It builds on `client-list` (done). Tapping a list row now opens the card instead of the edit modal, and editing moves to
the card's "עריכת פרטים" (recorded in client-list's Changelog). The consent row belongs to `marketing-consent`.

**Design:** `ClientCard.html` (iPhone) and `ClientCard.ipad.html` (list pane + card). The following have no mockup and are
built from `src/ui` components and tokens only, then approved by Aya from screenshots:
- the contact sheet;
- the more-actions sheet and the delete confirmation;
- the card's empty states;
- the iPad "no client selected" pane.

## Goals & User Stories

- As Aya, I open a client card and tap to call, WhatsApp or open their Instagram.
- As Aya, I see at a glance how many tattoos a client has had, the income from their completed appointments, and
  their next appointment (empty until those features exist).
- As Aya, I fix a client's details from their card.
- As Aya, I delete a client. Deleting is soft, so nothing linked breaks and both devices stay in sync.
- As Aya, on the iPad I see the list and the card side by side.

## Acceptance Criteria

1. AC1: Open: on iPhone, tapping a list row opens the card at `/clients/{id}` (back returns to the list). On iPad
   (width ≥ 768), it shows the card in the side pane and highlights the row. With no client selected, the pane shows
   "בחרו לקוח מהרשימה". The route is inside the signed-in guard and the app lock.
2. AC2: Header: avatar initial, name, and "לקוח/ה מאז <Hebrew month> <year>" from `createdAt` in Asia/Jerusalem
   (e.g. "לקוח/ה מאז מרץ 2026"). There is a phone chip and an Instagram chip (`@handle`), each shown only when the
   field is set, as isolated LTR runs.
3. AC3: Contacts: the phone chip opens a sheet with "התקשרות" (`tel:` the number), "וואטסאפ" (`https://wa.me/` with the
   number in international form, a leading `0` becoming `972`) and "ביטול". The Instagram chip opens
   `https://instagram.com/<handle>`. A link that can't open shows an error toast.
4. AC4: Summary: `GET /clients/{id}/summary` returns `{ tattooCount, completedIncomeAgorot, nextAppointmentAt }`, which
   is `0`, `0`, `null` until the later epics; unknown or soft-deleted → 404 `not_found`. The card shows the tiles
   "קעקועים שבוצעו" and "הכנסות לפי תורים שהסתיימו" (money via `formatMoney`, e.g. "0 ₪"), plus next appointment
   "אין תור קרוב" (a line on iPhone, a third tile on iPad, as in the mockups).
5. AC5: Tabs: "קעקועים", "הצעות מחיר" and "הערות" (the design-system `.tabs`), with " · N" shown only when N > 0, and
   "קעקועים" selected first. The empty states are "עדיין אין קעקועים" and "עדיין אין הצעות מחיר". "הערות" shows the
   client's notes, or "אין הערות".
6. AC6: Edit: "עריכת פרטים" opens the client-list modal ("עריכת לקוח") prefilled. Saving updates the card and the
   list. A 409 behaves as client-list AC3 (toast + form reloads).
7. AC7: Delete: "עוד פעולות" → "מחיקת לקוח" → a confirmation "למחוק את <name>?" ("הלקוח יוסר מהרשימה ומהחיפוש.")
   with "ביטול" / "מחיקה" (destructive). `DELETE /clients/{id}` → 204 and sets `deleted_at` (the row stays). It is
   idempotent: an unknown or already-deleted id is also 204. Afterwards the client is gone from the list and search,
   and GET → 404. The app shows the toast "הלקוח נמחק", and either returns to the list (iPhone) or clears the pane
   (iPad). Offline → error toast, nothing queued.
8. AC8: Gone elsewhere: a card whose client was deleted on the other device (GET → 404) shows "הלקוח לא נמצא" with
   "חזרה לרשימה" (iPhone), or clears the pane (iPad). The list refreshes.
9. AC9: `DELETE /clients/{id}` and `GET /clients/{id}/summary` require the owner bearer token (401 `unauthorized`).
10. AC10: Design: the card matches `ClientCard.html` and the iPad split matches `ClientCard.ipad.html`. Styles come
    only from tokens, with logical start/end; money uses "הכנסות לפי תורים שהסתיימו". The consent row and the
    "הצעת מחיר" / "קביעת תור" buttons are left out (later specs). Aya approves screenshots of the card (iPhone,
    iPad), the contact sheet, the delete confirmation, and the empty, not-found and no-selection states.

## Technical Approach

- **API (`client/`)**:
  - `DELETE /clients/{id}` in `ClientController`: `@ResponseStatus(NO_CONTENT)` and
    `writes.softDelete(Client.class, id)`, copied from `AttachmentController.delete`. It is idempotent, and the
    list/search queries already skip `deleted_at`.
  - `GET /clients/{id}/summary` returns a `ClientSummary` record from a small `ClientSummaryService` that loads the
    live client (404 via `VersionedWrites.get` semantics) and returns `0` / `0` / `null`. Later epics fill the
    service without changing the contract.
- **Mobile data**:
  - `src/api/clients.ts` adds `deleteClient(api, id)` and `getClientSummary(api, id)` (+ a `ClientSummary` type).
  - `src/features/clients/card/useClientCard.ts` holds:
    - `useClient(id)` with key `['clients', 'detail', id]`;
    - `useClientSummary(id)` with key `['clients', 'summary', id]`;
    - `useDeleteClient()`: invalidates `clientsKey` and removes the detail query; offline → toast.

    These keys sit under `clientsKey`, so the existing save invalidation refreshes them too.
- **Mobile UI (`src/features/clients/card/`)**:
  - `ClientCard` (header, chips, stats, tabs, tab bodies) is shared by the iPhone route and the iPad pane.
  - `ContactSheet` and `DeleteClientDialog` are built on the `src/ui` `Modal`, not `Alert`, which does nothing on web.
  - Links use `Linking.openURL` from `expo-linking` (already installed).
  - Phone → WhatsApp number: digits only, and a leading `0` becomes `972`.
- **Shared UI (`src/ui`)**:
  - `Tabs.tsx` ports the design-system `.tabs`.
  - `Icon.tsx` gains phone, whatsapp, instagram, edit, more and trash, from the mockups' inline SVGs.
  - `hebrewDate.ts` gains `formatMonthYear(iso)`, reusing `MONTHS` and the Asia/Jerusalem day.
- **Routing**:
  - `app/clients/[id].tsx` renders `ClientCard` and is registered as `<Stack.Screen name="clients/[id]">` inside the
    signed-in `Stack.Protected` in `app/_layout.tsx`.
  - `(tabs)/clients.tsx`:
    - row tap → `router.push('/clients/<id>')` when narrow, `setSelected(id)` when wide;
    - wide = width ≥ 768 (reuse `WIDE_MIN_WIDTH` from `ClientsList.tsx`);
    - the list pane is one third wide with the card beside it (per the `ClientCard.ipad.html` grid);
    - the edit modal opens from the card.
- **Tests (TDD)**:
  - `ClientIT` gets delete and summary cases (following the existing ones).
  - `__tests__/api/clients.test.ts` covers the new helpers.
  - A new `__tests__/clientCard.test.tsx` mocks fetch, `expo-linking` and `expo-router`, as `clients.test.tsx` does.
- **PRs**: stacked, ≤ 8 files each.

## Out of Scope

- The consent row and `consent_event` (`marketing-consent`).
- The tattoo list, photos and upload (Completed tattoos & gallery epic). The quote list and the "הצעת מחיר" / "קביעת
  תור" actions belong to the Calculator & quotes and Calendar epics.
- Restoring a deleted client, and hard delete.
- Real summary numbers (later epics fill `ClientSummaryService`).

## Standards Applied

- [global/git-workflow](../../../../../../standards/global/git-workflow.md): branch `feat/clients/client-card`,
  commits scoped `clients`, stacked PRs via the pr skill.
- [frontend/design-fidelity](../../../../../../standards/frontend/design-fidelity.md): copy the cited pages; derived
  screens from components + tokens only; numbers as isolated LTR runs (`Num`, `Field ltr`); screenshots on iPhone and iPad.

## Changelog

| Date | Author | Type | Change | Ref |
|---|---|---|---|---|
| 2026-11-19 | david-schwartzman | created | Initial shaping | — |
| 2026-11-24 | david-schwartzman | deviation | T11 compared the card, contact sheet, more-actions sheet, delete confirmation, empty card, "הלקוח לא נמצא" and the iPad split (card pane + "בחרו לקוח מהרשימה") with `ClientCard.html` / `ClientCard.ipad.html` from **web-preview** screenshots at iPhone (393×852) and iPad (1180×820) sizes (`visuals/client-card-iphone-web.png`, `visuals/client-card-ipad-web.png`), not the iOS Simulator (no Xcode on the dev machine). Fixed: the stat label's wrapped line was 22px instead of the mockup's 19px (`.label` at `line-height: normal`); the not-found screen padded its header twice and still offered "עריכת פרטים" / "עוד פעולות" for a client that no longer exists. Expected differences: the mockups' tattoo list, consent row, tab counts and iPad "הצעת מחיר" / "קביעת תור" are later specs (AC5, AC10); the iPad screen keeps the app shell's tab bar; the iPhone "אין תור קרוב" line has no clock icon (it would add a seventh icon to `Icon.tsx`, beyond the six this spec covers); the iPad pane shows "עריכת פרטים", which `ClientCard.ipad.html` doesn't, because AC6 needs editing from the card on iPad too; on web there's no status-bar or notch inset. **Owed:** an iPhone and iPad simulator/device check, and Aya's approval (T12). | T11 |
| 2026-11-24 | david-schwartzman | approval | Aya approved the card (iPhone, iPad), the contact sheet, the more-actions sheet, the delete confirmation, and the empty, not-found and no-selection states from the T11 web-preview screenshots (`visuals/client-card-iphone-web.png`, `visuals/client-card-ipad-web.png`), taken of the code at 89e79dd (AC10). The simulator/device check is still owed. | T12 |
