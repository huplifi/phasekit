import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  emptyData,
  parseBackup,
  mergeBackup,
  saveData,
  loadData,
  type ToolRecord,
} from "../apps/web/src/storage";
const record: ToolRecord = {
  id: "report1",
  createdAt: "2026-09-26T01:00:00.000Z",
  tool: "cycle",
  title: "R134a",
  notes: "Before adjustment",
  inputs: [{ label: { fi: "Imu", en: "Suction" }, value: "10", unit: "°C" }],
  outputs: [
    { label: { fi: "Tulistus", en: "Superheat" }, value: "10.02", unit: "K" },
  ],
  sources: [],
  equipmentId: "eq1",
  equipmentName: "Cold room",
};
describe("preview record compatibility", () => {
  it("imports original v1 backups without new collections", () => {
    const old = { ...emptyData() } as Record<string, unknown>;
    delete old.toolRecords;
    delete old.equipment;
    delete old.checklistDrafts;
    const restored = parseBackup(JSON.stringify(old));
    expect(restored.toolRecords).toEqual([]);
    expect(restored.checklistDrafts).toEqual([]);
    expect(restored.equipment).toEqual([]);
  });
  it("persists reports, equipment and checklist drafts and merges without replacing history", async () => {
    const state = emptyData();
    state.toolRecords = [record];
    state.equipment = [
      {
        id: "eq1",
        name: "Cold room",
        location: "Workshop",
        notes: "",
        updatedAt: record.createdAt,
      },
    ];
    state.checklistDrafts = [
      {
        id: "list1",
        kind: "evacuation",
        title: "Cold room",
        updatedAt: record.createdAt,
        checkedIds: ["measurement"],
        fields: { vacuum: "450 micron" },
        notes: "stable",
      },
    ];
    await saveData(state);
    expect(await loadData()).toEqual(state);
    const incoming = parseBackup(JSON.stringify(state));
    incoming.toolRecords[0].title = "Changed in another copy";
    expect(mergeBackup(state, incoming).toolRecords).toEqual([record]);
    expect(mergeBackup(emptyData(), incoming).checklistDrafts).toEqual(
      state.checklistDrafts,
    );
  });
  it("rejects duplicate records, unbounded text and unsafe source URLs", () => {
    const state = emptyData();
    state.toolRecords = [record, record];
    expect(() => parseBackup(JSON.stringify(state))).toThrow("Duplicate");
    state.toolRecords = [{ ...record, title: "x".repeat(201) }];
    expect(() => parseBackup(JSON.stringify(state))).toThrow();
    state.toolRecords = [
      {
        ...record,
        sources: [
          {
            id: "bad",
            title: "bad",
            url: "javascript:alert(1)",
            version: "1",
            checkedAt: "2026-09-26",
            license: "none",
          },
        ],
      },
    ];
    expect(() => parseBackup(JSON.stringify(state))).toThrow();
  });
  it("does not overwrite restorable storage with an invalid record or merge", async () => {
    const original = { ...emptyData(), toolRecords: [record] };
    await saveData(original);
    await expect(
      saveData({
        ...original,
        toolRecords: [{ ...record, title: "x".repeat(201) }],
      }),
    ).rejects.toThrow();
    expect(await loadData()).toEqual(original);
    const full = {
      ...emptyData(),
      toolRecords: Array.from({ length: 1000 }, (_, i) => ({
        ...record,
        id: `record-${i}`,
      })),
    };
    expect(() => mergeBackup(full, original)).toThrow();
    expect(full.toolRecords).toHaveLength(1000);
  });
});
