import { describe, expect, it } from "vitest";
import {
  calculateHeatQuantity,
  type HeatQuantityInput,
  type HeatMode,
} from "./heat-quantity";

const water: HeatQuantityInput = {
  mode: "energy",
  amount: "100",
  amountUnit: "kg",
  densityKgM3: "1000",
  specificHeatKJkgK: "4.2",
  inletC: "10",
  outletC: "60",
  energy: "21000",
  energyUnit: "kJ",
  powerKW: "2",
  durationMinutes: "175",
};

describe("constant-property sensible heat", () => {
  it("calculates the independent 100 kg water example and thermal heating time", () => {
    const result = calculateHeatQuantity({ ...water, mode: "time" });
    expect(result.energyKJ).toBe("21000");
    expect(Number(result.energyKWh)).toBeCloseTo(35 / 6, 14);
    expect(result.massKg).toBe("100");
    expect(result.specificHeatKJkgK).toBe("4.2");
    expect(result.differenceK).toBe("50");
    expect(result.inletC).toBe("10");
    expect(result.outletC).toBe("60");
    expect(result.powerKW).toBe("2");
    expect(result.durationMinutes).toBe("175");
  });

  it("uses signed cooling energy and positive cooling power/time", () => {
    const cooling = { ...water, inletC: "60", outletC: "10" };
    expect(calculateHeatQuantity({ ...cooling, mode: "time" })).toMatchObject({
      energyKJ: "-21000",
      differenceK: "-50",
      durationMinutes: "175",
      powerKW: "2",
    });
    expect(calculateHeatQuantity({ ...cooling, mode: "power" })).toMatchObject({
      energyKJ: "-21000",
      durationMinutes: "175",
      powerKW: "2",
    });
  });

  it.each(["mass", "temperature", "specific-heat"] as HeatMode[])(
    "recovers the original value in %s mode for heating and cooling",
    (mode) => {
      for (const [inletC, outletC] of [
        ["10", "60"],
        ["60", "10"],
      ]) {
        const forward = calculateHeatQuantity({
          ...water,
          inletC: inletC!,
          outletC: outletC!,
        });
        const inverse = calculateHeatQuantity({
          ...water,
          mode,
          inletC: inletC!,
          outletC: outletC!,
          energy: forward.energyKJ,
        });
        expect(inverse).toMatchObject({
          massKg: "100",
          specificHeatKJkgK: "4.2",
          inletC,
          outletC,
          energyKJ: forward.energyKJ,
          differenceK: forward.differenceK,
        });
      }
    },
  );

  it("converts litres using supplied density and accepts Finnish decimal commas", () => {
    expect(
      calculateHeatQuantity({
        ...water,
        amount: "2,5",
        amountUnit: "l",
        densityKgM3: "800",
        specificHeatKJkgK: "2,1",
      }),
    ).toMatchObject({ massKg: "2", energyKJ: "210", specificHeatKJkgK: "2.1" });
  });

  it("converts kWh to kJ before solving temperature", () => {
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "temperature",
        amount: "10",
        specificHeatKJkgK: "4",
        energy: "1",
        energyUnit: "kWh",
      }),
    ).toMatchObject({
      energyKJ: "3600",
      energyKWh: "1",
      differenceK: "90",
      outletC: "100",
    });
  });

  it.each(["energy", "time", "power"] as HeatMode[])(
    "allows zero energy at unchanged temperature in %s mode",
    (mode) => {
      expect(
        calculateHeatQuantity({ ...water, mode, outletC: water.inletC }),
      ).toMatchObject({
        energyKJ: "0",
        energyKWh: "0",
        differenceK: "0",
        ...(mode === "time" ? { durationMinutes: "0" } : {}),
        ...(mode === "power" ? { powerKW: "0" } : {}),
      });
    },
  );

  it("allows zero energy when solving temperature, including the absolute-zero boundary", () => {
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "temperature",
        inletC: "-273.15",
        energy: "0",
      }),
    ).toMatchObject({ differenceK: "0", outletC: "-273.15" });
  });

  it("does not parse irrelevant inputs", () => {
    const bad = "not a number";
    expect(
      calculateHeatQuantity({
        ...water,
        energy: bad,
        powerKW: bad,
        durationMinutes: bad,
        densityKgM3: bad,
      }),
    ).toMatchObject({
      energyKJ: "21000",
      powerKW: null,
      durationMinutes: null,
    });
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "time",
        durationMinutes: bad,
        energy: bad,
      }).durationMinutes,
    ).toBe("175");
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "power",
        powerKW: bad,
        energy: bad,
      }).powerKW,
    ).toBe("2");
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "mass",
        amount: bad,
        densityKgM3: bad,
      }).massKg,
    ).toBe("100");
    expect(
      calculateHeatQuantity({ ...water, mode: "temperature", outletC: bad })
        .outletC,
    ).toBe("60");
    expect(
      calculateHeatQuantity({
        ...water,
        mode: "specific-heat",
        specificHeatKJkgK: bad,
      }).specificHeatKJkgK,
    ).toBe("4.2");
  });

  it.each(["", " ", "Infinity", "-Infinity", "NaN", "1e3", "+", "1,2.3"])(
    "rejects malformed applicable input %j",
    (amount) => {
      expect(() => calculateHeatQuantity({ ...water, amount })).toThrow(
        "invalid_decimal",
      );
    },
  );

  it.each([
    [{ amount: "0" }, "positive_mass_required"],
    [{ amount: "-1" }, "positive_mass_required"],
    [{ specificHeatKJkgK: "0" }, "positive_properties_required"],
    [{ specificHeatKJkgK: "-4" }, "positive_properties_required"],
    [{ amountUnit: "l", densityKgM3: "0" }, "positive_properties_required"],
    [{ amountUnit: "l", densityKgM3: "-1000" }, "positive_properties_required"],
    [{ mode: "time", powerKW: "0" }, "positive_power_required"],
    [{ mode: "time", powerKW: "-2" }, "positive_power_required"],
    [{ mode: "power", durationMinutes: "0" }, "positive_duration_required"],
    [{ mode: "power", durationMinutes: "-1" }, "positive_duration_required"],
    [{ inletC: "-273.1501" }, "invalid_temperature"],
    [{ outletC: "-274" }, "invalid_temperature"],
    [
      { mode: "temperature", inletC: "-273", energy: "-1000" },
      "invalid_temperature",
    ],
  ] as [Partial<HeatQuantityInput>, string][])(
    "rejects invalid physical inputs %j",
    (patch, error) => {
      expect(() => calculateHeatQuantity({ ...water, ...patch })).toThrow(
        error,
      );
    },
  );

  it.each(["mass", "specific-heat"] as HeatMode[])(
    "rejects degenerate and directionally inconsistent %s inverses",
    (mode) => {
      expect(() =>
        calculateHeatQuantity({ ...water, mode, outletC: water.inletC }),
      ).toThrow("nonzero_temperature_difference_required");
      expect(() =>
        calculateHeatQuantity({
          ...water,
          mode,
          outletC: water.inletC,
          energy: "0",
        }),
      ).toThrow("nonzero_temperature_difference_required");
      expect(() =>
        calculateHeatQuantity({ ...water, mode, energy: "-21000" }),
      ).toThrow("inconsistent_heat_direction");
      expect(() =>
        calculateHeatQuantity({ ...water, mode, inletC: "60", outletC: "10" }),
      ).toThrow("inconsistent_heat_direction");
      expect(() =>
        calculateHeatQuantity({ ...water, mode, energy: "0" }),
      ).toThrow(
        mode === "mass"
          ? "positive_mass_required"
          : "positive_properties_required",
      );
    },
  );

  it("validates runtime modes and applicable unit enums", () => {
    expect(() =>
      calculateHeatQuantity({ ...water, mode: "other" as HeatMode }),
    ).toThrow("invalid_mode");
    expect(() =>
      calculateHeatQuantity({ ...water, amountUnit: "m3" as "l" }),
    ).toThrow("invalid_unit");
    expect(() =>
      calculateHeatQuantity({
        ...water,
        mode: "mass",
        energyUnit: "J" as "kJ",
      }),
    ).toThrow("invalid_unit");
  });
});
