import { describe, expect, it } from "vitest";
import {
  calculateElectrical,
  calculateThermalPower,
  calculatePipeExpansion,
  checklistText,
} from "./field-tools";
const thermal = {
  flow: "1",
  flowUnit: "l/s" as const,
  inletC: "10",
  outletC: "15",
  densityKgM3: "1000",
  specificHeatKJkgK: "4.18",
};
describe("sensible thermal power", () => {
  it("keeps the direction and converts volume flow to mass flow", () => {
    expect(calculateThermalPower(thermal)).toEqual({
      massFlowKgS: "1",
      differenceK: "5",
      powerKW: "20.9",
    });
    expect(
      calculateThermalPower({ ...thermal, inletC: "15", outletC: "10" })
        .powerKW,
    ).toBe("-20.9");
    for (const [flow, flowUnit] of [
      ["60", "l/min"],
      ["3.6", "m3/h"],
    ] as const)
      expect(
        calculateThermalPower({ ...thermal, flow, flowUnit }).powerKW,
      ).toBe("20.9");
  });
  it("accepts zero flow and negative Celsius, rejects invalid properties and absolute temperature", () => {
    expect(
      calculateThermalPower({
        ...thermal,
        flow: "0",
        inletC: "-20",
        outletC: "-10",
      }).powerKW,
    ).toBe("0");
    for (const change of [
      { flow: "-1" },
      { densityKgM3: "0" },
      { specificHeatKJkgK: "-1" },
      { inletC: "-274" },
      { flow: "NaN" },
      { outletC: "" },
    ])
      expect(() => calculateThermalPower({ ...thermal, ...change })).toThrow();
  });
});

describe("pipe thermal expansion", () => {
  it("preserves expansion and contraction sign and final length", () => {
    const input = {
      material: "copper_c12200" as const,
      referenceLengthM: "10",
      initialC: "20",
      finalC: "80",
    };
    expect(calculatePipeExpansion(input)).toMatchObject({
      differenceK: "60",
      changeMm: "10.152",
      finalLengthM: "10.010152",
    });
    expect(
      calculatePipeExpansion({ ...input, initialC: "80", finalC: "20" }),
    ).toMatchObject({
      differenceK: "-60",
      changeMm: "-10.152",
      finalLengthM: "9.989848",
    });
  });
  it("enforces the exact material range and valid reference length", () => {
    const input = {
      material: "stainless_304" as const,
      referenceLengthM: "5",
      initialC: "20",
      finalC: "100",
    };
    expect(calculatePipeExpansion(input).changeMm).toBe("6.4");
    for (const patch of [
      { referenceLengthM: "0" },
      { referenceLengthM: "-1" },
      { initialC: "19.9" },
      { finalC: "100.1" },
      { finalC: "" },
    ])
      expect(() => calculatePipeExpansion({ ...input, ...patch })).toThrow();
  });
});
describe("electrical power", () => {
  it("distinguishes DC, single phase and balanced three phase line quantities", () => {
    expect(
      calculateElectrical({ mode: "dc", voltageV: "24", currentA: "2" }).powerW,
    ).toBe("48");
    expect(
      calculateElectrical({
        mode: "single_phase",
        voltageV: "230",
        currentA: "10",
        powerFactor: "0.8",
      }),
    ).toMatchObject({ powerW: "1840", apparentVA: "2300" });
    expect(
      Number(
        calculateElectrical({
          mode: "three_phase",
          voltageV: "400",
          currentA: "10",
          powerFactor: "0.8",
        }).powerW,
      ),
    ).toBeCloseTo(5542.562584, 5);
    expect(
      calculateElectrical({ mode: "ohm", voltageV: "24", resistanceOhm: "12" }),
    ).toEqual({
      voltageV: "24",
      currentA: "2",
      powerW: "48",
      apparentVA: null,
      resistanceOhm: "12",
    });
  });
  it("supports zero load/PF, and rejects undefined or invalid inputs", () => {
    expect(
      calculateElectrical({
        mode: "single_phase",
        voltageV: "230",
        currentA: "10",
        powerFactor: "0",
      }).powerW,
    ).toBe("0");
    expect(
      calculateElectrical({ mode: "dc", voltageV: "24", currentA: "0" }).powerW,
    ).toBe("0");
    for (const powerFactor of ["-0.1", "1.1", "", "Infinity"])
      expect(() =>
        calculateElectrical({
          mode: "three_phase",
          voltageV: "400",
          currentA: "10",
          powerFactor,
        }),
      ).toThrow();
    expect(() =>
      calculateElectrical({ mode: "ohm", voltageV: "24", resistanceOhm: "0" }),
    ).toThrow();
    expect(() =>
      calculateElectrical({ mode: "dc", voltageV: "-24", currentA: "2" }),
    ).toThrow();
  });
});
it("exports observations without declaring a passed test", () => {
  const text = checklistText(
    {
      id: "draft",
      kind: "evacuation",
      title: "Plant 1",
      updatedAt: "2026-09-26T10:00:00Z",
      fields: { vacuum: "300 Pa" },
      checkedIds: ["measurement"],
      notes: "Follow-up required",
    },
    "en",
  );
  expect(text).toContain("300 Pa");
  expect(text).toContain("[x] Achieved vacuum");
  expect(text).toContain("[ ] Equipment procedure");
  expect(text).toContain("do not certify");
});

describe("pipe geometry", () => {
  it("calculates internal volume and mean velocity independently of nominal pipe size", async () => {
    const { calculatePipe } = await import("./field-tools");
    const result = calculatePipe({
      diameterMm: "20",
      lengthM: "10",
      flow: "0.5",
      flowUnit: "l/s",
    });
    expect(Number(result.volumeLitres)).toBeCloseTo(Math.PI, 10);
    expect(Number(result.velocityMS)).toBeCloseTo(1.591549431, 8);
    expect(
      calculatePipe({
        diameterMm: "20",
        lengthM: "0",
        flow: "0",
        flowUnit: "l/s",
      }).volumeLitres,
    ).toBe("0");
    expect(() =>
      calculatePipe({
        diameterMm: "0",
        lengthM: "10",
        flow: "0",
        flowUnit: "l/s",
      }),
    ).toThrow();
    expect(() =>
      calculatePipe({
        diameterMm: "20",
        lengthM: "-10",
        flow: "0",
        flowUnit: "l/s",
      }),
    ).toThrow();
  });
});
