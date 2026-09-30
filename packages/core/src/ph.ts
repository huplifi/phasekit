import rawGrids from '../generated/ph-grids.json';
import rawIsolines from '../generated/ph-isolines.json';
import { convertPressure, parseDecimal, type AtmosphericReference, type PressureUnit, type Quantity } from './units';
import { offlinePTProvider } from './pt';

type Phase = 'vapour' | 'liquid';
type TemperatureQuantity = Quantity<'C' | 'F'>;
interface GridPlane {
  pressureBarAbsolute: number;
  bubbleTemperatureC: number;
  dewTemperatureC: number;
  liquidEnthalpyKJkg: number;
  vapourEnthalpyKJkg: number;
  sides: Record<Phase, number[][]>;
}
interface Grid { coolPropFluid: string; planes: GridPlane[] }
interface GridFile { dataVersion: string; ptDataVersion: string; sourceId: string; grids: Record<string, Grid> }
const table = rawGrids as GridFile;
if (table.ptDataVersion !== offlinePTProvider.metadata.dataVersion)
  throw new Error('ph_pt_grid_version_mismatch');
export interface PHIsoline {
  kind: 'temperature' | 'entropy' | 'volume';
  phase: Phase;
  /** °C, kJ/(kg·K), or m³/kg according to kind. */
  level: number;
  segments: [number, number][][];
}
interface IsolineFile {
  dataVersion: string;
  phGridVersion: string;
  curves: Record<string, PHIsoline[]>;
}
const isolineTable = rawIsolines as unknown as IsolineFile;
if (isolineTable.phGridVersion !== table.dataVersion)
  throw new Error('ph_isoline_grid_version_mismatch');

export const phMetadata = {
  providerId: 'coolprop-heos-ph-offline',
  sourceIds: [table.sourceId, ...offlinePTProvider.metadata.sourceIds],
  coolPropVersion: '7.2.0',
  dataVersion: table.dataVersion,
  isolineDataVersion: isolineTable.dataVersion,
  ptDataVersion: offlinePTProvider.metadata.dataVersion,
  ptProviderId: offlinePTProvider.metadata.id,
  pressureConvention: 'absolute' as const,
  enthalpyUnit: 'kJ/kg' as const,
  model: 'CoolProp HEOS / pinned pure-fluid EOS / exact mixture composition',
  interpolation: 'temperature offset and log absolute pressure, within one phase',
  point4Assumption: 'Isenthalpic expansion (h4 = h3); two-phase temperature bounded by bubble and dew states',
};

export interface PHAvailability {
  supported: boolean;
  minimumPressureBarAbsolute?: string;
  maximumPressureBarAbsolute?: string;
  vapourOffsetRangeK?: readonly [number, number];
  liquidOffsetRangeK?: readonly [number, number];
  coolPropFluid?: string;
  dataVersion: string;
  sourceIds: string[];
}
export interface PHDomeNode {
  pressureBarAbsolute: string;
  bubbleTemperatureC: string;
  dewTemperatureC: string;
  liquidEnthalpyKJkg: string;
  vapourEnthalpyKJkg: string;
}
export interface PHDiagram {
  refrigerantId: string;
  dome: PHDomeNode[];
  isolines: PHIsoline[];
  availability: PHAvailability;
  provider: typeof phMetadata;
}
export interface PHPoint {
  label: '1' | '2' | '3' | '4';
  phase: Phase | 'two-phase';
  pressureBarAbsolute: string;
  enthalpyKJkg: string;
  temperatureC: string | null;
  temperatureBoundsC?: [string, string];
}
export interface PHCycleInput {
  refrigerantId: string;
  lowPressure: Quantity<PressureUnit>;
  highPressure: Quantity<PressureUnit>;
  T1: TemperatureQuantity;
  T2: TemperatureQuantity;
  T3: TemperatureQuantity;
  atmosphere?: AtmosphericReference;
}
export interface PHCycleResult {
  refrigerantId: string;
  points: Record<'1' | '2' | '3' | '4', PHPoint>;
  superheatK: string;
  subcoolingK: string;
  point4Assumption: string;
  sourceIds: string[];
  dataVersion: string;
  provider: typeof phMetadata;
}

export class PHPhaseBoundaryError extends Error {
  constructor(
    readonly point: '1' | '2' | '3',
    readonly phase: Phase,
    readonly temperatureC: number,
    readonly saturationTemperatureC: number,
    readonly pressureBarAbsolute: number,
    readonly offsetK: number,
  ) {
    super('ph_two_phase_or_boundary');
    this.name = 'PHPhaseBoundaryError';
  }
}

const printable = (value: number): string => Number(value.toPrecision(10)).toString();
function offsets(plane: GridPlane, phase: Phase) { return plane.sides[phase]; }
function offsetRange(grid: Grid, phase: Phase): [number, number] {
  const rows = grid.planes.flatMap((plane) => offsets(plane, phase));
  return [Math.min(...rows.map((row) => row[0]!)), Math.max(...rows.map((row) => row[0]!))];
}
export function getPHAvailability(refrigerantId: string): PHAvailability {
  const grid = table.grids[refrigerantId];
  if (!grid) return { supported: false, dataVersion: table.dataVersion, sourceIds: [...phMetadata.sourceIds] };
  return {
    supported: true,
    minimumPressureBarAbsolute: String(grid.planes[0]!.pressureBarAbsolute),
    maximumPressureBarAbsolute: String(grid.planes.at(-1)!.pressureBarAbsolute),
    vapourOffsetRangeK: offsetRange(grid, 'vapour'),
    liquidOffsetRangeK: offsetRange(grid, 'liquid'),
    coolPropFluid: grid.coolPropFluid,
    dataVersion: table.dataVersion,
    sourceIds: [...phMetadata.sourceIds],
  };
}
export function getPHDiagram(refrigerantId: string): PHDiagram | null {
  const grid = table.grids[refrigerantId];
  if (!grid) return null;
  return {
    refrigerantId,
    dome: grid.planes.map((plane) => ({
      pressureBarAbsolute: String(plane.pressureBarAbsolute),
      bubbleTemperatureC: String(plane.bubbleTemperatureC),
      dewTemperatureC: String(plane.dewTemperatureC),
      liquidEnthalpyKJkg: String(plane.liquidEnthalpyKJkg),
      vapourEnthalpyKJkg: String(plane.vapourEnthalpyKJkg),
    })),
    isolines: isolineTable.curves[refrigerantId] ?? [],
    availability: getPHAvailability(refrigerantId), provider: phMetadata,
  };
}

function bracket<T>(rows: T[], value: number, accessor: (row: T) => number): [T, T, number] | null {
  if (rows.length < 2 || value < accessor(rows[0]!) || value > accessor(rows.at(-1)!)) return null;
  for (let index = 0; index < rows.length - 1; index++) {
    const left = rows[index]!;
    const right = rows[index + 1]!;
    const a = accessor(left);
    const b = accessor(right);
    if (value >= a && value <= b) return [left, right, (value - a) / (b - a)];
  }
  return null;
}
function lerp(a: number, b: number, fraction: number) { return a + (b - a) * fraction; }
function atPressure(grid: Grid, pressureBarAbsolute: number) {
  const pair = bracket(grid.planes, Math.log(pressureBarAbsolute), (row) => Math.log(row.pressureBarAbsolute));
  if (!pair) throw new Error('ph_out_of_range');
  return pair;
}
function domeAt(pair: [GridPlane, GridPlane, number]) {
  const [a, b, fraction] = pair;
  return {
    bubbleTemperatureC: lerp(a.bubbleTemperatureC, b.bubbleTemperatureC, fraction),
    dewTemperatureC: lerp(a.dewTemperatureC, b.dewTemperatureC, fraction),
    liquidEnthalpyKJkg: lerp(a.liquidEnthalpyKJkg, b.liquidEnthalpyKJkg, fraction),
    vapourEnthalpyKJkg: lerp(a.vapourEnthalpyKJkg, b.vapourEnthalpyKJkg, fraction),
  };
}
function kelvinToCelsius(input: TemperatureQuantity): number {
  const value = parseDecimal(input.value).toNumber();
  const celsius = input.unit === 'F' ? (value - 32) * 5 / 9 : value;
  if (celsius < -273.15) throw new Error('ph_invalid_temperature');
  return celsius;
}
function singlePhaseEnthalpy(pair: [GridPlane, GridPlane, number], phase: Phase, temperatureC: number, point: '1' | '2' | '3', pressureBarAbsolute: number): number {
  const dome = domeAt(pair);
  const delta = phase === 'vapour' ? temperatureC - dome.dewTemperatureC : dome.bubbleTemperatureC - temperatureC;
  if (delta < 1) throw new PHPhaseBoundaryError(point, phase, temperatureC,
    phase === 'vapour' ? dome.dewTemperatureC : dome.bubbleTemperatureC,
    pressureBarAbsolute, delta);
  const values = ([pair[0], pair[1]] as GridPlane[]).map((plane) => {
    const samples = offsets(plane, phase);
    const local = bracket(samples, delta, (row) => row[0]!);
    if (!local) throw new Error('ph_out_of_range');
    return lerp(local[0][1]!, local[1][1]!, local[2]);
  });
  return lerp(values[0]!, values[1]!, pair[2]);
}
export function calculatePHCycle(input: PHCycleInput): PHCycleResult {
  const grid = table.grids[input.refrigerantId];
  if (!grid) throw new Error('ph_unsupported_refrigerant');
  const low = parseDecimal(convertPressure(input.lowPressure, 'bar(a)', input.atmosphere)).toNumber();
  const high = parseDecimal(convertPressure(input.highPressure, 'bar(a)', input.atmosphere)).toNumber();
  if (low <= 0 || high <= 0) throw new Error('nonpositive_absolute_pressure');
  if (high <= low) throw new Error('ph_high_pressure_must_exceed_low');
  const lowPair = atPressure(grid, low);
  const highPair = atPressure(grid, high);
  const lowDome = domeAt(lowPair);
  const lowDew = offlinePTProvider.temperatureAtPressure(input.refrigerantId, String(low), 'dew');
  const lowBubble = offlinePTProvider.temperatureAtPressure(input.refrigerantId, String(low), 'bubble');
  const highBubble = offlinePTProvider.temperatureAtPressure(input.refrigerantId, String(high), 'bubble');
  if (!lowDew || !lowBubble || !highBubble) throw new Error('ph_out_of_range');
  const t1 = kelvinToCelsius(input.T1);
  const t2 = kelvinToCelsius(input.T2);
  const t3 = kelvinToCelsius(input.T3);
  const h1 = singlePhaseEnthalpy(lowPair, 'vapour', t1, '1', low);
  const h2 = singlePhaseEnthalpy(highPair, 'vapour', t2, '2', high);
  const h3 = singlePhaseEnthalpy(highPair, 'liquid', t3, '3', high);
  if (h2 <= h1) throw new Error('ph_discharge_enthalpy_must_exceed_suction');
  if (h3 < lowDome.liquidEnthalpyKJkg || h3 > lowDome.vapourEnthalpyKJkg) throw new Error('ph_point4_outside_two_phase');
  const point = (label: '1' | '2' | '3', phase: Phase, pressure: number, temperature: number, enthalpy: number): PHPoint => ({
    label, phase, pressureBarAbsolute: printable(pressure), temperatureC: printable(temperature), enthalpyKJkg: printable(enthalpy),
  });
  return {
    refrigerantId: input.refrigerantId,
    points: {
      '1': point('1', 'vapour', low, t1, h1),
      '2': point('2', 'vapour', high, t2, h2),
      '3': point('3', 'liquid', high, t3, h3),
      '4': { label: '4', phase: 'two-phase', pressureBarAbsolute: printable(low), enthalpyKJkg: printable(h3),
        temperatureC: null, temperatureBoundsC: [lowBubble.temperatureC, lowDew.temperatureC] },
    },
    superheatK: printable(t1 - Number(lowDew.temperatureC)),
    subcoolingK: printable(Number(highBubble.temperatureC) - t3),
    point4Assumption: phMetadata.point4Assumption,
    sourceIds: [...phMetadata.sourceIds], dataVersion: table.dataVersion, provider: phMetadata,
  };
}
