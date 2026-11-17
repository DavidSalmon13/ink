/**
 * Component metrics that design-system.html's CSS sets but tokens.json doesn't carry.
 * Kept here, in one place, so components never hold their own literals (design-fidelity).
 * Values that do exist in tokens.json are referenced from the generated module instead.
 */
export const componentMetrics = {
  /** `.btn`: 16px / 600, 20px side padding, 8px icon gap; `.btn-sm`: 15px, 14px padding; `.btn-ghost`: 8px padding; ghost and small buttons use an 18px glyph. */
  button: {
    fontSize: 16,
    fontSizeSmall: 15,
    paddingHorizontal: 20,
    paddingHorizontalSmall: 14,
    paddingHorizontalGhost: 8,
    gap: 8,
    iconSize: 20,
    iconSizeSmall: 18,
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
  /** `.row` trailing chevron: 18px muted glyph. (Row height/padding/gap come from spacing tokens.) */
  row: { chevronSize: 18 },
  /** `.avatar`: 44px circle, 16px/700 initial on primaryTint. */
  avatar: { size: 44, fontSize: 16 },
  /** `.badge`: 12px/600 pill on primaryTint. (Padding comes from spacing tokens.) */
  badge: { fontSize: 12 },
  /** Home.html `.section-h h2`: 13px/700, 0.6 letter-spacing, muted. (Margins come from spacing tokens.) */
  sectionHeader: { fontSize: 13, letterSpacing: 0.6 },
  /**
   * `.modal`: 14px radius, 760px max height; `.modal-h` 12/8 top/bottom, 20 start, 8 end; `.modal-b`
   * 4/20/16 with 12px gaps; `.modal-f` 10px gap, 14/20/20, hairline top border. Width caps are
   * tokens.json layout.modalMaxWidth; spacing-token values are used where they match.
   */
  modal: { radius: 14, maxHeight: 760, footerGap: 10, footerPaddingTop: 14 },
  /**
   * `.toast`: 10px gap, 15px/500, 20px glyph, inline action 700 with 6px start margin (padding 12/16 and
   * the raised shadow come from tokens). Durations aren't in the design: long enough to read a short line.
   */
  toast: { gap: 10, fontSize: 15, iconSize: 20, actionGap: 6, durationMs: 4000, errorDurationMs: 6000 },
  /**
   * Home.html `.tabbar`: 8px top/side padding, items 60px min wide with a 3px icon-label gap,
   * 24px glyphs, 11px/500 muted labels (active 700 primary). The mockup's 30px bottom padding is the
   * home-indicator area, so the real bar uses the bottom safe-area inset instead.
   */
  tabBar: { padding: 8, itemMinWidth: 60, itemGap: 3, iconSize: 24, fontSize: 11 },
  /**
   * Home.html: `.top` 56px min header with 4/12 padding; `.overline` date at 700 (the page's class,
   * bolder than the scale's 600); `.tile` 92px min, 12px radius, 12/2 padding, 6px gap, 12px/600 label;
   * `.well` 44px, 10px radius, 24px glyph; `.mini` 52px row, 12px padding, 10px gap, 20px glyph,
   * 14px/500 label; both grids 8px gaps.
   */
  home: {
    headerMinHeight: 56,
    tileMinHeight: 92,
    tilePaddingVertical: 12,
    tilePaddingHorizontal: 2,
    tileGap: 6,
    tileFontSize: 12,
    wellSize: 44,
    wellRadius: 10,
    wellIconSize: 24,
    miniPaddingHorizontal: 12,
    miniGap: 10,
    miniIconSize: 20,
    miniFontSize: 14,
    gridGap: 8,
  },
  /**
   * `.st` states: 200px min height, 10px gap (16px padding from tokens); empty art 64px; error glyph
   * 32px; `.skel` bars 14px tall, 4px radius, at 70% / 90% / 50% width.
   */
  state: {
    minHeight: 200,
    gap: 10,
    artSize: 64,
    errorIconSize: 32,
    skeletonHeight: 14,
    skeletonRadius: 4,
    skeletonWidths: ['70%', '90%', '50%'],
  },
  /** Opacity while pressed — iOS's standard touch feedback (the mockups show no pressed state). */
  pressedOpacity: 0.7,
} as const;
