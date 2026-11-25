/** Absorbs float error just above a multiple of 5 (a product of 60.0000001 → 60, not 65). */
const EPS = 1e-6;

/** Rounds `minutes` UP to the next multiple of 5, guarded against float noise just over a multiple. */
export function roundUpTo5(minutes: number): number {
  const rounded = Math.ceil((minutes - EPS) / 5) * 5;
  // Math.ceil yields -0 for inputs at/just below 0; normalise so the result compares equal to 0.
  return rounded === 0 ? 0 : rounded;
}
