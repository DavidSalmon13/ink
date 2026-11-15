# Option D — Soft ink + warmth · דיו רך וחם

**Idea.** Option C's structure and components (rounded cards, floating tab bar, 52px controls, brown client mode) with more character. Added after the first review, in response to "do CRMs have to look this gray?"

Top CRMs (Attio, HubSpot, Fresha for business) keep the interface mostly neutral and use color only for meaning. D follows that rule: the frame stays cream and quiet. The warmth comes from the content and a few chosen moments, not from painting surfaces.

**What changed from C**

| Change | Where | Why |
|---|---|---|
| Serif titles: Frank Ruhl Libre for display, title and price; Rubik stays for body and controls | Every screen | The biggest gain in character for the smallest change; the serif is limited to large sizes, where Hebrew serif stays legible. |
| Second accent, mauve `#7A5472` (light) / `#D6AECB` (dark), with a tint | "הבא בתור" badge, "חדשה" on a new sketch, selected day, now-line, active tab | It marks "now / new / here". It is deliberately not green, orange or red, so the status dots keep their meaning. Contrast is 5.9:1 on surface (light) and 7.7:1 (dark). |
| Featured next appointment with its sketch | Home | Puts the actual artwork on the first screen with no prices and nothing invented: it is the sketch linked to the next appointment. |
| Tattoo photos as large 2-column tiles | Client card | The finished work is the most meaningful content in the record. |
| Larger art in the sketch tiles, serif sketch names | Sketch library, client mode | The library reads as a portfolio. |
| Fine-line drawings as ornaments | Home header, client mode header | Brand moments where there is room for them, never inside working controls. |

Tokens: `colors.*.accent / onAccent / accentTint` were added; everything else is inherited from C.

## Patterns borrowed
Same as Option C (see `../c-soft-ink/README.md`). In addition: neutral frame + a single accent used for meaning, as in Attio and HubSpot's product UI (HubSpot keeps its orange for primary actions only).

## Strengths for Aya
- Keeps C's one-tap navigation and large touch targets.
- Feels like a studio and not a generic CRM, closest to A's brand strength without A's costs.

## Weaknesses
- Two font families to load and maintain (still within Google Fonts / Expo).
- One more color to govern: the accent must stay rare, or it starts competing with the brown primary.

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
