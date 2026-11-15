# Design Fidelity

The design in `design/` is the source of truth for every screen. Frontend work copies it;
it doesn't reinterpret it.

## Sources

- `design/design-system/tokens.json`: every color, font size, spacing, radius, shadow, z-layer and touch size
- `design/design-system/design-system.html`: component look and states (buttons, inputs, modal, toasts, empty/loading/error)
- `design/pages/<Screen>.html` (iPhone 393×852) and `<Screen>.ipad.html` (iPad landscape 1180×820)
- `design/design-system/README.md`: notes for the React Native build

## Specs (`/shape-spec`)

- Every spec that touches UI lists the matching `design/pages/*.html` file(s) in `references.md`
  under **Design**, and its UI tasks name the page they implement.
- If a screen or state has no mockup, say so in the spec and either:
  build it from existing components and tokens only, **or** add the mockup to `design/` first.
  Never invent a new visual style inside a task.

## Implementation

- Styles come only from `tokens.json` (via the app's theme module). No hard-coded hex colors, font sizes,
  spacing or radii in components.
- Reuse the design-system components; a new component must look like it belongs on `design-system.html`.
- Right-to-left: logical sides only (`start`/`end`, `marginStart`, `paddingEnd`), never `left`/`right`.
  Numbers, times and ₪ amounts go in their own `<Text>` (isolated left-to-right runs).
- Use the Hebrew wording from the mockup exactly (e.g. "הכנסות לפי תורים שהסתיימו").
- Support light and dark mode with the tokens' paired values.
- Status is never shown by color alone: every status dot has a text label.

## Done means

A UI task can be ticked only when:

1. The screen matches its cited page in layout, hierarchy, spacing, typography and Hebrew text,
   on iPhone, and on iPad when an `.ipad.html` exists.
2. Every state the mockup or design system shows works: empty, loading, error, disabled, and modal open.
3. A screenshot from the simulator is compared side by side with the mockup, and any deviation
   is either fixed or recorded in the spec's Changelog with a reason.
