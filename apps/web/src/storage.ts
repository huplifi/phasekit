import { openDB } from "idb";
import { z } from "zod";
import type {
  CheckResult,
  Refrigerant,
  Source,
} from "../../../packages/core/src/contracts";
import type { Locale } from "../../../packages/i18n/src";
import type { ChecklistDraft } from "../../../packages/core/src/field-tools";
import type { PHChartSnapshot } from "./ph-chart-snapshot";
export interface EquipmentRecord {
  id: string;
  name: string;
  location: string;
  notes: string;
  updatedAt: string;
}
export interface ReportRow {
  label: { fi: string; en: string };
  value: string;
  unit?: string;
}
export interface ToolRecord {
  id: string;
  createdAt: string;
  tool:
    | "cycle"
    | "pt"
    | "co2e"
    | "convert"
    | "thermal-power"
    | "electrical"
    | "pipe";
  title: string;
  equipmentId?: string;
  equipmentName?: string;
  /** Name of a former link recovered at deletion; not a name recorded at calculation time. */
  lastLinkedEquipmentName?: string;
  notes: string;
  inputs: ReportRow[];
  outputs: ReportRow[];
  dataVersion?: string;
  sources: Source[];
  chartSnapshot?: PHChartSnapshot;
}
/** Additive report metadata; legacy checklists remain readable without migration. */
export interface FieldReport extends ChecklistDraft {
  status?: "draft" | "final";
  revision?: number;
  previousRevisionId?: string;
  finalizedAt?: string;
  appVersion?: string;
  equipmentId?: string;
  cycleReport?: ToolRecord;
}
export interface Snapshot {
  id: string;
  createdAt: string;
  refrigerant: Refrigerant;
  result: CheckResult;
  sources: Source[];
  // Frozen at calculation time. Older schema-v1 backups omit this field and
  // display stable component IDs instead of names from a newer dataset.
  componentDesignations?: Record<string, string>;
  lastInspectionDate?: string;
}
export function snapshotDesignation(snapshot: Snapshot, id: string): string {
  return (
    snapshot.componentDesignations?.[id] ??
    (snapshot.refrigerant.id === id ? snapshot.refrigerant.designation : id)
  );
}
export interface UserData {
  schemaVersion: 1;
  favourites: string[];
  recent: string[];
  snapshots: Snapshot[];
  checklistDrafts: FieldReport[];
  toolRecords: ToolRecord[];
  equipment: EquipmentRecord[];
  locale: Locale;
  theme: "light" | "dark" | "system";
}
export const emptyData = (): UserData => ({
  schemaVersion: 1,
  favourites: [],
  recent: [],
  snapshots: [],
  checklistDrafts: [],
  toolRecords: [],
  equipment: [],
  locale: "fi",
  theme: "system",
});
const id = z
  .string()
  .regex(/^[a-z0-9-]+$/)
  .max(80);
const input = z.object({
  refrigerantId: id,
  charge: z.string().max(100),
  unit: z.enum(["kg", "g"]),
  equipment: z.enum([
    "stationary_refrigeration",
    "stationary_ac",
    "stationary_heat_pump",
    "truck_trailer",
    "other_mobile",
    "orc",
    "switchgear",
    "fire_protection",
    "other",
  ]),
  detection: z.boolean(),
  hermetic: z.boolean(),
  hermeticLabel: z.boolean(),
  residential: z.boolean(),
  asOf: z.iso.date(),
});
const fact = z.object({
  state: z.enum(["verified", "unknown", "not_applicable"]),
  value: z.union([z.string(), z.number(), z.null()]),
  sourceIds: z.array(z.string()),
  unit: z.string().optional(),
  basis: z.string().optional(),
  checkedAt: z.string().optional(),
  conditions: z
    .object({
      temperatureC: z.number().optional(),
      pressureKPaAbsolute: z.number().optional(),
      phase: z.string().optional(),
      method: z.string().optional(),
    })
    .optional(),
});
const refrigerant = z.object({
  id,
  designation: z.string(),
  name: z.object({ fi: z.string(), en: z.string() }),
  kind: z.enum(["pure", "blend"]),
  family: z.string(),
  aliases: z.array(z.string()),
  cas: z.string().nullable(),
  formula: z.string().nullable(),
  components: z.array(
    z.object({
      refrigerantId: id,
      massPercent: z.string(),
      sourceIds: z.array(z.string()),
    }),
  ),
  facts: z.record(z.string(), fact),
  sourceIds: z.array(z.string()),
  coverage: z.object({
    identity: z.enum(["verified", "partial"]),
    composition: z.enum(["verified", "partial", "not_applicable"]),
    safety: z.enum(["verified", "partial"]),
    regulatory_eu_fi: z.enum(["verified", "partial", "unsupported"]),
    pt: z.enum(["verified", "estimated", "unsupported"]),
  }),
});
const result = z.object({
  state: z.enum([
    "required",
    "below_threshold",
    "exempt",
    "outside_rule_scope",
    "unsupported",
    "insufficient_data",
  ]),
  months: z.number().int().positive().nullable(),
  decisiveRule: z.string().nullable(),
  decisiveComponent: z.string().nullable(),
  components: z.array(
    z.object({
      refrigerantId: id,
      massPercent: z.string(),
      massKg: z.string(),
      annex: z.string(),
      gwpBasis: z.string().optional(),
      gwp: z.string().optional(),
      tonnesCO2e: z.string().optional(),
    }),
  ),
  obligations: z.array(
    z.object({
      ruleId: z.string(),
      component: z.string(),
      quantity: z.string(),
      unit: z.string(),
      months: z.number().nullable(),
      reasonCode: z.string(),
    }),
  ),
  reasonCodes: z.array(z.string()),
  requiredInputs: z.array(z.string()),
  missingData: z
    .array(
      z.object({
        refrigerantId: id,
        field: z.enum(["identity", "composition", "euAnnex", "legalGwp"]),
      }),
    )
    .optional(),
  rulesetVersion: z.string(),
  dataVersion: z.string(),
  sourceIds: z.array(z.string()),
  detectionRequired: z.boolean(),
  input,
});
const source = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url().refine((s) => /^https?:/.test(s)),
  version: z.string(),
  checkedAt: z.string(),
  license: z.string(),
  note: z.string().optional(),
});
const reportRow = z.object({
  label: z.object({ fi: z.string().max(200), en: z.string().max(200) }),
  value: z.string().max(3000),
  unit: z.string().max(80).optional(),
});
const chartPressure = z.number().finite().positive().max(100000);
const chartEnthalpy = z.number().finite().min(-100000).max(100000);
const chartSnapshot = z.object({
  kind: z.literal("ph-cycle-v1"),
  dataVersion: z.string().min(1).max(200),
  dome: z
    .array(z.tuple([chartPressure, chartEnthalpy, chartEnthalpy]))
    .min(2)
    .max(1000),
  points: z.tuple([
    z.tuple([chartPressure, chartEnthalpy]),
    z.tuple([chartPressure, chartEnthalpy]),
    z.tuple([chartPressure, chartEnthalpy]),
    z.tuple([chartPressure, chartEnthalpy]),
  ]),
  view: z
    .object({
      fitCycle: z.boolean(),
      visibleKinds: z.object({
        temperature: z.boolean(),
        entropy: z.boolean(),
        volume: z.boolean(),
      }),
    })
    .optional(),
  isolines: z
    .array(
      z.object({
        kind: z.enum(["temperature", "entropy", "volume"]),
        phase: z.enum(["liquid", "vapour"]),
        level: z.number().finite().min(-100000).max(100000),
        segments: z
          .array(
            z
              .array(z.tuple([chartPressure, chartEnthalpy]))
              .min(2)
              .max(250),
          )
          .max(10),
      }),
    )
    .max(30)
    .optional(),
  isolineDataVersion: z.string().min(1).max(200).optional(),
});
const boundedId = z.string().min(1).max(100);
const toolRecord = z.object({
  id: boundedId,
  createdAt: z.iso.datetime(),
  tool: z.enum([
    "cycle",
    "pt",
    "co2e",
    "convert",
    "thermal-power",
    "electrical",
    "pipe",
  ]),
  title: z.string().min(1).max(200),
  equipmentId: boundedId.optional(),
  equipmentName: z.string().max(200).optional(),
  lastLinkedEquipmentName: z.string().max(200).optional(),
  notes: z.string().max(10000),
  inputs: z.array(reportRow).max(200),
  outputs: z.array(reportRow).max(200),
  dataVersion: z.string().max(200).optional(),
  sources: z.array(source).max(100),
  chartSnapshot: chartSnapshot.optional(),
});
export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  favourites: z.array(id).max(10000),
  recent: z.array(id).max(100),
  snapshots: z
    .array(
      z.object({
        id: z.string(),
        createdAt: z.iso.datetime(),
        refrigerant,
        result,
        sources: z.array(source),
        componentDesignations: z.record(id, z.string()).optional(),
        lastInspectionDate: z.iso.date().optional(),
      }),
    )
    .max(1000),
  checklistDrafts: z
    .array(
      z.object({
        id: boundedId,
        kind: z.enum([
          "tightness",
          "evacuation",
          "commissioning",
          "service",
          "refrigerant",
        ]),
        title: z.string().max(300),
        updatedAt: z.iso.datetime(),
        checkedIds: z.array(z.string().max(80)).max(100),
        status: z.enum(["draft", "final"]).optional(),
        revision: z.number().int().min(1).max(10000).optional(),
        previousRevisionId: boundedId.optional(),
        finalizedAt: z.iso.datetime().optional(),
        appVersion: z.string().max(100).optional(),
        equipmentId: boundedId.optional(),
        cycleReport: toolRecord.optional(),
        fields: z
          .record(z.string().max(80), z.string().max(2000))
          .refine((v) => Object.keys(v).length <= 100),
        notes: z.string().max(10000),
      }),
    )
    .max(1000)
    .default([]),
  toolRecords: z.array(toolRecord).max(1000).default([]),
  equipment: z
    .array(
      z.object({
        id: boundedId,
        name: z.string().min(1).max(200),
        location: z.string().max(300),
        notes: z.string().max(10000),
        updatedAt: z.iso.datetime(),
      }),
    )
    .max(1000)
    .default([]),
  locale: z.enum(["fi", "en"]),
  theme: z.enum(["light", "dark", "system"]),
});
export function parseBackup(text: string): UserData {
  if (text.length > 10_000_000) throw new Error("Backup too large");
  const data = backupSchema.parse(JSON.parse(text));
  if (new Set(data.snapshots.map((s) => s.id)).size !== data.snapshots.length)
    throw new Error("Duplicate snapshot");
  for (const records of [
    data.toolRecords,
    data.checklistDrafts,
    data.equipment,
  ])
    if (new Set(records.map((r) => r.id)).size !== records.length)
      throw new Error("Duplicate record");
  return {
    ...data,
    favourites: [...new Set(data.favourites)],
    recent: [...new Set(data.recent)],
  };
}
function db() {
  return openDB("phasekit", 1, {
    upgrade(database) {
      database.createObjectStore("user");
    },
  });
}
export async function loadData(): Promise<UserData> {
  const database = await db();
  const value = await database.get("user", "state");
  database.close();
  return value ? parseBackup(JSON.stringify(value)) : emptyData();
}
export async function saveData(data: UserData) {
  // Never persist a state that this version cannot restore.
  const validated = parseBackup(JSON.stringify(data));
  const database = await db();
  await database.put("user", validated, "state");
  database.close();
}
/** Serial writes keep the newest state last; failures remain observable to callers. */
export function createDurableWriter<T>(write: (value: T) => Promise<void>) {
  let tail: Promise<void> = Promise.resolve();
  return {
    enqueue(value: T): Promise<void> {
      const attempt = tail.catch(() => {}).then(() => write(value));
      tail = attempt;
      return attempt;
    },
    async flush(): Promise<void> {
      let observed: Promise<void>;
      do {
        observed = tail;
        await observed;
      } while (observed !== tail);
    },
  };
}
export function mergeBackup(current: UserData, incoming: UserData): UserData {
  const ids = new Set(current.snapshots.map((s) => s.id));
  const appendMissing = <T extends { id: string }>(
    existing: T[],
    additions: T[],
  ): T[] => {
    const keys = new Set(existing.map((r) => r.id));
    return [...existing, ...additions.filter((r) => !keys.has(r.id))];
  };
  return parseBackup(
    JSON.stringify({
      ...current,
      favourites: [...new Set([...current.favourites, ...incoming.favourites])],
      recent: [...new Set([...current.recent, ...incoming.recent])].slice(
        0,
        20,
      ),
      toolRecords: appendMissing(current.toolRecords, incoming.toolRecords),
      checklistDrafts: appendMissing(
        current.checklistDrafts,
        incoming.checklistDrafts,
      ),
      equipment: appendMissing(current.equipment, incoming.equipment),
      snapshots: [
        ...current.snapshots,
        ...incoming.snapshots.filter((s) => !ids.has(s.id)),
      ],
    }),
  );
}
export function downloadJSON(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
