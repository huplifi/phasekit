import type { FieldReport, EquipmentRecord, SiteRecord } from "./storage";
import type { SharedAssetLink } from "./asset-sharing-types";
import { equipmentReportPatch } from "./equipment-report-defaults";
import { appVersion } from "./release";
import { assetSnapshotSchema } from "./asset-snapshot";
import type { AssetSnapshot } from "./asset-snapshot";
export * from "./asset-snapshot";

export function newColdReport(
  equipment?: EquipmentRecord,
  site?: SiteRecord,
): FieldReport {
  const draft: FieldReport = {
    id: crypto.randomUUID(),
    kind: "commissioning",
    title: site?.name ?? "",
    siteId: site?.id,
    updatedAt: new Date().toISOString(),
    checkedIds: [],
    fields: {
      pressureUnit: "bar",
      commissioningPurpose: "installation",
      pressureReference: "gauge",
      atmosphericReference: "1.01325",
      pressureTestRequired: "not_assessed",
      performedOn: new Date().toLocaleDateString("sv-SE"),
    },
    notes: "",
    status: "draft",
    revision: 1,
    appVersion,
  };
  return equipment
    ? { ...draft, ...equipmentReportPatch(draft, equipment, site) }
    : draft;
}
const endpoint = "/api/shared-assets";
async function responseData(response: Response) {
  if (!response.ok)
    throw new Error(
      response.status === 409
        ? "conflict"
        : response.status === 413
          ? "too-large"
          : "unavailable",
    );
  return await response.json();
}
export async function publishAsset(
  link: SharedAssetLink,
  snapshot: AssetSnapshot,
): Promise<{
  etag: string;
  publishedAt: string;
  publishedFingerprint: string;
}> {
  if (link.origin !== window.location.origin) throw new Error("foreign-origin");
  const update = Boolean(link.etag);
  const response = await fetch(update ? `${endpoint}/${link.id}` : endpoint, {
    method: update ? "PUT" : "POST",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: {
      "Content-Type": "application/json",
      ...(update ? { Authorization: `Bearer ${link.writeSecret}` } : {}),
    },
    body: JSON.stringify(
      update
        ? { snapshot, expectedEtag: link.etag }
        : {
            id: link.id,
            readCode: link.readCode,
            writeSecret: link.writeSecret,
            snapshot,
          },
    ),
  });
  return responseData(response);
}
export async function readSharedAsset(
  id: string,
  readCode: string,
): Promise<AssetSnapshot> {
  if (!/^[a-f0-9]{32}$/.test(id)) throw new Error("unavailable");
  const response = await fetch(`${endpoint}/${id}/read`, {
    method: "POST",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ readCode }),
  });
  const result = await responseData(response);
  return assetSnapshotSchema.parse(result.snapshot);
}
export async function revokeSharedAsset(link: SharedAssetLink): Promise<void> {
  if (link.origin !== window.location.origin) throw new Error("foreign-origin");
  const response = await fetch(`${endpoint}/${link.id}`, {
    method: "DELETE",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: {
      Authorization: `Bearer ${link.writeSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expectedEtag: link.etag }),
  });
  await responseData(response);
}
