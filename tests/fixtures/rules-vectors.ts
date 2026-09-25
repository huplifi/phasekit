// Independent source-derived vectors; see docs/RULES.md before changing expected values.
export const tierVectors = [
  { annex: 'I', score: '4.999999', months: null, detectedMonths: null },
  { annex: 'I', score: '5', months: 12, detectedMonths: 24 },
  { annex: 'I', score: '5.000001', months: 12, detectedMonths: 24 },
  { annex: 'I', score: '49.999999', months: 12, detectedMonths: 24 },
  { annex: 'I', score: '50', months: 6, detectedMonths: 12 },
  { annex: 'I', score: '50.000001', months: 6, detectedMonths: 12 },
  { annex: 'I', score: '499.999999', months: 6, detectedMonths: 12 },
  { annex: 'I', score: '500', months: 3, detectedMonths: 6 },
  { annex: 'I', score: '500.000001', months: 3, detectedMonths: 6 },
  { annex: 'II-1', score: '0.999999', months: null, detectedMonths: null },
  { annex: 'II-1', score: '1', months: 12, detectedMonths: 24 },
  { annex: 'II-1', score: '1.000001', months: 12, detectedMonths: 24 },
  { annex: 'II-1', score: '9.999999', months: 12, detectedMonths: 24 },
  { annex: 'II-1', score: '10', months: 6, detectedMonths: 12 },
  { annex: 'II-1', score: '10.000001', months: 6, detectedMonths: 12 },
  { annex: 'II-1', score: '99.999999', months: 6, detectedMonths: 12 },
  { annex: 'II-1', score: '100', months: 3, detectedMonths: 6 },
  { annex: 'II-1', score: '100.000001', months: 3, detectedMonths: 6 },
] as const;

export const odsVectors = [
  { kg: '2.999999', months: null }, { kg: '3', months: 12 }, { kg: '3.000001', months: 12 },
  { kg: '29.999999', months: 12 }, { kg: '30', months: 6 }, { kg: '30.000001', months: 6 },
  { kg: '299.999999', months: 6 }, { kg: '300', months: 3 }, { kg: '300.000001', months: 3 },
] as const;
