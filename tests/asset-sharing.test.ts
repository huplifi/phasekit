import { describe, expect, it, vi } from "vitest";
vi.mock("../apps/web/src/release", () => ({ appVersion: "test" }));
import { recoverAssetReceipt } from "../apps/web/src/asset-sharing";
import { emptyData, parseBackup } from "../apps/web/src/storage";
import {
  createElectricalReport,
  createMeasurement,
} from "../apps/web/src/electrical";
import {
  buildAssetSnapshot,
  assetSnapshotSchema,
  importAssetSnapshot,
  snapshotFingerprint,
} from "../apps/web/src/asset-snapshot";
import { createSharedAssetLink } from "../apps/web/src/asset-sharing-types";
import { sharedAssetsHandler } from "../netlify/lib/shared-assets";
import type {
  SnapshotStore,
  SharedDocument,
} from "../netlify/lib/shared-assets";
const now = "2026-11-11T12:00:00.000Z";
function fixture() {
  const data = emptyData();
  data.sites = [
    { id: "site-1", name: "Plant", address: "Street", updatedAt: now },
    {
      id: "site-2",
      name: "Private site",
      address: "Elsewhere",
      updatedAt: now,
    },
  ];
  data.equipment = [
    {
      id: "device-1",
      siteId: "site-1",
      name: "Pump",
      location: "Roof",
      notes: "Owner note",
      updatedAt: now,
    },
    {
      id: "device-2",
      siteId: "site-2",
      name: "Private device",
      location: "Secret",
      notes: "Do not share",
      updatedAt: now,
    },
  ];
  const reading = createMeasurement({
    id: "session-1",
    siteId: "site-1",
    siteName: "Plant",
    equipmentId: "device-1",
    equipmentName: "Pump",
    meter: { brand: "Example", model: "", serialNumber: "" },
    technician: "Technician",
  });
  reading.result = "0,15";
  data.electricalMeasurements = [
    reading,
    {
      ...reading,
      id: "other-reading",
      siteId: "site-2",
      equipmentId: "device-2",
      note: "Secret reading",
    },
  ];
  const report = createElectricalReport([reading]);
  data.electricalReports = [
    report,
    {
      ...report,
      id: "mixed-report",
      measurements: [...data.electricalMeasurements],
    },
  ];
  data.checklistDrafts = [
    {
      id: "cold-1",
      equipmentId: "device-1",
      kind: "service",
      title: "Service",
      updatedAt: now,
      checkedIds: [],
      fields: { technician: "T" },
      notes: "Work note",
    },
    {
      id: "cold-2",
      equipmentId: "device-2",
      kind: "service",
      title: "Private work",
      updatedAt: now,
      checkedIds: [],
      fields: {},
      notes: "Secret",
    },
  ];
  data.sharedLinks = [
    createSharedAssetLink("site", "site-1", "https://phasekit.example"),
  ];
  return data;
}
class MemoryStore implements SnapshotStore {
  entries = new Map<string, { data: SharedDocument; etag: string }>();
  revision = 0;
  async getWithMetadata(key: string) {
    return this.entries.has(key)
      ? structuredClone(this.entries.get(key)!)
      : null;
  }
  async setJSON(
    key: string,
    data: SharedDocument,
    options: { onlyIfNew?: boolean; onlyIfMatch?: string },
  ) {
    const old = this.entries.get(key);
    if (
      (options.onlyIfNew && old) ||
      (options.onlyIfMatch && old?.etag !== options.onlyIfMatch)
    )
      return { modified: false };
    const etag = `"revision-${++this.revision}"`;
    this.entries.set(key, { data: structuredClone(data), etag });
    return { modified: true, etag };
  }
}
function request(
  path: string,
  method = "POST",
  body?: unknown,
  secret?: string,
) {
  return new Request(`https://phasekit.example/api/shared-assets${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
describe("shared asset document boundary", () => {
  it("shares an explicitly linked site-only refrigeration report without guessing names", () => {
    const data = fixture();
    data.checklistDrafts.push({
      id: "site-cold",
      siteId: "site-1",
      kind: "service",
      title: "Unrelated historical title",
      updatedAt: now,
      checkedIds: [],
      fields: {},
      notes: "Site work",
    });
    data.checklistDrafts.push({
      id: "unlinked-cold",
      kind: "service",
      title: "Plant",
      updatedAt: now,
      checkedIds: [],
      fields: {},
      notes: "Not explicitly linked",
    });
    expect(
      buildAssetSnapshot(data, "site", "site-1", now).data.checklistDrafts.map(
        (report) => report.id,
      ),
    ).toEqual(["cold-1", "site-cold"]);
    expect(
      buildAssetSnapshot(
        data,
        "equipment",
        "device-1",
        now,
      ).data.checklistDrafts.map((report) => report.id),
    ).toEqual(["cold-1"]);
  });
  it("shares only scoped records, excludes mixed frozen reports and strips credentials", async () => {
    const data = fixture();
    const snapshot = buildAssetSnapshot(data, "site", "site-1", now);
    expect(snapshot.data.equipment.map((v) => v.id)).toEqual(["device-1"]);
    expect(snapshot.data.electricalReports).toHaveLength(1);
    expect(snapshot.data.checklistDrafts.map((v) => v.id)).toEqual(["cold-1"]);
    expect(JSON.stringify(snapshot)).not.toContain("Private");
    expect(JSON.stringify(snapshot)).not.toContain("writeSecret");
    expect(JSON.stringify(snapshot)).not.toContain(
      data.sharedLinks![0].writeSecret,
    );
    const contaminated = structuredClone(snapshot);
    contaminated.data.electricalReports![0].measurements.push(
      data.electricalMeasurements![1],
    );
    expect(() => assetSnapshotSchema.parse(contaminated)).toThrow("unrelated");
    const duplicate = structuredClone(snapshot);
    duplicate.data.equipment.push(duplicate.data.equipment[0]);
    expect(() => assetSnapshotSchema.parse(duplicate)).toThrow("Duplicate");
    const secretInput = {
      ...snapshot,
      data: { ...snapshot.data, sharedLinks: data.sharedLinks },
    };
    expect(
      JSON.stringify(assetSnapshotSchema.parse(secretInput)),
    ).not.toContain("writeSecret");
    expect(await snapshotFingerprint(snapshot)).toBe(
      await snapshotFingerprint({
        ...snapshot,
        publishedAt: "2026-11-12T12:00:00.000Z",
      }),
    );
  });
  it("imports missing records without credentials and refuses conflicting local IDs", () => {
    const snapshot = buildAssetSnapshot(
      fixture(),
      "equipment",
      "device-1",
      now,
    );
    const imported = importAssetSnapshot(emptyData(), snapshot);
    expect(imported.equipment[0].name).toBe("Pump");
    expect(imported.sharedLinks).toEqual([]);
    expect(importAssetSnapshot(imported, snapshot).equipment).toHaveLength(1);
    imported.equipment[0].name = "Local edit";
    expect(() => importAssetSnapshot(imported, snapshot)).toThrow("conflict");
    expect(imported.equipment[0].name).toBe("Local edit");
  });
  it("preserves owner and read credentials through a local backup", () => {
    const data = fixture();
    const restored = parseBackup(JSON.stringify(data));
    expect(restored.sharedLinks).toEqual(data.sharedLinks);
    expect(restored.sharedLinks![0].origin).toBe("https://phasekit.example");
    expect(restored.sharedLinks![0].writeSecret).toHaveLength(64);
    expect(restored.sharedLinks![0].readCode.replaceAll("-", "")).toHaveLength(
      16,
    );
  });
  it("URL alone and wrong code disclose no record; read code can read but cannot edit", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const snapshot = buildAssetSnapshot(data, "site", "site-1", now);
    const create = await handler(request("", "POST", { ...link, snapshot }));
    expect(create.status).toBe(201);
    const receipt = await create.json();
    expect(receipt.publishedFingerprint).toBe(
      await snapshotFingerprint(snapshot),
    );
    const stored = store.entries.get(link.id)!.data;
    expect(JSON.stringify(stored)).not.toContain(link.readCode);
    expect(JSON.stringify(stored)).not.toContain(link.writeSecret);
    for (const id of [link.id, "f".repeat(32)]) {
      const bare = await handler(request(`/${id}`, "GET"));
      expect(bare.status).toBe(403);
      expect(await bare.json()).toEqual({ error: "Access unavailable" });
      const wrong = await handler(
        request(`/${id}/read`, "POST", { readCode: "0000-0000-0000-0000" }),
      );
      expect(wrong.status).toBe(403);
    }
    const read = await handler(
      request(`/${link.id}/read`, "POST", {
        readCode: link.readCode.toLowerCase(),
      }),
    );
    expect(read.status).toBe(200);
    expect((await read.json()).snapshot).toEqual(snapshot);
    const edit = await handler(
      request(
        `/${link.id}`,
        "PUT",
        { snapshot, expectedEtag: receipt.etag },
        link.readCode,
      ),
    );
    expect(edit.status).toBe(403);
    expect(read.headers.get("Cache-Control")).toBe("no-store");
    expect(read.headers.has("Access-Control-Allow-Origin")).toBe(false);
  });
  it("retries create without overwrite, requires owner secret and matching revision, revokes reads", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const snapshot = buildAssetSnapshot(data, "site", "site-1", now);
    const receipt = await (
      await handler(request("", "POST", { ...link, snapshot }))
    ).json();
    const next = structuredClone(snapshot);
    next.data.equipment[0].notes = "Changed";
    const retry = await handler(
      request("", "POST", { ...link, snapshot: next }),
    );
    expect(retry.status).toBe(200);
    expect((await retry.json()).publishedFingerprint).toBe(
      receipt.publishedFingerprint,
    );
    expect(
      store.entries.get(link.id)!.data.snapshot.data.equipment[0].notes,
    ).toBe("Owner note");
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "PUT",
            { snapshot: next, expectedEtag: "wrong" },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(409);
    const update = await handler(
      request(
        `/${link.id}`,
        "PUT",
        { snapshot: next, expectedEtag: receipt.etag },
        link.writeSecret,
      ),
    );
    expect(update.status).toBe(200);
    const latest = await update.json();
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "PUT",
            { snapshot, expectedEtag: receipt.etag },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(409);
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "DELETE",
            { expectedEtag: latest.etag },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request(`/${link.id}/read`, "POST", { readCode: link.readCode }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await handler(request("", "POST", { ...link, snapshot }))).status,
    ).toBe(403);
  });
  it("recovers the latest receipt after a lost PUT without overwriting a different snapshot, then revokes", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const initial = buildAssetSnapshot(data, "site", "site-1", now);
    const originalReceipt = await (
      await handler(request("", "POST", { ...link, snapshot: initial }))
    ).json();
    const remote = structuredClone(initial);
    remote.data.sites[0].address = "Successfully stored newer snapshot";
    const successfulPut = await handler(
      request(
        `/${link.id}`,
        "PUT",
        { snapshot: remote, expectedEtag: originalReceipt.etag },
        link.writeSecret,
      ),
    );
    expect(successfulPut.status).toBe(200); // Its response is deliberately not used to update the local receipt.
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "PUT",
            { snapshot: initial, expectedEtag: originalReceipt.etag },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(409);
    const recovered = await handler(
      request(`/${link.id}/receipt`, "POST", undefined, link.writeSecret),
    );
    expect(recovered.status).toBe(200);
    const receipt = await recovered.json();
    expect(receipt.etag).not.toBe(originalReceipt.etag);
    expect(receipt.publishedFingerprint).toBe(
      await snapshotFingerprint(remote),
    );
    expect(store.entries.get(link.id)!.data.snapshot).toEqual(remote);
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "DELETE",
            { expectedEtag: receipt.etag },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request(`/${link.id}/read`, "POST", { readCode: link.readCode }),
        )
      ).status,
    ).toBe(403);
  });
  it("recovers a credential-only owner receipt even when local records exceed the upload limit", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const initial = buildAssetSnapshot(data, "site", "site-1", now);
    const original = await (
      await handler(request("", "POST", { ...link, snapshot: initial }))
    ).json();
    const remote = structuredClone(initial);
    remote.data.sites[0].address = "Latest stored version";
    const update = await handler(
      request(
        `/${link.id}`,
        "PUT",
        { expectedEtag: original.etag, snapshot: remote },
        link.writeSecret,
      ),
    );
    expect(update.status).toBe(200);
    const latest = await update.json();
    data.electricalMeasurements = Array.from({ length: 3 }, (_, index) => ({
      ...data.electricalMeasurements![0],
      id: `large-photo-${index}`,
      photo: `data:image/png;base64,${"A".repeat(1_600_000)}`,
    }));
    const oversized = buildAssetSnapshot(data, "site", "site-1", now);
    expect(JSON.stringify(oversized).length).toBeGreaterThan(4_000_000);
    const received: Request[] = [];
    vi.stubGlobal("window", { location: { origin: link.origin } });
    vi.stubGlobal("fetch", async (input: string, init?: RequestInit) => {
      const incoming = new Request(new URL(input, link.origin), init);
      received.push(incoming);
      return handler(incoming);
    });
    try {
      const receipt = await recoverAssetReceipt({ ...link, ...original });
      expect(receipt).toEqual(latest);
      expect(received).toHaveLength(1);
      expect(new URL(received[0].url).pathname).toBe(
        `/api/shared-assets/${link.id}/receipt`,
      );
      expect(received[0].method).toBe("POST");
      expect(received[0].body).toBeNull();
      expect(received[0].headers.get("authorization")).toBe(
        `Bearer ${link.writeSecret}`,
      );
      expect(store.entries.get(link.id)!.data.snapshot).toEqual(remote);
      expect(
        (
          await handler(
            request(
              `/${link.id}`,
              "DELETE",
              { expectedEtag: receipt.etag },
              link.writeSecret,
            ),
          )
        ).status,
      ).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("receipt recovery requires the owner key and denies missing, revoked and non-POST routes", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const snapshot = buildAssetSnapshot(data, "site", "site-1", now);
    const created = await (
      await handler(request("", "POST", { ...link, snapshot }))
    ).json();
    for (const secret of [undefined, link.readCode, "0".repeat(64)])
      expect(
        (
          await handler(
            request(`/${link.id}/receipt`, "POST", undefined, secret),
          )
        ).status,
      ).toBe(403);
    expect(
      (
        await handler(
          request(
            `/${"f".repeat(32)}/receipt`,
            "POST",
            undefined,
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(403);
    for (const method of ["GET", "HEAD", "PUT", "DELETE"])
      expect(
        (
          await handler(
            request(`/${link.id}/receipt`, method, undefined, link.writeSecret),
          )
        ).status,
      ).toBe(403);
    expect(
      (
        await handler(
          request(
            `/${link.id}/receipt`,
            "POST",
            { padding: "x".repeat(1025) },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(413);
    const crossOrigin = request(
      `/${link.id}/receipt`,
      "POST",
      undefined,
      link.writeSecret,
    );
    crossOrigin.headers.set("Origin", "https://other.example");
    expect((await handler(crossOrigin)).status).toBe(403);
    const recovered = await handler(
      request(`/${link.id}/receipt`, "POST", undefined, link.writeSecret),
    );
    expect(recovered.status).toBe(200);
    const body = await recovered.text();
    expect(body.length).toBeLessThan(512);
    expect(JSON.parse(body)).toEqual(created);
    expect(body).not.toContain("snapshot");
    expect(body).not.toContain(link.writeSecret);
    expect(body).not.toContain(link.readCode);
    expect(recovered.headers.get("cache-control")).toBe("no-store");
    expect(
      (
        await handler(
          request(
            `/${link.id}`,
            "DELETE",
            { expectedEtag: created.etag },
            link.writeSecret,
          ),
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await handler(
          request(`/${link.id}/receipt`, "POST", undefined, link.writeSecret),
        )
      ).status,
    ).toBe(403);
  });
  it("bounds payloads, validates snapshots, and blocks cross-origin requests", async () => {
    const store = new MemoryStore();
    const handler = sharedAssetsHandler(store);
    const data = fixture();
    const link = data.sharedLinks![0];
    const snapshot = buildAssetSnapshot(data, "site", "site-1", now);
    const invalid = structuredClone(snapshot);
    invalid.data.equipment.push(data.equipment[1]);
    expect(
      (await handler(request("", "POST", { ...link, snapshot: invalid })))
        .status,
    ).toBe(400);
    const big = request("", "POST", { body: "x".repeat(4_000_001) });
    expect((await handler(big)).status).toBe(413);
    const cross = request("", "POST", { ...link, snapshot });
    cross.headers.set("Origin", "https://evil.example");
    expect((await handler(cross)).status).toBe(403);
    expect(store.entries.size).toBe(0);
  });
});
