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
  /**
   * `.field` (label-to-input gap 6), `label` 13px/600 muted, `.input` 16px text with 14px side padding
   * and an 8px gap, `.unit` 14px muted, `.helper` 13px (error: 600, with a 14px warning glyph).
   */
  field: {
    gap: 6,
    labelFontSize: 13,
    inputFontSize: 16,
    inputPaddingHorizontal: 14,
    inputGap: 8,
    unitFontSize: 14,
    helperFontSize: 13,
    helperGap: 4,
    helperIconSize: 14,
  },
  /** `.search`: 12px side padding, 8px gap, 20px glyph, 16px text, surfaceAlt fill. */
  search: { paddingHorizontal: 12, gap: 8, iconSize: 20, fontSize: 16 },
  /**
   * `.seg`: 3px inset, 2px gap; segments 38px tall, 6px side padding, 14px/500 (selected 700 primary
   * on surface with the card shadow), optional 11px/400 muted sub-label.
   */
  segmented: { padding: 3, gap: 2, minHeight: 38, paddingHorizontal: 6, fontSize: 14, subFontSize: 11 },
  /** `.chip`: 34px tall, 10px side padding, 13px, 6px gap (selected 600 on primary); `.chips` wrap with 8px gaps. */
  chip: { minHeight: 34, paddingHorizontal: 10, fontSize: 13, gap: 6, groupGap: 8 },
  /** `.status` / `.dot`: 10px dot, 6px gap, 13px/500 label. */
  status: { dotSize: 10, gap: 6, fontSize: 13 },
  /** Opacity while pressed — iOS's standard touch feedback (the mockups show no pressed state). */
  pressedOpacity: 0.7,
} as const;
