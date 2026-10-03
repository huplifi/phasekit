import { describe, expect, it } from "vitest";
import { equipmentReportPatch } from "../apps/web/src/equipment-report-defaults";
import type { FieldReport, EquipmentRecord } from "../apps/web/src/storage";
const equipment: EquipmentRecord = {
  id: "unit",
  name: "LN25",
  location: "Konehuone",
  notes: "",
  updatedAt: "2026-10-03",
  refrigerantId: "r134a",
  chargeKg: "2,5",
  model: "Model A",
  serialNumber: "SN1",
};
const report: FieldReport = {
  id: "report",
  kind: "commissioning",
  title: "",
  updatedAt: "2026-10-03",
  checkedIds: [],
  fields: {},
  notes: "",
};
describe("equipment defaults respect recorded report facts", () => {
  it("fills a new report with site identity, total charge and sourced refrigerant fields", () => {
    const patch = equipmentReportPatch(report, equipment, {
      id: "site",
      name: "Torpanmäki 2",
      address: "Katu 1",
      updatedAt: "2026-10-03",
    });
    expect(patch.title).toBe("Torpanmäki 2");
    expect(patch.equipmentId).toBe("unit");
    expect(patch.fields).toMatchObject({
      equipment: "LN25 · Model A · SN1",
      installationLocation: "Katu 1 · Konehuone",
      refrigerantId: "r134a",
      chargeKg: "2,5",
    });
    expect(patch.fields?.refrigerantSourceNote).toContain("PhaseKit");
    expect(report.fields).toEqual({});
  });
  it("preserves entered facts and never adds a different device's charge to an existing refrigerant", () => {
    const fields = {
      refrigerantId: "r32",
      equipment: "Recorded unit",
      refrigerantGwp: "675",
      customHistorical: "kept",
    };
    const patch = equipmentReportPatch(
      { ...report, title: "Recorded site", fields },
      equipment,
    );
    expect(patch.title).toBe("Recorded site");
    expect(patch.fields).toEqual({
      ...fields,
      installationLocation: "Konehuone",
    });
    expect(
      equipmentReportPatch({ ...report, status: "final" }, equipment),
    ).toEqual({});
  });
  it("does not treat total charge as a movement or a measurement", () => {
    const patch = equipmentReportPatch(
      { ...report, kind: "evacuation" },
      equipment,
    );
    expect(patch.fields).toEqual({ equipment: "LN25 · Model A · SN1" });
  });
});
