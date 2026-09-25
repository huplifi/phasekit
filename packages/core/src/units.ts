import Decimal from 'decimal.js';

// Legal threshold arithmetic combines at most 100 components and three input
// factors of at most 40 decimal digits. 256 significant digits preserve the
// full finite-decimal product and sum, including wide integer/fraction spans.
export const ExactDecimal = Decimal.clone({ precision: 256, rounding: Decimal.ROUND_HALF_UP });
export const MAX_DECIMAL_DIGITS = 40;

export type MassUnit = 'kg' | 'g';
export type PressureUnit = 'bar(a)' | 'bar(g)' | 'kPa(a)' | 'kPa(g)' | 'MPa(a)' | 'MPa(g)' | 'psi(a)' | 'psi(g)';
export interface Quantity<U extends string> { value: string; unit: U }
export interface AtmosphericReference { value: string; unit: 'bar(a)' | 'kPa(a)' | 'MPa(a)' | 'psi(a)' }

export function parseDecimal(value: string): Decimal {
  const normalized = value.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) throw new Error('invalid_decimal');
  if ((normalized.match(/\d/g) ?? []).length > MAX_DECIMAL_DIGITS) throw new Error('decimal_precision_exceeded');
  return new ExactDecimal(normalized);
}

export function toKilograms(quantity: Quantity<MassUnit>): Decimal {
  const value = parseDecimal(quantity.value);
  return quantity.unit === 'g' ? value.div(1000) : value;
}

export function convertMass(quantity: Quantity<MassUnit>, to: MassUnit): string {
  const kg = toKilograms(quantity);
  return (to === 'g' ? kg.mul(1000) : kg).toString();
}

const pressureBarFactor: Record<string, string> = {
  bar: '1', kPa: '0.01', MPa: '10', psi: '0.06894757293168',
};

function absoluteBar(quantity: Quantity<PressureUnit>, atmosphere?: AtmosphericReference): Decimal {
  const [base, mode] = quantity.unit.split('(');
  const bar = parseDecimal(quantity.value).mul(pressureBarFactor[base]!);
  if (mode === 'a)') return bar;
  if (!atmosphere) throw new Error('atmospheric_reference_required');
  const referenceBase = atmosphere.unit.split('(')[0]!;
  const reference = parseDecimal(atmosphere.value).mul(pressureBarFactor[referenceBase]!);
  if (reference.lte(0)) throw new Error('invalid_atmospheric_reference');
  return bar.plus(reference);
}

export function convertPressure(
  quantity: Quantity<PressureUnit>,
  to: PressureUnit,
  atmosphere?: AtmosphericReference,
): string {
  const [fromBase, fromMode] = quantity.unit.split('(');
  const [toBase, toMode] = to.split('(');
  const referenceBase = atmosphere?.unit.split('(')[0];
  if (fromBase === toBase && (fromMode === toMode || referenceBase === fromBase)) {
    let value = parseDecimal(quantity.value);
    if (fromMode !== toMode) {
      if (!atmosphere) throw new Error('atmospheric_reference_required');
      const reference = parseDecimal(atmosphere.value);
      if (reference.lte(0)) throw new Error('invalid_atmospheric_reference');
      value = toMode === 'a)' ? value.plus(reference) : value.minus(reference);
    }
    if (toMode === 'a)' && value.lt(0)) throw new Error('negative_absolute_pressure');
    return value.toString();
  }
  const barAbsolute = absoluteBar(quantity, atmosphere);
  if (barAbsolute.lt(0)) throw new Error('negative_absolute_pressure');
  const [base, mode] = to.split('(');
  let bar = barAbsolute;
  if (mode === 'g)') {
    if (!atmosphere) throw new Error('atmospheric_reference_required');
    const reference = absoluteBar({ value: atmosphere.value, unit: atmosphere.unit });
    if (reference.lte(0)) throw new Error('invalid_atmospheric_reference');
    bar = bar.minus(reference);
  }
  // Dividing by the finite psi factor is recurring; keep the published result
  // within the input precision contract for a subsequent unit round-trip.
  return bar.div(pressureBarFactor[base]!).toSignificantDigits(MAX_DECIMAL_DIGITS).toString();
}
