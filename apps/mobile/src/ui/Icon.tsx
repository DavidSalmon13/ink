import { Platform } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { useColors, type ColorName } from '@/theme';

type Shape =
  | { kind: 'path'; d: string }
  | { kind: 'circle'; cx: number; cy: number; r: number }
  | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number };

const path = (d: string): Shape => ({ kind: 'path', d });
const circle = (cx: number, cy: number, r: number): Shape => ({ kind: 'circle', cx, cy, r });
const rect = (x: number, y: number, width: number, height: number, rx: number): Shape => ({
  kind: 'rect',
  x,
  y,
  width,
  height,
  rx,
});

/**
 * Glyphs copied path-for-path from design/pages/Home.html, ClientCard.html and design-system.html
 * (24×24 viewBox, 1.5 stroke, round caps/joins, no fill). Not mirrored for RTL — the mockups are
 * already drawn for right-to-left (e.g. `chevron` points left = forward).
 */
const glyphs = {
  home: [path('M4 10.5L12 4l8 6.5V20H4z'), path('M10 20v-5h4v5')],
  calculator: [rect(5, 3, 14, 18, 2), path('M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h4')],
  sketches: [
    path('M4 5.5C4 4.7 4.7 4 5.5 4H18v14H5.5C4.7 18 4 18.7 4 19.5z'),
    path('M4 19.5C4 20.3 4.7 21 5.5 21H20V6'),
    path('M8 13c1.5-3 3-4 4-4s1 1.5 0 2.5S9.5 14 11 14s2.5-2 3.5-3'),
  ],
  clients: [
    circle(9, 8, 3.2),
    path('M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5'),
    circle(17, 9, 2.4),
    path('M15.8 14.2c2.2-.3 4.2 1.2 4.7 4'),
  ],
  calendar: [
    rect(3.5, 5, 17, 15.5, 2),
    path('M3.5 9.5h17M8 3v4M16 3v4'),
    path('M8 13.5h.01M12 13.5h.01M16 13.5h.01M8 17h.01M12 17h.01'),
  ],
  settings: [
    circle(12, 12, 3),
    path('M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2L5.5 5.5'),
  ],
  gallery: [rect(3.5, 4.5, 17, 15, 2), circle(9, 10, 1.6), path('M4 17l4.5-4 3.5 3 3-2.5 5 4')],
  myData: [path('M4 20V10M10 20V4M16 20v-7M21 20H3')],
  marketing: [rect(3.5, 5.5, 17, 13, 2), path('M4 7l8 6 8-6')],
  chevron: [path('M14.5 6l-6 6 6 6')],
  copy: [
    rect(8.5, 8.5, 11, 11, 2),
    path('M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5'),
  ],
  plus: [path('M12 5v14M5 12h14')],
  close: [path('M6 6l12 12M18 6L6 18')],
  check: [path('M5 12.5l4.5 4.5L19 7.5')],
  warning: [path('M12 4l9 16H3z'), path('M12 10v4M12 17h.01')],
  search: [circle(11, 11, 6.5), path('M20 20l-4.2-4.2')],
  // From design/pages/ClientCard.html (contact chips and the header's icon buttons).
  phone: [path('M6.5 4h3l1.5 4-2 1.3a10 10 0 0 0 5.7 5.7L16 13l4 1.5v3A2 2 0 0 1 18 19.5 15 15 0 0 1 4.5 6 2 2 0 0 1 6.5 4z')],
  instagram: [rect(4, 4, 16, 16, 4.5), circle(12, 12, 3.6), path('M16.8 7.2h.01')],
  edit: [path('M6 4h9l4 4v12H6z'), path('M15 4v4h4M9 12h7M9 16h5')],
  more: [circle(6, 12, 1), circle(12, 12, 1), circle(18, 12, 1)],
  // No mockup (client-card's contact sheet and delete): drawn in the same 24px, 1.5-stroke style.
  whatsapp: [
    path('M4.5 19.5l1.2-3.7A8 8 0 1 1 8.4 18.4z'),
    path('M9.5 9c0 2.8 2.7 5.5 5.5 5.5l1-1.5-2-.9-.9.8a4 4 0 0 1-2-2l.8-.9-.9-2z'),
  ],
  trash: [path('M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13M10.5 11v5M13.5 11v5')],
} satisfies Record<string, Shape[]>;

export type IconName = keyof typeof glyphs;

/**
 * Hides a decorative graphic from screen readers. react-native-svg renders real DOM on web, where the
 * native-only props would leak as unknown attributes, so web gets `aria-hidden` instead.
 */
export const decorativeProps = (
  Platform.OS === 'web'
    ? { 'aria-hidden': true }
    : { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' }
) as object;
export const iconNames = Object.keys(glyphs) as IconName[];

export type IconProps = {
  name: IconName;
  /** Rendered size in px (the mockups use 18–24). Defaults to 24. */
  size?: number;
  /** Palette color; ignored when `tint` is given. Defaults to `text`. */
  color?: ColorName;
  /** A resolved color string, for callers that already hold one (e.g. a Button's label color). */
  tint?: string;
};

/** Decorative glyph: hidden from accessibility — label the control that contains it instead. */
export function Icon({ name, size = 24, color = 'text', tint }: IconProps) {
  const colors = useColors();
  const stroke = tint ?? colors[color];
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...decorativeProps}
      testID={`icon-${name}`}
    >
      {glyphs[name].map((shape, i) => {
        switch (shape.kind) {
          case 'path':
            return <Path key={i} d={shape.d} />;
          case 'circle':
            return <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />;
          case 'rect':
            return <Rect key={i} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} />;
        }
      })}
    </Svg>
  );
}
