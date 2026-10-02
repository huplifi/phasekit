import { describe, expect, it } from "vitest";
import type { Refrigerant } from "../../core/src/contracts";
import { dataset } from "./index";
import { describeRefrigerantFact } from "./fact-status";

const get = (id: string) =>
  dataset.refrigerants.find((item) => item.id === id)!;

describe("refrigerant fact status", () => {
  it("distinguishes a verified zero nominal glide from missing data", () => {
    expect(describeRefrigerantFact(get("r410a"), "glide", "fi")).toMatchObject({
      state: "known_absent",
      text: "Ei liukumaa",
    });
    expect(describeRefrigerantFact(get("r134a"), "glide", "fi")).toMatchObject({
      state: "known_absent",
      text: "Ei liukumaa",
    });
    const missing = structuredClone(get("r410a"));
    missing.facts.nominal_glide_k = {
      state: "unknown",
      value: null,
      sourceIds: [],
    };
    expect(describeRefrigerantFact(missing, "glide", "fi").state).toBe(
      "missing",
    );
  });
  it("does not show a density number without its full conditions", () => {
    const refrigerant = structuredClone(get("r410a"));
    refrigerant.facts.normal_density_kg_m3 = {
      state: "verified",
      value: "1120",
      unit: "kg/m³",
      sourceIds: ["example"],
      conditions: { temperatureC: 20, phase: "liquid" },
    };
    const withheld = describeRefrigerantFact(refrigerant, "density", "en");
    expect(withheld.state).toBe("missing");
    expect(withheld.text).not.toContain("1120");
    refrigerant.facts.normal_density_kg_m3.conditions = {
      temperatureC: 20,
      pressureKPaAbsolute: 101.325,
      phase: "liquid",
      method: "Measured",
    };
    expect(describeRefrigerantFact(refrigerant, "density", "en")).toMatchObject(
      {
        state: "known",
        text: "1120 kg/m³",
        detail: expect.stringContaining("20 °C"),
      },
    );
  });
  it("keeps PED, LFL and autoignition meanings distinct", () => {
    const refrigerant = structuredClone(get("r410a")) as Refrigerant;
    refrigerant.facts.ped_fluid_group = {
      state: "verified",
      value: "2",
      sourceIds: ["example"],
    };
    refrigerant.facts.lower_flammability_limit_vol_pct = {
      state: "not_applicable",
      value: null,
      sourceIds: ["example"],
    };
    refrigerant.facts.autoignition_c = {
      state: "unknown",
      value: null,
      sourceIds: [],
    };
    expect(describeRefrigerantFact(refrigerant, "ped", "fi")).toMatchObject({
      state: "known",
      text: "Fluidiryhmä 2",
    });
    expect(describeRefrigerantFact(refrigerant, "lfl", "fi").state).toBe(
      "not_applicable",
    );
    expect(
      describeRefrigerantFact(refrigerant, "autoignition", "fi").state,
    ).toBe("missing");
  });
  it("shows independently sourced R1243zf family without inventing its safety class", () => {
    const refrigerant = get("r1243zf");
    expect(refrigerant.sourceIds).toContain("epa-hfo-1243zf-family");
    expect(describeRefrigerantFact(refrigerant, "family", "fi")).toMatchObject({
      state: "known",
      text: "HFO",
    });
    expect(describeRefrigerantFact(refrigerant, "safety", "fi").state).toBe(
      "unclassified",
    );
  });
});
