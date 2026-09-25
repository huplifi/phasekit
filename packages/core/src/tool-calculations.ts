import type { Fact } from './contracts';
import { getPTAvailability, offlinePTProvider, type PTResult, type SaturationSide } from './pt';
import {
  convertPressure, parseDecimal, type AtmosphericReference, type PressureUnit,
  type Quantity, MAX_DECIMAL_DIGITS,
} from './units';

export type TemperatureUnit = 'C' | 'F';
export type TemperatureQuantity = Quantity<TemperatureUnit>;
export type PTCalculationInput =
  | { refrigerantId: string; side: SaturationSide; direction: 'temperature_at_pressure'; pressure: Quantity<PressureUnit>; atmosphere?: AtmosphericReference; outputTemperatureUnit?: TemperatureUnit }
  | { refrigerantId: string; side: SaturationSide; direction: 'pressure_at_temperature'; temperature: TemperatureQuantity; outputPressureUnit?: PressureUnit; atmosphere?: AtmosphericReference };

function toCelsius(input: TemperatureQuantity): string {
  const value = parseDecimal(input.value);
  if (input.unit === 'C') return value.toString();
  const converted = value.minus(32).mul(5).div(9);
  // Fahrenheit conversion often repeats in decimal notation. Keep the
  // internally generated value well within parseDecimal's input digit limit,
  // without changing the precision contract for values supplied by users.
  if (converted.abs().gt(500)) throw new Error('pt_out_of_range');
  return converted.toDecimalPlaces(10).toFixed();
}
function fromCelsius(celsius: string, unit: TemperatureUnit): string {
  const value = parseDecimal(celsius);
  return (unit === 'F' ? value.mul(9).div(5).plus(32) : value).toString();
}
function requireSaturation(result: PTResult | null, id: string, side: SaturationSide): PTResult {
  if (result) return result;
  if (!getPTAvailability(id, side).supported) throw new Error('pt_unsupported_refrigerant_or_side');
  throw new Error('pt_out_of_range');
}

export function calculatePT(input: PTCalculationInput): {
  saturation: PTResult;
  temperature: TemperatureQuantity;
  pressure: Quantity<PressureUnit>;
} {
  if (input.direction === 'temperature_at_pressure') {
    const barAbsolute = convertPressure(input.pressure, 'bar(a)', input.atmosphere);
    const saturation = requireSaturation(offlinePTProvider.temperatureAtPressure(input.refrigerantId, barAbsolute, input.side), input.refrigerantId, input.side);
    const unit = input.outputTemperatureUnit ?? 'C';
    return { saturation, temperature: { value: fromCelsius(saturation.temperatureC, unit), unit }, pressure: input.pressure };
  }
  const celsius = toCelsius(input.temperature);
  const saturation = requireSaturation(offlinePTProvider.pressureAtTemperature(input.refrigerantId, celsius, input.side), input.refrigerantId, input.side);
  const unit = input.outputPressureUnit ?? 'bar(a)';
  return {
    saturation, temperature: input.temperature,
    pressure: { value: convertPressure({ value: saturation.pressureBarAbsolute, unit: 'bar(a)' }, unit, input.atmosphere), unit },
  };
}

export type SHSCMode = 'superheat' | 'subcooling';
export function calculateSHSC(input: {
  refrigerantId: string;
  mode: SHSCMode;
  pressure: Quantity<PressureUnit>;
  measuredTemperature: TemperatureQuantity;
  atmosphere?: AtmosphericReference;
}): {
  saturation: PTResult;
  measuredTemperatureC: string;
  differenceK: string;
  differenceF: string;
} {
  const side: SaturationSide = input.mode === 'superheat' ? 'dew' : 'bubble';
  const barAbsolute = convertPressure(input.pressure, 'bar(a)', input.atmosphere);
  const saturation = requireSaturation(offlinePTProvider.temperatureAtPressure(input.refrigerantId, barAbsolute, side), input.refrigerantId, side);
  const measuredC = toCelsius(input.measuredTemperature);
  const measured = parseDecimal(measuredC);
  const sat = parseDecimal(saturation.temperatureC);
  const delta = input.mode === 'superheat' ? measured.minus(sat) : sat.minus(measured);
  return {
    saturation, measuredTemperatureC: measuredC,
    differenceK: delta.toString(), differenceF: delta.mul(9).div(5).toString(),
  };
}

export function convertCO2e(input: {
  direction: 'kg_to_tonnes_co2e' | 'tonnes_co2e_to_kg';
  value: string;
  gwpFact: Fact;
}): {
  kg: string;
  tonnesCO2e: string;
  gwp: string;
  gwpBasis: string;
  sourceIds: string[];
} {
  const fact = input.gwpFact;
  if (fact.state !== 'verified' || fact.value === null || !fact.basis || fact.sourceIds.length === 0) {
    throw new Error('verified_gwp_with_basis_required');
  }
  const gwp = parseDecimal(String(fact.value));
  if (gwp.lt(0)) throw new Error('negative_gwp');
  if (input.direction === 'tonnes_co2e_to_kg' && gwp.isZero()) throw new Error('zero_gwp_inverse_undefined');
  const value = parseDecimal(input.value);
  if (value.lt(0)) throw new Error('negative_quantity');
  const kg = input.direction === 'kg_to_tonnes_co2e' ? value : value.mul(1000).div(gwp);
  const tonnes = input.direction === 'kg_to_tonnes_co2e' ? value.mul(gwp).div(1000) : value;
  return {
    kg: kg.toSignificantDigits(MAX_DECIMAL_DIGITS).toString(),
    tonnesCO2e: tonnes.toSignificantDigits(MAX_DECIMAL_DIGITS).toString(),
    gwp: gwp.toString(), gwpBasis: fact.basis, sourceIds: [...fact.sourceIds],
  };
}
