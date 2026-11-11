import { z } from "zod";
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
const receiptSchema = z.object({
  etag: z.string().min(1).max(200),
  publishedAt: z.iso.datetime(),
  publishedFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});
export type SharedAssetReceipt = z.infer<typeof receiptSchema>;
async function requestCreationReceipt(
  link: SharedAssetLink,
  snapshot: AssetSnapshot,
): Promise<SharedAssetReceipt> {
  if (link.origin !== window.location.origin) throw new Error("foreign-origin");
  const response = await fetch(endpoint, {
    method: "POST",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: link.id,
      readCode: link.readCode,
      writeSecret: link.writeSecret,
      snapshot,
    }),
  });
  return receiptSchema.parse(await responseData(response));
}
export async function publishAsset(
  link: SharedAssetLink,
  snapshot: AssetSnapshot,
): Promise<SharedAssetReceipt> {
  if (link.origin !== window.location.origin) throw new Error("foreign-origin");
  if (!link.etag) return requestCreationReceipt(link, snapshot);
  const response = await fetch(`${endpoint}/${link.id}`, {
    method: "PUT",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${link.writeSecret}`,
    },
    body: JSON.stringify({ snapshot, expectedEtag: link.etag }),
  });
  return receiptSchema.parse(await responseData(response));
}
/** Explicit owner action: the idempotent POST returns the current stored
 * receipt without replacing an existing snapshot, even when local data differs.
 * Never follow this with an automatic PUT; the owner must review and publish.
 */
export async function recoverAssetReceipt(
  link: SharedAssetLink,
  snapshot: AssetSnapshot,
): Promise<SharedAssetReceipt> {
  if (!link.etag && !link.publishedAt) throw new Error("not-published");
  return requestCreationReceipt(link, snapshot);
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
