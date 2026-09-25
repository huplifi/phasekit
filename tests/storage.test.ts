import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import type {
  CheckResult,
  Refrigerant,
  Source,
} from "../packages/core/src/contracts";
import {
  emptyData,
  loadData,
  mergeBackup,
  parseBackup,
  saveData,
} from "../apps/web/src/storage";
import type { Snapshot, UserData } from "../apps/web/src/storage";

const source: Source = {
  id: "eu-regulation",
  title: "EU Regulation test source",
  url: "https://example.test/regulation",
  version: "2024/573",
  checkedAt: "2026-09-25",
  license: "Public legislation",
};

const refrigerant: Refrigerant = {
  id: "r513a",
  designation: "R513A",
  name: { fi: "R513A", en: "R513A" },
  kind: "blend",
  family: "hfo-hfc",
  aliases: [],
  cas: null,
  formula: null,
  components: [
    {
      refrigerantId: "r1234yf",
      massPercent: "56",
      sourceIds: ["eu-regulation"],
    },
    { refrigerantId: "r134a", massPercent: "44", sourceIds: ["eu-regulation"] },
  ],
  facts: {},
  sourceIds: ["eu-regulation"],
  coverage: {
    identity: "verified",
    composition: "verified",
    safety: "verified",
    regulatory_eu_fi: "verified",
    pt: "unsupported",
  },
};

function makeSnapshot(id: string, dataVersion: string): Snapshot {
  const input: CheckResult["input"] = {
    refrigerantId: "r513a",
    charge: "50",
    unit: "kg",
    equipment: "stationary_refrigeration",
    detection: false,
    hermetic: false,
    hermeticLabel: false,
    residential: false,
    asOf: "2026-09-25",
  };
  const result: CheckResult = {
    state: "required",
    months: 12,
    decisiveRule: "annex-i-tier-1",
    decisiveComponent: "r134a",
    components: [
      {
        refrigerantId: "r1234yf",
        massPercent: "56",
        massKg: "28",
        annex: "II-1",
        gwpBasis: "EU 2024/573",
        gwp: "1",
        tonnesCO2e: "0.028",
      },
      {
        refrigerantId: "r134a",
        massPercent: "44",
        massKg: "22",
        annex: "I",
        gwpBasis: "EU 2024/573",
        gwp: "1430",
        tonnesCO2e: "31.46",
      },
    ],
    obligations: [
      {
        ruleId: "annex-i-tier-1",
        component: "r134a",
        quantity: "31.46",
        unit: "t CO2e",
        months: 12,
        reasonCode: "above_threshold",
      },
    ],
    reasonCodes: ["above_threshold"],
    requiredInputs: [],
    rulesetVersion: "eu-fi-test-1",
    dataVersion,
    sourceIds: ["eu-regulation"],
    detectionRequired: false,
    input,
  };
  return {
    id,
    createdAt: "2026-09-25T12:00:00.000Z",
    refrigerant,
    result,
    sources: [source],
  };
}

afterEach(async () => {
  await deleteDB("phasekit");
});

describe("local snapshot persistence", () => {
  it("round-trips the original inputs, source, and data version through IndexedDB", async () => {
    const original = makeSnapshot("snapshot-v1", "refrigerants-2026-09-25");
    await saveData({ ...emptyData(), snapshots: [original] });

    const loaded = await loadData();

    expect(loaded.snapshots).toEqual([original]);
    expect(loaded.snapshots[0]?.result.dataVersion).toBe(
      "refrigerants-2026-09-25",
    );
    expect(loaded.snapshots[0]?.result.input).toEqual(original.result.input);
  });

  it("keeps a saved result on its original data version when newer snapshots are added", async () => {
    const original = makeSnapshot("snapshot-v1", "refrigerants-2026-09-25");
    await saveData({ ...emptyData(), snapshots: [original] });
    const loaded = await loadData();

    await saveData({
      ...loaded,
      snapshots: [
        makeSnapshot("snapshot-v2", "refrigerants-2026-10-01"),
        ...loaded.snapshots,
      ],
    });
    const afterUpdate = await loadData();

    expect(
      afterUpdate.snapshots.find((snapshot) => snapshot.id === "snapshot-v1")
        ?.result.dataVersion,
    ).toBe("refrigerants-2026-09-25");
    expect(
      afterUpdate.snapshots.find((snapshot) => snapshot.id === "snapshot-v1")
        ?.result,
    ).toEqual(original.result);
    expect(
      afterUpdate.snapshots.find((snapshot) => snapshot.id === "snapshot-v2")
        ?.result.dataVersion,
    ).toBe("refrigerants-2026-10-01");
  });

  it("does not replace an existing snapshot when an imported copy reuses its id", () => {
    const original = makeSnapshot(
      "snapshot-same-id",
      "refrigerants-2026-09-25",
    );
    const tampered = {
      ...original,
      result: { ...original.result, dataVersion: "refrigerants-2026-10-01" },
    };
    const current: UserData = { ...emptyData(), snapshots: [original] };
    const incoming: UserData = { ...emptyData(), snapshots: [tampered] };

    const merged = mergeBackup(current, incoming);

    expect(merged.snapshots).toEqual([original]);
    expect(merged.snapshots[0]?.result.dataVersion).toBe(
      "refrigerants-2026-09-25",
    );
  });
});

describe("backup import validation", () => {
  it("rejects malformed JSON, unsupported schemas, and invalid saved IDs", () => {
    expect(() => parseBackup("{not-json")).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...emptyData(), schemaVersion: 2 })),
    ).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...emptyData(), favourites: ["R134a"] })),
    ).toThrow();
  });

  it("rejects duplicate snapshot IDs instead of silently merging them", () => {
    const snapshot = makeSnapshot("duplicate-id", "refrigerants-2026-09-25");
    const backup = { ...emptyData(), snapshots: [snapshot, snapshot] };

    expect(() => parseBackup(JSON.stringify(backup))).toThrow(
      "Duplicate snapshot",
    );
  });

  it("normalizes duplicate favourite and recent IDs in a valid backup", () => {
    const snapshot = makeSnapshot("snapshot-v1", "refrigerants-2026-09-25");
    const parsed = parseBackup(
      JSON.stringify({
        ...emptyData(),
        favourites: ["r513a", "r513a"],
        recent: ["r513a", "r513a"],
        snapshots: [snapshot],
      }),
    );

    expect(parsed.favourites).toEqual(["r513a"]);
    expect(parsed.recent).toEqual(["r513a"]);
    expect(parsed.snapshots).toEqual([snapshot]);
  });
});

it("keeps optional missing-data diagnostics in backup and local snapshots", async () => {
  const snapshot = makeSnapshot("missing-evidence", "old-data");
  snapshot.result.state = "insufficient_data";
  snapshot.result.missingData = [{ refrigerantId: "r1130e", field: "euAnnex" }];
  snapshot.componentDesignations = { r1130e: "R1130(E)" };
  const backup = { ...emptyData(), snapshots: [snapshot] };
  expect(
    parseBackup(JSON.stringify(backup)).snapshots[0].result.missingData,
  ).toEqual(snapshot.result.missingData);
  await saveData(backup);
  expect((await loadData()).snapshots[0].componentDesignations).toEqual({
    r1130e: "R1130(E)",
  });
});
