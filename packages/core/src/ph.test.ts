import { describe, expect, it } from 'vitest';
import { calculatePHCycle, getPHAvailability, getPHDiagram, phMetadata, PHPhaseBoundaryError } from './ph';
import { offlinePTProvider } from './pt';

const example = {
  refrigerantId: 'r134a',
  lowPressure: { value: '2.5', unit: 'bar(a)' as const },
  highPressure: { value: '10', unit: 'bar(a)' as const },
  T1: { value: '10', unit: 'C' as const },
  T2: { value: '70', unit: 'C' as const },
  T3: { value: '25', unit: 'C' as const },
};

describe('offline P–h provider', () => {
  it('keeps model coverage and source version explicit', () => {
    expect(getPHAvailability('r134a').supported).toBe(true);
    expect(getPHAvailability('not-in-catalogue').supported).toBe(false);
    const diagram = getPHDiagram('r134a');
    expect(diagram?.dome.length).toBeGreaterThan(10);
    expect(diagram?.provider.dataVersion).toBe(phMetadata.dataVersion);
    expect(diagram?.provider.sourceIds).toEqual(['coolprop-ph-7.2.0', 'coolprop-pt-7.2.0']);
    expect(diagram?.provider.ptDataVersion).toBe(offlinePTProvider.metadata.dataVersion);
    expect(diagram?.provider.isolineDataVersion).toMatch(/^ph-isolines-2026-09-26\./);
  });

  it.each(['r134a', 'r290'])('ships only bounded single-phase guide segments for %s', (id) => {
    const diagram = getPHDiagram(id)!;
    const minimum = Number(diagram.availability.minimumPressureBarAbsolute);
    const maximum = Number(diagram.availability.maximumPressureBarAbsolute);
    expect(new Set(diagram.isolines.map((line) => line.kind))).toEqual(new Set(['temperature', 'entropy', 'volume']));
    for (const line of diagram.isolines) {
      expect(line.segments.length).toBeGreaterThan(0);
      for (const segment of line.segments) {
        expect(segment.length).toBeGreaterThanOrEqual(3);
        for (const [pressure, enthalpy] of segment) {
          expect(pressure).toBeGreaterThanOrEqual(minimum);
          expect(pressure).toBeLessThanOrEqual(maximum);
          expect(Number.isFinite(enthalpy)).toBe(true);
        }
        for (let index = 1; index < segment.length; index++)
          expect(segment[index]![0]).toBeGreaterThan(segment[index - 1]![0]);
      }
    }
  });

  it('matches independent CoolProp R134a Hmass(P,T) vectors within bounded interpolation error', () => {
    // CoolProp 7.2.0 HEOS, direct PropsSI Hmass(P,T) evaluations in kJ/kg.
    const cycle = calculatePHCycle(example);
    expect(Number(cycle.points['1'].enthalpyKJkg)).toBeCloseTo(408.55417789378623, 0);
    expect(Number(cycle.points['2'].enthalpyKJkg)).toBeCloseTo(452.0005965967065, 0);
    expect(Number(cycle.points['3'].enthalpyKJkg)).toBeCloseTo(234.5571432998888, 0);
    expect(cycle.points['4'].enthalpyKJkg).toBe(cycle.points['3'].enthalpyKJkg);
    expect(cycle.points['4'].phase).toBe('two-phase');
    expect(cycle.points['4'].temperatureC).toBeNull();
    expect(Number(cycle.superheatK)).toBeGreaterThan(14);
    expect(Number(cycle.subcoolingK)).toBeGreaterThan(14);
  });

  it('preserves physical pressure across gauge and absolute inputs', () => {
    const absolute = calculatePHCycle(example);
    const gauge = calculatePHCycle({
      ...example,
      lowPressure: { value: '1.48675', unit: 'bar(g)' },
      highPressure: { value: '8.98675', unit: 'bar(g)' },
      atmosphere: { value: '1.01325', unit: 'bar(a)' },
    });
    expect(gauge.points['1'].enthalpyKJkg).toBe(absolute.points['1'].enthalpyKJkg);
    expect(gauge.points['3'].enthalpyKJkg).toBe(absolute.points['3'].enthalpyKJkg);
  });

  it('reports SH, SC and point-4 temperature limits from the same P–T provider as the standalone tools', () => {
    const cycle = calculatePHCycle(example);
    const lowDew = offlinePTProvider.temperatureAtPressure('r134a', '2.5', 'dew')!;
    const lowBubble = offlinePTProvider.temperatureAtPressure('r134a', '2.5', 'bubble')!;
    const highBubble = offlinePTProvider.temperatureAtPressure('r134a', '10', 'bubble')!;
    expect(Number(cycle.superheatK)).toBeCloseTo(10 - Number(lowDew.temperatureC), 7);
    expect(Number(cycle.subcoolingK)).toBeCloseTo(Number(highBubble.temperatureC) - 25, 7);
    expect(cycle.points['4'].temperatureBoundsC).toEqual([lowBubble.temperatureC, lowDew.temperatureC]);
    expect(cycle.sourceIds).toEqual(['coolprop-ph-7.2.0', 'coolprop-pt-7.2.0']);
  });

  it('rejects unsupported fluids, reversed pressures, phase boundary and extrapolation', () => {
    expect(() => calculatePHCycle({ ...example, refrigerantId: 'unknown' })).toThrow('ph_unsupported_refrigerant');
    expect(() => calculatePHCycle({ ...example, highPressure: { value: '2', unit: 'bar(a)' } })).toThrow('ph_high_pressure_must_exceed_low');
    expect(() => calculatePHCycle({ ...example, T1: { value: '-4.28', unit: 'C' } })).toThrow('ph_two_phase_or_boundary');
    expect(() => calculatePHCycle({ ...example, T2: { value: '200', unit: 'C' } })).toThrow('ph_out_of_range');
  });

  it.each([
    ['T1', '-4', '1', 'vapour', 2.5],
    ['T2', '39.5', '2', 'vapour', 10],
    ['T3', '39.5', '3', 'liquid', 10],
  ] as const)('identifies the blocked %s point and its model boundary', (field, value, point, phase, pressure) => {
    let caught: unknown;
    try { calculatePHCycle({ ...example, [field]: { value, unit: 'C' } }); }
    catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(PHPhaseBoundaryError);
    const error = caught as PHPhaseBoundaryError;
    expect(error.point).toBe(point);
    expect(error.phase).toBe(phase);
    expect(error.pressureBarAbsolute).toBe(pressure);
    expect(error.temperatureC).toBe(Number(value));
    expect(error.offsetK).toBeLessThan(1);
    expect(error.offsetK).toBeCloseTo(phase === 'vapour' ? Number(value) - error.saturationTemperatureC : error.saturationTemperatureC - Number(value), 8);
  });
});
