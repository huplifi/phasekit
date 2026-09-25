import { describe, it, expect } from "vitest";
import raw from "../../refrigerant-data/generated/dataset.json";
import type { Refrigerant } from "./contracts";
import { co2eBreakdown } from "./co2e-breakdown";
import { convertCO2e } from "./tool-calculations";
const key = "gwp_eu_2024_573_100yr";
const all = raw.refrigerants as Refrigerant[];
const fluid = (id: string) => structuredClone(all.find((r) => r.id === id)!);
describe("CO2e component reconciliation", () => {
  it("reconciles R410A at 10kg without substituting the headline total", () => {
    const result = co2eBreakdown({
      refrigerant: fluid("r410a"),
      refrigerants: all,
      kg: "10",
      gwpKey: key,
    });
    expect(result.status).toBe("complete");
    expect(result.reconciled).toBe(true);
    expect(result.componentTonnesCO2e).toBe("20.875");
    expect(result.rows.find((r) => r.refrigerantId === "r32")?.tonnesCO2e).toBe(
      "3.375",
    );
  });
  it("accepts scientific notation returned for a very small calculated mass", () => {
    const r = fluid("r410a");
    const result = convertCO2e({
      direction: "tonnes_co2e_to_kg",
      value: "0.000000000001",
      gwpFact: r.facts[key],
    });
    expect(
      co2eBreakdown({
        refrigerant: r,
        refrigerants: all,
        kg: result.kg,
        gwpKey: key,
      }).status,
    ).toBe("complete");
  });
  it("uses actual inverse-converted mass", () => {
    const r = fluid("r410a");
    const result = convertCO2e({
      direction: "tonnes_co2e_to_kg",
      value: "20.875",
      gwpFact: r.facts[key],
    });
    expect(
      co2eBreakdown({
        refrigerant: r,
        refrigerants: all,
        kg: result.kg,
        gwpKey: key,
      }).rows.every((r) => r.massKg === "5"),
    ).toBe(true);
  });
  it("allows prescribed EU mixed assessments with explicit statutory flag", () => {
    const result = co2eBreakdown({
      refrigerant: fluid("r513a"),
      refrigerants: all,
      kg: "1",
      gwpKey: key,
    });
    expect(result.statutoryMixture).toBe(true);
    expect(result.reconciled).toBe(true);
    expect(result.weightedGwp).toBe("629.48056");
  });
  it("does not mix unrelated AR4, AR6 or ODS bases", () => {
    for (const basis of [
      "IPCC-AR4-100yr",
      "IPCC-AR6-100yr",
      "EU-2024/590-Annex-I-GWP100",
    ]) {
      const component = fluid("r32");
      component.facts[key].basis = basis;
      const result = co2eBreakdown({
        refrigerant: fluid("r410a"),
        refrigerants: [component, fluid("r125")],
        kg: "1",
        gwpKey: key,
      });
      expect(result.status).toBe("unavailable");
      expect(result.componentTonnesCO2e).toBeNull();
      expect(
        result.rows.find((r) => r.refrigerantId === "r32")?.gwp,
      ).toBeNull();
    }
  });
  it("requires complete sourced composition and GWP", () => {
    const r = fluid("r410a");
    r.components[0].massPercent = "49";
    expect(
      co2eBreakdown({ refrigerant: r, refrigerants: all, kg: "1", gwpKey: key })
        .reason,
    ).toBe("composition");
    r.components[0].massPercent = "50";
    r.components[0].sourceIds = [];
    expect(
      co2eBreakdown({ refrigerant: r, refrigerants: all, kg: "1", gwpKey: key })
        .reason,
    ).toBe("composition");
    const c = fluid("r32");
    c.facts[key].sourceIds = [];
    expect(
      co2eBreakdown({
        refrigerant: fluid("r410a"),
        refrigerants: [c, fluid("r125")],
        kg: "1",
        gwpKey: key,
      }).reason,
    ).toBe("component_gwp");
  });
  it("reports rounding or source mismatch without adjusting values", () => {
    const r = fluid("r410a");
    r.facts[key].value = "2088";
    const result = co2eBreakdown({
      refrigerant: r,
      refrigerants: all,
      kg: "10",
      gwpKey: key,
    });
    expect(result.reconciled).toBe(false);
    expect(result.selectedTonnesCO2e).toBe("20.88");
    expect(result.differenceTonnesCO2e).toBe("-0.005");
  });
  it("does not disguise a weighted GWP mismatch when mass is zero", () => {
    const r = fluid("r410a");
    r.facts[key].value = "2088";
    expect(
      co2eBreakdown({ refrigerant: r, refrigerants: all, kg: "0", gwpKey: key })
        .reconciled,
    ).toBe(false);
  });
  it("shows a pure substance as 100 percent and rejects negative charge", () => {
    const r = fluid("r134a");
    expect(
      co2eBreakdown({ refrigerant: r, refrigerants: all, kg: "1", gwpKey: key })
        .rows[0].massPercent,
    ).toBe("100");
    expect(() =>
      co2eBreakdown({
        refrigerant: r,
        refrigerants: all,
        kg: "-1",
        gwpKey: key,
      }),
    ).toThrow("negative_quantity");
  });
});
