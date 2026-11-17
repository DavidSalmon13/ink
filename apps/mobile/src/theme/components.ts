/**
 * Component metrics that design-system.html's CSS sets but tokens.json doesn't carry.
 * Kept here, in one place, so components never hold their own literals (design-fidelity).
 * Values that do exist in tokens.json are referenced from the generated module instead.
 */
export const componentMetrics = {
  /** `.btn`: 16px / 600, 20px side padding, 8px icon gap; `.btn-sm`: 15px, 14px padding; `.btn-ghost`: 8px padding. */
  button: {
    fontSize: 16,
    fontSizeSmall: 15,
    paddingHorizontal: 20,
    paddingHorizontalSmall: 14,
    paddingHorizontalGhost: 8,
    gap: 8,
    iconSize: 20,
    iconSizeGhost: 18,
  },
  /** `.iconbtn`: 44×44 round, glyph 22px. */
  iconButton: { iconSize: 22 },
  /** Opacity while pressed — iOS's standard touch feedback (the mockups show no pressed state). */
  pressedOpacity: 0.7,
} as const;
