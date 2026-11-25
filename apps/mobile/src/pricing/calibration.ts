import type { CalibrationPoint } from '@/api/settings';

/**
 * The calibration point whose minutes are closest to `estimatedMinutes`.
 * Ties resolve to the point with fewer minutes, then to the earlier one in the list.
 */
export function nearestCalibration(
  estimatedMinutes: number,
  points: CalibrationPoint[],
): CalibrationPoint {
  let best = points[0];
  let bestDistance = Math.abs(best.minutes - estimatedMinutes);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    const distance = Math.abs(point.minutes - estimatedMinutes);
    if (distance < bestDistance || (distance === bestDistance && point.minutes < best.minutes)) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/** English calibration labels → the Hebrew shown in the "similar" hint. */
const LABELS_HE: Record<string, string> = {
  rose: 'ורד',
  cherry: 'דובדבן',
  arm: 'זרוע',
  back: 'גב',
  deer: 'צבי',
  'figure with book': 'דמות עם ספר',
};

/** The "דומה: <label> ≈ <minutes> דק׳" hint for the nearest calibration point. */
export function calibrationHint(estimatedMinutes: number, points: CalibrationPoint[]): string {
  const point = nearestCalibration(estimatedMinutes, points);
  const label = LABELS_HE[point.label] ?? point.label;
  return `דומה: ${label} ≈ ${point.minutes} דק׳`;
}
