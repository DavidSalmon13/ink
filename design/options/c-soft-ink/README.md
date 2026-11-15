# Option C — Soft ink · דיו רך

**Idea.** Friendly and tactile: rounded cards that sit on the cream ground with soft shadows, pill buttons and segments, tinted icon wells, and one rounded sans (Rubik) whose soft terminals echo a fine-line drawing. A **floating pill tab bar** gives one-tap access to the main actions; secondary areas are pills on home. The calendar tile on home is filled brown, the one place she goes most.

**Personality:** warm, approachable, a little playful. **Density:** medium (60px rows, 20px padding, 52px controls). **Components:** 12–26px radii, soft elevation instead of borders, pill tabs on the client card. **Client mode:** the whole screen turns brown, with cream sketch cards, a lock badge and an exit pill. It's clearly a different, safe space.

## Patterns borrowed (patterns only, not brands)

| Pattern | From | Why it fits a solo tattoo artist |
|---|---|---|
| Floating tab bar with a highlighted current item | Booksy / modern iOS apps | Same one-tap reach as B, but lighter on screen and in keeping with the soft identity. |
| Upcoming appointments as individual cards with a time "chip" | Fresha / Booksy client-facing lists | Each appointment reads as a person, not a row, which suits a one-chair studio. |
| Floating "+ תור חדש" button over the calendar | Square Appointments / Google-style FAB | Adding an appointment is always reachable with the thumb, and still opens the centered modal. |
| Pill tabs (קעקועים · הצעות מחיר · הערות) on the record | Attio / HubSpot tabs, restyled | Large touch targets; clear which tab is on. |
| Week strip + day timeline, mini-month sidebar on iPad | Apple Calendar | Familiar on both devices. |
| Status filter with counts as a pill segmented control | Pipedrive / Booksy filters | Quick state check of the library. |

## Strengths for Aya
- Most comfortable to touch: 52px controls, big tiles, generous pills. Good between sessions and on the iPad held in one hand.
- Warm and clearly branded through the cream/brown palette and soft forms, without A's density cost.
- One-tap navigation (like B) together with a personality closer to A.

## Weaknesses
- Shadows and rounded cards take more space than B; the sketch grid is 2 columns.
- Soft shadows need care in RN (iOS vs Android elevation look different) and in dark mode they're nearly invisible, so dark mode relies on surface steps.
- Rubik's rounder voice is less "editorial" than A's serif; the fine-line feel comes mostly from the drawings.

## Files

| File | What it is |
|---|---|
| `tokens.json` | Colors (light + dark), type scale, spacing, radii, border widths, shadows (RN `shadow*` + Android `elevation`), z-layers, touch sizes, layout constants. Plain px numbers only. |
| `design-system.html` | Visual sheet: swatches, computed WCAG contrast for light and dark, type scale with Hebrew samples, buttons, inputs (incl. error), search, segmented control, chips, status dots, cards, list rows, navigation, centered modal ("לקוח חדש"), toasts, empty/loading/error states. |
| `pages/Home.html` | Four main actions + the next 3 appointments (name, time, tattoo). No prices or money totals. Secondary nav: גלריית עבודות, הנתונים שלי, שיווק והודעות, הגדרות. |
| `pages/Calculator.html` | Two-tattoo visit: tattoo 1 collapsed to a summary, tattoo 2 open. "לקוחות" search at the top with "לקוח חדש"; "אפשרויות נוספות" open (extra needle, ₪95 discount, manual price). Totals follow `data-model.md`: 120 min → 845 + 200 design + 50 needle − 95 = 1,000 ₪. |
| `pages/ClientCard.html` | Tattoos tab: one tattoo with no photo yet ("העלאת תמונה"), contact chips, tattoo count, "הכנסות לפי תורים שהסתיימו", marketing consent. |
| `pages/Calendar.html` | iPhone day view, week strip, now line, one cancelled appointment (excluded from income). |
| `pages/CalendarNewAppointment.html` | Same screen with the **centered** "תור חדש" modal over a dimmed backdrop, pre-filled from a saved quote. |
| `pages/SketchLibrary.html` | One grid, status filter (הכול/פנויה/שמורה/בוצעה), status dot + label, no prices, entry to client mode. |
| `pages/ClientMode.html` | Sketches only, no management controls, no client names on reserved sketches; exit needs Face ID or the passcode. |
| `pages/Calendar.ipad.html`, `CalendarNewAppointment.ipad.html` | iPad landscape 1180×820 week view + the same centered modal. |
| `pages/ClientCard.ipad.html` | iPad split view: client list on the start (right) side, card on the other. |

All pages: `dir="rtl" lang="he"`, inline CSS, Google Fonts only. Sample people and data are fictional.

## Notes for the React Native build

- Layout uses logical sides (`margin-inline-start` etc.) → use `start`/`end` in RN, never `left`/`right`.
- Numbers, times and ₪ amounts are wrapped as isolated LTR runs (`.num`); in RN wrap them in their own `<Text>` and check bidi on device.
- Nothing depends on blur, gradients or CSS-only effects. The iPad week grid draws its hour lines with a CSS gradient in the mockup only; in RN they are plain 1px Views.
- Status dots always come with a text label, so color is never the only signal.
