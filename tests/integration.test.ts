import { describe, it, expect } from "vitest";
import type { CheckInput, Dataset } from "../packages/core/src/contracts";
import raw from "../packages/refrigerant-data/generated/dataset.json";
import { searchRefrigerants } from "../packages/refrigerant-data/src";
import { evaluateCheck } from "../packages/rulesets/eu-fi/src";
import { reasonMessages } from "../packages/rulesets/eu-fi/src/reasons";
import { translate } from "../packages/i18n/src";
const dataset = raw as Dataset;
const input = (id: string, charge = "50", detection = false): CheckInput => ({
  refrigerantId: id,
  charge,
  unit: "kg",
  equipment: "stationary_refrigeration",
  detection,
  hermetic: false,
  hermeticLabel: false,
  residential: false,
  asOf: "2026-09-25",
});
describe("shipped CSV dataset → search → real rule engine", () => {
  it.each(["R134a", "R-134A", "811-97-2"])(
    "resolves %s to the stable refrigerant identity",
    (query) => {
      expect(searchRefrigerants(query)[0]).toMatchObject({
        refrigerant: { id: "r134a" },
        match: "exact",
      });
    },
  );
  it("keeps an incomplete numeric query explicit", () => {
    const result = searchRefrigerants("134");
    expect(result.some((r) => r.refrigerant.id === "r134a")).toBe(true);
    expect(result.find((r) => r.refrigerant.id === "r134a")?.match).toBe(
      "suggested",
    );
  });
  it("evaluates R513A from shipped source facts, not a UI fixture", () => {
    const r = dataset.refrigerants.find((r) => r.id === "r513a");
    expect(r).toBeDefined();
    expect(
      r?.components.find((c) => c.refrigerantId === "r1234yf")?.massPercent,
    ).toBe("56");
    expect(
      r?.components.find((c) => c.refrigerantId === "r134a")?.massPercent,
    ).toBe("44");
    const result = evaluateCheck(input("r513a"), dataset);
    expect(result.state).toBe("required");
    expect(result.months).toBe(6);
    expect(
      result.components.find((c) => c.refrigerantId === "r134a"),
    ).toMatchObject({ massKg: "22", tonnesCO2e: "31.46" });
    expect(
      result.components.find((c) => c.refrigerantId === "r1234yf"),
    ).toMatchObject({ massKg: "28" });
    expect(result.obligations).toHaveLength(2);
    expect(evaluateCheck(input("r513a", "50", true), dataset).months).toBe(12);
    expect(
      result.sourceIds.every((id) => dataset.sources.some((s) => s.id === id)),
    ).toBe(true);
  });
  it.each(["r744", "r717", "r290", "r600a", "r170"])(
    "%s retains its separate natural-refrigerant scope",
    (id) => {
      expect(evaluateCheck(input(id), dataset).state).toBe(
        "outside_rule_scope",
      );
    },
  );
  it("R22 uses ODS even though no F-gas duty is claimed", () => {
    const r = evaluateCheck(input("r22", "30"), dataset);
    expect(r.state).toBe("required");
    expect(r.months).toBe(6);
    expect(r.decisiveRule).toContain("ods");
  });
  it.each(["fi", "en"] as const)(
    "%s translates an unchanged calculated result",
    (locale) => {
      const result = evaluateCheck(input("r513a"), dataset);
      expect(result.months).toBe(6);
      expect(translate(locale, result.state)).not.toBe("");
      expect(reasonMessages[result.reasonCodes[0]][locale]).not.toBe("");
      expect(result.dataVersion).toBe(dataset.version);
    },
  );
  it("published corpus contains legacy, natural and multi-component refrigerants", () => {
    expect(dataset.refrigerants.length).toBeGreaterThanOrEqual(190);
    expect(
      dataset.refrigerants.some(
        (r) => r.kind === "blend" && r.components.length >= 3,
      ),
    ).toBe(true);
  });
});

it("prioritizes number prefixes over single-character fuzzy matches", () => {
  expect(searchRefrigerants("513")[0].refrigerant.id).toBe("r513a");
});

it("keeps the Annex VI mixture GWP separate from legacy mixed-basis values", () => {
  const r = dataset.refrigerants.find((r) => r.id === "r513a")!;
  expect(r.facts.gwp_eu_2024_573_100yr).toMatchObject({
    value: "629.48056",
    basis: "EU-2024/573-Annex-VI-mass-weighted",
  });
});

it("evaluates the reported R514A 26 kg case from shipped source records", () => {
  const result = evaluateCheck(input("r514a", "26"), dataset);
  expect(result).toMatchObject({ state: "required", months: 6 });
  expect(result.obligations[0]).toMatchObject({
    unit: "kg",
    quantity: "19.422",
  });
  expect(result.sourceIds).toContain("eu-2024-573");
  expect(evaluateCheck(input("r514a", "26", true), dataset).months).toBe(12);
});
