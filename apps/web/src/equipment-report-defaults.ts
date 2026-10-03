import { checklistDefinitions } from "../../../packages/core/src/field-tools";
import { byId, getFact, factKeys, dataset } from "./data";
import type { EquipmentRecord, FieldReport, SiteRecord } from "./storage";

/** Use the same sourced fields as an explicit refrigerant selection in a report. */
export function refrigerantReportFields(id: string): Record<string, string> {
  const refrigerant = byId.get(id);
  const safety = refrigerant
    ? getFact(refrigerant, ...factKeys.safety)
    : undefined;
  const gwp = refrigerant ? getFact(refrigerant, ...factKeys.gwp) : undefined;
  const sourced = (fact: typeof safety) =>
    fact?.state === "verified" &&
    fact.value !== null &&
    fact.sourceIds.length > 0;
  return {
    refrigerantId: id,
    refrigerantDesignation: refrigerant?.designation ?? id,
    refrigerantSafetyClass: sourced(safety) ? String(safety!.value) : "",
    refrigerantGwp: sourced(gwp) ? String(gwp!.value) : "",
    refrigerantGwpBasis: sourced(gwp)
      ? (gwp!.basis ?? "gwp_eu_2024_573_100yr")
      : "",
    refrigerantSourceNote: sourced(gwp)
      ? `PhaseKit ${dataset.version} · ${[...new Set([...(sourced(safety) ? safety!.sourceIds : []), ...gwp!.sourceIds])].join(", ")}`
      : "",
  };
}

/** Linking a device supplies defaults, never revises recorded facts or final reports. */
export function equipmentReportPatch(
  report: FieldReport,
  equipment: EquipmentRecord,
  site?: SiteRecord,
): Partial<FieldReport> {
  if (report.status === "final") return {};
  const fields = { ...report.fields };
  const fill = (key: string, value: string | undefined) => {
    if (!fields[key]?.trim() && value?.trim()) fields[key] = value.trim();
  };
  const availableFields = new Set(
    checklistDefinitions[report.kind].fields.map((field) => field.id),
  );
  fill(
    "equipment",
    [
      ...new Set(
        [equipment.name, equipment.model, equipment.serialNumber].filter(
          Boolean,
        ),
      ),
    ].join(" · "),
  );
  if (availableFields.has("installationLocation")) {
    fill(
      "installationLocation",
      [site?.address || site?.name, equipment.location]
        .filter(Boolean)
        .join(" · "),
    );
  }
  const deviceRefrigerant = equipment.refrigerantId?.trim();
  const compatible =
    !fields.refrigerantId?.trim() || fields.refrigerantId === deviceRefrigerant;
  if (deviceRefrigerant && compatible && availableFields.has("refrigerantId")) {
    for (const [key, value] of Object.entries(
      refrigerantReportFields(deviceRefrigerant),
    )) {
      if (availableFields.has(key) || key === "refrigerantDesignation")
        fill(key, value);
    }
  }
  // A total device charge is not an amount recovered/added or a test measurement.
  if (availableFields.has("chargeKg") && (!deviceRefrigerant || compatible)) {
    fill("chargeKg", equipment.chargeKg);
  }
  return {
    equipmentId: equipment.id,
    title: report.title.trim()
      ? report.title
      : site?.name || equipment.location || equipment.name,
    fields,
  };
}
