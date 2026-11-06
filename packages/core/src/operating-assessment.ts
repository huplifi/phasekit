import { offlinePTProvider, getPTAvailability, type SaturationSide } from './pt';
import {
  convertPressure,
  parseDecimal,
  type AtmosphericReference,
  type PressureUnit,
} from './units';

export type AssessmentLocale = 'fi' | 'en';
export type AssessmentSystem = 'air_air' | 'dx_cooling' | 'hydronic' | 'industrial';
export type AssessmentMode = 'cooling' | 'heating';
export type PortRole = 'suction' | 'hot_gas' | 'liquid' | 'unknown';
export type EvaporatorStyle = 'dx' | 'flooded' | 'unknown';
export type OperatingStability = 'unknown' | 'just_started' | 'running' | 'oem_stable' | 'defrost';
export type CapacityState = 'unknown' | 'reduced' | 'full';
export type AssessmentField =
  | 'atmosphere'
  | 'primaryPressure'
  | 'primaryUncertainty'
  | 'primaryTemperature'
  | 'secondaryPressure'
  | 'secondaryUncertainty'
  | 'secondaryTemperature'
  | 'indoorAir'
  | 'outdoorAir'
  | 'processTemperature'
  | 'oemSuction'
  | 'oemHigh'
  | 'oemSuperheat'
  | 'oemSubcooling';
export type AssessmentFieldErrorCode =
  | 'invalid_number'
  | 'below_absolute_zero'
  | 'nonpositive_absolute'
  | 'invalid_uncertainty'
  | 'invalid_atmosphere'
  | 'atmosphere_required';
export type ReadingRegime =
  | 'transcritical'
  | 'saturated'
  | 'out_of_domain'
  | 'unsupported'
  | 'no_refrigerant'
  | 'invalid';
export type HypothesisStrength = 'open' | 'supported' | 'weakened';

export interface Copy {
  fi: string;
  en: string;
}
export interface AssessmentPressureInput {
  value: string;
  unit: PressureUnit;
  uncertainty?: string;
  role: PortRole;
  pipeTemperatureC?: string;
}
export interface OperatingAssessmentInput {
  refrigerantId?: string;
  criticalTemperatureC?: string;
  criticalPressureBarAbsolute?: string;
  criticalSourceIds?: string[];
  system: AssessmentSystem;
  mode: AssessmentMode;
  evaporatorStyle?: EvaporatorStyle;
  atmosphere?: AtmosphericReference;
  primary?: AssessmentPressureInput;
  secondary?: AssessmentPressureInput;
  indoorAirC?: string;
  outdoorAirC?: string;
  processTemperatureC?: string;
  stability?: OperatingStability;
  capacity?: CapacityState;
  modelName?: string;
  oemSuctionPressure?: string;
  oemHighPressure?: string;
  oemSuperheatK?: string;
  oemSubcoolingK?: string;
}
export interface AssessmentFieldError {
  field: AssessmentField;
  code: AssessmentFieldErrorCode;
}
export interface AssessmentReading {
  id: 'primary' | 'secondary';
  role: PortRole;
  entered: string;
  unit: PressureUnit;
  absoluteBar?: string;
  uncertaintyBar?: string;
  regime: ReadingRegime;
  dewC?: string;
  bubbleC?: string;
}
export interface AssessmentQuantity {
  id:
    | 'saturation_dew'
    | 'saturation_bubble'
    | 'glide'
    | 'suction_superheat'
    | 'subcooling'
    | 'hot_gas_above_dew'
    | 'approach'
    | 'lift';
  readingId: 'primary' | 'secondary';
  value: string;
  low?: string;
  high?: string;
  medium?: 'indoor' | 'outdoor' | 'process';
}
export interface AssessmentFocus {
  label: Copy;
  value: Copy;
  unit: Copy;
  note?: Copy;
}
export interface AssessmentRow {
  label: Copy;
  value: Copy;
}
export interface AssessmentHypothesis {
  id: string;
  strength: HypothesisStrength;
  strengthLabel: Copy;
  title: Copy;
  text: Copy;
  differentiate: Copy;
  evidence: Copy;
}
export interface AssessmentReference {
  title: Copy;
  url: string;
  note: Copy;
}
export interface OperatingAssessmentResult {
  readings: AssessmentReading[];
  quantities: AssessmentQuantity[];
  focus?: AssessmentFocus;
  rows: AssessmentRow[];
  summary: Copy[];
  hypotheses: AssessmentHypothesis[];
  checks: Copy[];
  technical: Copy[];
  efficiency: Copy[];
  references: AssessmentReference[];
  fieldErrors: AssessmentFieldError[];
  circuit: {
    layout: 'split' | 'industrial';
    highSide: 'condenser' | 'gas_cooler' | 'unresolved';
  };
  criticalSourceIds: string[];
  ptSourceIds: string[];
  model: {
    dataVersion: string;
    toleranceTemperatureC: string;
    toleranceRelativePressure?: string;
    sourceUrl?: string;
  };
}

interface NormalizedReading extends AssessmentReading {
  pipeC?: string;
  dewLowC?: string;
  dewHighC?: string;
  bubbleLowC?: string;
  bubbleHighC?: string;
}
interface Medium {
  temp: string;
  kind: 'indoor' | 'outdoor' | 'process';
}
interface Context {
  input: OperatingAssessmentInput;
  readings: NormalizedReading[];
  primary?: NormalizedReading;
  secondary?: NormalizedReading;
  suction?: NormalizedReading;
  liquid?: NormalizedReading;
  hotGas?: NormalizedReading;
  transcriticalHigh?: NormalizedReading;
  quantities: AssessmentQuantity[];
  sh?: AssessmentQuantity;
  sc?: AssessmentQuantity;
  hotDelta?: AssessmentQuantity;
  glide?: AssessmentQuantity;
  approach?: AssessmentQuantity;
  lift?: AssessmentQuantity;
  cooled?: Medium;
  rejection?: Medium;
  oemSuctionBar?: string;
  oemHighBar?: string;
  oemSuperheatK?: string;
  oemSubcoolingK?: string;
  style: EvaporatorStyle;
  stability: OperatingStability;
  capacity: CapacityState;
}

const COLE_PARMER = 'https://www.coleparmer.co.uk/tech-article/troubleshooting-hvac-r-systems';
const DANFOSS_INDUSTRIAL = 'https://assets.danfoss.com/documents/470491/AB137786416217en-000801.pdf';
const MITSUBISHI_EXAMPLE =
  'https://www.meiersupply.com/customer/docs/skudocs/Document_Links/Vendors/106835%20-%20Mitsubishi/MITSU%20FS%20DOCS/FS06NAHMANUAL.pdf';
const HONEYWELL_R449A =
  'https://prod-edam.honeywell.com/content/dam/honeywell-edam/pmt/oneam/en-us/refrigerants/documents/hon-ess-am-3161690-adm-tds-pt-chart-solstice-449a-a4-en.pdf';

export function suggestedPortRole(system: AssessmentSystem, mode: AssessmentMode): PortRole {
  if (system === 'industrial') return 'unknown';
  if (system === 'dx_cooling') return 'suction';
  return mode === 'heating' ? 'hot_gas' : 'suction';
}

export function assessOperation(input: OperatingAssessmentInput): OperatingAssessmentResult {
  const errors: AssessmentFieldError[] = [];
  const atmosphere = readAtmosphere(input.atmosphere, errors);
  const primary = normalizeReading('primary', input.primary, input, atmosphere, errors);
  const secondary = normalizeReading('secondary', input.secondary, input, atmosphere, errors);
  const readings = [primary, secondary].filter((item): item is NormalizedReading => Boolean(item));
  const ctx = buildContext(input, readings, atmosphere, errors);
  const summary = paired(locale => summaryLines(ctx, locale));
  const hypotheses = hypothesisDrafts(ctx).map(finishHypothesis);
  return {
    readings: readings.map(publicReading),
    quantities: ctx.quantities,
    focus: buildFocus(ctx),
    rows: buildRows(ctx),
    summary,
    hypotheses,
    checks: paired(locale => checks(ctx, locale)).slice(0, 3),
    technical: paired(locale => technicalLines(ctx, locale)),
    efficiency: paired(locale => efficiencyLines(ctx, locale)),
    references: references(input.refrigerantId),
    fieldErrors: errors,
    circuit: {
      layout: input.system === 'industrial' ? 'industrial' : 'split',
      highSide: highSideKind(input.refrigerantId, readings),
    },
    criticalSourceIds: input.criticalPressureBarAbsolute ? [...(input.criticalSourceIds ?? [])] : [],
    ptSourceIds: [...offlinePTProvider.metadata.sourceIds],
    model: {
      dataVersion: offlinePTProvider.metadata.dataVersion,
      toleranceTemperatureC: offlinePTProvider.metadata.toleranceTemperatureC,
      toleranceRelativePressure: offlinePTProvider.metadata.toleranceRelativePressure,
      sourceUrl: offlinePTProvider.metadata.sourceUrl,
    },
  };
}

export function assessmentPlainText(result: OperatingAssessmentResult, locale: AssessmentLocale): string {
  return [
    result.focus?.label[locale],
    result.focus?.value[locale],
    result.focus?.note?.[locale],
    ...result.summary.map(item => item[locale]),
    ...result.hypotheses.flatMap(item => [item.title[locale], item.strengthLabel[locale], item.text[locale], item.differentiate[locale]]),
    ...result.checks.map(item => item[locale]),
    ...result.technical.map(item => item[locale]),
    ...result.efficiency.map(item => item[locale]),
  ].filter((item): item is string => Boolean(item)).join('\n');
}

function buildContext(
  input: OperatingAssessmentInput,
  readings: NormalizedReading[],
  atmosphere: AtmosphericReference | undefined,
  errors: AssessmentFieldError[],
): Context {
  const primary = readings.find(item => item.id === 'primary');
  const secondary = readings.find(item => item.id === 'secondary');
  const suction = readings.find(item => item.role === 'suction' && item.regime !== 'invalid');
  const liquid = readings.find(item => item.role === 'liquid' && item.regime !== 'invalid');
  const hotGas = readings.find(item => item.role === 'hot_gas' && item.regime !== 'invalid');
  const quantities: AssessmentQuantity[] = [];
  for (const reading of readings) addReadingQuantities(reading, quantities);
  const sh = quantities.find(item => item.id === 'suction_superheat');
  const sc = quantities.find(item => item.id === 'subcooling');
  const hotDelta = quantities.find(item => item.id === 'hot_gas_above_dew');
  const glide = quantities.find(item => item.id === 'glide' && item.readingId === (primary?.id ?? secondary?.id));
  const cooled = cooledMedium(input, errors);
  const rejection = rejectionMedium(input, errors);
  if (suction?.dewC && cooled) {
    quantities.push({
      id: 'approach',
      readingId: suction.id,
      value: parseDecimal(cooled.temp).minus(parseDecimal(suction.dewC)).toString(),
      medium: cooled.kind,
    });
  }
  const highForLift = liquid?.regime === 'saturated' && liquid.bubbleC
    ? liquid
    : hotGas?.regime === 'saturated' && hotGas.bubbleC
      ? hotGas
      : undefined;
  if (suction?.dewC && highForLift?.bubbleC) {
    quantities.push({
      id: 'lift',
      readingId: suction.id,
      value: parseDecimal(highForLift.bubbleC).minus(parseDecimal(suction.dewC)).toString(),
    });
  }
  const unit = primary?.unit ?? secondary?.unit;
  return {
    input,
    readings,
    primary,
    secondary,
    suction,
    liquid,
    hotGas,
    transcriticalHigh: readings.find(item =>
      (item.role === 'hot_gas' || item.role === 'liquid') && item.regime === 'transcritical'),
    quantities,
    sh,
    sc,
    hotDelta,
    glide,
    approach: quantities.find(item => item.id === 'approach'),
    lift: quantities.find(item => item.id === 'lift'),
    cooled,
    rejection,
    oemSuctionBar: oemBar(input.oemSuctionPressure, 'oemSuction', unit, atmosphere, errors),
    oemHighBar: oemBar(input.oemHighPressure, 'oemHigh', unit, atmosphere, errors),
    oemSuperheatK: oemDifference(input.oemSuperheatK, 'oemSuperheat', errors),
    oemSubcoolingK: oemDifference(input.oemSubcoolingK, 'oemSubcooling', errors),
    style: input.evaporatorStyle ?? 'unknown',
    stability: input.stability ?? 'unknown',
    capacity: input.capacity ?? 'unknown',
  };
}

function addReadingQuantities(reading: NormalizedReading, quantities: AssessmentQuantity[]) {
  if (reading.dewC) {
    quantities.push(bandQuantity('saturation_dew', reading, reading.dewC, reading.dewLowC, reading.dewHighC));
  }
  if (reading.bubbleC && (!reading.dewC || glideOf(reading) >= 0.05 || reading.role === 'liquid')) {
    quantities.push(bandQuantity('saturation_bubble', reading, reading.bubbleC, reading.bubbleLowC, reading.bubbleHighC));
  }
  const glide = glideOf(reading);
  if (reading.dewC && reading.bubbleC && glide >= 0.05) {
    quantities.push({ id: 'glide', readingId: reading.id, value: String(glide) });
  }
  if (reading.role === 'suction' && reading.pipeC && reading.dewC) {
    quantities.push(differenceQuantity('suction_superheat', reading, reading.pipeC, reading.dewC, reading.dewLowC, reading.dewHighC));
  }
  if (reading.role === 'liquid' && reading.pipeC && reading.bubbleC && reading.regime === 'saturated') {
    const value = parseDecimal(reading.bubbleC).minus(parseDecimal(reading.pipeC));
    const low = reading.bubbleLowC ? parseDecimal(reading.bubbleLowC).minus(parseDecimal(reading.pipeC)) : undefined;
    const high = reading.bubbleHighC ? parseDecimal(reading.bubbleHighC).minus(parseDecimal(reading.pipeC)) : undefined;
    quantities.push(optionalBand('subcooling', reading.id, value.toString(), low?.toString(), high?.toString()));
  }
  if (reading.role === 'hot_gas' && reading.pipeC && reading.dewC && reading.regime === 'saturated') {
    quantities.push(differenceQuantity('hot_gas_above_dew', reading, reading.pipeC, reading.dewC, reading.dewLowC, reading.dewHighC));
  }
}

function differenceQuantity(
  id: 'suction_superheat' | 'hot_gas_above_dew',
  reading: NormalizedReading,
  pipeC: string,
  dewC: string,
  dewLowC: string | undefined,
  dewHighC: string | undefined,
): AssessmentQuantity {
  const value = parseDecimal(pipeC).minus(parseDecimal(dewC));
  const low = dewHighC ? parseDecimal(pipeC).minus(parseDecimal(dewHighC)) : undefined;
  const high = dewLowC ? parseDecimal(pipeC).minus(parseDecimal(dewLowC)) : undefined;
  return optionalBand(id, reading.id, value.toString(), low?.toString(), high?.toString());
}

function bandQuantity(
  id: 'saturation_dew' | 'saturation_bubble',
  reading: NormalizedReading,
  value: string,
  low: string | undefined,
  high: string | undefined,
): AssessmentQuantity {
  return optionalBand(id, reading.id, value, low, high);
}

function optionalBand(
  id: AssessmentQuantity['id'],
  readingId: AssessmentQuantity['readingId'],
  value: string,
  low?: string,
  high?: string,
): AssessmentQuantity {
  return {
    id,
    readingId,
    value,
    ...(low ? { low } : {}),
    ...(high ? { high } : {}),
  };
}

function glideOf(reading: NormalizedReading): number {
  if (!reading.dewC || !reading.bubbleC) return 0;
  return parseDecimal(reading.dewC).minus(parseDecimal(reading.bubbleC)).toNumber();
}

function normalizeReading(
  id: 'primary' | 'secondary',
  raw: AssessmentPressureInput | undefined,
  input: OperatingAssessmentInput,
  atmosphere: AtmosphericReference | undefined,
  errors: AssessmentFieldError[],
): NormalizedReading | undefined {
  if (!raw) return undefined;
  const pressure = readNumber(raw.value);
  if (pressure.state === 'empty') return undefined;
  const pressureField = id === 'primary' ? 'primaryPressure' : 'secondaryPressure';
  const uncertaintyField = id === 'primary' ? 'primaryUncertainty' : 'secondaryUncertainty';
  const temperatureField = id === 'primary' ? 'primaryTemperature' : 'secondaryTemperature';
  const pipeC = readTemperature(raw.pipeTemperatureC, temperatureField, errors);
  if (pressure.state === 'invalid') {
    errors.push({ field: pressureField, code: 'invalid_number' });
    return { id, role: raw.role, entered: raw.value, unit: raw.unit, regime: 'invalid', ...(pipeC ? { pipeC } : {}) };
  }
  const uncertainty = readUncertainty(raw.uncertainty, uncertaintyField, errors);
  const gauge = raw.unit.endsWith('(g)');
  if (gauge && !atmosphere) {
    errors.push({ field: pressureField, code: 'atmosphere_required' });
    return { id, role: raw.role, entered: pressure.value.toString(), unit: raw.unit, regime: 'invalid', ...(pipeC ? { pipeC } : {}) };
  }
  let absolute: string;
  try {
    absolute = convertPressure({ value: pressure.value.toString(), unit: raw.unit }, 'bar(a)', atmosphere);
  } catch (error) {
    const code = error instanceof Error && error.message === 'negative_absolute_pressure'
      ? 'nonpositive_absolute'
      : 'invalid_atmosphere';
    errors.push({ field: pressureField, code });
    return { id, role: raw.role, entered: pressure.value.toString(), unit: raw.unit, regime: 'invalid', ...(pipeC ? { pipeC } : {}) };
  }
  if (parseDecimal(absolute).lte(0)) {
    errors.push({ field: pressureField, code: 'nonpositive_absolute' });
    return { id, role: raw.role, entered: pressure.value.toString(), unit: raw.unit, absoluteBar: absolute, regime: 'invalid', ...(pipeC ? { pipeC } : {}) };
  }
  const uncertaintyBar = uncertainty ? pressureDeltaBar(uncertainty, raw.unit) : undefined;
  const sides = saturate(input, absolute, uncertaintyBar);
  return {
    id,
    role: raw.role,
    entered: pressure.value.toString(),
    unit: raw.unit,
    absoluteBar: absolute,
    ...(uncertaintyBar ? { uncertaintyBar } : {}),
    regime: regimeFor(input, absolute, sides),
    ...(sides.dew ? { dewC: sides.dew } : {}),
    ...(sides.bubble ? { bubbleC: sides.bubble } : {}),
    ...(sides.dewLow ? { dewLowC: sides.dewLow } : {}),
    ...(sides.dewHigh ? { dewHighC: sides.dewHigh } : {}),
    ...(sides.bubbleLow ? { bubbleLowC: sides.bubbleLow } : {}),
    ...(sides.bubbleHigh ? { bubbleHighC: sides.bubbleHigh } : {}),
    ...(pipeC ? { pipeC } : {}),
  };
}

function saturate(
  input: OperatingAssessmentInput,
  absoluteBar: string,
  uncertaintyBar: string | undefined,
) {
  const dew = lookupSide(input, absoluteBar, 'dew');
  const bubble = lookupSide(input, absoluteBar, 'bubble');
  if (!uncertaintyBar) return { dew, bubble };
  const lowPressure = parseDecimal(absoluteBar).minus(parseDecimal(uncertaintyBar));
  const highPressure = parseDecimal(absoluteBar).plus(parseDecimal(uncertaintyBar));
  const low = lowPressure.lte(0) ? undefined : lowPressure.toString();
  const high = highPressure.toString();
  return {
    dew,
    bubble,
    ...(low && lookupSide(input, low, 'dew') ? { dewLow: lookupSide(input, low, 'dew') } : {}),
    ...(lookupSide(input, high, 'dew') ? { dewHigh: lookupSide(input, high, 'dew') } : {}),
    ...(low && lookupSide(input, low, 'bubble') ? { bubbleLow: lookupSide(input, low, 'bubble') } : {}),
    ...(lookupSide(input, high, 'bubble') ? { bubbleHigh: lookupSide(input, high, 'bubble') } : {}),
  };
}

function lookupSide(input: OperatingAssessmentInput, absoluteBar: string, side: SaturationSide): string | undefined {
  if (!input.refrigerantId || !getPTAvailability(input.refrigerantId, side).supported) return undefined;
  const pressure = parseDecimal(absoluteBar);
  if (pressure.lte(0)) return undefined;
  if (input.criticalPressureBarAbsolute && pressure.gte(parseDecimal(input.criticalPressureBarAbsolute))) return undefined;
  try {
    return offlinePTProvider.temperatureAtPressure(input.refrigerantId, pressure.toString(), side)?.temperatureC;
  } catch {
    return undefined;
  }
}

function regimeFor(
  input: OperatingAssessmentInput,
  absoluteBar: string,
  sides: { dew?: string; bubble?: string },
): ReadingRegime {
  if (!input.refrigerantId) return 'no_refrigerant';
  if (input.criticalPressureBarAbsolute && parseDecimal(absoluteBar).gte(parseDecimal(input.criticalPressureBarAbsolute))) {
    return 'transcritical';
  }
  if (!getPTAvailability(input.refrigerantId).supported) return 'unsupported';
  if (!sides.dew && !sides.bubble) return 'out_of_domain';
  return 'saturated';
}

function highSideKind(refrigerantId: string | undefined, readings: NormalizedReading[]): 'condenser' | 'gas_cooler' | 'unresolved' {
  const high = readings.find(item => item.role === 'hot_gas' || item.role === 'liquid');
  if (high?.regime === 'transcritical') return 'gas_cooler';
  if (refrigerantId === 'r744' && high?.regime !== 'saturated') return 'unresolved';
  return 'condenser';
}

function cooledMedium(input: OperatingAssessmentInput, errors: AssessmentFieldError[]): Medium | undefined {
  if (input.system === 'industrial') return medium(input.processTemperatureC, 'processTemperature', 'process', errors);
  if (input.mode === 'heating') return medium(input.outdoorAirC, 'outdoorAir', 'outdoor', errors);
  if (input.system === 'hydronic') return undefined;
  return medium(input.indoorAirC, 'indoorAir', 'indoor', errors);
}

function rejectionMedium(input: OperatingAssessmentInput, errors: AssessmentFieldError[]): Medium | undefined {
  if (input.system === 'industrial') return undefined;
  if (input.mode === 'heating') {
    if (input.system === 'hydronic') return undefined;
    return medium(input.indoorAirC, 'indoorAir', 'indoor', errors);
  }
  return medium(input.outdoorAirC, 'outdoorAir', 'outdoor', errors);
}

function medium(
  value: string | undefined,
  field: AssessmentField,
  kind: Medium['kind'],
  errors: AssessmentFieldError[],
): Medium | undefined {
  const temp = readTemperature(value, field, errors);
  return temp ? { temp, kind } : undefined;
}

function readAtmosphere(
  atmosphere: AtmosphericReference | undefined,
  errors: AssessmentFieldError[],
): AtmosphericReference | undefined {
  if (!atmosphere) return undefined;
  const value = readNumber(atmosphere.value);
  if (value.state !== 'ok' || value.value.lte(0)) {
    errors.push({ field: 'atmosphere', code: 'invalid_atmosphere' });
    return undefined;
  }
  return { value: value.value.toString(), unit: atmosphere.unit };
}

function readUncertainty(
  value: string | undefined,
  field: AssessmentField,
  errors: AssessmentFieldError[],
): string | undefined {
  const read = readNumber(value);
  if (read.state === 'empty') return undefined;
  if (read.state === 'invalid' || read.value.lte(0)) {
    errors.push({ field, code: 'invalid_uncertainty' });
    return undefined;
  }
  return read.value.toString();
}

function readTemperature(
  value: string | undefined,
  field: AssessmentField,
  errors: AssessmentFieldError[],
): string | undefined {
  const read = readNumber(value);
  if (read.state === 'empty') return undefined;
  if (read.state === 'invalid') {
    errors.push({ field, code: 'invalid_number' });
    return undefined;
  }
  if (read.value.lt('-273.15')) {
    errors.push({ field, code: 'below_absolute_zero' });
    return undefined;
  }
  return read.value.toString();
}

function oemBar(
  value: string | undefined,
  field: AssessmentField,
  unit: PressureUnit | undefined,
  atmosphere: AtmosphericReference | undefined,
  errors: AssessmentFieldError[],
): string | undefined {
  const read = readNumber(value);
  if (read.state === 'empty' || !unit) return undefined;
  if (read.state === 'invalid') {
    errors.push({ field, code: 'invalid_number' });
    return undefined;
  }
  if (unit.endsWith('(g)') && !atmosphere) return undefined;
  try {
    const absolute = convertPressure({ value: read.value.toString(), unit }, 'bar(a)', atmosphere);
    if (parseDecimal(absolute).lte(0)) {
      errors.push({ field, code: 'nonpositive_absolute' });
      return undefined;
    }
    return absolute;
  } catch {
    errors.push({ field, code: 'invalid_number' });
    return undefined;
  }
}

function oemDifference(value: string | undefined, field: AssessmentField, errors: AssessmentFieldError[]): string | undefined {
  const read = readNumber(value);
  if (read.state === 'empty') return undefined;
  if (read.state === 'invalid') {
    errors.push({ field, code: 'invalid_number' });
    return undefined;
  }
  return read.value.toString();
}

function pressureDeltaBar(value: string, unit: PressureUnit): string {
  const absoluteUnit = `${unit.slice(0, unit.indexOf('('))}(a)` as PressureUnit;
  return convertPressure({ value, unit: absoluteUnit }, 'bar(a)');
}

function readNumber(value: string | undefined): { state: 'empty' } | { state: 'invalid' } | { state: 'ok'; value: ReturnType<typeof parseDecimal> } {
  const trimmed = value?.trim() ?? '';
  if (!trimmed || /^[+-]?$|^[+-]?[.,]$/.test(trimmed)) return { state: 'empty' };
  try {
    return { state: 'ok', value: parseDecimal(trimmed) };
  } catch {
    return { state: 'invalid' };
  }
}

function publicReading(reading: NormalizedReading): AssessmentReading {
  return {
    id: reading.id,
    role: reading.role,
    entered: reading.entered,
    unit: reading.unit,
    ...(reading.absoluteBar ? { absoluteBar: reading.absoluteBar } : {}),
    ...(reading.uncertaintyBar ? { uncertaintyBar: reading.uncertaintyBar } : {}),
    regime: reading.regime,
    ...(reading.dewC ? { dewC: reading.dewC } : {}),
    ...(reading.bubbleC ? { bubbleC: reading.bubbleC } : {}),
  };
}

function summaryLines(ctx: Context, locale: AssessmentLocale): string[] {
  const lines: string[] = [];
  if (ctx.stability === 'defrost') {
    lines.push(locale === 'fi'
      ? 'Sulatus ei ole vakaata jäähdytystä tai lämmitystä. Täytöstä ei päätetä sulatuksen paineesta.'
      : 'Defrost is not steady cooling or heating. Do not judge the charge from a defrost pressure.');
  } else if (ctx.stability === 'just_started') {
    lines.push(locale === 'fi'
      ? 'Käynti on merkitty juuri alkaneeksi. Vakaa tila luetaan laitteen ohjeesta, ei yleisestä minuuttimäärästä.'
      : 'Operation is marked as just started. Steady state comes from the equipment instruction, not a universal number of minutes.');
  }
  const lead = ctx.primary ?? ctx.secondary;
  if (lead) lines.push(readingSentence(ctx, lead, locale));
  if (ctx.secondary && ctx.secondary !== lead) {
    if (ctx.secondary.regime === 'transcritical' || ctx.secondary.role !== lead?.role) {
      lines.push(readingSentence(ctx, ctx.secondary, locale));
    }
  }
  const comparison = comparisonSentence(ctx, locale);
  if (comparison) lines.push(comparison);
  else if (ctx.approach && ctx.cooled) lines.push(approachSentence(ctx, locale));
  const leadHypothesis = hypothesisSentence(ctx, locale);
  if (leadHypothesis) lines.push(leadHypothesis);
  return lines.slice(0, 4);
}

function readingSentence(ctx: Context, reading: NormalizedReading, locale: AssessmentLocale): string {
  const p = enteredPressure(reading, locale);
  const abs = reading.absoluteBar ? `${num(reading.absoluteBar, 3, locale)} bar(a)` : '';
  if (reading.regime === 'invalid') {
    return locale === 'fi' ? `Painetta ${p} ei muunnettu.` : `Pressure ${p} was not converted.`;
  }
  if (reading.regime === 'no_refrigerant') {
    return locale === 'fi'
      ? `Paine ${p} on kirjattu${abs ? ` (${abs})` : ''}. Kyllästyslämpötila lasketaan, kun kylmäaine on valittu.`
      : `Pressure ${p} is recorded${abs ? ` (${abs})` : ''}. Saturation temperature is calculated once a refrigerant is selected.`;
  }
  if (reading.regime === 'unsupported') {
    return locale === 'fi'
      ? `Paine ${p} on kirjattu. Tälle kylmäaineelle ei ole kyllästystaulua, joten painetta ei muuteta lämpötilaksi.`
      : `Pressure ${p} is recorded. This refrigerant has no saturation table, so the pressure is not turned into a temperature.`;
  }
  if (reading.regime === 'transcritical') {
    const critical = ctx.input.criticalPressureBarAbsolute
      ? num(ctx.input.criticalPressureBarAbsolute, 2, locale)
      : '';
    const base = locale === 'fi'
      ? `Paine ${p} on ${abs}. Se on kriittisen paineen ${critical} bar(a) yläpuolella, joten kyllästyslämpötilaa ei ole.`
      : `Pressure ${p} is ${abs}. It is above the critical pressure ${critical} bar(a), so there is no saturation temperature.`;
    const gasCooler = reading.role === 'hot_gas' || reading.role === 'liquid';
    if (!gasCooler) return base;
    return locale === 'fi'
      ? `${base} Korkeapainepuoli on kaasujäähdytin, ei lauhdutin. Alijäähdytystä ei lasketa.`
      : `${base} The high side is a gas cooler, not a condenser. Subcooling is not calculated.`;
  }
  if (reading.regime === 'out_of_domain') {
    const belowCritical = ctx.input.criticalPressureBarAbsolute
      && reading.absoluteBar
      && parseDecimal(reading.absoluteBar).lt(parseDecimal(ctx.input.criticalPressureBarAbsolute));
    if (belowCritical) {
      const critical = num(ctx.input.criticalPressureBarAbsolute!, 2, locale);
      return locale === 'fi'
        ? `Paine ${abs} on kyllästystaulun yläpuolella mutta kriittisen paineen ${critical} bar(a) alapuolella. Lämpötilaa ei ekstrapoloida, eikä painetta nimetä ylikriittiseksi.`
        : `Pressure ${abs} is above the saturation table but below the critical pressure ${critical} bar(a). The temperature is not extrapolated, and the pressure is not called transcritical.`;
    }
    return locale === 'fi'
      ? `Paine ${abs} on kyllästystaulun ulkopuolella. Taulua ei jatketa alueen yli.`
      : `Pressure ${abs} is outside the saturation table. The table is not extended past its range.`;
  }
  if (reading.role !== 'liquid' && !reading.dewC) {
    return locale === 'fi'
      ? `Paine ${p} on ${abs}. Kastepistettä ei ole taulussa tällä paineella, joten tulistusta ei lasketa.`
      : `Pressure ${p} is ${abs}. The dew point is not in the table at this pressure, so superheat is not calculated.`;
  }
  if (reading.role === 'liquid' && !reading.bubbleC) {
    return locale === 'fi'
      ? `Paine ${p} on ${abs}. Kuplapistettä ei ole taulussa tällä paineella, joten alijäähdytystä ei lasketa.`
      : `Pressure ${p} is ${abs}. The bubble point is not in the table at this pressure, so subcooling is not calculated.`;
  }
  const dew = reading.dewC ? `${num(reading.dewC, 1, locale)} °C` : '';
  const bubble = reading.bubbleC ? `${num(reading.bubbleC, 1, locale)} °C` : '';
  const band = temperatureBand(reading, reading.role === 'liquid' ? 'bubble' : 'dew', locale);
  let sentence: string;
  if (reading.role === 'suction') {
    sentence = locale === 'fi'
      ? `Imupaine ${p} on ${abs}. Kastepiste on ${dew}${band}.`
      : `Suction pressure ${p} is ${abs}. Dew point is ${dew}${band}.`;
    const delta = ctx.sh && ctx.sh.readingId === reading.id ? ctx.sh : undefined;
    if (delta) sentence += ` ${superheatClause(delta, locale)}`;
  } else if (reading.role === 'hot_gas') {
    sentence = locale === 'fi'
      ? `Kuumakaasun paine ${p} on ${abs}. Kastepiste on ${dew}${band}.`
      : `Hot-gas pressure ${p} is ${abs}. Dew point is ${dew}${band}.`;
    const delta = ctx.hotDelta && ctx.hotDelta.readingId === reading.id ? ctx.hotDelta : undefined;
    if (delta) {
      sentence += locale === 'fi'
        ? ` Kuumakaasu on ${signed(delta.value, 1, locale)} K kastepisteen ${parseDecimal(delta.value).isNeg() ? 'alapuolella' : 'yläpuolella'}. Tämä ei ole imutulistus.`
        : ` Hot gas is ${signed(delta.value, 1, locale)} K ${parseDecimal(delta.value).isNeg() ? 'below' : 'above'} the dew point. This is not suction superheat.`;
    }
  } else if (reading.role === 'liquid') {
    sentence = locale === 'fi'
      ? `Nesteputken paine ${p} on ${abs}. Kuplapiste on ${bubble}${band}.`
      : `Liquid-line pressure ${p} is ${abs}. Bubble point is ${bubble}${band}.`;
    const delta = ctx.sc && ctx.sc.readingId === reading.id ? ctx.sc : undefined;
    if (delta) sentence += ` ${subcoolingClause(delta, locale)}`;
  } else {
    sentence = locale === 'fi'
      ? `Paine ${p} on ${abs}. Kastepiste tässä paineessa on ${dew}${band}. Roolia ei ole vahvistettu, joten tätä ei nimetä imuksi tai kuumakaasuksi.`
      : `Pressure ${p} is ${abs}. Dew point at this pressure is ${dew}${band}. The port role is not confirmed, so this is not named as suction or hot gas.`;
  }
  return sentence;
}

function superheatClause(delta: AssessmentQuantity, locale: AssessmentLocale): string {
  const value = signed(delta.value, 1, locale);
  if (parseDecimal(delta.value).lte(0)) {
    return locale === 'fi'
      ? `Erotus kastepisteeseen on ${value} K. Höyry ei ole kastepisteen yläpuolella, joten kyse ei ole positiivisesta tulistuksesta.`
      : `The difference from dew point is ${value} K. The vapour is not above the dew point, so this is not positive superheat.`;
  }
  return locale === 'fi'
    ? `Tulistus, höyryn lämpötila miinus kastepiste, on ${value} K.`
    : `Superheat, vapour temperature minus dew point, is ${value} K.`;
}

function subcoolingClause(delta: AssessmentQuantity, locale: AssessmentLocale): string {
  const value = signed(delta.value, 1, locale);
  if (parseDecimal(delta.value).lte(0)) {
    return locale === 'fi'
      ? `Erotus kuplapisteeseen on ${value} K. Neste on kuplapisteen yläpuolella, joten alijäähdytystä ei ole.`
      : `The difference from bubble point is ${value} K. The liquid is above the bubble point, so there is no subcooling.`;
  }
  return locale === 'fi'
    ? `Alijäähdytys, kuplapiste miinus nesteen lämpötila, on ${value} K.`
    : `Subcooling, bubble point minus liquid temperature, is ${value} K.`;
}

function approachSentence(ctx: Context, locale: AssessmentLocale): string {
  const approach = ctx.approach;
  const cooled = ctx.cooled;
  if (!approach || !cooled) return '';
  const value = num(parseDecimal(approach.value).abs().toString(), 1, locale);
  const warmer = parseDecimal(approach.value).isNeg();
  const target = mediumName(cooled.kind, locale);
  if (warmer) {
    return locale === 'fi'
      ? `Kastepiste on ${value} K lämpimämpi kuin ${target}. Lämpö ei siirry tästä kohteesta tähän höyrystymislämpötilaan päin.`
      : `Dew point is ${value} K warmer than the ${target}. Heat is not flowing from that source into this evaporating temperature.`;
  }
  return locale === 'fi'
    ? `Kastepiste on ${value} K viileämpi kuin ${target}.`
    : `Dew point is ${value} K colder than the ${target}.`;
}

function comparisonSentence(ctx: Context, locale: AssessmentLocale): string {
  if (ctx.sh && ctx.oemSuperheatK) {
    const relation = relationToTarget(ctx.sh.value, ctx.oemSuperheatK);
    const measured = signed(ctx.sh.value, 1, locale);
    const target = signed(ctx.oemSuperheatK, 1, locale);
    if (relation === 'level') {
      return locale === 'fi'
        ? `Tulistus ${measured} K on kirjaamasi ohjearvon ${target} K tasalla. Luku on sinun syöttämäsi, ei PhaseKitin raja.`
        : `Superheat ${measured} K matches the ${target} K target you entered. That figure is yours, not a PhaseKit limit.`;
    }
    return locale === 'fi'
      ? `Tulistus ${measured} K on kirjaamasi ohjearvon ${target} K ${relation === 'above' ? 'yläpuolella' : 'alapuolella'}. Luku on sinun syöttämäsi, ei PhaseKitin raja.`
      : `Superheat ${measured} K is ${relation === 'above' ? 'above' : 'below'} the ${target} K target you entered. That figure is yours, not a PhaseKit limit.`;
  }
  if (ctx.suction?.absoluteBar && ctx.oemSuctionBar) {
    const relation = relationToTarget(ctx.suction.absoluteBar, ctx.oemSuctionBar);
    return locale === 'fi'
      ? `Imun absoluuttinen paine on kirjaamasi ohjearvon ${relation === 'level' ? 'tasalla' : relation === 'above' ? 'yläpuolella' : 'alapuolella'}. Ohjearvo on muunnettu samalla paineviitteellä kuin mittaus.`
      : `Absolute suction pressure is ${relation === 'level' ? 'level with' : relation === 'above' ? 'above' : 'below'} the target you entered. The target uses the same pressure reference as the measurement.`;
  }
  return '';
}

function hypothesisSentence(ctx: Context, locale: AssessmentLocale): string {
  if (!ctx.suction && ctx.transcriticalHigh) return '';
  if (!ctx.suction && (ctx.hotGas || ctx.liquid) && !ctx.transcriticalHigh) {
    return locale === 'fi'
      ? 'Korkeapainetta ei luokitella yleisellä rajalla. Vertaa sitä aineeseen, käyttöön, olosuhteisiin ja laitteen ohjeeseen.'
      : 'High-side pressure is not classed by a universal limit. Compare it with the fluid, the mode, the conditions and the equipment instruction.';
  }
  if (ctx.primary?.role === 'unknown' && !ctx.suction) {
    return locale === 'fi'
      ? 'Portin rooli on avoin. Imutulistusta tai korkeapainepäätelmää ei tehdä ennen vahvistusta.'
      : 'The port role is open. Suction superheat and high-side conclusions wait until it is confirmed.';
  }
  if (!ctx.suction) return '';
  if (ctx.input.refrigerantId === 'r717' && ctx.style === 'flooded') {
    return locale === 'fi'
      ? 'Tulvitettuna pieni tulistus voi kuulua käyntiin. Vajautta ei päätellä tästä tulistuksesta, eikä kylmäainetta lisätä yhdestä paineesta.'
      : 'On a flooded evaporator, low superheat can belong to normal operation. A shortage is not read from this superheat, and refrigerant is not added from one pressure.';
  }
  if (ctx.sh && parseDecimal(ctx.sh.value).lte(0)) {
    return locale === 'fi'
      ? 'Imulämpötila ei ole kastepisteen yläpuolella, joten vajaus ei saa tästä tukea. Yksi paine ei ole syy lisätä kylmäainetta.'
      : 'Suction temperature is not above the dew point, so a shortage is not supported by this reading. One pressure is not a reason to add refrigerant.';
  }
  if (ctx.approach && parseDecimal(ctx.approach.value).isNeg()) {
    return locale === 'fi'
      ? 'Höyrystymislämpötila ei ole jäähdytettävää kohdetta kylmempi, joten vajaus ei ole tämän eron tukema selitys. Kuorma, virtaus ja rajoitus kannattaa silti pitää mielessä.'
      : 'Evaporating temperature is not colder than the cooled source, so this difference does not support a shortage. Load, flow and a restriction can still be kept in view.';
  }
  const partLoad = ctx.capacity === 'reduced'
    ? (locale === 'fi' ? ' Merkitty osateho voi muuttaa samaa painetta.' : ' The marked part load can change the same pressure.')
    : '';
  if (ctx.sh && ctx.oemSuperheatK && relationToTarget(ctx.sh.value, ctx.oemSuperheatK) === 'above' && !(ctx.sc && ctx.oemSubcoolingK && relationToTarget(ctx.sc.value, ctx.oemSubcoolingK) === 'above')) {
    return locale === 'fi'
      ? `Tulistus on kirjaamasi ohjearvon yläpuolella, joten vajaus sopii tähän suuntaan. Rajoitus ja ilmavirta voivat silti näyttää samalta.${partLoad} Kylmäainetta ei lisätä tämän perusteella.`
      : `Superheat is above the target you entered, so a shortage points in this direction. A restriction and airflow can still look the same.${partLoad} Refrigerant is not added on this basis.`;
  }
  if (ctx.sh) {
    return locale === 'fi'
      ? `Vajaus, kuorma, ilmavirta ja rajoitus voivat kaikki liittyä imupuoleen. Ne erottaa alijäähdytyksellä ja sillä, mistä putki kylmenee.${partLoad} Kylmäainetta ei lisätä yhdestä lukemasta.`
      : `A shortage, the load, airflow and a restriction can all involve the suction side. Subcooling and where the pipe cools separate them.${partLoad} Refrigerant is not added from one reading.`;
  }
  return locale === 'fi'
    ? `Kylmäainevajaus on mahdollinen, jos imupaine on kuormaan nähden matala. Kuorma, ilmavirta ja rajoitus voivat näyttää samalta.${partLoad} Yksi paine ei ole syy lisätä kylmäainetta.`
    : `A refrigerant shortage is possible if suction pressure is low for the load. Load, airflow and a restriction can look the same.${partLoad} One pressure is not a reason to add refrigerant.`;
}

interface DraftHypothesis {
  id: string;
  strength: HypothesisStrength;
  title: [string, string];
  text: [string, string];
  differentiate: [string, string];
  evidence: [string, string];
}

function hypothesisDrafts(ctx: Context): DraftHypothesis[] {
  const drafts: DraftHypothesis[] = [];
  if (ctx.suction) drafts.push(...suctionHypotheses(ctx));
  if ((ctx.hotGas || ctx.liquid) && !ctx.transcriticalHigh) drafts.push(highSideHypothesis(ctx));
  return drafts;
}

function suctionHypotheses(ctx: Context): DraftHypothesis[] {
  const evidence = evidenceLabel(ctx);
  const shortage = shortageDraft(ctx, evidence);
  const alternatives: DraftHypothesis[] = [];
  if (ctx.input.system === 'industrial') {
    alternatives.push({
      id: 'heat_transfer',
      strength: 'open',
      title: ['Lämmönsiirto', 'Heat transfer'],
      text: ['Kuorma tai höyrystimen lämmönsiirto voi laskea imupainetta ilman että kylmäainetta puuttuu.', 'Load or evaporator heat transfer can lower suction pressure without a missing charge.'],
      differentiate: ['Erotus: kuorman muutos, höyrystimen tyyppi ja paine-ero lämmönvaihtimen yli.', 'Separate it with the load change, the evaporator type and the temperature difference across the heat exchanger.'],
      evidence,
    });
  } else if (ctx.input.system === 'hydronic') {
    alternatives.push({
      id: 'flow',
      strength: 'open',
      title: ['Virtaus', 'Flow'],
      text: ['Ilmavirta tai nestevirtaus voi muuttaa painetta.', 'Airflow or liquid flow can change the pressure.'],
      differentiate: ['Erotus: puhallin, suodatin ja kiertopiirin virtaus.', 'Separate it with the fan, the filter and the secondary-circuit flow.'],
      evidence,
    });
  } else {
    alternatives.push({
      id: 'airflow',
      strength: 'open',
      title: ['Ilmavirta', 'Airflow'],
      text: ['Heikko ilmavirta, likainen suodatin tai hidas puhallin voi laskea imupainetta.', 'Low airflow, a dirty filter or a slow fan can lower suction pressure.'],
      differentiate: ['Erotus: suodatin, puhallin ja patterin lämpötila. Heikko ilmavirta voi näyttää samalta kuin vajaus.', 'Separate it with the filter, the fan and the coil temperature. Low airflow can look like a shortage.'],
      evidence,
    });
  }
  const restrictionSupported = Boolean(
    ctx.sh && ctx.oemSuperheatK && relationToTarget(ctx.sh.value, ctx.oemSuperheatK) === 'above'
    && ctx.sc && ctx.oemSubcoolingK && relationToTarget(ctx.sc.value, ctx.oemSubcoolingK) === 'above',
  );
  alternatives.push({
    id: 'restriction',
    strength: restrictionSupported ? 'supported' : 'open',
    title: ['Rajoitus', 'Restriction'],
    text: restrictionSupported
      ? ['Tulistus ja alijäähdytys ovat molemmat kirjaamiesi ohjearvojen yläpuolella. Rajoitus sopii tähän suuntaan paremmin kuin vajaus.', 'Superheat and subcooling are both above the targets you entered. A restriction fits this direction better than a shortage.']
      : ['Nesteputken rajoitus voi laskea imupainetta ja kasvattaa tulistusta.', 'A liquid-line restriction can lower suction pressure and raise superheat.'],
    differentiate: ['Erotus: lämpötilaero suodattimen tai venttiilin yli ja alijäähdytys. Yksi imupaine ei näytä rajoitusta.', 'Separate it with the temperature drop across the drier or valve and with subcooling. One suction pressure does not show a restriction.'],
    evidence,
  });
  alternatives.push({
    id: 'load',
    strength: 'open',
    title: ['Kuorma', 'Load'],
    text: ctx.capacity === 'reduced'
      ? ['Merkitsit osatehon. Pieni kuorma voi laskea imupainetta ilman vuotoa.', 'You marked part load. A small load can lower suction pressure without a leak.']
      : ['Pieni kuorma tai kevyt käynti voi laskea imupainetta.', 'A small load or light running can lower suction pressure.'],
    differentiate: ['Erotus: pyynti, käyntiteho ja se, onko olosuhde sama kuin ohjeen mittauksessa.', 'Separate it with the setpoint, the running capacity and whether the conditions match the instruction.'],
    evidence,
  });
  return [shortage, ...alternatives];
}

function shortageDraft(ctx: Context, evidence: [string, string]): DraftHypothesis {
  let strength: HypothesisStrength = 'open';
  if (ctx.input.refrigerantId === 'r717' && ctx.style === 'flooded') strength = 'weakened';
  else if (ctx.sh && parseDecimal(ctx.sh.value).lte(0)) strength = 'weakened';
  else if (ctx.approach && parseDecimal(ctx.approach.value).isNeg()) strength = 'weakened';
  else if (ctx.sh && ctx.oemSuperheatK && relationToTarget(ctx.sh.value, ctx.oemSuperheatK) === 'below') strength = 'weakened';
  else if (
    ctx.sh && ctx.oemSuperheatK && relationToTarget(ctx.sh.value, ctx.oemSuperheatK) === 'above'
    && !(ctx.sc && ctx.oemSubcoolingK && relationToTarget(ctx.sc.value, ctx.oemSubcoolingK) === 'above')
  ) strength = 'supported';
  const text: [string, string] = strength === 'weakened'
    ? ctx.style === 'flooded'
      ? ['Tulvitettu höyrystin ei anna tulistuksesta vajauspäätöstä. Täytös kuuluu laitoksen ohjeeseen.', 'A flooded evaporator does not turn superheat into a shortage decision. Charge belongs to the plant instruction.']
      : ['Tämän mittauksen suunta ei tue kylmäainevajausta. Täytöstä ei päätetä yhdestä paineesta.', 'The direction of this measurement does not support a refrigerant shortage. Charge is not decided from one pressure.']
    : strength === 'supported'
      ? ['Kirjaamasi tulistusohje on saman suuntainen kuin vajaus. Rajoitus on yhä mahdollinen, jos alijäähdytys on suuri.', 'The superheat target you entered points the same way as a shortage. A restriction is still possible if subcooling is high.']
      : ['Vajaus on avoin mahdollisuus, jos imupaine on kuormaan nähden matala. Mittaus ei vielä sano, että ainetta puuttuu.', 'A shortage is an open possibility if suction pressure is low for the load. The measurement does not yet say that charge is missing.'];
  return {
    id: 'shortage',
    strength,
    title: ['Kylmäainevajaus', 'Refrigerant shortage'],
    text,
    differentiate: ctx.input.system === 'industrial'
      ? ['Erotus: tulistus, alijäähdytys ja lämpötilaero kuivaimen tai venttiilin yli. Vajauksessa alijäähdytys jää tyypillisesti pieneksi. Tämä on suunta, ei raja.', 'Separate it with superheat, subcooling and the temperature drop across the drier or valve. With a shortage, subcooling typically stays small. This is a direction, not a limit.']
      : ['Erotus: tulistus, alijäähdytys ja lämpötilaero suodattimen yli. Vajauksessa alijäähdytys jää tyypillisesti pieneksi. Tämä on suunta, ei raja.', 'Separate it with superheat, subcooling and the temperature drop across the drier. With a shortage, subcooling typically stays small. This is a direction, not a limit.'],
    evidence,
  };
}

function highSideHypothesis(ctx: Context): DraftHypothesis {
  const above = ctx.oemHighBar && (ctx.liquid?.absoluteBar || ctx.hotGas?.absoluteBar)
    ? relationToTarget((ctx.liquid ?? ctx.hotGas)!.absoluteBar!, ctx.oemHighBar) === 'above'
    : false;
  return {
    id: 'high_side',
    strength: above ? 'supported' : 'open',
    title: ['Korkeapainepuoli', 'High side'],
    text: above
      ? ['Mitattu korkeapaine on kirjaamasi ohjearvon yläpuolella. Lämmönluovutus, olosuhteet ja täytös voivat kaikki vaikuttaa. Ohjearvo on kirjaamasi luku.', 'Measured high-side pressure is above the target you entered. Heat rejection, conditions and charge can all affect it. The target is the figure you entered.']
      : ['Korkeapainepuolen painetta ei luokitella liian korkeaksi ilman laitteen ohjetta ja olosuhteita.', 'High-side pressure is not classed as too high without the equipment instruction and the conditions.'],
    differentiate: ['Erotus: lämmönluovutuksen ilmavirta tai nestevirtaus, patterin puhtaus ja valmistajan paine näissä oloissa.', 'Separate it with heat-rejection airflow or liquid flow, coil cleanliness and the manufacturer pressure at these conditions.'],
    evidence: evidenceLabel(ctx),
  };
}

function evidenceLabel(ctx: Context): [string, string] {
  const partsFi = ['paine'];
  const partsEn = ['pressure'];
  if (ctx.sh || ctx.hotDelta) {
    partsFi.push('putken lämpötila');
    partsEn.push('pipe temperature');
  }
  if (ctx.sc) {
    partsFi.push('neste');
    partsEn.push('liquid');
  }
  if (ctx.approach) {
    partsFi.push('ympäristön lämpötila');
    partsEn.push('surrounding temperature');
  }
  return [`Mittaukset: ${partsFi.join(', ')}.`, `Measurements: ${partsEn.join(', ')}.`];
}

function finishHypothesis(draft: DraftHypothesis): AssessmentHypothesis {
  const strengthLabel: Record<HypothesisStrength, Copy> = {
    open: { fi: 'Avoin mahdollisuus', en: 'Open possibility' },
    supported: { fi: 'Ohjearvon suuntaan', en: 'Same direction as your target' },
    weakened: { fi: 'Ei tukea tästä mittauksesta', en: 'Not supported by this measurement' },
  };
  return {
    id: draft.id,
    strength: draft.strength,
    strengthLabel: strengthLabel[draft.strength],
    title: { fi: draft.title[0], en: draft.title[1] },
    text: { fi: draft.text[0], en: draft.text[1] },
    differentiate: { fi: draft.differentiate[0], en: draft.differentiate[1] },
    evidence: { fi: draft.evidence[0], en: draft.evidence[1] },
  };
}

function checks(ctx: Context, locale: AssessmentLocale): string[] {
  const lines: string[] = [];
  const lead = ctx.primary ?? ctx.secondary;
  if (lead?.role === 'unknown') {
    lines.push(locale === 'fi'
      ? 'Vahvista portin rooli: imu, kuumakaasu tai neste. Avoin rooli jättää tulistuksen ja korkeapäätelmän tekemättä.'
      : 'Confirm the port role: suction, hot gas or liquid. An open role leaves superheat and the high-side conclusion unmade.');
  }
  if (ctx.suction && !ctx.suction.pipeC && ctx.suction.regime === 'saturated') {
    lines.push(locale === 'fi'
      ? 'Mittaa imuputken lämpötila samasta kohdasta, jos haluat tulistuksen. Ilman sitä näytetään vain kastepiste.'
      : 'Measure the suction-pipe temperature at the same place if you want superheat. Without it, only the dew point is shown.');
  }
  if (ctx.hotGas && !ctx.hotGas.pipeC && ctx.hotGas.regime === 'saturated') {
    lines.push(locale === 'fi'
      ? 'Kuumakaasun lämpötila kertoo eron kastepisteeseen. Sitä ei nimetä imutulistukseksi.'
      : 'Hot-gas temperature shows the difference from dew point. It is not named suction superheat.');
  }
  if (ctx.transcriticalHigh && !ctx.transcriticalHigh.pipeC) {
    lines.push(locale === 'fi'
      ? 'Kaasujäähdyttimen ulostulolämpötila kertoo korkeapuolesta enemmän kuin alijäähdytys, jota tässä ei ole.'
      : 'Gas-cooler outlet temperature says more about the high side than subcooling, which does not exist here.');
  }
  if (ctx.liquid && !ctx.liquid.pipeC && ctx.liquid.regime === 'saturated') {
    lines.push(locale === 'fi'
      ? 'Nesteputken lämpötila tarvitaan alijäähdytykseen. Pelkkä paine ei riitä.'
      : 'Liquid-line temperature is needed for subcooling. Pressure alone is not enough.');
  }
  if (ctx.suction && !ctx.liquid && !ctx.hotGas) {
    lines.push(locale === 'fi'
      ? 'Toinen paine, jos portti on olemassa, erottaa imupuolen korkeapainepuolesta.'
      : 'A second pressure, if a port exists, separates the suction side from the high side.');
  }
  if (!ctx.cooled && (ctx.input.system === 'air_air' || ctx.input.system === 'dx_cooling' || ctx.input.system === 'hydronic')) {
    lines.push(locale === 'fi'
      ? 'Ilman lämpötila höyrystimen puolella näyttää, kuinka kaukana kastepiste on jäähdytettävästä kohteesta.'
      : 'Air temperature on the evaporator side shows how far the dew point is from the cooled source.');
  }
  if ((ctx.input.refrigerantId === 'r717' || ctx.input.system === 'industrial') && ctx.style === 'unknown' && ctx.suction) {
    lines.push(locale === 'fi'
      ? 'Kerro, onko höyrystin suorahöyrysteinen vai tulvitettu. Tulistus tulkitaan eri tavalla.'
      : 'Say whether the evaporator is direct expansion or flooded. Superheat is read differently.');
  }
  if (lead && !lead.uncertaintyBar && lead.regime !== 'invalid') {
    lines.push(locale === 'fi'
      ? 'Mittarin ±-epävarmuus, jos tiedät sen, levittää kastepisteen vaihteluväliksi. Ilmanpaineviitettä ei lisätä toiseen kertaan.'
      : 'The gauge ± uncertainty, if you know it, turns the dew point into a range. The atmospheric reference is not added a second time.');
  }
  return lines;
}

function technicalLines(ctx: Context, locale: AssessmentLocale): string[] {
  const lines: string[] = [];
  const tolerance = offlinePTProvider.metadata.toleranceTemperatureC;
  const pressureTolerance = offlinePTProvider.metadata.toleranceRelativePressure;
  lines.push(locale === 'fi'
    ? `Kyllästysarvot tulevat offline-taulusta ${offlinePTProvider.metadata.dataVersion}. Interpolointitoleranssi on ${num(tolerance, 1, locale)} °C ja ${num(pressureTolerance ?? '0', 3, locale)} suhteellista painetta. Sitä ei ole lisätty mittarin epävarmuuteen.`
    : `Saturation values come from offline table ${offlinePTProvider.metadata.dataVersion}. Interpolation tolerance is ${num(tolerance, 1, locale)} °C and ${num(pressureTolerance ?? '0', 3, locale)} relative pressure. It is not added to the gauge uncertainty.`);
  if (ctx.readings.some(item => item.unit.endsWith('(g)') && item.absoluteBar)) {
    const atmosphere = ctx.input.atmosphere?.value;
    lines.push(locale === 'fi'
      ? `Mittaripaineeseen on lisätty ilmanpaineviite ${atmosphere ? num(atmosphere, 5, locale) : ''} bar(a) yhden kerran. Epävarmuus koskee mittarilukemaa, ei toista ilmakehää.`
      : `The atmospheric reference ${atmosphere ? num(atmosphere, 5, locale) : ''} bar(a) was added to gauge pressure once. Uncertainty applies to the gauge reading, not a second atmosphere.`);
  }
  lines.push(locale === 'fi'
    ? 'Tulistus käyttää höyryn painetta ja kastepistettä. Alijäähdytys käyttää nesteen painetta ja kuplapistettä. Puuttuva lämpötila jättää erotuksen laskematta.'
    : 'Superheat uses vapour pressure and the dew point. Subcooling uses liquid pressure and the bubble point. A missing temperature leaves the difference uncalculated.');
  if (ctx.glide) {
    lines.push(locale === 'fi'
      ? `Liukuma tässä paineessa on ${num(ctx.glide.value, 1, locale)} K, kastepiste miinus kuplapiste. Ilmanpaineessa ilmoitettu nimellisliukuma ei korvaa tätä.`
      : `Glide at this pressure is ${num(ctx.glide.value, 1, locale)} K, dew point minus bubble point. A nominal glide quoted at atmospheric pressure does not replace it.`);
  }
  if (ctx.input.refrigerantId === 'r717') {
    lines.push(locale === 'fi'
      ? 'R717 on myrkyllinen teollisuuskylmäaine. Suorahöyrysteisen ja tulvitetun höyrystimen tulistus tarkoittaa eri asiaa. Näkymä ei korvaa laitoksen ohjetta eikä turvallisuusarviota.'
      : 'R717 is a toxic industrial refrigerant. Superheat means different things on a direct-expansion and a flooded evaporator. This view does not replace the plant instruction or a safety assessment.');
  }
  if (ctx.input.refrigerantId === 'r744') {
    lines.push(locale === 'fi'
      ? 'R744:llä lauhtumislämpötila on olemassa vain kriittisen paineen alapuolella ja vain taulun alueella. Taulun ja kriittisen paineen väliin jäävä paine näytetään kattamattomana, ei keksittynä kyllästyksenä eikä ylikriittisenä.'
      : 'For R744, a condensing temperature exists only below the critical pressure and only inside the table. A pressure between the table and the critical pressure is shown as uncovered, not as an invented saturation or as transcritical.');
  }
  if (ctx.input.modelName?.trim()) {
    lines.push(locale === 'fi'
      ? `Malli on kirjattu nimellä ${ctx.input.modelName.trim()}. PhaseKit ei hae sille ohjearvoja.`
      : `The model is recorded as ${ctx.input.modelName.trim()}. PhaseKit does not look up targets for it.`);
  }
  if (ctx.stability === 'oem_stable') {
    lines.push(locale === 'fi'
      ? 'Merkitsit valmistajan vakautuksen tehdyksi. PhaseKit ei tarkista ohjetta eikä keksi yleistä odotusaikaa.'
      : 'You marked the manufacturer stabilisation as done. PhaseKit does not check the instruction or invent a universal waiting time.');
  }
  if (ctx.oemSuctionBar || ctx.oemHighBar || ctx.oemSuperheatK || ctx.oemSubcoolingK) {
    lines.push(locale === 'fi'
      ? 'Ohjearvot ovat kirjaamiasi lukuja. Niitä ei ole tarkistettu valmistajan taulukosta.'
      : 'The targets are figures you entered. They were not checked against a manufacturer table.');
  }
  if (!ctx.oemSuctionBar && !ctx.oemHighBar && !ctx.oemSuperheatK && !ctx.oemSubcoolingK) {
    lines.push(locale === 'fi'
      ? 'Käyntiä ei luokitella tavalliseksi tai poikkeavaksi, koska mallikohtaista ohjearvoa ei ole annettu.'
      : 'Operation is not classed as ordinary or out of range, because no model-specific target was given.');
  }
  return lines;
}

function efficiencyLines(ctx: Context, locale: AssessmentLocale): string[] {
  const lines: string[] = [];
  if (ctx.lift) {
    lines.push(locale === 'fi'
      ? `Höyrystymisen ja lauhtumisen lämpötilaero on ${num(ctx.lift.value, 1, locale)} K. Se on kierron lämpötilanosto, ei COP.`
      : `The difference between evaporating and condensing temperature is ${num(ctx.lift.value, 1, locale)} K. It is the cycle temperature lift, not a COP.`);
  } else if (ctx.transcriticalHigh) {
    lines.push(locale === 'fi'
      ? 'Ylikriittisellä korkeapuolella ei ole lauhtumislämpötilaa, joten lämpötilanostoa ei lasketa.'
      : 'A transcritical high side has no condensing temperature, so temperature lift is not calculated.');
  }
  lines.push(locale === 'fi'
    ? 'COP vaatisi saman ajanjakson luovutetun lämmön tai jäähdytyksen ja koko laitteen sähkönkulutuksen. Ilma-ilmalaitteessa siihen tarvitaan ilmavirta ja ilman entalpia, jäähdytyksessä myös latentti osuus. Sulatus kuuluu pidempään energiajaksoon.'
    : 'COP would need delivered heat or cooling and the whole unit’s electric input over the same interval. An air-to-air unit also needs airflow and air enthalpy, including latent cooling. Defrost belongs in a longer energy interval.');
  lines.push(locale === 'fi'
    ? 'Rakennukseen sopivuus vaatii kuorman tai lämpöhäviön ja mallin tehon näissä oloissa. Yksi mittaus ei kerro sitä. Hyötysuhdetta ei lasketa paineesta ja lämpötilasta.'
    : 'Suitability for a building needs the load or heat loss and the model capacity at these conditions. One reading does not show it. Efficiency is not calculated from pressure and temperature.');
  return lines;
}

function references(refrigerantId: string | undefined): AssessmentReference[] {
  const items: AssessmentReference[] = [
    {
      title: { fi: 'CoolProp 7.2.0 HEOS -kyllästystaulukko', en: 'CoolProp 7.2.0 HEOS saturation table' },
      url: offlinePTProvider.metadata.sourceUrl ?? 'https://github.com/CoolProp/CoolProp/tree/v7.2.0',
      note: {
        fi: 'Laskennan lähde. Malli interpoloidaan taulun sisällä, eikä sitä jatketa kriittisen pisteen yli.',
        en: 'Source of the calculation. The model is interpolated inside the table and is not extended past the critical point.',
      },
    },
    {
      title: { fi: 'Cole-Parmer, HVAC-R troubleshooting', en: 'Cole-Parmer, HVAC-R troubleshooting' },
      url: COLE_PARMER,
      note: {
        fi: 'Laadullinen suunta sille, mitkä mittaukset erottavat vajauksen, ilmavirran ja rajoituksen. Artikkelin lukuja ei käytetä rajoina.',
        en: 'Qualitative direction for which measurements separate a shortage, airflow and a restriction. Figures from the article are not used as limits.',
      },
    },
    {
      title: { fi: 'Danfoss, teollinen ammoniakki ja CO₂', en: 'Danfoss, industrial ammonia and CO₂' },
      url: DANFOSS_INDUSTRIAL,
      note: {
        fi: 'Teollinen ammoniakki- ja hiilidioksidikäytäntö eroaa ilmalämpöpumpun huoltoportista. Oppaan rajoja ei ole kopioitu.',
        en: 'Industrial ammonia and carbon-dioxide practice differs from a heat-pump service port. Limits from the guide are not copied.',
      },
    },
    {
      title: { fi: 'Mitsubishi-huolto-ohje, esimerkki', en: 'Mitsubishi service manual, example' },
      url: MITSUBISHI_EXAMPLE,
      note: {
        fi: 'Esimerkki siitä, että vakautus ja tavoitepaineet ovat mallikohtaisia. Niitä ei ole tuotu oletuksiksi.',
        en: 'An example that stabilisation and target pressures are model-specific. They are not imported as defaults.',
      },
    },
  ];
  if (refrigerantId === 'r449a') {
    items.push({
      title: { fi: 'Honeywell Solstice 449A -painetaulukko', en: 'Honeywell Solstice 449A pressure table' },
      url: HONEYWELL_R449A,
      note: {
        fi: 'Julkinen taulukko näyttää, että R449A:n kupla- ja kastepiste eroavat. Tämän näkymän luvut tulevat CoolProp-taulusta, ei PDF:stä.',
        en: 'The published table shows that R449A bubble and dew points differ. Figures in this view come from the CoolProp table, not the PDF.',
      },
    });
  }
  return items;
}

function buildFocus(ctx: Context): AssessmentFocus | undefined {
  const lead = ctx.primary ?? ctx.secondary;
  if (!lead) return undefined;
  if (lead.regime === 'transcritical' && lead.absoluteBar) {
    return {
      label: { fi: 'Korkeapaine, yli kriittisen', en: 'High-side pressure, above critical' },
      value: pair(locale => num(lead.absoluteBar!, 2, locale)),
      unit: { fi: 'bar(a)', en: 'bar(a)' },
      note: { fi: 'Kyllästyslämpötilaa ei ole.', en: 'There is no saturation temperature.' },
    };
  }
  const sh = ctx.sh && ctx.sh.readingId === lead.id ? ctx.sh : undefined;
  if (sh) {
    return {
      label: { fi: 'Tulistus', en: 'Superheat' },
      value: pair(locale => signed(sh.value, 1, locale)),
      unit: { fi: 'K', en: 'K' },
      note: parseDecimal(sh.value).lte(0)
        ? { fi: 'Ei positiivinen tulistus.', en: 'Not positive superheat.' }
        : { fi: 'Höyryn lämpötila miinus kastepiste.', en: 'Vapour temperature minus dew point.' },
    };
  }
  const hot = ctx.hotDelta && ctx.hotDelta.readingId === lead.id ? ctx.hotDelta : undefined;
  if (hot) {
    return {
      label: { fi: 'Kuumakaasu ja kastepiste', en: 'Hot gas and dew point' },
      value: pair(locale => signed(hot.value, 1, locale)),
      unit: { fi: 'K', en: 'K' },
      note: { fi: 'Tämä ei ole imutulistus.', en: 'This is not suction superheat.' },
    };
  }
  const sc = ctx.sc && ctx.sc.readingId === lead.id ? ctx.sc : undefined;
  if (sc) {
    return {
      label: { fi: 'Alijäähdytys', en: 'Subcooling' },
      value: pair(locale => signed(sc.value, 1, locale)),
      unit: { fi: 'K', en: 'K' },
      note: parseDecimal(sc.value).lte(0)
        ? { fi: 'Ei alijäähdytystä.', en: 'No subcooling.' }
        : { fi: 'Kuplapiste miinus nesteen lämpötila.', en: 'Bubble point minus liquid temperature.' },
    };
  }
  const side = lead.role === 'liquid' ? 'bubble' : 'dew';
  const temp = side === 'bubble' ? lead.bubbleC : lead.dewC;
  if (!temp) return undefined;
  const labels: Record<PortRole, Copy> = {
    suction: { fi: 'Imun kastepiste', en: 'Suction dew point' },
    hot_gas: { fi: 'Kuumakaasun kastepiste', en: 'Hot-gas dew point' },
    liquid: { fi: 'Nesteen kuplapiste', en: 'Liquid bubble point' },
    unknown: side === 'bubble'
      ? { fi: 'Kuplapiste tässä paineessa', en: 'Bubble point at this pressure' }
      : { fi: 'Kastepiste tässä paineessa', en: 'Dew point at this pressure' },
  };
  return {
    label: labels[lead.role],
    value: pair(locale => num(temp, 1, locale)),
    unit: { fi: '°C', en: '°C' },
    note: temperatureBand(lead, side, 'fi')
      ? pair(locale => {
          const band = temperatureBand(lead, side, locale);
          return locale === 'fi' ? `Mittarin epävarmuudella${band}.` : `With the gauge uncertainty${band}.`;
        })
      : undefined,
  };
}

function buildRows(ctx: Context): AssessmentRow[] {
  const rows: AssessmentRow[] = [];
  const lead = ctx.primary ?? ctx.secondary;
  if (lead?.absoluteBar && lead.regime !== 'transcritical') {
    rows.push({
      label: { fi: 'Absoluuttinen paine', en: 'Absolute pressure' },
      value: pair(locale => `${num(lead.absoluteBar!, 3, locale)} bar(a)`),
    });
  }
  const glide = ctx.glide;
  const bubble = lead?.bubbleC;
  const dew = lead?.dewC;
  if (glide && bubble && dew && lead && lead.role !== 'liquid') {
    rows.push({
      label: { fi: 'Kuplapiste ja liukuma', en: 'Bubble point and glide' },
      value: pair(locale => `${num(bubble, 1, locale)} °C · ${num(glide.value, 1, locale)} K`),
    });
  }
  if (glide && dew && lead?.role === 'liquid') {
    rows.push({
      label: { fi: 'Kastepiste ja liukuma', en: 'Dew point and glide' },
      value: pair(locale => `${num(dew, 1, locale)} °C · ${num(glide.value, 1, locale)} K`),
    });
  }
  if (ctx.approach) {
    rows.push({
      label: { fi: 'Ero jäähdytettävään', en: 'Difference from the cooled source' },
      value: pair(locale => `${signed(ctx.approach!.value, 1, locale)} K`),
    });
  }
  const other = ctx.secondary && ctx.secondary !== lead ? ctx.secondary : undefined;
  if (other?.dewC || other?.bubbleC) {
    const temp = other.role === 'liquid' ? other.bubbleC : other.dewC;
    if (temp) {
      rows.push({
        label: { fi: 'Toinen mittaus', en: 'Second reading' },
        value: pair(locale => `${num(temp, 1, locale)} °C`),
      });
    }
  }
  return rows.slice(0, 3);
}

function temperatureBand(reading: NormalizedReading, side: 'dew' | 'bubble', locale: AssessmentLocale): string {
  const low = side === 'dew' ? reading.dewLowC : reading.bubbleLowC;
  const high = side === 'dew' ? reading.dewHighC : reading.bubbleHighC;
  if (!low || !high) return '';
  const lowText = num(low, 1, locale);
  const highText = num(high, 1, locale);
  if (lowText === highText) return '';
  return locale === 'fi' ? ` (${lowText}…${highText} °C)` : ` (${lowText}…${highText} °C)`;
}

function enteredPressure(reading: NormalizedReading, locale: AssessmentLocale): string {
  if (reading.regime === 'invalid') {
    const shown = locale === 'fi' ? reading.entered.replace('.', ',') : reading.entered;
    return `${shown} ${reading.unit}`;
  }
  return `${num(reading.entered, decimalPlaces(reading.entered), locale)} ${reading.unit}`;
}

function decimalPlaces(value: string): number {
  const fraction = value.trim().replace(',', '.').split('.')[1] ?? '';
  return Math.min(3, fraction.length);
}

function relationToTarget(measured: string, target: string): 'above' | 'below' | 'level' {
  const delta = parseDecimal(measured).minus(parseDecimal(target));
  if (delta.abs().lt('0.05')) return 'level';
  return delta.gt(0) ? 'above' : 'below';
}

function paired(lines: (locale: AssessmentLocale) => string[]): Copy[] {
  const fi = lines('fi');
  const en = lines('en');
  return fi.map((text, index) => ({ fi: text, en: en[index] ?? '' }));
}

function pair(text: (locale: AssessmentLocale) => string): Copy {
  return { fi: text('fi'), en: text('en') };
}

function num(value: string, digits: number, locale: AssessmentLocale): string {
  const decimal = parseDecimal(value).toDecimalPlaces(digits);
  const negative = decimal.isNeg() && !decimal.isZero();
  const body = decimal.abs().toFixed(digits);
  const shown = locale === 'fi' ? body.replace('.', ',') : body;
  return negative ? `−${shown}` : shown;
}

function signed(value: string, digits: number, locale: AssessmentLocale): string {
  const decimal = parseDecimal(value);
  if (decimal.isZero()) return num('0', digits, locale);
  return num(value, digits, locale);
}

function mediumName(kind: Medium['kind'], locale: AssessmentLocale): string {
  const names = {
    indoor: { fi: 'sisäilma', en: 'indoor air' },
    outdoor: { fi: 'ulkoilma', en: 'outdoor air' },
    process: { fi: 'jäähdytettävä kohde', en: 'cooled source' },
  } as const;
  return names[kind][locale];
}
