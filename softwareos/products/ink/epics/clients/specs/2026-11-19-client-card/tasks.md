# Tasks — Client Card

> Epic: clients
> Spec: 2026-11-19-client-card
> Branch: feat/clients/client-card
> PR: https://github.com/DavidSalmon13/ink/pull/72 · https://github.com/DavidSalmon13/ink/pull/73 · https://github.com/DavidSalmon13/ink/pull/74 · https://github.com/DavidSalmon13/ink/pull/75 · https://github.com/DavidSalmon13/ink/pull/76 · https://github.com/DavidSalmon13/ink/pull/77 · https://github.com/DavidSalmon13/ink/pull/78 (stacked, merge in this order)

## Tests first (TDD)

- [x] T1 Failing ClientIT cases: DELETE → 204, row kept with deleted_at, idempotent (unknown / repeat → 204), then excluded from list + search and GET → 404; summary 0 / 0 / null, 404 for unknown or deleted; 401 without a token on both (AC4, AC7, AC9)
- [x] T2 Failing mobile tests: `__tests__/api/clients.test.ts` (deleteClient, getClientSummary) and `__tests__/clientCard.test.tsx` (header + "לקוח/ה מאז", chips only when set, contact sheet tel / wa.me / Instagram URLs, summary tiles + "אין תור קרוב", tabs + empty states + notes, edit opens the prefilled modal, delete confirm → DELETE → toast, offline delete toast, 404 "הלקוח לא נמצא", iPhone row → card route, iPad split selection + empty pane) (AC1–AC8)

## API

- [x] T3 `DELETE /clients/{id}` in ClientController via `VersionedWrites.softDelete`: T1 delete cases green (AC7, AC9)
- [x] T4 `ClientSummary` + `ClientSummaryService` + `GET /clients/{id}/summary`: T1 green (AC4, AC9)

## Mobile

- [x] T5 src/ui: `Tabs.tsx` per design-system `.tabs`; phone / whatsapp / instagram / edit / more / trash icons in `Icon.tsx`; `formatMonthYear` in `hebrewDate.ts` (AC2, AC5, AC10)
- [x] T6 `src/api/clients.ts` deleteClient + getClientSummary; `features/clients/card/useClientCard.ts` (useClient, useClientSummary, useDeleteClient) (AC4, AC7, AC8)
- [x] T7 `ClientCard` per ClientCard.html: header, chips, summary tiles, tabs + empty states, notes (AC2, AC4, AC5, AC10)
- [x] T8 ContactSheet (call / WhatsApp) + Instagram link via expo-linking; more-actions → DeleteClientDialog (AC3, AC7)
- [x] T9 `app/clients/[id].tsx` registered in app/_layout.tsx (signed-in guard); iPhone row → card; edit from the card via ClientFormModal; not-found state (AC1, AC6, AC8)
- [x] T10 iPad split in `(tabs)/clients.tsx` per ClientCard.ipad.html: list pane + card pane, selection highlight, "בחרו לקוח מהרשימה"; T2 green (AC1, AC10)

## Verification

- [x] T11 Screenshots on iPhone + iPad (simulator/device, or web preview at those sizes with a device check owed) vs the cited mockups; fix or record each deviation in the Changelog (AC10)
- [x] T12 HUMAN: Aya approves the card, contact sheet, delete confirmation, and the empty / not-found / no-selection states (AC10)
- [x] T13 Run QA against acceptance criteria (qa skill)
