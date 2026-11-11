import { describe, expect, it } from "vitest";
import {
  electricalMeterGuide,
  flukeManualUrl,
} from "../apps/web/src/electrical-meter-guides";
const meter = (model: string, brand = "Fluke") => ({
  brand,
  model,
  serialNumber: "",
});
describe("verified meter guidance", () => {
  it("requires exact supported model as well as brand", () => {
    for (const model of ["", "1664", "1664 FC II", "166x", "1674 FC"])
      expect(electricalMeterGuide(meter(model), "continuity")).toBeUndefined();
    expect(
      electricalMeterGuide(meter("1663", "Other"), "continuity"),
    ).toBeUndefined();
    for (const model of ["1662", "1663", "1664 FC"])
      expect(electricalMeterGuide(meter(model), "continuity")?.marker).toBe(
        "RLO",
      );
  });
  it("shows Safety Pretest only on 1664 FC and cites the checked manufacturer manual", () => {
    expect(
      electricalMeterGuide(meter("1664 FC"), "insulation")?.steps.some((step) =>
        step.en.includes("Safety Pretest"),
      ),
    ).toBe(true);
    for (const model of ["1662", "1663"])
      expect(
        electricalMeterGuide(meter(model), "insulation")?.steps.some((step) =>
          step.en.includes("Safety Pretest"),
        ),
      ).toBe(false);
    expect(flukeManualUrl).toMatch(/^https:\/\/media\.fluke\.com\//);
  });
  it("leaves unverified functions unsupported and chooses no test voltage or acceptance limit", () => {
    expect(
      electricalMeterGuide(meter("1663"), "phase-sequence"),
    ).toBeUndefined();
    const insulation = electricalMeterGuide(meter("1663"), "insulation")!;
    expect(insulation.steps.map((step) => step.en).join(" ")).not.toMatch(
      /\b(250|500|1000)\s*V/,
    );
    expect(electricalMeterGuide(meter("1662"), "rcd-time")?.marker).toBe("ΔT");
  });
});
