# QA Report — Client Card

> Spec: spec.md
> Date: 2026-11-19 · QA by: david-schwartzman · Mode: setup
> Verdict: PASS WITH NOTES

## Acceptance Criteria

| AC | Criterion | Result | Evidence |
|---|---|---|---|
| AC1 | Open: iPhone row → `/clients/{id}`, iPad side pane + highlight, "בחרו לקוח מהרשימה", route inside the guard and lock | pass | `clientCard.test.tsx` "iPhone › a list row opens the card route", "iPhone › the route shows the card…", "iPad split › shows the list and the card side by side…"; `app/_layout.tsx:70,74,77` (AppLockGate → signed-in `Stack.Protected` → `clients/[id]`); `app/(tabs)/clients.tsx:23,34,52`; back = `router.back()` `app/clients/[id].tsx:9` |
| AC2 | Header: avatar, name, "לקוח/ה מאז <month year>" (Asia/Jerusalem), phone and @handle chips only when set, LTR runs | pass | `clientCard.test.tsx` "header › shows the name, …" and "leaves out the chips…"; `ClientCard.tsx:264` (`formatMonthYear`, Asia/Jerusalem in `hebrewDate.ts`); chips use `Num` `ClientCard.tsx:308` |
| AC3 | Phone sheet: התקשרות (`tel:`), וואטסאפ (`wa.me/972…`), ביטול; Instagram opens the profile; error toast on failure | pass | `clientCard.test.tsx` "contacts ›" (3 tests: `tel:0543812290`, `https://wa.me/972543812290`, `https://instagram.com/maya.lines`, `LINK_FAILED_MESSAGE` toast); `card/ContactSheet.tsx` |
| AC4 | `GET /clients/{id}/summary` → 0 / 0 / null, 404 for unknown/deleted; tiles + "אין תור קרוב" | pass | `ClientIT.summaryIsEmptyUntilTheLaterEpics`, `ClientIT.summaryOfAnUnknownOrDeletedClientIs404`; `clientCard.test.tsx` "summary ›" ("0 ₪", "אין תור קרוב"); iPad third tile `ClientCard.tsx:326-330`; money via `Num agorot` → `formatMoney` |
| AC5 | Tabs קעקועים / הצעות מחיר / הערות, " · N" only when N > 0, empty states, notes or "אין הערות" | pass | `clientCard.test.tsx` "tabs ›" (2 tests); count suffix `ClientCard.tsx:59,207` (inspection; N is 0 until later epics) |
| AC6 | "עריכת פרטים" opens the prefilled "עריכת לקוח" modal; save refreshes card + list; 409 as client-list AC3 | pass | `clientCard.test.tsx` "edit ›"; `clients.test.tsx` "edit ›" (PUT with last-seen version, 409 toast + reload, both opened from the card); save invalidates `clientsKey` (`useClients.ts:67`), which contains the detail/summary keys |
| AC7 | Delete: more actions → confirmation → DELETE 204 soft + idempotent → gone from list/search, GET 404; toast; back / pane cleared; offline toast | pass | `ClientIT.deleteIsSoftAndHidesTheClientEverywhere`, `ClientIT.deleteIsIdempotent`; `clientCard.test.tsx` "delete ›" (3 tests) and "the route … goes back after a delete"; iPad pane clears via `onGone → setSelected(null)` `app/(tabs)/clients.tsx:58` (inspection) |
| AC8 | Deleted elsewhere: "הלקוח לא נמצא" + "חזרה לרשימה" (iPhone), pane clears (iPad), list refreshes | pass | `clientCard.test.tsx` "not found ›" (2 tests); list invalidation `ClientCard.tsx:107-108` (inspection) |
| AC9 | DELETE and summary require the owner token (401 `unauthorized`) | pass | `ClientIT.cardEndpointsRequireTheOwnerToken` |
| AC10 | Design matches ClientCard.html / .ipad.html, tokens only, logical sides, consent row and quote/appointment buttons left out, Aya approves screenshots | not verifiable | Inspection passes: no hex colors or left/right props in the card, tab and route files; metrics in a named `cardMetrics` block from the mockups; consent and "הצעת מחיר" / "קביעת תור" absent. The screenshot comparison (T11) and Aya's approval (T12) are still open |

## Checks Run

- build: `./gradlew build` (apps/api) — pass
- lint: `npx expo lint` (apps/mobile) — pass
- typecheck: `npx tsc --noEmit` (apps/mobile) — pass
- tests: `./gradlew test --rerun` (apps/api) — pass (105 passed, 0 failed; ClientIT 22/22)
- tests: `npx jest` (apps/mobile) — pass (155 passed, 0 failed, 22 suites)

## Issues Found

| # | Severity | Issue | Route |
|---|---|---|---|
| 1 | low | Running one Jest file on its own (e.g. `npx jest __tests__/clients.test.tsx`) prints its results, then never exits ("Jest did not exit one second after the test run has completed"). The full `npx jest` run exits normally. This was already true of `clients.test.tsx` before this spec. The likely cause is React Query's 5-minute mutation cleanup timer (unconfirmed) | test infra, `/hotfix` if it bothers CI |

## Notes

- **Open tasks:** T11 (screenshots against the mockups) and T12 (Aya's approval) are human-gated. Re-run QA after both to clear AC10. The next report then supersedes this one.
- **Design differences T11 should record in the Changelog:**
  - There's no clock icon on the iPhone "אין תור קרוב" line. Adding it means another icon in `Icon.tsx`, beyond the six this spec covers.
  - The iPad pane shows "עריכת פרטים", which `ClientCard.ipad.html` doesn't, because AC6 needs editing from the card on iPad too.
- **Files outside `> Covers:`:**
  - `src/features/clients/ClientsList.tsx`: an optional `selectedId` row highlight, and an export of the existing `WIDE_MIN_WIDTH` that the spec asks to reuse.
  - `__tests__/clients.test.tsx`: the edit tests now open the modal from the card, since the row tap moved to the card per client-list's Changelog.
- **Branch:** no PR yet (`> PR:` not recorded). The branch changes more than 8 files, so the pr skill should split it into stacked PRs.
