/**
 * Numbers, times and ₪ amounts inside Hebrew text (design-system.html `.num`:
 * tabular-nums, direction ltr, unicode-bidi isolate). RN has no CSS bidi isolation, so the run is
 * wrapped in Unicode LEFT-TO-RIGHT ISOLATE … POP DIRECTIONAL ISOLATE instead.
 */
export const LRI = '⁦';
export const PDI = '⁩';

/** Wraps a string as an isolated left-to-right run. Idempotent. */
export function ltrIsolate(value: string): string {
  if (value.startsWith(LRI) && value.endsWith(PDI)) return value;
  return `${LRI}${value}${PDI}`;
}

const MINUS = '−';

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Integer agorot → "1,000 ₪" (whole shekels) or "1,000.50 ₪". Negative amounts use a real minus
 * sign ("−95 ₪"). Not isolated: render it with `Num` or wrap with `ltrIsolate`.
 */
export function formatMoney(agorot: number): string {
  if (!Number.isInteger(agorot)) throw new Error(`formatMoney: agorot must be an integer, got ${agorot}`);
  const sign = agorot < 0 ? MINUS : '';
  const abs = Math.abs(agorot);
  const shekels = groupThousands(String(Math.floor(abs / 100)));
  const rest = abs % 100;
  const amount = rest === 0 ? shekels : `${shekels}.${String(rest).padStart(2, '0')}`;
  return `${sign}${amount} ₪`;
}
