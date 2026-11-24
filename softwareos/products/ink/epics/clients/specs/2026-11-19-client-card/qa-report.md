# QA Report — Client Card

> Spec: spec.md
> Date: 2026-11-24 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Open: iPhone row → `/clients/{id}`, iPad side pane + highlight, "בחרו לקוח מהרשימה", route inside the guard and lock | pass | `clientCard.test.tsx` "iPhone › a list row opens the card route", "iPhone › the route shows the card…", "iPad split › shows the list and the card side by side…"; `app/_layout.tsx:70,74,77` (AppLockGate → signed-in `Stack.Protected` → `clients/[id]`); `app/(tabs)/clients.tsx:23,34,52`; back = `router.back()` `app/clients/[id].tsx:9`. Observed in the web preview at 393×852 and 1180×820 (`visuals/`) |
| AC2 | Header: avatar, name, "לקוח/ה מאז <month year>" (Asia/Jerusalem), phone and @handle chips only when set, LTR runs | pass | `clientCard.test.tsx` "header › shows the name, …" and "leaves out the chips…"; `ClientCard.tsx:270` (`formatMonthYear`, Asia/Jerusalem in `hebrewDate.ts`); chips use `Num` `ClientCard.tsx:314` |
| AC3 | Phone sheet: התקשרות (`tel:`), וואטסאפ (`wa.me/972…`), ביטול; Instagram opens the profile; error toast on failure | pass | `clientCard.test.tsx` "contacts ›" (3 tests: `tel:0543812290`, `https://wa.me/972543812290`, `https://instagram.com/maya.lines`, `LINK_FAILED_MESSAGE` toast); `card/ContactSheet.tsx`; sheet observed in the web preview |
| AC4 | `GET /clients/{id}/summary` → 0 / 0 / null, 404 for unknown/deleted; tiles + "אין תור קרוב" | pass | `ClientIT.summaryIsEmptyUntilTheLaterEpics`, `ClientIT.summaryOfAnUnknownOrDeletedClientIs404`; `clientCard.test.tsx` "summary ›" ("0 ₪", "אין תור קרוב"); iPad third tile `ClientCard.tsx:337`; money via `Num agorot` → `formatMoney` `ClientCard.tsx:334` |
| AC5 | Tabs קעקועים / הצעות מחיר / הערות, " · N" only when N > 0, empty states, notes or "אין הערות" | pass | `clientCard.test.tsx` "tabs ›" (2 tests); count suffix `ClientCard.tsx:61,213` (inspection; N is 0 until later epics) |
| AC6 | "עריכת פרטים" opens the prefilled "עריכת לקוח" modal; save refreshes card + list; 409 as client-list AC3 | pass | `clientCard.test.tsx` "edit ›"; `clients.test.tsx` "edit ›" (PUT with last-seen version, 409 toast + reload, both opened from the card); save invalidates `clientsKey` (`useClients.ts:67`), which contains the detail/summary keys |
| AC7 | Delete: more actions → confirmation → DELETE 204 soft + idempotent → gone from list/search, GET 404; toast; back / pane cleared; offline toast | pass | `ClientIT.deleteIsSoftAndHidesTheClientEverywhere`, `ClientIT.deleteIsIdempotent`; `clientCard.test.tsx` "delete ›" (3 tests) and "the route … goes back after a delete"; iPad pane clears via `onGone → setSelected(null)` `app/(tabs)/clients.tsx:58` (inspection); confirmation observed in the web preview |
| AC8 | Deleted elsewhere: "הלקוח לא נמצא" + "חזרה לרשימה" (iPhone), pane clears (iPad), list refreshes | pass | `clientCard.test.tsx` "not found ›" (2 tests; the first now also asserts no "עריכת פרטים" / "עוד פעולות"); list invalidation `ClientCard.tsx:109` (inspection); observed in the web preview |
| AC9 | DELETE and summary require the owner token (401 `unauthorized`) | pass | `ClientIT.cardEndpointsRequireTheOwnerToken` |
| AC10 | Design matches ClientCard.html / .ipad.html, tokens only, logical sides, consent row and quote/appointment buttons left out, Aya approves screenshots | pass | T11 compared web-preview screenshots with both mockups (`visuals/client-card-iphone-web.png`, `visuals/client-card-ipad-web.png`); two differences fixed in 89e79dd, the rest recorded in the 2026-11-24 deviation row. Aya approved them (2026-11-24 approval row, T12). Inspection: no hex colors or left/right props in `ClientCard.tsx`, `Tabs.tsx`, `app/clients/[id].tsx`; metrics in the named `cardMetrics` block; consent and "הצעת מחיר" / "קביעת תור" absent |

## Checks Run

- build: `./gradlew build --rerun-tasks` (apps/api) — pass
- lint: `npm run lint` (apps/mobile) — pass
- typecheck: `npm run typecheck` (apps/mobile) — pass
- tests: `./gradlew build --rerun-tasks` (apps/api) — pass (105 passed, 0 failed; ClientIT 22/22)
- tests: `npx jest` (apps/mobile) — pass (155 passed, 0 failed, 22 suites)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | Running one Jest file on its own (e.g. `npx jest __tests__/clientCard.test.tsx`) prints its results, then never exits. The full `npx jest` run exits normally. Seen again this run; it predates this spec. The likely cause is React Query's 5-minute mutation cleanup timer (unconfirmed) | test infra, `/hotfix` if it bothers CI |

## Notes

- **Device check owed:** AC10's comparison and Aya's approval come from web-preview screenshots, not the iOS Simulator or a device (no Xcode on the dev machine). An iPhone and iPad device check is still owed, as recorded in the Changelog.
- **Since the last QA (2026-11-19):** 89e79dd fixed the stat label line height and the not-found header (double inset, actions hidden); 31d75db added the not-found test assertions and completed the T11 Changelog row.
- **Files outside `> Covers:`** (unchanged since the last run):
  - `src/features/clients/ClientsList.tsx`: an optional `selectedId` row highlight, and an export of the existing `WIDE_MIN_WIDTH` that the spec asks to reuse.
  - `__tests__/clients.test.tsx`: the edit tests now open the modal from the card, since the row tap moved to the card per client-list's Changelog.
- **Hygiene:** all 13 tasks `[x]`. #72–#77 are merged and #78 is open. The commits after #78's (89e79dd, b0ccca5, 31d75db) still need to be pushed. `spec.md` and `epic.md` still say `in-progress`; mark the spec done once the last PR merges.
