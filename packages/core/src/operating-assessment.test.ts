import { describe, expect, it } from "vitest";
import {
  assessOperation,
  assessmentPlainText,
  suggestedPortRole,
} from "./operating-assessment";
import type { OperatingAssessmentInput } from "./operating-assessment";

const atmosphere = { value: "1.01325", unit: "bar(a)" } as const;

function assess(
  input: Partial<OperatingAssessmentInput> &
    Pick<OperatingAssessmentInput, "system" | "mode">,
) {
  return assessOperation(input);
}

describe("operating assessment", () => {
  it("suggests the gas-port role from mode without treating it as universal", () => {
    expect(suggestedPortRole("air_air", "cooling")).toBe("suction");
    expect(suggestedPortRole("air_air", "heating")).toBe("hot_gas");
    expect(suggestedPortRole("hydronic", "heating")).toBe("hot_gas");
    expect(suggestedPortRole("dx_cooling", "cooling")).toBe("suction");
    expect(suggestedPortRole("industrial", "cooling")).toBe("unknown");
  });

  it("converts one gauge atmosphere and keeps R134a superheat on the dew point", () => {
    const result = assess({
      refrigerantId: "r134a",
      system: "air_air",
      mode: "cooling",
      atmosphere,
      primary: {
        value: "1.914781823",
        unit: "bar(g)",
        uncertainty: "0.2",
        role: "suction",
        pipeTemperatureC: "10",
      },
    });
    expect(result.fieldErrors).toEqual([]);
    expect(result.readings[0]?.absoluteBar).toBe("2.928031823");
    expect(result.readings[0]?.uncertaintyBar).toBe("0.2");
    const superheat = result.quantities.find(
      (item) => item.id === "suction_superheat",
    );
    expect(Number(superheat?.value)).toBeCloseTo(10, 0);
    expect(superheat?.low).toBeTruthy();
    expect(superheat?.high).toBeTruthy();
    expect(Number(superheat?.low)).toBeLessThan(Number(superheat?.value));
    expect(Number(superheat?.high)).toBeGreaterThan(Number(superheat?.value));
    const text = assessmentPlainText(result, "fi");
    expect(text).toContain("Kylmäainetta ei lisätä yhdestä lukemasta");
    expect(text).not.toMatch(/lisää kylmäainetta/);
    expect(assessmentPlainText(result, "en")).toContain(
      "Refrigerant is not added from one reading",
    );
  });

  it("shows a useful dew point from pressure alone and does not invent superheat", () => {
    const result = assess({
      refrigerantId: "r32",
      system: "air_air",
      mode: "cooling",
      atmosphere,
      primary: { value: "4", unit: "bar(g)", role: "suction" },
      indoorAirC: "22",
    });
    expect(
      result.quantities.some((item) => item.id === "suction_superheat"),
    ).toBe(false);
    expect(result.focus?.label.fi).toBe("Imun kastepiste");
    expect(result.quantities.some((item) => item.id === "approach")).toBe(true);
    expect(assessmentPlainText(result, "fi")).toContain("Kastepiste on");
    expect(assessmentPlainText(result, "fi")).not.toContain("Tulistus,");
  });

  it("does not call heating hot-gas temperature suction superheat", () => {
    const result = assess({
      refrigerantId: "r32",
      system: "air_air",
      mode: "heating",
      atmosphere,
      primary: {
        value: "18",
        unit: "bar(g)",
        role: "hot_gas",
        pipeTemperatureC: "70",
      },
    });
    expect(result.quantities.map((item) => item.id)).not.toContain(
      "suction_superheat",
    );
    expect(
      result.quantities.some((item) => item.id === "hot_gas_above_dew"),
    ).toBe(true);
    expect(result.focus?.note?.fi).toContain("ei ole imutulistus");
    expect(assessmentPlainText(result, "fi")).toContain(
      "Tämä ei ole imutulistus",
    );
  });

  it("keeps saturation when the port role is unknown and withholds dependent conclusions", () => {
    const result = assess({
      refrigerantId: "r134a",
      system: "air_air",
      mode: "heating",
      atmosphere,
      primary: {
        value: "8",
        unit: "bar(g)",
        role: "unknown",
        pipeTemperatureC: "40",
      },
    });
    expect(result.focus?.label.fi).toBe("Kastepiste tässä paineessa");
    expect(
      result.quantities.some(
        (item) =>
          item.id === "suction_superheat" || item.id === "hot_gas_above_dew",
      ),
    ).toBe(false);
    expect(result.hypotheses).toEqual([]);
    expect(assessmentPlainText(result, "fi")).toContain(
      "Roolia ei ole vahvistettu",
    );
  });

  it("uses bubble point for subcooling and shows R449A glide", () => {
    const result = assess({
      refrigerantId: "r449a",
      system: "dx_cooling",
      mode: "cooling",
      primary: {
        value: "8",
        unit: "bar(a)",
        role: "liquid",
        pipeTemperatureC: "20",
      },
    });
    const bubble = result.quantities.find(
      (item) => item.id === "saturation_bubble",
    );
    const dew = result.quantities.find((item) => item.id === "saturation_dew");
    const subcooling = result.quantities.find(
      (item) => item.id === "subcooling",
    );
    expect(Number(dew?.value)).toBeGreaterThan(Number(bubble?.value) + 0.2);
    expect(Number(subcooling?.value)).toBeCloseTo(
      Number(bubble?.value) - 20,
      5,
    );
    expect(result.references.some((item) => item.url.includes("449a"))).toBe(
      true,
    );
    expect(assessmentPlainText(result, "fi")).toContain("liukuma");
  });

  it("treats carbon dioxide above the critical pressure as a gas cooler", () => {
    const result = assess({
      refrigerantId: "r744",
      criticalTemperatureC: "30.9782",
      criticalPressureBarAbsolute: "73.773",
      criticalSourceIds: ["coolprop-mit"],
      system: "industrial",
      mode: "cooling",
      primary: {
        value: "90",
        unit: "bar(a)",
        role: "hot_gas",
        pipeTemperatureC: "40",
      },
      secondary: { value: "30", unit: "bar(a)", role: "suction" },
    });
    expect(result.readings[0]?.regime).toBe("transcritical");
    expect(result.readings[1]?.regime).toBe("saturated");
    expect(result.circuit.highSide).toBe("gas_cooler");
    expect(
      result.quantities.some(
        (item) => item.id === "subcooling" || item.id === "hot_gas_above_dew",
      ),
    ).toBe(false);
    expect(result.readings[1]?.dewC).toBeTruthy();
    const text = assessmentPlainText(result, "fi");
    expect(text).toContain("kaasujäähdytin");
    expect(text).toContain("Kyllästyslämpötilaa ei ole");
    expect(text).not.toMatch(/COP\s+[0-9]/);
  });

  it("does not call a subcritical pressure above the CO2 table transcritical", () => {
    const result = assess({
      refrigerantId: "r744",
      criticalPressureBarAbsolute: "73.773",
      criticalSourceIds: ["coolprop-mit"],
      system: "industrial",
      mode: "cooling",
      primary: { value: "70", unit: "bar(a)", role: "hot_gas" },
    });
    expect(result.readings[0]?.regime).toBe("out_of_domain");
    expect(result.circuit.highSide).toBe("unresolved");
    expect(assessmentPlainText(result, "fi")).toContain(
      "nimetä ylikriittiseksi",
    );
    expect(assessmentPlainText(result, "fi")).not.toContain("kaasujäähdytin");
  });

  it("does not read flooded ammonia superheat as a shortage", () => {
    const probe = assess({
      refrigerantId: "r717",
      criticalPressureBarAbsolute: "113.63391162815327",
      system: "industrial",
      mode: "cooling",
      evaporatorStyle: "flooded",
      primary: { value: "3", unit: "bar(a)", role: "suction" },
    });
    const dew = probe.readings[0]?.dewC;
    const result = assess({
      refrigerantId: "r717",
      criticalPressureBarAbsolute: "113.63391162815327",
      system: "industrial",
      mode: "cooling",
      evaporatorStyle: "flooded",
      primary: {
        value: "3",
        unit: "bar(a)",
        role: "suction",
        pipeTemperatureC: dew,
      },
    });
    expect(
      result.hypotheses.find((item) => item.id === "shortage")?.strength,
    ).toBe("weakened");
    const text = assessmentPlainText(result, "fi");
    expect(text).toContain("Tulvitetun höyrystimen");
    expect(text).toContain("myrkyllinen");
    expect(text).not.toContain("suodatin");
  });

  it("rejects an unsupported verdict and a made-up COP", () => {
    const result = assess({
      refrigerantId: "r134a",
      system: "air_air",
      mode: "cooling",
      atmosphere,
      primary: {
        value: "7",
        unit: "bar(g)",
        role: "suction",
        pipeTemperatureC: "12",
      },
      secondary: {
        value: "8",
        unit: "bar(g)",
        role: "liquid",
        pipeTemperatureC: "25",
      },
      indoorAirC: "21",
      outdoorAirC: "30",
    });
    const text = assessmentPlainText(result, "fi");
    expect(text).not.toMatch(/epänormaali|on liian korkea|normaali käynti/);
    expect(text).toContain("ei luokitella tavalliseksi tai poikkeavaksi");
    expect(text).toContain("ei COP");
    expect(
      result.efficiency.some((item) =>
        item.fi.includes("Hyötysuhdetta ei lasketa"),
      ),
    ).toBe(true);
    expect(result.quantities.some((item) => item.id === "lift")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/"cop"/i);
  });

  it("keeps a valid saturation when another entry is invalid", () => {
    const result = assess({
      refrigerantId: "r134a",
      system: "dx_cooling",
      mode: "cooling",
      primary: {
        value: "3",
        unit: "bar(a)",
        role: "suction",
        pipeTemperatureC: "-300",
      },
      secondary: { value: "abc", unit: "bar(a)", role: "liquid" },
    });
    expect(result.fieldErrors.map((item) => item.code)).toEqual([
      "below_absolute_zero",
      "invalid_number",
    ]);
    expect(result.readings[0]?.regime).toBe("saturated");
    expect(
      result.quantities.some((item) => item.id === "suction_superheat"),
    ).toBe(false);
    expect(result.focus?.label.fi).toBe("Imun kastepiste");
  });

  it("requires an atmospheric reference for gauge pressure and does not assume one silently", () => {
    const result = assess({
      refrigerantId: "r32",
      system: "air_air",
      mode: "cooling",
      primary: { value: "4", unit: "bar(g)", role: "suction" },
    });
    expect(result.fieldErrors).toEqual([
      { field: "primaryPressure", code: "atmosphere_required" },
    ]);
    expect(result.readings[0]?.absoluteBar).toBeUndefined();
  });
});

describe("assessment interpretation boundaries", () => {
  const co2 = {
    refrigerantId: "r744",
    criticalPressureBarAbsolute: "73.773",
    system: "industrial",
    mode: "cooling",
  } as const;
  it.each(["unknown", "suction"] as const)(
    "never infers a high side from %s at critical pressure",
    (role) => {
      for (const value of ["73.773", "90"]) {
        const r = assess({ ...co2, primary: { value, unit: "bar(a)", role } });
        expect(r.focus?.label.fi).not.toContain("Korkeapaine");
        expect(r.focus?.label.en).not.toContain("High-side");
        expect(r.circuit.highSide).toBe("unresolved");
        expect(r.quantities).toEqual([]);
      }
    },
  );
  it("keeps both sides of the critical boundary numerically and verbally distinct", () => {
    const below = assess({
      ...co2,
      primary: { value: "73.772", unit: "bar(a)", role: "liquid" },
    });
    expect(below.readings[0]?.regime).toBe("out_of_domain");
    expect(assessmentPlainText(below, "fi")).toContain("73,773");
    expect(assessmentPlainText(below, "en")).toContain("73.773");
    const at = assess({
      ...co2,
      primary: { value: "73.773", unit: "bar(a)", role: "liquid" },
    });
    expect(at.circuit.highSide).toBe("gas_cooler");
    expect(at.focus?.value.fi).toBe("73,773");
    expect(assessmentPlainText(at, "fi")).toContain("tasalla tai yläpuolella");
    expect(assessmentPlainText(at, "en")).toContain("at or above");
  });
  it("distinguishes the lower table boundary from the gap below the critical point", () => {
    const r = assess({
      ...co2,
      primary: { value: "0.1", unit: "bar(a)", role: "unknown" },
    });
    expect(assessmentPlainText(r, "fi")).toContain(
      "kyllästystaulun alapuolella",
    );
    expect(assessmentPlainText(r, "en")).toContain(
      "below the saturation table",
    );
    expect(assessmentPlainText(r, "fi")).not.toContain(
      "kyllästystaulun yläpuolella",
    );
  });
  it.each(["unknown", "flooded"] as const)(
    "keeps R717 %s from a supported shortage even with a target and high superheat",
    (evaporatorStyle) => {
      const r = assess({
        refrigerantId: "r717",
        system: "industrial",
        mode: "cooling",
        evaporatorStyle,
        oemSuperheatK: "5",
        primary: {
          value: "3",
          unit: "bar(a)",
          role: "suction",
          pipeTemperatureC: "80",
        },
      });
      expect(r.hypotheses.find((h) => h.id === "shortage")?.strength).not.toBe(
        "supported",
      );
      expect(assessmentPlainText(r, "fi")).not.toMatch(
        /pieni tulistus|vajaus sopii tähän suuntaan/,
      );
      expect(assessmentPlainText(r, "en")).not.toMatch(
        /low superheat|shortage points in this direction/,
      );
    },
  );
  it("does not turn large superheat and subcooling into a shortage without entered targets", () => {
    const r = assess({
      refrigerantId: "r134a",
      system: "dx_cooling",
      mode: "cooling",
      primary: {
        value: "3",
        unit: "bar(a)",
        role: "suction",
        pipeTemperatureC: "80",
      },
      secondary: {
        value: "8",
        unit: "bar(a)",
        role: "liquid",
        pipeTemperatureC: "-20",
      },
    });
    expect(r.hypotheses.find((h) => h.id === "shortage")?.strength).toBe(
      "open",
    );
  });
});
