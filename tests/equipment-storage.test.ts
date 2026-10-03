import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import {
  emptyData,
  isValidEquipmentCharge,
  loadData,
  mergeBackup,
  parseBackup,
  saveData,
} from "../apps/web/src/storage";
import type { EquipmentRecord, SiteRecord } from "../apps/web/src/storage";

const site: SiteRecord = {
  id: "site-market",
  name: "Market",
  address: "Main Street 1",
  updatedAt: "2026-10-03T12:00:00.000Z",
};
const equipment: EquipmentRecord = {
  id: "equipment-freezer",
  name: "Freezer 1",
  siteId: site.id,
  location: "Plant room",
  notes: "Keep the service access clear.",
  refrigerantId: "r134a",
  chargeKg: "2,5",
  model: "Manufacturer Model A",
  serialNumber: "SN-001",
  updatedAt: "2026-10-03T12:00:00.000Z",
};

afterEach(async () => {
  await deleteDB("phasekit");
});

describe("sites and device details", () => {
  it("round-trips multiple devices per site and optional details through backups and IndexedDB", async () => {
    const backup = {
      ...emptyData(),
      sites: [site],
      equipment: [
        equipment,
        {
          ...equipment,
          id: "equipment-freezer-2",
          name: "Freezer 2",
          chargeKg: "0",
        },
      ],
    };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.sites).toEqual([site]);
    expect(parsed.equipment).toEqual(backup.equipment);
    await saveData(parsed);
    const loaded = await loadData();
    expect(loaded.sites).toEqual([site]);
    expect(loaded.equipment).toEqual(backup.equipment);
  });

  it("imports legacy schema-v1 devices unchanged without inferring sites from location", () => {
    const { sites: _sites, ...legacy } = emptyData();
    const oldEquipment = {
      id: "legacy-equipment",
      name: "Old unit",
      location: "Market / Main Street 1",
      notes: "Original notes",
      updatedAt: equipment.updatedAt,
    };
    const parsed = parseBackup(
      JSON.stringify({ ...legacy, equipment: [oldEquipment] }),
    );
    expect(parsed.sites).toEqual([]);
    expect(parsed.equipment).toEqual([oldEquipment]);
  });

  it("preserves unknown refrigerant IDs and unresolved site links during import", () => {
    const unknown = {
      ...equipment,
      siteId: "site-not-in-backup",
      refrigerantId: "unknown-refrigerant",
    };
    expect(
      parseBackup(JSON.stringify({ ...emptyData(), equipment: [unknown] }))
        .equipment,
    ).toEqual([unknown]);
  });

  it("merges explicit sites and devices while keeping current records on ID collision", () => {
    const otherSite = { ...site, id: "site-other", name: "Other site" };
    const otherEquipment = {
      ...equipment,
      id: "equipment-other",
      siteId: otherSite.id,
      model: "Model B",
    };
    const merged = mergeBackup(
      { ...emptyData(), sites: [site], equipment: [equipment] },
      {
        ...emptyData(),
        sites: [{ ...site, name: "Imported duplicate" }, otherSite],
        equipment: [{ ...equipment, chargeKg: "9" }, otherEquipment],
      },
    );
    expect(merged.sites).toEqual([site, otherSite]);
    expect(merged.equipment).toEqual([equipment, otherEquipment]);
    const { sites: _sites, ...legacy } = emptyData();
    expect(
      mergeBackup(legacy, { ...emptyData(), sites: [site] }).sites,
    ).toEqual([site]);
  });

  it("rejects duplicate sites and invalid or excessive site data", () => {
    const parseSites = (sites: unknown[]) =>
      parseBackup(JSON.stringify({ ...emptyData(), sites }));
    expect(() => parseSites([site, site])).toThrow("Duplicate record");
    expect(() => parseSites([{ ...site, name: "" }])).toThrow();
    expect(() => parseSites([{ ...site, name: "x".repeat(201) }])).toThrow();
    expect(() => parseSites([{ ...site, address: "x".repeat(301) }])).toThrow();
    expect(() =>
      parseSites(
        Array.from({ length: 1001 }, (_, index) => ({
          ...site,
          id: `site-${index}`,
        })),
      ),
    ).toThrow();
  });

  it("validates device detail bounds and optional charge consistently with the form", () => {
    const parseDevice = (detail: Partial<EquipmentRecord>) =>
      parseBackup(
        JSON.stringify({
          ...emptyData(),
          equipment: [{ ...equipment, ...detail }],
        }),
      );
    for (const chargeKg of ["0", "2,5", "2.5", ".5", " 2,5 "]) {
      expect(isValidEquipmentCharge(chargeKg)).toBe(true);
      expect(parseDevice({ chargeKg }).equipment[0].chargeKg).toBe(chargeKg);
    }
    for (const chargeKg of [
      "",
      "-1",
      "NaN",
      "Infinity",
      "1,2,3",
      "1e3",
      "9".repeat(101),
    ]) {
      expect(isValidEquipmentCharge(chargeKg)).toBe(false);
      expect(() => parseDevice({ chargeKg })).toThrow();
    }
    expect(() => parseDevice({ model: "x".repeat(201) })).toThrow();
    expect(() => parseDevice({ serialNumber: "x".repeat(201) })).toThrow();
    expect(() => parseDevice({ refrigerantId: "x".repeat(101) })).toThrow();
    expect(() => parseDevice({ siteId: "" })).toThrow();
    expect(
      parseDevice({ chargeKg: undefined }).equipment[0].chargeKg,
    ).toBeUndefined();
  });
});
