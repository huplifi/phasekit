import { describe, expect, it } from 'vitest';
import { calculatePT, calculateSHSC, convertCO2e } from './tool-calculations';
import { getPTAvailability, offlinePTProvider } from './pt';
import type { Fact } from './contracts';

describe('offline saturation provider', () => {
  it('matches independent CoolProp 7.2.0 vectors for a pure fluid and blend glide', () => {
    // Fresh PropsSI(P,T=273.15 K,Q=0/1) reference values from CoolProp 7.2.0.
    const r134a = offlinePTProvider.pressureAtTemperature('r134a', '0', 'dew');
    expect(Math.abs(Number(r134a!.pressureBarAbsolute) / 2.928031823 - 1)).toBeLessThan(0.003);
    const bubble = offlinePTProvider.pressureAtTemperature('r410a', '0', 'bubble');
    const dew = offlinePTProvider.pressureAtTemperature('r410a', '0', 'dew');
    expect(Math.abs(Number(bubble!.pressureBarAbsolute) / 8.007019593 - 1)).toBeLessThan(0.003);
    expect(Math.abs(Number(dew!.pressureBarAbsolute) / 7.980536221 - 1)).toBeLessThan(0.003);
    expect(Number(bubble!.pressureBarAbsolute)).toBeGreaterThan(Number(dew!.pressureBarAbsolute));
  });

  it('blocks unknown IDs, out-of-range and near-critical calculations', () => {
    expect(getPTAvailability('r448a').supported).toBe(false);
    expect(offlinePTProvider.pressureAtTemperature('r448a', '0', 'dew')).toBeNull();
    expect(offlinePTProvider.pressureAtTemperature('r134a', '100', 'dew')).toBeNull();
    expect(offlinePTProvider.pressureAtTemperature('r744', '30', 'bubble')).toBeNull();
    expect(offlinePTProvider.temperatureAtPressure('r134a', '999', 'dew')).toBeNull();
    expect(() => offlinePTProvider.temperatureAtPressure('r134a', '-1', 'dew')).toThrow('nonpositive_absolute_pressure');
  });
});

describe('field calculations', () => {
  it('uses explicit atmosphere for gauge pressure and correct dew/bubble sides', () => {
    const atmosphere = { value: '1.01325', unit: 'bar(a)' } as const;
    const pressure = { value: '1.914781823', unit: 'bar(g)' } as const;
    const pt = calculatePT({ refrigerantId: 'r134a', side: 'dew', direction: 'temperature_at_pressure', pressure, atmosphere });
    expect(Number(pt.temperature.value)).toBeCloseTo(0, 1);
    const superheat = calculateSHSC({ refrigerantId: 'r134a', mode: 'superheat', pressure, measuredTemperature: { value: '10', unit: 'C' }, atmosphere });
    expect(Number(superheat.differenceK)).toBeCloseTo(10, 1);
    expect(Number(superheat.differenceF)).toBeCloseTo(18, 1);
    expect(superheat.saturation.side).toBe('dew');
    const subcooling = calculateSHSC({ refrigerantId: 'r134a', mode: 'subcooling', pressure, measuredTemperature: { value: '23', unit: 'F' }, atmosphere });
    expect(Number(subcooling.differenceK)).toBeCloseTo(5, 1);
    expect(subcooling.saturation.side).toBe('bubble');
    expect(() => calculateSHSC({ refrigerantId: 'r134a', mode: 'superheat', pressure, measuredTemperature: { value: '10', unit: 'C' } })).toThrow('atmospheric_reference_required');
  });

  it('accepts recurring Fahrenheit conversions and preserves out-of-range errors', () => {
    const pt = calculatePT({ refrigerantId: 'r134a', side: 'dew', direction: 'pressure_at_temperature', temperature: { value: '70', unit: 'F' } });
    expect(Number(pt.pressure.value)).toBeGreaterThan(5);
    const sh = calculateSHSC({ refrigerantId: 'r134a', mode: 'superheat', pressure: { value: '2.928031823', unit: 'bar(a)' }, measuredTemperature: { value: '70', unit: 'F' } });
    expect(Math.abs(Number(sh.differenceK) - 21.111111)).toBeLessThan(0.1);
    expect(() => calculatePT({ refrigerantId: 'r134a', side: 'dew', direction: 'pressure_at_temperature', temperature: { value: '-999', unit: 'F' } })).toThrow('pt_out_of_range');
  });

  it('converts exact CO2e values only from a verified fact with named basis', () => {
    const gwpFact: Fact = { state: 'verified', value: '1430', basis: 'EU-2024/573-Annex-I-GWP100', sourceIds: ['eu-2024-573'] };
    const forward = convertCO2e({ direction: 'kg_to_tonnes_co2e', value: '3.5', gwpFact });
    expect(forward.tonnesCO2e).toBe('5.005');
    expect(forward.gwpBasis).toBe(gwpFact.basis);
    const reverse = convertCO2e({ direction: 'tonnes_co2e_to_kg', value: '5.005', gwpFact });
    expect(reverse.kg).toBe('3.5');
    expect(() => convertCO2e({ direction: 'kg_to_tonnes_co2e', value: '1', gwpFact: { state: 'unknown', value: null, sourceIds: [] } })).toThrow('verified_gwp_with_basis_required');
    expect(() => convertCO2e({ direction: 'kg_to_tonnes_co2e', value: '-1', gwpFact })).toThrow('negative_quantity');
    const zeroGwp = { ...gwpFact, value: '0' };
    expect(convertCO2e({ direction: 'kg_to_tonnes_co2e', value: '1', gwpFact: zeroGwp }).tonnesCO2e).toBe('0');
    expect(() => convertCO2e({ direction: 'tonnes_co2e_to_kg', value: '1', gwpFact: zeroGwp })).toThrow('zero_gwp_inverse_undefined');
  });
});
