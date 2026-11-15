# Ink design system — Calm pro · מקצועי ושקט

> Chosen on 2026-11-15 from the three directions explored on the `design/options` branch (option B).
> Source of truth for UI work: `design/design-system/tokens.json` + `design-system.html`, and the screen mockups in `design/pages/` (`<Screen>.html`, `<Screen>.ipad.html`). In the file table below, `pages/…` means `design/pages/…`.

**Idea.** A modern CRM that happens to be warm. One sans family (Heebo) in a tight 4px rhythm, white cards on an off-white ground, brown as the only accent, and cream kept for secondary panels. A permanent **tab bar** (בית, מחשבון, סקיצות, לקוחות, יומן) makes the four main actions one tap from anywhere. Secondary areas sit on home under "עוד".

**Personality:** efficient, tidy, familiar from tools like booking apps. **Density:** high (52px rows, 16px padding, 44px controls, 3-column sketch grid, 50px calendar hours). **Components:** 6–12px radii, subtle 1px shadows, raised selected segment. **Client mode:** a brown header band labelled "מצב לקוח" with the exit pill, and large single-image cards on cream instead of the white owner UI.

## Patterns borrowed (patterns only, not brands)

| Pattern | From | Why it fits a solo tattoo artist |
|---|---|---|
| Persistent bottom tab bar for the main modules | Square Appointments / Fresha mobile | She switches between calendar, client and calculator during a consultation; one tap matters. |
| Upcoming list with a time column, duration underneath and a colored rule | Fresha / Vagaro "today" lists | Time is the first thing she scans; duration answers "do I have a gap". |
| Dense day timeline (shorter hours) + compact appointment blocks | Apple Calendar / Square calendar | More of the day fits above the fold on iPhone. |
| Record header with stat tiles, tabs underneath | Attio / HubSpot | Same as A, more compact: on iPad, three tiles (tattoos, income, next appointment). |
| List + detail split on iPad, list on the leading (right, in RTL) side | Pipedrive / Attio | She can step through clients without going back and forth. |
| Filter as a segmented control with counts | Pipedrive filters / Booksy | "פנויה 4" tells her the state of the library before she scrolls. |

## Strengths for Aya
- Fastest to operate: everything important is one tap away, and more fits on each screen.
- Very predictable for engineers: closest to stock iOS patterns, and the cheapest to build and keep consistent.
- Numbers are crisp in a single sans with tabular figures, so the calculator and My Data read well.

## Weaknesses
- The least "fine line": warm, but could pass for any booking app, so the brand comes through only in color.
- Higher density can feel busy for someone working between sessions with gloves just off.
- 44px controls are at the minimum; fine for fingers, less forgiving than A or C.

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
