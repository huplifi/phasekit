import { z } from "zod";

export const measurementTypes = {
  continuity: {
    label: {
      fi: "Suojajohtimen / potentiaalintasauksen jatkuvuus",
      en: "Protective conductor / bonding continuity",
    },
    unit: "Ω",
  },
  insulation: {
    label: { fi: "Eristysresistanssi", en: "Insulation resistance" },
    unit: "MΩ",
  },
  "loop-impedance": {
    label: { fi: "Silmukkaimpedanssi", en: "Loop impedance" },
    unit: "Ω",
  },
  "short-circuit-current": {
    label: { fi: "Oikosulkuvirta", en: "Short-circuit current" },
    unit: "A",
  },
  "rcd-time": {
    label: { fi: "Vikavirtasuojan toiminta-aika", en: "RCD operating time" },
    unit: "ms",
  },
  "rcd-current": {
    label: { fi: "Vikavirtasuojan toimintavirta", en: "RCD operating current" },
    unit: "mA",
  },
  voltage: { label: { fi: "Jännite", en: "Voltage" }, unit: "V" },
  "phase-sequence": {
    label: { fi: "Vaihejärjestys", en: "Phase sequence" },
    unit: "",
  },
  other: {
    label: {
      fi: "Muu mittaus / toimintatesti",
      en: "Other measurement / functional test",
    },
    unit: "",
  },
} as const;
export type MeasurementType = keyof typeof measurementTypes;
export interface ElectricalMeter {
  brand: string;
  model: string;
  serialNumber: string;
}
export interface ElectricalSession {
  id: string;
  siteId?: string;
  siteName: string;
  equipmentId?: string;
  equipmentName: string;
  meter: ElectricalMeter;
  technician: string;
  activeMeasurementId?: string;
}
export interface ElectricalMeasurement {
  id: string;
  /** Optional explicit grouping; legacy readings remain independent points. */
  pointId?: string;
  sessionId: string;
  siteId?: string;
  siteName: string;
  equipmentId?: string;
  equipmentName: string;
  point: string;
  type: MeasurementType;
  result: string;
  unit: string;
  note: string;
  photo?: string;
  measuredAt: string;
  technician: string;
  meter: ElectricalMeter;
  assessment: "unassessed" | "pass" | "fail" | "not-applicable";
  assessmentNote: string;
}
export type ElectricalConclusion = "" | "accepted" | "defects" | "not-approved";
export interface ElectricalInspectionReport {
  id: string;
  status: "draft" | "final";
  revision: number;
  previousRevisionId?: string;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string;
  siteId?: string;
  siteName: string;
  siteAddress: string;
  equipmentId?: string;
  equipmentName: string;
  workDescription: string;
  scope: string;
  builder: string;
  builderContact: string;
  electricalSupervisor: string;
  supervisorContact: string;
  inspector: string;
  inspectorContact: string;
  standards: string;
  methods: string;
  visualInspection: string;
  findings: string;
  deviations: string;
  evaluation: string;
  conclusion: ElectricalConclusion;
  conclusionNote: string;
  signature: string;
  inspectionDate: string;
  applicabilityVerified: boolean;
  measurements: ElectricalMeasurement[];
}
const text = z.string().max(10000);
const name = z.string().max(300);
const id = z.string().min(1).max(100);
export const electricalMeterSchema = z.object({
  brand: name,
  model: name,
  serialNumber: name,
});
export const electricalSessionSchema = z.object({
  id,
  siteId: id.optional(),
  siteName: name,
  equipmentId: id.optional(),
  equipmentName: name,
  meter: electricalMeterSchema,
  technician: name,
  activeMeasurementId: id.optional(),
});
export const electricalMeasurementSchema = z.object({
  id,
  pointId: id.optional(),
  sessionId: id,
  siteId: id.optional(),
  siteName: name,
  equipmentId: id.optional(),
  equipmentName: name,
  point: name,
  type: z.enum(
    Object.keys(measurementTypes) as [MeasurementType, ...MeasurementType[]],
  ),
  result: z.string().max(1000),
  unit: z.string().max(80),
  note: text,
  photo: z
    .string()
    .max(2_000_000)
    .regex(/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/)
    .optional(),
  measuredAt: z.iso.datetime(),
  technician: name,
  meter: electricalMeterSchema,
  assessment: z.enum(["unassessed", "pass", "fail", "not-applicable"]),
  assessmentNote: text,
});
export const electricalReportSchema = z
  .object({
    id,
    status: z.enum(["draft", "final"]),
    revision: z.number().int().min(1).max(10000),
    previousRevisionId: id.optional(),
    createdAt: z.iso.datetime(),
    updatedAt: z.iso.datetime(),
    finalizedAt: z.iso.datetime().optional(),
    siteId: id.optional(),
    siteName: name,
    siteAddress: name,
    equipmentId: id.optional(),
    equipmentName: name,
    workDescription: text,
    scope: text,
    builder: name,
    builderContact: name,
    electricalSupervisor: name,
    supervisorContact: name,
    inspector: name,
    inspectorContact: name,
    standards: text,
    methods: text,
    visualInspection: text,
    findings: text,
    deviations: text,
    evaluation: text,
    conclusion: z.enum(["", "accepted", "defects", "not-approved"]),
    conclusionNote: text,
    signature: name,
    inspectionDate: z.union([z.literal(""), z.iso.date()]),
    applicabilityVerified: z.boolean(),
    measurements: z.array(electricalMeasurementSchema).max(2000),
  })
  .superRefine((report, ctx) => {
    if (
      new Set(report.measurements.map((m) => m.id)).size !==
      report.measurements.length
    )
      ctx.addIssue({ code: "custom", message: "Duplicate report measurement" });
    if (
      report.status === "final" &&
      (!report.finalizedAt || electricalReportMissingFields(report).length)
    )
      ctx.addIssue({
        code: "custom",
        message: "Incomplete final electrical report",
      });
  });
/** A blank display or a comparator alone is not a recorded reading. */
export function hasMeasurementResult(result: string): boolean {
  return !!result.trim() && !/^[<>≥≤=+−\-\s]+$/.test(result.trim());
}
/** Keep the original instrument text and avoid a repeated displayed unit. */
export function measurementResultText(measurement: {
  result: string;
  unit: string;
}): string {
  if (!measurement.result.trim()) return "—";
  const unit = measurement.unit.trim();
  return !unit || measurement.result.trimEnd().endsWith(unit)
    ? measurement.result
    : `${measurement.result} ${unit}`;
}
export function createMeasurement(
  session: ElectricalSession,
  type: MeasurementType = "continuity",
): ElectricalMeasurement {
  return {
    id: crypto.randomUUID(),
    sessionId: session.id,
    siteId: session.siteId,
    siteName: session.siteName,
    equipmentId: session.equipmentId,
    equipmentName: session.equipmentName,
    point: "",
    type,
    result: "",
    unit: measurementTypes[type].unit,
    note: "",
    measuredAt: new Date().toISOString(),
    technician: session.technician,
    meter: { ...session.meter },
    assessment: "unassessed",
    assessmentNote: "",
  };
}
export function copyMeasurementPoint(
  source: ElectricalMeasurement,
  session?: ElectricalSession,
): ElectricalMeasurement {
  const context = session ?? { ...source, id: source.sessionId };
  return {
    ...createMeasurement(context, source.type),
    point: source.point,
    unit: source.unit,
  };
}
export function createElectricalReport(
  measurements: ElectricalMeasurement[] = [],
): ElectricalInspectionReport {
  const first = measurements[0];
  if (
    measurements.some(
      (m) =>
        (m.siteId ?? m.siteName.trim()) !==
        (first?.siteId ?? first?.siteName.trim()),
    )
  )
    throw new Error("Select measurements from one site per report");
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    status: "draft",
    revision: 1,
    createdAt: now,
    updatedAt: now,
    siteId: first?.siteId,
    siteName: first?.siteName ?? "",
    siteAddress: "",
    equipmentId: measurements.every((m) => m.equipmentId === first?.equipmentId)
      ? first?.equipmentId
      : undefined,
    equipmentName: measurements.every(
      (m) =>
        m.equipmentId === first?.equipmentId &&
        m.equipmentName === first?.equipmentName,
    )
      ? (first?.equipmentName ?? "")
      : "",
    workDescription: "",
    scope: "",
    builder: "",
    builderContact: "",
    electricalSupervisor: "",
    supervisorContact: "",
    inspector: first?.technician ?? "",
    inspectorContact: "",
    standards: "",
    methods: "",
    visualInspection: "",
    findings: "",
    deviations: "",
    evaluation: "",
    conclusion: "",
    conclusionNote: "",
    signature: "",
    inspectionDate: "",
    applicabilityVerified: false,
    measurements: structuredClone(measurements),
  };
}
/** Completion means a documented assessment, never an automatically approved installation. */
export function electricalReportMissingFields(
  report: ElectricalInspectionReport,
): string[] {
  const required = [
    "siteName",
    "siteAddress",
    "workDescription",
    "scope",
    "builder",
    "builderContact",
    "electricalSupervisor",
    "supervisorContact",
    "inspector",
    "inspectorContact",
    "standards",
    "methods",
    "visualInspection",
    "findings",
    "deviations",
    "evaluation",
    "conclusion",
    "conclusionNote",
    "signature",
    "inspectionDate",
  ] as const;
  const missing: string[] = required.filter((key) => !report[key].trim());
  if (!report.applicabilityVerified) missing.push("applicabilityVerified");
  if (
    report.measurements.some(
      (m) =>
        !m.point.trim() ||
        !hasMeasurementResult(m.result) ||
        !m.technician.trim() ||
        !m.meter.brand.trim() ||
        !m.meter.model.trim() ||
        !m.meter.serialNumber.trim() ||
        m.assessment === "unassessed" ||
        ((m.assessment === "fail" || m.assessment === "not-applicable") &&
          !m.assessmentNote.trim()),
    )
  )
    missing.push("measurements");
  if (
    report.conclusion === "accepted" &&
    report.measurements.some((m) => m.assessment === "fail")
  )
    missing.push("conflictingConclusion");
  return missing;
}
export function finalizeElectricalReport(
  report: ElectricalInspectionReport,
): ElectricalInspectionReport {
  if (report.status === "final") return structuredClone(report);
  const missing = electricalReportMissingFields(report);
  if (missing.length)
    throw new Error(`Incomplete electrical report: ${missing.join(", ")}`);
  const now = new Date().toISOString();
  return electricalReportSchema.parse({
    ...structuredClone(report),
    status: "final",
    finalizedAt: now,
    updatedAt: now,
  });
}
export function reviseElectricalReport(
  report: ElectricalInspectionReport,
): ElectricalInspectionReport {
  if (report.status !== "final")
    throw new Error("Only finalized reports need a new revision");
  const now = new Date().toISOString();
  return {
    ...structuredClone(report),
    id: crypto.randomUUID(),
    status: "draft",
    revision: report.revision + 1,
    previousRevisionId: report.id,
    createdAt: now,
    updatedAt: now,
    finalizedAt: undefined,
    applicabilityVerified: false,
    signature: "",
    inspectionDate: "",
  };
}
export function updateElectricalReports(
  records: ElectricalInspectionReport[],
  next: ElectricalInspectionReport,
): ElectricalInspectionReport[] {
  const previous = records.find((r) => r.id === next.id);
  if (
    previous?.status === "final" &&
    JSON.stringify(previous) !== JSON.stringify(next)
  )
    throw new Error("Final electrical report is immutable");
  electricalReportSchema.parse(next);
  return previous
    ? records.map((r) => (r.id === next.id ? next : r))
    : [...records, next];
}
