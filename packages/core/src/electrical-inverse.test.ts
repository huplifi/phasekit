import { describe, expect, it } from "vitest";
import { calculateElectrical, type ElectricalInput } from "./field-tools";

describe("electrical inverse calculations", () => {
  it("solves current and voltage from DC real power", () => {
    expect(
      calculateElectrical({
        mode: "dc",
        solveFor: "current",
        powerW: "12",
        voltageV: "24",
      }),
    ).toEqual({
      voltageV: "24",
      currentA: "0.5",
      powerW: "12",
      apparentVA: null,
      resistanceOhm: null,
    });
    expect(
      calculateElectrical({
        mode: "dc",
        solveFor: "voltage",
        powerW: "12",
        currentA: "0,5",
      }),
    ).toMatchObject({ voltageV: "24", currentA: "0.5", powerW: "12" });
  });

  it("solves single-phase quantities with PF and preserves apparent power", () => {
    expect(
      calculateElectrical({
        mode: "single_phase",
        solveFor: "current",
        powerW: "1840",
        voltageV: "230",
        powerFactor: "0.8",
      }),
    ).toMatchObject({
      currentA: "10",
      voltageV: "230",
      powerW: "1840",
      apparentVA: "2300",
    });
    expect(
      calculateElectrical({
        mode: "single_phase",
        solveFor: "voltage",
        powerW: "1840",
        currentA: "10",
        powerFactor: "0.8",
      }),
    ).toMatchObject({
      currentA: "10",
      voltageV: "230",
      powerW: "1840",
      apparentVA: "2300",
    });
  });

  it("solves balanced three-phase line quantities using sqrt(3)", () => {
    const current = calculateElectrical({
      mode: "three_phase",
      solveFor: "current",
      powerW: "6000",
      voltageV: "400",
      powerFactor: "0.8",
    });
    expect(Number(current.currentA)).toBeCloseTo(10.8253175473055, 12);
    expect(current.powerW).toBe("6000");
    expect(current.apparentVA).toBe("7500");
    const voltage = calculateElectrical({
      mode: "three_phase",
      solveFor: "voltage",
      powerW: "6000",
      currentA: "10",
      powerFactor: "0.8",
    });
    expect(Number(voltage.voltageV)).toBeCloseTo(433.012701892219, 10);
    expect(voltage.apparentVA).toBe("7500");
  });

  it("solves all Ohm law directions and supporting resistive power", () => {
    const expected = {
      voltageV: "24",
      currentA: "2",
      resistanceOhm: "12",
      powerW: "48",
      apparentVA: null,
    };
    expect(
      calculateElectrical({
        mode: "ohm",
        solveFor: "current",
        voltageV: "24",
        resistanceOhm: "12",
      }),
    ).toEqual(expected);
    expect(
      calculateElectrical({
        mode: "ohm",
        solveFor: "voltage",
        currentA: "2",
        resistanceOhm: "12",
      }),
    ).toEqual(expected);
    expect(
      calculateElectrical({
        mode: "ohm",
        solveFor: "resistance",
        voltageV: "24",
        currentA: "2",
      }),
    ).toEqual(expected);
  });

  it("keeps legacy target defaults", () => {
    expect(
      calculateElectrical({ mode: "dc", voltageV: "24", currentA: "2" }).powerW,
    ).toBe("48");
    expect(
      calculateElectrical({ mode: "ohm", voltageV: "24", resistanceOhm: "12" })
        .currentA,
    ).toBe("2");
  });

  it("accepts zero real power in inverse calculations when denominators determine a unique result", () => {
    expect(
      calculateElectrical({
        mode: "single_phase",
        solveFor: "current",
        powerW: "0",
        voltageV: "230",
        powerFactor: "0.8",
      }),
    ).toMatchObject({ currentA: "0", powerW: "0", apparentVA: "0" });
    expect(
      calculateElectrical({
        mode: "three_phase",
        solveFor: "voltage",
        powerW: "0",
        currentA: "10",
        powerFactor: "0.8",
      }),
    ).toMatchObject({ voltageV: "0", powerW: "0", apparentVA: "0" });
    expect(
      calculateElectrical({
        mode: "ohm",
        solveFor: "voltage",
        currentA: "0",
        resistanceOhm: "12",
      }),
    ).toMatchObject({ voltageV: "0", currentA: "0", powerW: "0" });
  });

  it("allows PF zero for forward power but rejects underdetermined inverse PF zero", () => {
    expect(
      calculateElectrical({
        mode: "single_phase",
        voltageV: "230",
        currentA: "10",
        powerFactor: "0",
      }),
    ).toMatchObject({ powerW: "0", apparentVA: "2300" });
    for (const solveFor of ["current", "voltage"] as const) {
      for (const powerW of ["0", "100"]) {
        expect(() =>
          calculateElectrical({
            mode: "single_phase",
            solveFor,
            powerW,
            voltageV: "230",
            currentA: "10",
            powerFactor: "0",
          }),
        ).toThrow("positive_power_factor_required");
      }
    }
  });

  it.each([
    [
      { mode: "dc", solveFor: "current", voltageV: "0", powerW: "0" },
      "positive_voltage_required",
    ],
    [
      { mode: "dc", solveFor: "voltage", currentA: "0", powerW: "0" },
      "positive_current_required",
    ],
    [
      { mode: "ohm", solveFor: "resistance", voltageV: "24", currentA: "0" },
      "positive_current_required",
    ],
    [
      { mode: "ohm", solveFor: "resistance", voltageV: "0", currentA: "1" },
      "positive_voltage_required",
    ],
    [
      { mode: "ohm", solveFor: "voltage", currentA: "2", resistanceOhm: "0" },
      "positive_resistance_required",
    ],
    [
      { mode: "dc", solveFor: "current", voltageV: "24", powerW: "-1" },
      "negative_electrical_quantity",
    ],
    [
      { mode: "dc", solveFor: "voltage", currentA: "-2", powerW: "12" },
      "negative_electrical_quantity",
    ],
    [
      {
        mode: "single_phase",
        solveFor: "current",
        voltageV: "230",
        powerW: "100",
        powerFactor: "1.1",
      },
      "invalid_power_factor",
    ],
    [
      {
        mode: "single_phase",
        solveFor: "voltage",
        currentA: "10",
        powerW: "100",
        powerFactor: "-0.1",
      },
      "invalid_power_factor",
    ],
  ] as [ElectricalInput, string][])(
    "rejects undefined or out-of-domain inverse inputs %j",
    (input, error) => {
      expect(() => calculateElectrical(input)).toThrow(error);
    },
  );

  it("ignores stale values in fields not used by the selected direction", () => {
    const bad = "invalid";
    expect(
      calculateElectrical({
        mode: "dc",
        solveFor: "current",
        powerW: "12",
        voltageV: "24",
        currentA: bad,
        resistanceOhm: bad,
        powerFactor: bad,
      }).currentA,
    ).toBe("0.5");
    expect(
      calculateElectrical({
        mode: "dc",
        solveFor: "voltage",
        powerW: "12",
        currentA: "0.5",
        voltageV: bad,
      }).voltageV,
    ).toBe("24");
    expect(
      calculateElectrical({
        mode: "dc",
        solveFor: "power",
        powerW: bad,
        voltageV: "24",
        currentA: "0.5",
      }).powerW,
    ).toBe("12");
    expect(
      calculateElectrical({
        mode: "ohm",
        solveFor: "resistance",
        voltageV: "24",
        currentA: "2",
        resistanceOhm: bad,
        powerW: bad,
        powerFactor: bad,
      }).resistanceOhm,
    ).toBe("12");
  });

  it.each(["", "Infinity", "NaN", "1e3", "1,2.3"])(
    "rejects invalid given power %j",
    (powerW) => {
      expect(() =>
        calculateElectrical({
          mode: "dc",
          solveFor: "current",
          voltageV: "24",
          powerW,
        }),
      ).toThrow("invalid_decimal");
    },
  );

  it("rejects unsupported targets and modes at runtime", () => {
    for (const input of [
      { mode: "ohm", solveFor: "power" },
      { mode: "dc", solveFor: "resistance" },
      { mode: "single_phase", solveFor: "resistance" },
      { mode: "dc", solveFor: "other" },
      { mode: "dc", solveFor: null },
    ])
      expect(() => calculateElectrical(input as ElectricalInput)).toThrow(
        "invalid_electrical_target",
      );
    expect(() =>
      calculateElectrical({ mode: "other" } as unknown as ElectricalInput),
    ).toThrow("invalid_mode");
  });
});
