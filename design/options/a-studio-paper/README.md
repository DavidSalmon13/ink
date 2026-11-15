# Option A — Studio paper · נייר סטודיו

**Idea.** The app as Aya's studio notebook: warm paper, editorial serif headings (Frank Ruhl Libre) over a quiet sans body (Assistant), hairline rules and a small fine-line ornament. Lots of air, few borders, no shadows except on the modal. Navigation is **hub-and-spoke**: no tab bar; home is the center, and every screen returns to it with a back button. This keeps the four big actions on home as *the* way in, the way the spec describes it.

**Personality:** calm, crafted, closest to a tattoo-studio brand. **Density:** low (64px rows, 24px screen padding, 50px controls). **Components:** square-ish (2–8px radii), outlined segmented controls with filled selection, outlined cards. **Client mode:** inverted to espresso with cream line art, like a gallery wall. It cannot be mistaken for owner mode.

## Patterns borrowed (patterns only, not brands)

| Pattern | From | Why it fits a solo tattoo artist |
|---|---|---|
| Week strip above a single-day timeline, with a red "now" line | Apple Calendar (iPhone) | Aya works one day at a time; the strip shows which days are booked without leaving the day. |
| Mini-month + today's list in a sidebar, week grid beside it | Apple Calendar (iPad) | On the iPad she plans ahead; the sidebar keeps "today" visible while she looks at the week. |
| Appointment block = client name + service on a light fill; cancelled = dashed outline | Fresha / Square Appointments | Shows who and what at a glance; the cancelled block stays visible but clearly isn't counted. |
| New-appointment fields in the order client → saved quote → date/time → duration → price | Square Appointments / Vagaro booking forms | Matches her flow: pick the person, reuse the quote, and only then choose the slot. |
| Record header (name, contact, 2 key stats) above tabs | Attio / HubSpot record pages | One look answers "who is she, how many tattoos". The tabs (קעקועים/הצעות מחיר/הערות) keep the history out of the way. |
| Search-first client picker with an inline "new" action | HubSpot / Pipedrive quick add | In the calculator she either finds the client or creates one in a short modal without losing the quote. |
| Empty state = one drawing + one primary action | Square / Booksy empty states | Keeps empty screens warm and points to the next step. |

## Strengths for Aya
- Most distinctive, and closest to the fine-line identity the spec asks for. It feels like *her* studio, not generic software.
- Calm and roomy; little visual noise between appointments.
- The home hub matches the spec's "four big actions" literally, and client mode is unmistakable.

## Weaknesses
- No tab bar means one extra tap to jump between calendar and clients (always back to home first).
- Serif Hebrew at small sizes is less legible, so it's limited to headings and the price, which takes discipline in implementation.
- The airy spacing makes long screens (calculator, client card) scroll more.

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
