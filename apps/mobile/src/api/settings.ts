import type { ApiClient } from '@/api/client';

/** The time-estimate tables (all editable): minutes = roundUpTo5(max(15, sizeBase × detail × shading × placement)). */
export interface EstimateTables {
  sizeBaseMinutes: Record<string, number>;
  detail: Record<string, number>;
  shading: Record<string, number>;
  placement: Record<string, number>;
}

export interface CalibrationPoint {
  label: string;
  minutes: number;
}

/** The studio's single Settings record. Money is integer agorot. */
export interface Settings {
  id: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  minimumPriceAgorot: number;
  minimumMinutes: number;
  hourlyRateAgorot: number;
  designHourlyRateAgorot: number;
  needleOpeningCostAgorot: number;
  extraNeedleCostAgorot: number;
  estimateTables: EstimateTables;
  calibrationPoints: CalibrationPoint[];
  autoLockSeconds: number;
  timezone: string;
}

/** What PUT /settings takes: every editable field plus the `version` last read. */
export type SettingsInput = Omit<Settings, 'id' | 'createdAt' | 'updatedAt'>;

export function getSettings(api: ApiClient): Promise<Settings> {
  return api.apiFetch<Settings>('/settings', { method: 'GET' });
}

/**
 * Saves the settings. Retrying the same call is safe. Throws `ApiError` with code `version_conflict`
 * (and the current record in `details.current`) when another device saved first.
 */
export function saveSettings(api: ApiClient, input: SettingsInput): Promise<Settings> {
  return api.apiFetch<Settings>('/settings', { method: 'PUT', body: input });
}
