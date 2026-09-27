import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { buildCommissioningCycle } from "../apps/web/src/commissioning-cycle";
import {
  emptyData,
  loadData,
  mergeBackup,
  parseBackup,
  saveData,
  type FieldReport,
} from "../apps/web/src/storage";

const legacy: FieldReport = {
  id: "legacy-vacuum",
  kind: "evacuation",
  title: "Työsali / KEUDA",
  updatedAt: "2026-09-26T11:38:00.000Z",
  checkedIds: ["measurement", "future-step-preserved"],
  fields: {
    equipment: "Kone #1",
    dateTechnician: "26.9.2026 Samu Hupli",
    vacuum: "1 mbar",
    hold: "1 mbar, 2,3 mbar 15min",
    unknownHistoricalField: "Historical value remains unchanged",
  },
  notes: "Testikirjaus\nPidä alkuperäinen sisältö.",
};
const measurements = {
  refrigerantId: "r134a",
  lp: "2.5",
  hp: "10",
  pressureUnit: "bar",
  pressureReference: "absolute",
  suctionC: "10",
  dischargeC: "70",
  liquidC: "25",
};
function finalized(): FieldReport {
  return {
    ...legacy,
    id: "commissioning-final",
    kind: "commissioning",
    status: "final",
    revision: 2,
    previousRevisionId: "commissioning-v1",
    finalizedAt: "2026-09-26T12:00:00.000Z",
    appVersion: "0.2.0-beta.4",
    equipmentId: "equipment-1",
    fields: {
      ...legacy.fields,
      ...measurements,
      performedOn: "2026-09-26",
      technician: "Samu Hupli",
    },
    cycleReport: buildCommissioningCycle(measurements).report!,
  };
}
const backup = (reports: FieldReport[]) => ({
  ...emptyData(),
  checklistDrafts: reports,
});

describe("additive field-report persistence", () => {
  it("preserves the full supported equipment location as a report title", async () => {
    const record = { ...legacy, title: "K".repeat(300) };
    const state = backup([record]);
    expect(parseBackup(JSON.stringify(state)).checklistDrafts[0]?.title).toBe(
      record.title,
    );
    await saveData(state);
    expect((await loadData()).checklistDrafts[0]?.title).toBe(record.title);
    const invalid = backup([{ ...record, title: `${record.title}x` }]);
    expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
    await expect(saveData(invalid)).rejects.toThrow();
    expect(await loadData()).toEqual(state);
  });
  it("restores older field maps, text and checkbox IDs without inventing metadata or splitting text", async () => {
    const original = backup([legacy]);
    expect(parseBackup(JSON.stringify(original))).toEqual(original);
    await saveData(original);
    expect(await loadData()).toEqual(original);
    const restored = (await loadData()).checklistDrafts[0]!;
    expect(restored).not.toHaveProperty("status");
    expect(restored).not.toHaveProperty("revision");
    expect(restored.fields).not.toHaveProperty("technician");
    expect(restored.fields.hold).toBe("1 mbar, 2,3 mbar 15min");
  });

  it("round-trips final and draft revisions with independent frozen calculation and chart data", async () => {
    const final = finalized();
    const draft: FieldReport = {
      ...structuredClone(final),
      id: "commissioning-next",
      status: "draft",
      revision: 3,
      previousRevisionId: final.id,
      finalizedAt: undefined,
      fields: { ...final.fields, notesForNextVisit: "Check the liquid line" },
    };
    const state = backup([final, draft]);
    const json = JSON.stringify(state);
    const parsed = parseBackup(json);
    expect(parsed).toEqual(JSON.parse(json));
    await saveData(parsed);
    const restored = await loadData();
    expect(restored).toEqual(parsed);
    const recovered = restored.checklistDrafts[0]!;
    expect(recovered.cycleReport).toEqual(final.cycleReport);
    expect(recovered.cycleReport?.chartSnapshot?.points).toHaveLength(4);
    expect(recovered.cycleReport?.sources.length).toBeGreaterThan(0);
    // Editing a later revision cannot mutate the already persisted original.
    restored.checklistDrafts[1]!.fields.lp = "3";
    restored.checklistDrafts[1]!.cycleReport!.chartSnapshot!.points[0][0] = 3;
    expect((await loadData()).checklistDrafts[0]).toEqual(final);
    expect((await loadData()).checklistDrafts[1]!.fields.lp).toBe("2.5");
  });

  it.each(["service", "refrigerant"] as const)(
    "restores the new %s report kind with all recorded fields",
    (kind) => {
      const entry: FieldReport = {
        ...legacy,
        id: kind,
        kind,
        status: "draft",
        revision: 1,
      };
      expect(
        parseBackup(JSON.stringify(backup([entry]))).checklistDrafts,
      ).toEqual([entry]);
    },
  );

  it("merges only missing report IDs, preserving local history and importing complete new revisions", () => {
    const final = finalized();
    const current = backup([legacy, final]);
    const previous = structuredClone(current);
    const next: FieldReport = {
      ...structuredClone(final),
      id: "new-revision",
      revision: 3,
      previousRevisionId: final.id,
    };
    const incoming = backup([
      {
        ...legacy,
        fields: { hold: "Different values from another copy" },
        notes: "replacement",
      },
      { ...final, title: "Changed elsewhere", cycleReport: undefined },
      next,
    ]);
    const merged = mergeBackup(current, incoming);
    expect(merged.checklistDrafts).toEqual([legacy, final, next]);
    expect(current).toEqual(previous);
    expect(mergeBackup(emptyData(), current)).toEqual(current);
  });

  it.each([
    { kind: "unrecognised" },
    { status: "approved" },
    { revision: 0 },
    { revision: -1 },
    { revision: 1.5 },
    { revision: 10001 },
    { finalizedAt: "26.9.2026" },
    { previousRevisionId: "" },
  ])("rejects invalid report metadata %s", (invalid) => {
    const candidate = {
      ...emptyData(),
      checklistDrafts: [{ ...legacy, ...invalid }],
    };
    expect(() => parseBackup(JSON.stringify(candidate))).toThrow();
  });

  it.each([
    "wrong-kind",
    "missing-point",
    "negative-pressure",
    "nonfinite-enthalpy",
    "short-dome",
  ])(
    "rejects malformed frozen charts (%s) before overwriting recoverable data",
    async (fault) => {
      const original = backup([finalized()]);
      await saveData(original);
      const invalid = structuredClone(original);
      const chart = invalid.checklistDrafts[0]!.cycleReport!.chartSnapshot!;
      if (fault === "wrong-kind")
        Object.assign(chart, { kind: "unsupported-v2" });
      if (fault === "missing-point") chart.points.pop();
      if (fault === "negative-pressure") chart.points[0][0] = -1;
      if (fault === "nonfinite-enthalpy")
        chart.points[0][1] = Number.POSITIVE_INFINITY;
      if (fault === "short-dome") chart.dome = [];
      expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
      await expect(saveData(invalid)).rejects.toThrow();
      expect(await loadData()).toEqual(original);
    },
  );
});
