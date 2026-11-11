import { z } from "zod";
import { backupSchema, emptyData, mergeBackup } from "./storage";
import type { UserData } from "./storage";
import type { AssetType } from "./asset-sharing-types";

// Re-use the backup validators; pick an explicit allowlist so credentials and
// unrelated local state can never enter a shared document, even after import.
export const assetSnapshotSchema = z
  .object({
    version: z.literal(1),
    assetType: z.enum(["site", "equipment"]),
    assetId: z.string().min(1).max(100),
    publishedAt: z.iso.datetime(),
    data: backupSchema.pick({
      sites: true,
      equipment: true,
      toolRecords: true,
      checklistDrafts: true,
      electricalMeasurements: true,
      electricalReports: true,
    }),
  })
  .superRefine((snapshot, context) => {
    const { assetType, assetId, data } = snapshot;
    const ids = new Set(data.equipment.map((item) => item.id));
    const validRoot =
      assetType === "site"
        ? data.sites.length === 1 &&
          data.sites[0].id === assetId &&
          data.equipment.every((item) => item.siteId === assetId)
        : data.equipment.length === 1 &&
          ids.has(assetId) &&
          data.sites.every((site) => site.id === data.equipment[0].siteId);
    const isRelated = (item: { siteId?: string; equipmentId?: string }) =>
      assetType === "site"
        ? item.siteId === assetId
        : item.equipmentId === assetId;
    for (const records of [
      data.sites,
      data.equipment,
      data.toolRecords,
      data.checklistDrafts,
      data.electricalMeasurements ?? [],
      data.electricalReports ?? [],
    ])
      if (new Set(records.map((item) => item.id)).size !== records.length)
        context.addIssue({
          code: "custom",
          message: "Duplicate snapshot record",
        });
    const related =
      validRoot &&
      data.toolRecords.every(
        (item) => item.equipmentId && ids.has(item.equipmentId),
      ) &&
      data.checklistDrafts.every(
        (item) =>
          (assetType === "site" && item.siteId === assetId) ||
          Boolean(item.equipmentId && ids.has(item.equipmentId)),
      ) &&
      (data.electricalMeasurements ?? []).every((item) =>
        assetType === "site"
          ? item.siteId === assetId
          : item.equipmentId === assetId,
      ) &&
      (data.electricalReports ?? []).every(
        (item) => isRelated(item) && item.measurements.every(isRelated),
      );
    if (!related)
      context.addIssue({
        code: "custom",
        message: "Snapshot contains unrelated records",
      });
  });
export type AssetSnapshot = z.infer<typeof assetSnapshotSchema>;
export function buildAssetSnapshot(
  data: UserData,
  assetType: AssetType,
  assetId: string,
  publishedAt = new Date().toISOString(),
): AssetSnapshot {
  const equipment = data.equipment.filter((item) =>
    assetType === "site" ? item.siteId === assetId : item.id === assetId,
  );
  const ids = new Set(equipment.map((item) => item.id));
  const isRelated = (item: { siteId?: string; equipmentId?: string }) =>
    assetType === "site"
      ? item.siteId === assetId
      : item.equipmentId === assetId;
  return assetSnapshotSchema.parse({
    version: 1,
    assetType,
    assetId,
    publishedAt,
    data: {
      sites: (data.sites ?? []).filter((item) =>
        assetType === "site"
          ? item.id === assetId
          : equipment.some((device) => device.siteId === item.id),
      ),
      equipment,
      toolRecords: data.toolRecords.filter(
        (item) => item.equipmentId && ids.has(item.equipmentId),
      ),
      checklistDrafts: data.checklistDrafts.filter(
        (item) =>
          (assetType === "site" && item.siteId === assetId) ||
          Boolean(item.equipmentId && ids.has(item.equipmentId)),
      ),
      electricalMeasurements: (data.electricalMeasurements ?? []).filter(
        (item) =>
          assetType === "site"
            ? item.siteId === assetId
            : item.equipmentId === assetId,
      ),
      electricalReports: (data.electricalReports ?? []).filter(
        (item) => isRelated(item) && item.measurements.every(isRelated),
      ),
    },
  });
}
export async function snapshotFingerprint(
  snapshot: AssetSnapshot,
): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(
      JSON.stringify({
        assetType: snapshot.assetType,
        assetId: snapshot.assetId,
        data: snapshot.data,
      }),
    ),
  );
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
/** Explicit import appends missing records, and refuses conflicting IDs. */
export function importAssetSnapshot(
  current: UserData,
  raw: AssetSnapshot,
): UserData {
  const snapshot = assetSnapshotSchema.parse(raw);
  const incoming = { ...emptyData(), ...snapshot.data };
  for (const key of [
    "sites",
    "equipment",
    "toolRecords",
    "checklistDrafts",
    "electricalMeasurements",
    "electricalReports",
  ] as const) {
    const existing = new Map(
      (current[key] ?? []).map((item) => [item.id, JSON.stringify(item)]),
    );
    for (const record of incoming[key] ?? [])
      if (
        existing.has(record.id) &&
        existing.get(record.id) !== JSON.stringify(record)
      )
        throw new Error("conflict");
  }
  return mergeBackup(current, incoming);
}
