// covers AC1, T1, T17 — the theme generator: committed output matches tokens.json, and bad input fails loudly.
import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { OUTPUT_PATH, renderTheme, TOKENS_PATH } from '../../scripts/gen-theme';

const mobileRoot = resolve(__dirname, '../..');
const tokens = JSON.parse(readFileSync(resolve(mobileRoot, TOKENS_PATH), 'utf8'));

describe('gen-theme', () => {
  it('has regenerated src/theme/tokens.generated.ts from the current tokens.json (run `npm run gen:theme`)', () => {
    const committed = readFileSync(resolve(mobileRoot, OUTPUT_PATH), 'utf8');
    expect(renderTheme(tokens)).toBe(committed);
  });

  it('emits every group the theme reads, with both color schemes', () => {
    const out = renderTheme(tokens);
    for (const name of ['colors', 'fonts', 'typeScale', 'spacing', 'radii', 'borderWidth', 'shadows', 'zIndex', 'touch', 'layout']) {
      expect(out).toContain(`export const ${name} = `);
    }
    expect(out).toContain('light: {');
    expect(out).toContain('dark: {');
  });

  it('is deterministic', () => {
    expect(renderTheme(tokens)).toBe(renderTheme(tokens));
  });

  it('rejects tokens without a light and dark palette', () => {
    expect(() => renderTheme({ ...tokens, colors: { light: tokens.colors.light } })).toThrow(/colors\.light and colors\.dark/);
  });
});
