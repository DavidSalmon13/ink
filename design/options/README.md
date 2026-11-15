# Ink — three design directions

Design files only (no app code). **Option D (`d-soft-ink-warm/`) was added after the first review**: C's structure with serif titles, a mauve accent for now/new, larger art and drawn moments. See its README for the reasoning, including how top CRMs use color. Each option has `tokens.json`, `design-system.html`, `pages/` (iPhone 393×852 + iPad 1180×820) and its own `README.md` with pattern credits. All screens use the same fictional sample data and Hebrew wording from `AYA_INK_new.docx`, so the differences you see are design choices, not content.

| | **A · Studio paper** `a-studio-paper/` | **B · Calm pro** `b-calm-pro/` | **C · Soft ink** `c-soft-ink/` |
|---|---|---|---|
| Personality | Editorial notebook, fine-line ornament | Modern CRM, tidy and quiet | Friendly, tactile, rounded |
| Typography | Frank Ruhl Libre (serif) headings + Assistant | Heebo throughout, tabular numbers | Rubik throughout |
| Density | Low: 64px rows, 50px controls | High: 52px rows, 44px controls | Medium: 60px rows, 52px controls |
| Components | Hairline outlines, 2–8px radii, no shadows | Light cards, 6–12px radii, 1px shadows | Soft-shadow cards, 12–26px radii, pills |
| Navigation | Hub-and-spoke: home is the center, back buttons, no tab bar | Fixed tab bar: home + 4 main actions | Floating pill tab bar: home + 4 main actions |
| Secondary nav | 2×2 text links on home | "עוד" cards on home | Pills on home |
| Client mode | Espresso "gallery wall", cream line art | Brown header band + large cards on cream | Whole screen turns brown, cream cards |
| Sketch grid (iPhone) | 2 columns | 3 columns | 2 columns |
| Brand fit ("fine line", warm) | ★★★ | ★ | ★★ |
| Speed of use | ★ | ★★★ | ★★ |
| Touch comfort | ★★ | ★ | ★★★ |
| Build cost in RN | Low (no shadows) | Lowest (stock patterns) | Medium (cross-platform shadows) |

Shared across all three (from the spec): four main actions + next 3 appointments on home with no money; the centered "תור חדש" modal with a dimmed backdrop on iPhone and iPad; the "לקוחות" search + "לקוח חדש" at the top of the calculator, with "אפשרויות נוספות" for needles and discounts and copying allowed without a client; status dots green/orange/red with text labels and no prices on sketches; client mode with exit via Face ID or passcode; "הכנסות לפי תורים שהסתיימו" wording; WCAG AA contrast in light and dark (ratios printed in each `design-system.html`).

## Recommendation: **C · Soft ink** (or D, its warmer version)

For one artist who uses the app between sessions, on an iPhone and sometimes an iPad held in one hand, C is the best balance:

- **One-tap navigation** to calculator, sketches, clients and calendar (like B), which A gives up.
- **The largest touch targets** (52px) and the clearest client mode: the whole screen changes color.
- **Warm and branded** without A's scroll length or B's generic CRM feel.

If brand identity matters more to Aya than speed, choose **A**. Its studio feel is the strongest of the three, and adding a tab bar later is easy. **B** is the right call only if she wants a dense, data-first tool.

Pick one and I'll promote it to `design/design-system/` and `design/pages/`. If you like C but want A's serif for screen titles and the price, that's a small token change (`typography.scale.display/title1/price`).
