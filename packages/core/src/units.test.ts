import { describe, expect, it } from 'vitest';
import { convertMass, convertPressure, parseDecimal } from './units';

describe('exact typed units', () => {
  it('accepts Finnish and English decimal separators without changing the value', () => {
    expect(parseDecimal('1,25').toString()).toBe('1.25');
    expect(parseDecimal('1.25').toString()).toBe('1.25');
    expect(() => parseDecimal('1,000.25')).toThrow('invalid_decimal');
    expect(() => parseDecimal('1.' + '0'.repeat(40))).toThrow('decimal_precision_exceeded');
  });
  it('converts mass without binary rounding', () => {
    expect(convertMass({ value: '1250', unit: 'g' }, 'kg')).toBe('1.25');
    expect(convertMass({ value: '1,25', unit: 'kg' }, 'g')).toBe('1250');
  });
  it('converts all requested pressure scales with an explicit atmosphere for gauge', () => {
    const atmosphere = { value: '101.325', unit: 'kPa(a)' } as const;
    expect(convertPressure({ value: '0', unit: 'bar(g)' }, 'kPa(a)', atmosphere)).toBe('101.325');
    expect(convertPressure({ value: '2.01325', unit: 'bar(a)' }, 'bar(g)', atmosphere)).toBe('1');
    expect(convertPressure({ value: '1', unit: 'MPa(a)' }, 'bar(a)')).toBe('10');
    expect(convertPressure({ value: '100', unit: 'kPa(a)' }, 'MPa(a)')).toBe('0.1');
    expect(convertPressure({ value: '1', unit: 'psi(a)' }, 'bar(a)')).toBe('0.06894757293168');
    expect(convertPressure({ value: '1', unit: 'psi(g)' }, 'psi(a)', { value: '14.6959487755', unit: 'psi(a)' })).toBe('15.6959487755');
    const psi = convertPressure({ value: '14.6959487755', unit: 'psi(a)' }, 'bar(a)');
    const roundtrip = convertPressure({ value: psi, unit: 'bar(a)' }, 'psi(a)');
    expect(Number(roundtrip)).toBeCloseTo(14.6959487755, 11);
  });
  it('rejects hidden or invalid atmospheric references', () => {
    expect(() => convertPressure({ value: '1', unit: 'bar(g)' }, 'bar(a)')).toThrow('atmospheric_reference_required');
    expect(() => convertPressure({ value: '1', unit: 'bar(a)' }, 'bar(g)')).toThrow('atmospheric_reference_required');
    expect(() => convertPressure({ value: '1', unit: 'bar(a)' }, 'bar(g)', { value: '0', unit: 'bar(a)' })).toThrow('invalid_atmospheric_reference');
    expect(() => convertPressure({ value: '-1', unit: 'bar(a)' }, 'bar(a)')).toThrow('negative_absolute_pressure');
  });
});
