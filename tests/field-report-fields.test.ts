import { describe, expect, it } from "vitest";
import {
  checklistDefinitions,
  checklistReportFields,
  checklistText,
  commissioningMissingFields,
  updateCommissioningFields,
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
  it("hides the signature name on new forms but preserves historical names", () => {
    expect(
      checklistReportFields(draft("commissioning")).some(
        (field) => field.id === "signatureName",
      ),
    ).toBe(false);
    const old = draft("commissioning", { signatureName: "Original signer" });
    expect(
      checklistReportFields(old).find((field) => field.id === "signatureName")
        ?.legacy,
    ).toBe(true);
    expect(checklistText(old, "en")).toContain("Original signer");
  });
  it("shares optional evacuation readings with commissioning without merging old free text", () => {
    const record = draft("commissioning", {
      vacuum: "1 mbar after 30 minutes",
      holdStartPressure: "1",
      holdEndPressure: "2.3",
      holdMinutes: "15",
      vacuumUnit: "mbar",
    });
    const fields = checklistReportFields(record).filter(
      (field) => field.group === "evacuation",
    );
    expect(fields.map((field) => field.id)).toEqual(
      expect.arrayContaining([
        "vacuum",
        "vacuumUnit",
        "achievedPressure",
        "holdStartPressure",
        "holdEndPressure",
        "holdMinutes",
      ]),
    );
    expect(record.fields.achievedPressure).toBeUndefined();
    expect(checklistText(record, "en")).toContain("1 mbar after 30 minutes");
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
  it("requires explicit commissioning certificate records without treating readings as protocol approval", () => {
    const complete = {
      equipment: "SN-123",
      technician: "Installer",
      installerCompany: "Test Company",
      installerQualificationNumber: "INST-1",
      responsiblePerson: "Responsible person",
      responsibleQualificationNumber: "RESP-1",
      refrigerantId: "r134a",
      refrigerantSafetyClass: "A1",
      refrigerantGwp: "1430",
      refrigerantGwpBasis: "EU 2024/573",
      refrigerantSourceNote: "Source record",
      chargeKg: "2",
      leakCheckInterval: "Assessed interval and basis",
      tightnessTestReportReference: "Annex T-1",
      testRunReportReference: "Annex R-1",
      evacuationReportReference: "Annex V-1",
      operatorDeclaration: "confirmed",
      pressureTestRequired: "no",
      pressureTestExemptionReason: "Documented equipment assessment",
    };
    expect(commissioningMissingFields(complete)).toEqual([]);
    expect(
      commissioningMissingFields({
        ...complete,
        pressureTestRequired: "not_assessed",
      }).map((field) => field.id),
    ).toContain("pressureTestRequired");
    expect(
      commissioningMissingFields({
        ...complete,
        pressureTestRequired: "yes",
      }).map((field) => field.id),
    ).toContain("pressureTestReportReference");
    expect(
      commissioningMissingFields({
        ...complete,
        pressureTestExemptionReason: "",
      }).map((field) => field.id),
    ).toContain("pressureTestExemptionReason");
    expect(
      commissioningMissingFields({
        ...complete,
        operatorDeclaration: "looks good",
      }).map((field) => field.id),
    ).toContain("operatorDeclaration");
    expect(
      commissioningMissingFields({ ...complete, chargeKg: "-2" }).map(
        (field) => field.id,
      ),
    ).toContain("chargeKg");
    expect(
      commissioningMissingFields({
        ...complete,
        testRunReportReference: "",
        lp: "3",
        hp: "10",
        suctionC: "10",
        dischargeC: "60",
        liquidC: "20",
      }).map((field) => field.id),
    ).toContain("testRunReportReference");
    const inline = {
      ...complete,
      evacuationReportReference: "",
      achievedPressure: "1",
      holdStartPressure: "1",
      holdEndPressure: "1.2",
      holdMinutes: "15",
      vacuumUnit: "mbar",
    };
    expect(
      commissioningMissingFields(inline).map((field) => field.id),
    ).toContain("evacuationReportReference");
    expect(
      commissioningMissingFields({
        ...inline,
        criterion: "Equipment instruction limits",
        instrumentName: "Gauge 1",
        measurementLocation: "Service port",
        evacuationFinding: "Results compared to instruction",
      }),
    ).toEqual([]);
  });
  it("requires renewed declaration and dependent assessments after substantive changes", () => {
    const before = {
      refrigerantId: "r134a",
      chargeKg: "2",
      leakCheckInterval: "12 months",
      pressureTestRequired: "no",
      pressureTestReportReference: "Retained protocol",
      operatorDeclaration: "confirmed",
    };
    expect(
      updateCommissioningFields(before, { ...before, refrigerantId: "r290" }),
    ).toMatchObject({
      operatorDeclaration: "",
      leakCheckInterval: "",
      pressureTestRequired: "not_assessed",
      pressureTestReportReference: "Retained protocol",
    });
    expect(
      updateCommissioningFields(before, { ...before, chargeKg: "3" }),
    ).toMatchObject({
      operatorDeclaration: "",
      leakCheckInterval: "",
      pressureTestRequired: "no",
    });
    expect(
      updateCommissioningFields(before, { ...before, lp: "3" })
        .operatorDeclaration,
    ).toBe("");
    expect(
      updateCommissioningFields(before, {
        ...before,
        operatorDeclaration: "confirmed",
      }).operatorDeclaration,
    ).toBe("confirmed");
  });
});
