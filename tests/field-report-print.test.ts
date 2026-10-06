import { describe, expect, it } from "vitest";
import type { ChecklistDraft } from "../packages/core/src/field-tools";
import {
  fieldReportObservationFields,
  fieldReportSummary,
} from "../apps/web/src/report-export";

function draft(
  kind: ChecklistDraft["kind"],
  fields: Record<string, string>,
): ChecklistDraft {
  return {
    id: "report-1",
    kind,
    title: "Konehuone A",
    updatedAt: "2026-09-26T12:00:00Z",
    checkedIds: [],
    fields,
    notes: "",
  };
}

describe("field-report print summary", () => {
  it("prints signed outdoor and indoor temperatures without requiring liquid readings", () => {
    const record = draft("commissioning", { outdoorC: "-7,5", indoorC: "21" });
    const fi = fieldReportSummary(record, "fi");
    expect(fi.map((item) => item.id)).toEqual(["outdoorC", "indoorC"]);
    expect(fi[0].value.replace("−", "-")).toBe("-7,5 °C");
    expect(fi[1].value).toBe("21 °C");
    expect(fieldReportObservationFields(record, "fi")).toEqual([]);
    expect(fieldReportSummary(record, "en")[0].label.en).toBe(
      "Outdoor temperature",
    );
  });

  it("shows compatible absolute standing-test readings and their signed difference", () => {
    const result = fieldReportSummary(
      draft("evacuation", {
        vacuumUnit: "mbar",
        targetPressure: "0,30",
        achievedPressure: "0,25",
        evacuationMinutes: "60",
        holdStartPressure: "0,25",
        holdEndPressure: "0,29",
        holdMinutes: "20",
      }),
      "fi",
    );
    expect(result.find((row) => row.id === "holdDelta")?.value).toBe(
      "0,04 mbar",
    );
    expect(result.find((row) => row.id === "achievedPressure")?.value).toBe(
      "0,25 mbar(a)",
    );
    expect(result.find((row) => row.id === "holdMinutes")?.value).toBe(
      "20 min",
    );
    expect(result.slice(0, 3).map((row) => row.id)).toEqual([
      "holdStartPressure",
      "holdEndPressure",
      "holdMinutes",
    ]);
  });

  it("does not interpret legacy prose or invalid readings as a measured result", () => {
    const legacy = fieldReportSummary(
      draft("evacuation", {
        vacuum: "300 Pa · 10:30",
        hold: "Alku 300, loppu 350 Pa",
      }),
      "fi",
    );
    expect(legacy).toEqual([]);
    const invalid = fieldReportSummary(
      draft("evacuation", {
        vacuumUnit: "Pa",
        holdStartPressure: "-30",
        holdEndPressure: "50 Pa",
      }),
      "en",
    );
    expect(invalid.find((row) => row.id === "holdDelta")).toBeUndefined();
    expect(
      invalid.find((row) => row.id === "holdStartPressure"),
    ).toBeUndefined();
    const observations = fieldReportObservationFields(
      draft("evacuation", {
        equipment: "PK-17",
        performedOn: "2026-09-26",
        technician: "S. Asentaja",
        vacuumUnit: "mbar",
        holdStartPressure: "0,25",
        holdEndPressure: "0,29",
        vacuum: "Vanha merkintä 300 Pa · 10:30",
        criterion: "Valmistajan raja",
      }),
      "fi",
    );
    expect(observations.map((field) => field.id)).toEqual([
      "criterion",
      "vacuum",
    ]);
  });

  it("keeps pressure reference explicit and negative temperatures valid in commissioning", () => {
    const result = fieldReportSummary(
      draft("commissioning", {
        refrigerantId: "R134a",
        chargeKg: "2,5",
        pressureUnit: "bar",
        pressureReference: "gauge",
        lp: "2,1",
        hp: "12",
        suctionC: "-8",
        dischargeC: "61",
        liquidC: "28",
      }),
      "en",
    );
    expect(result.find((row) => row.id === "lp")?.value).toBe("2.1 bar(g)");
    expect(result.find((row) => row.id === "suctionC")?.value).toBe("−8 °C");
    expect(result.find((row) => row.id === "chargeKg")?.value).toBe("2.5 kg");
    expect(
      result.some((row) => /pass|accepted|approved/i.test(row.value)),
    ).toBe(false);
  });

  it("shows subatmospheric gauge pressure but never a negative absolute pressure", () => {
    const input = {
      refrigerantId: "r134a",
      refrigerantDesignation: "R134a",
      pressureUnit: "bar",
      pressureReference: "gauge",
      lp: "-0,2",
      hp: "12",
    };
    const gauge = fieldReportSummary(draft("commissioning", input), "fi");
    expect(gauge.find((row) => row.id === "lp")?.value).toBe("−0,2 bar(g)");
    expect(gauge.find((row) => row.id === "refrigerantId")?.value).toBe(
      "R134a",
    );
    const absolute = fieldReportSummary(
      draft("commissioning", {
        ...input,
        pressureReference: "absolute",
      }),
      "fi",
    );
    expect(absolute.find((row) => row.id === "lp")).toBeUndefined();
  });
});
