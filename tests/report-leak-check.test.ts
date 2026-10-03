import { describe, expect, it } from "vitest";
import { evaluateCommissioningLeakCheck } from "../apps/web/src/report-leak-check";

const base = {
  performedOn: "2026-10-02",
  refrigerantId: "r134a",
  chargeKg: "4",
  leakEquipment: "stationary_refrigeration",
  leakDetection: "no",
  leakHermetic: "no",
};

describe("commissioning leak-check assessment", () => {
  it("uses the legal rule engine and saves versioned evidence for a 5 t CO2e threshold crossing", () => {
    const below = evaluateCommissioningLeakCheck({ ...base, chargeKg: "3" });
    expect(below.state).toBe("resolved");
    expect(below.result?.state).toBe("below_threshold");
    const above = evaluateCommissioningLeakCheck(base);
    expect(above.state).toBe("resolved");
    expect(above.result?.state).toBe("required");
    expect(above.result?.months).toBe(12);
    expect(above.fieldPatch?.leakCheckInterval).toContain("12 kuukauden");
    const evidence = JSON.parse(above.fieldPatch!.leakCheckEvidence);
    expect(evidence).toMatchObject({
      input: { charge: "4", asOf: "2026-10-02" },
      state: "required",
      months: 12,
      decisiveRule: expect.any(String),
      rulesetVersion: expect.any(String),
      dataVersion: expect.any(String),
    });
    expect(above.fieldPatch!.leakCheckEvidence.length).toBeLessThanOrEqual(
      2000,
    );
  });
  it("only doubles an applicable interval when detection is confirmed", () => {
    const detected = evaluateCommissioningLeakCheck({
      ...base,
      leakDetection: "yes",
    });
    expect(detected.result?.months).toBe(24);
  });
  it("withholds any exemption when equipment or hermetic facts are missing", () => {
    const omitted = evaluateCommissioningLeakCheck({
      ...base,
      leakEquipment: "",
      leakHermetic: "yes",
      leakHermeticLabel: "",
    });
    expect(omitted.state).toBe("needs_input");
    expect(omitted.missing).toEqual(
      expect.arrayContaining(["leakEquipment", "leakHermeticLabel"]),
    );
    expect(omitted.fieldPatch).toBeUndefined();
    const other = evaluateCommissioningLeakCheck({
      ...base,
      leakEquipment: "other",
    });
    expect(other.state).toBe("needs_review");
    expect(other.fieldPatch).toBeUndefined();
  });
  it("does not convert missing regulatory data into a no-check decision", () => {
    const unknown = evaluateCommissioningLeakCheck({
      ...base,
      refrigerantId: "r1243zf",
    });
    expect(unknown.state).toBe("needs_review");
    expect(unknown.fieldPatch).toBeUndefined();
  });
});
