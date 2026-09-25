export interface Threshold { id: string; annex: 'I' | 'II-1' | 'ODS-I'; min: string; unit: 'tCO2e' | 'kg'; months: number; detectedMonths: number | null }

export const rulesetVersion = 'EU-FI-2024-573+590/2026-09-25.2';
export const rulesetEffectiveFrom = '2024-03-11';

export const thresholds: readonly Threshold[] = [
  { id: 'fgas-I-5', annex: 'I', min: '5', unit: 'tCO2e', months: 12, detectedMonths: 24 },
  { id: 'fgas-I-50', annex: 'I', min: '50', unit: 'tCO2e', months: 6, detectedMonths: 12 },
  { id: 'fgas-I-500', annex: 'I', min: '500', unit: 'tCO2e', months: 3, detectedMonths: 6 },
  { id: 'fgas-II-1', annex: 'II-1', min: '1', unit: 'kg', months: 12, detectedMonths: 24 },
  { id: 'fgas-II-10', annex: 'II-1', min: '10', unit: 'kg', months: 6, detectedMonths: 12 },
  { id: 'fgas-II-100', annex: 'II-1', min: '100', unit: 'kg', months: 3, detectedMonths: 6 },
  { id: 'ods-3', annex: 'ODS-I', min: '3', unit: 'kg', months: 12, detectedMonths: null },
  { id: 'ods-30', annex: 'ODS-I', min: '30', unit: 'kg', months: 6, detectedMonths: null },
  { id: 'ods-300', annex: 'ODS-I', min: '300', unit: 'kg', months: 3, detectedMonths: null },
];
