import rawCurves from '../generated/pt-curves.json';
import { parseDecimal } from './units';

export type SaturationSide = 'bubble' | 'dew';
export interface PTProviderMetadata {
  id: string;
  sourceIds: string[];
  version: string;
  dataVersion: string;
  pressureConvention: 'absolute';
  minimumTemperatureC: string;
  maximumTemperatureC: string;
  toleranceTemperatureC: string;
  toleranceRelativePressure?: string;
  method?: 'equation_of_state_interpolation';
  sourceUrl?: string;
  supports: SaturationSide[];
}
export interface PTResult {
  refrigerantId: string;
  side: SaturationSide;
  pressureBarAbsolute: string;
  temperatureC: string;
  provider: PTProviderMetadata;
}
export interface PTProvider {
  readonly metadata: PTProviderMetadata;
  temperatureAtPressure(refrigerantId: string, pressureBarAbsolute: string, side: SaturationSide): PTResult | null;
  pressureAtTemperature(refrigerantId: string, temperatureC: string, side: SaturationSide): PTResult | null;
}

interface Curve { coolPropFluid: string; sides: Partial<Record<SaturationSide, number[][]>> }
interface CurveFile { schema: string; dataVersion: string; sourceIds: string[]; curves: Record<string, Curve> }
const table = rawCurves as CurveFile;
const metadata: PTProviderMetadata = {
  id: 'coolprop-heos-offline', sourceIds: table.sourceIds, version: '7.2.0',
  dataVersion: table.dataVersion, pressureConvention: 'absolute',
  minimumTemperatureC: '', maximumTemperatureC: '', toleranceTemperatureC: '0.1',
  toleranceRelativePressure: '0.003', method: 'equation_of_state_interpolation',
  sourceUrl: 'https://github.com/CoolProp/CoolProp/tree/v7.2.0',
  supports: ['bubble', 'dew'],
};

export interface PTAvailability {
  supported: boolean;
  sides: SaturationSide[];
  minimumTemperatureC?: string;
  maximumTemperatureC?: string;
  minimumPressureBarAbsolute?: string;
  maximumPressureBarAbsolute?: string;
  coolPropFluid?: string;
}
export function getPTAvailability(refrigerantId: string, side?: SaturationSide): PTAvailability {
  const curve = table.curves[refrigerantId];
  const sides = (['bubble', 'dew'] as SaturationSide[]).filter((key) => (curve?.sides[key]?.length ?? 0) >= 2);
  const selected = side ? curve?.sides[side] : curve?.sides.dew ?? curve?.sides.bubble;
  if (!selected || selected.length < 2) return { supported: false, sides };
  return {
    supported: true, sides,
    minimumTemperatureC: String(selected[0]![0]), maximumTemperatureC: String(selected.at(-1)![0]),
    minimumPressureBarAbsolute: String(selected[0]![1]), maximumPressureBarAbsolute: String(selected.at(-1)![1]),
    coolPropFluid: curve!.coolPropFluid,
  };
}
function points(id: string, side: SaturationSide): number[][] | undefined { return table.curves[id]?.sides[side]; }
function between(values: number[][], target: number, column: 0 | 1): [number[], number[]] | null {
  if (!Number.isFinite(target) || target < values[0]![column]! || target > values.at(-1)![column]!) return null;
  let lo = 0;
  let hi = values.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (values[mid]![column]! <= target) lo = mid;
    else hi = mid;
  }
  return [values[lo]!, values[hi]!];
}
function result(id: string, side: SaturationSide, temperatureC: number, pressureBarAbsolute: number): PTResult {
  const availability = getPTAvailability(id, side);
  const pressureDecimals = Math.max(8, Math.ceil(-Math.log10(pressureBarAbsolute)) + 12);
  return {
    refrigerantId: id, side,
    temperatureC: temperatureC.toFixed(6).replace(/\.?0+$/, ''),
    pressureBarAbsolute: pressureBarAbsolute.toFixed(pressureDecimals).replace(/\.?0+$/, ''),
    provider: { ...metadata, minimumTemperatureC: availability.minimumTemperatureC!, maximumTemperatureC: availability.maximumTemperatureC!, supports: availability.sides },
  };
}
export const offlinePTProvider: PTProvider = {
  metadata,
  temperatureAtPressure(id, pressureBarAbsolute, side) {
    const value = parseDecimal(pressureBarAbsolute);
    if (value.lte(0)) throw new Error('nonpositive_absolute_pressure');
    const nodes = points(id, side);
    if (!nodes) return null;
    const p = value.toNumber();
    const pair = between(nodes, p, 1);
    if (!pair) return null;
    const [a, b] = pair;
    const ratio = (Math.log(p) - Math.log(a[1]!)) / (Math.log(b[1]!) - Math.log(a[1]!));
    return result(id, side, a[0]! + (b[0]! - a[0]!) * ratio, p);
  },
  pressureAtTemperature(id, temperatureC, side) {
    const value = parseDecimal(temperatureC);
    const nodes = points(id, side);
    if (!nodes) return null;
    const t = value.toNumber();
    const pair = between(nodes, t, 0);
    if (!pair) return null;
    const [a, b] = pair;
    const ratio = (t - a[0]!) / (b[0]! - a[0]!);
    const p = Math.exp(Math.log(a[1]!) + (Math.log(b[1]!) - Math.log(a[1]!)) * ratio);
    return result(id, side, t, p);
  },
};
export const unavailablePTProvider: PTProvider = {
  metadata: { ...metadata, id: 'unavailable', version: '0', dataVersion: '0', sourceIds: [], supports: [] },
  temperatureAtPressure: () => null, pressureAtTemperature: () => null,
};
