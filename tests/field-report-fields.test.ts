import { describe, expect, it } from "vitest";
import {
  checklistDefinitions,
  checklistReportFields,
  checklistText,
  type ChecklistDraft,
} from "../packages/core/src/field-tools";

const draft = (
  kind: ChecklistDraft["kind"],
  fields: Record<string, string> = {},
): ChecklistDraft => ({
  id: "report-one",
  kind,
  title: "Test site",
  updatedAt: "2026-09-26T12:00:00Z",
  checkedIds: [],
  fields,
  notes: "",
});

describe("structured field reports", () => {
  it("keeps old free text byte-for-byte without guessing structured values", () => {
    const old = draft("evacuation", {
      date: "26.9.2026 Samu",
      vacuum: "1 mbar",
      hold: "1 mbar, 2,3 mbar 15min",
      instrument: "TESTO",
    });
    const fields = checklistReportFields(old);
    expect(
      fields.filter((field) => field.legacy).map((field) => field.id),
    ).toEqual(["date", "instrument", "vacuum", "hold"]);
    expect(old.fields.holdStartPressure).toBeUndefined();
    const exported = checklistText(old, "fi");
    expect(exported).toContain("1 mbar, 2,3 mbar 15min");
    expect(exported).toContain("26.9.2026 Samu");
  });
  it("shows separate unambiguous evacuation and standing-test fields", () => {
    const fields = checklistReportFields(draft("evacuation"));
    expect(fields.some((field) => field.legacy)).toBe(false);
    expect(fields.map((field) => field.id)).toEqual(
      expect.arrayContaining([
        "performedOn",
        "technician",
        "signatureName",
        "achievedPressure",
        "evacuationMinutes",
        "holdStartPressure",
        "holdEndPressure",
        "holdMinutes",
        "vacuumUnit",
      ]),
    );
  });
  it("gives commissioning separate measurements shared with the cycle calculation", () => {
    const fields = checklistReportFields(draft("commissioning"));
    expect(fields.map((field) => field.id)).toEqual(
      expect.arrayContaining([
        "refrigerantId",
        "chargeKg",
        "lp",
        "hp",
        "pressureUnit",
        "pressureReference",
        "atmosphericReference",
        "suctionC",
        "dischargeC",
        "liquidC",
      ]),
    );
    expect(fields.filter((field) => field.legacy)).toEqual([]);
  });
  it("exports every recording template bilingually without duplicate fields", () => {
    for (const kind of Object.keys(
      checklistDefinitions,
    ) as ChecklistDraft["kind"][]) {
      const record = draft(kind);
      const fields = checklistReportFields(record);
      expect(new Set(fields.map((field) => field.id)).size).toBe(fields.length);
      expect(fields.every((field) => field.label.fi && field.label.en)).toBe(
        true,
      );
      expect(checklistText(record, "en")).toContain(
        checklistDefinitions[kind].name.en,
      );
    }
  });
});
