import { describe, expect, it } from "vitest";
import { calculateStraightPipePressureLoss } from "./pipe-pressure-loss";

const water = {
  diameterMm: "20",
  lengthM: "10",
  flow: "0.01",
  flowUnit: "l/s" as const,
  densityKgM3: "1000",
  dynamicViscosityPaS: "0.001",
  roughnessMm: "0",
};

describe("bounded straight-pipe pressure loss", () => {
  it("agrees with the independent Hagen–Poiseuille laminar result", () => {
    const result = calculateStraightPipePressureLoss(water);
    expect(result.regime).toBe("laminar");
    // 128 μ L Q / (π D⁴), with Q = 10⁻⁵ m³/s and D = 0.02 m.
    expect(Number(result.pressureLossPa)).toBeCloseTo(25.4647908947, 8);
    expect(Number(result.reynolds)).toBeCloseTo(636.6197724, 5);
  });

  it("matches a separately evaluated turbulent Swamee–Jain benchmark", () => {
    const result = calculateStraightPipePressureLoss({
      ...water,
      diameterMm: "50",
      flow: "7.2",
      flowUnit: "m3/h",
      densityKgM3: "998",
      roughnessMm: "0.045",
    });
    expect(result.regime).toBe("turbulent");
    expect(Number(result.reynolds)).toBeCloseTo(50827.7226258, 5);
    expect(Number(result.frictionFactor)).toBeCloseTo(0.02383218723, 8);
    expect(Number(result.pressureLossPa)).toBeCloseTo(2467.713032, 5);
  });

  it("blocks transition and invalid properties, and handles no flow explicitly", () => {
    expect(() =>
      calculateStraightPipePressureLoss({ ...water, flow: "0.05" }),
    ).toThrow("pipe_transitional_flow");
    for (const patch of [
      { diameterMm: "0" },
      { lengthM: "0" },
      { densityKgM3: "0" },
      { dynamicViscosityPaS: "0" },
      { flow: "-1" },
      { roughnessMm: "-0.1" },
      { roughnessMm: "2" },
    ])
      expect(() =>
        calculateStraightPipePressureLoss({ ...water, ...patch }),
      ).toThrow();
    expect(
      calculateStraightPipePressureLoss({ ...water, flow: "0" }),
    ).toMatchObject({
      regime: "no_flow",
      pressureLossPa: "0",
      frictionFactor: null,
    });
  });
});
