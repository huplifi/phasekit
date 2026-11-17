import { describe, expect, it } from "vitest";
import {
  cycleEntryDisplay,
  cyclePressure,
  type CycleEntry,
} from "../apps/web/src/views/cycle-input";
import { calculateSHSC } from "../packages/core/src/tool-calculations";
import { calculatePHCycle } from "../packages/core/src/ph";
const evaporation: CycleEntry = {
  kind: "temperature",
  value: "-10",
  unit: "C",
  side: "dew",
};
const condensation: CycleEntry = {
  kind: "temperature",
  value: "40",
  unit: "C",
  side: "dew",
};
const display = (
  entry: CycleEntry,
  change: Partial<Parameters<typeof cycleEntryDisplay>[0]> = {},
) =>
  cycleEntryDisplay({
    id: "r452a",
    entry,
    mode: "pressure",
    side: "dew",
    pressureUnit: "bar(a)",
    tempUnit: "C",
    atmosphere: "1.01325",
    ...change,
  });
describe("refrigeration cycle inputs", () => {
  it("derives R452A pressures from the selected dew temperatures and shares full precision with SH/SC and the diagram", () => {
    const low = cyclePressure("r452a", evaporation, "1.01325")!;
    const high = cyclePressure("r452a", condensation, "1.01325")!;
    expect(Number(low)).toBeCloseTo(4.0, 2);
    expect(Number(high)).toBeCloseTo(17.59, 2);
    const sh = calculateSHSC({
      refrigerantId: "r452a",
      mode: "superheat",
      pressure: { value: low, unit: "bar(a)" },
      measuredTemperature: { value: "0", unit: "C" },
    });
    const sc = calculateSHSC({
      refrigerantId: "r452a",
      mode: "subcooling",
      pressure: { value: high, unit: "bar(a)" },
      measuredTemperature: { value: "30", unit: "C" },
    });
    expect(Number(sh.differenceK)).toBeCloseTo(10, 5);
    expect(Number(sc.differenceK)).toBeCloseTo(6.6, 2);
    expect(sh.saturation.pressureBarAbsolute).toBe(low);
    expect(sc.saturation.pressureBarAbsolute).toBe(high);
    const cycle = calculatePHCycle({
      refrigerantId: "r452a",
      lowPressure: { value: low, unit: "bar(a)" },
      highPressure: { value: high, unit: "bar(a)" },
      T1: { value: "0", unit: "C" },
      T2: { value: "70", unit: "C" },
      T3: { value: "30", unit: "C" },
    });
    expect(Number(cycle.points[1].pressureBarAbsolute)).toBeCloseTo(
      Number(low),
      8,
    );
    expect(Number(cycle.points[2].pressureBarAbsolute)).toBeCloseTo(
      Number(high),
      8,
    );
  });
  it("uses bubble temperature as an independent source boundary while SC always references bubble", () => {
    const pressure = cyclePressure(
      "r452a",
      { ...condensation, side: "bubble" },
      "1.01325",
    )!;
    const result = calculateSHSC({
      refrigerantId: "r452a",
      mode: "subcooling",
      pressure: { value: pressure, unit: "bar(a)" },
      measuredTemperature: { value: "30", unit: "C" },
    });
    expect(Number(result.differenceK)).toBeCloseTo(10, 5);
    expect(Number(pressure)).toBeGreaterThan(
      Number(cyclePressure("r452a", condensation, "1.01325")),
    );
  });
  it("retains the original entry across pressure, temperature, phase and unit views without round-trip drift", () => {
    const source = structuredClone(condensation);
    const expected = cyclePressure("r452a", source, "1.01325");
    for (let i = 0; i < 20; i++) {
      expect(display(source, { mode: "temperature", tempUnit: "F" })).toBe(
        "104",
      );
      expect(
        Number(display(source, { mode: "temperature", side: "bubble" })),
      ).toBeCloseTo(36.6, 2);
      expect(Number(display(source, { pressureUnit: "kPa(g)" }))).toBeCloseTo(
        (Number(expected) - 1.01325) * 100,
        7,
      );
      expect(display(source, { mode: "temperature" })).toBe("40");
      expect(cyclePressure("r452a", source, "1.01325")).toBe(expected);
    }
    expect(source).toEqual(condensation);
  });
  it("keeps measured gauge pressure fixed when its atmospheric reference changes, and temperature-derived pressure independent of it", () => {
    const gauge: CycleEntry = { kind: "pressure", value: "3", unit: "bar(g)" };
    expect(cyclePressure("r452a", gauge, "1")).toBe("4");
    expect(cyclePressure("r452a", gauge, "0.9")).toBe("3.9");
    expect(cyclePressure("r452a", evaporation, "1")).toBe(
      cyclePressure("r452a", evaporation, "0.9"),
    );
    expect(display(gauge)).toBe("4.01325");
  });
  it("retains pressure-origin physical pressure when viewing either temperature boundary", () => {
    const pressure: CycleEntry = {
      kind: "pressure",
      value: "17.59",
      unit: "bar(a)",
    };
    expect(
      Number(display(pressure, { mode: "temperature", side: "dew" })),
    ).toBeGreaterThan(
      Number(display(pressure, { mode: "temperature", side: "bubble" })),
    );
    expect(cyclePressure("r452a", pressure, "1.01325")).toBe("17.59");
  });
  it("resolves mixed R452A LP pressure and HP dew-temperature sources independently", () => {
    const lp: CycleEntry = Object.freeze({
      kind: "pressure",
      value: "4,00",
      unit: "bar(a)",
    });
    const hp: CycleEntry = Object.freeze({
      kind: "temperature",
      value: "40,00",
      unit: "C",
      side: "dew",
    });
    const low = cyclePressure("r452a", lp, "1.01325")!;
    const high = cyclePressure("r452a", hp, "1.01325")!;
    expect(low).toBe("4");
    expect(Number(high)).toBeCloseTo(17.59, 2);
    const sh = calculateSHSC({
      refrigerantId: "r452a",
      mode: "superheat",
      pressure: { value: low, unit: "bar(a)" },
      measuredTemperature: { value: "0", unit: "C" },
    });
    const sc = calculateSHSC({
      refrigerantId: "r452a",
      mode: "subcooling",
      pressure: { value: high, unit: "bar(a)" },
      measuredTemperature: { value: "30", unit: "C" },
    });
    expect(Number(sh.differenceK)).toBeCloseTo(10, 3);
    expect(Number(sc.differenceK)).toBeCloseTo(6.6, 2);

    // Showing the other HP boundary must not reinterpret its source as 40 bubble.
    expect(
      Number(display(hp, { mode: "temperature", side: "bubble" })),
    ).toBeCloseTo(36.6, 2);
    expect(cyclePressure("r452a", hp, "1.01325")).toBe(high);
    expect(cyclePressure("r452a", lp, "1.01325")).toBe(low);
    expect(display(hp, { mode: "temperature", side: "dew" })).toBe("40,00");
    expect(display(lp)).toBe("4,00");
    const cycle = calculatePHCycle({
      refrigerantId: "r452a",
      lowPressure: { value: low, unit: "bar(a)" },
      highPressure: { value: high, unit: "bar(a)" },
      T1: { value: "0", unit: "C" },
      T2: { value: "70", unit: "C" },
      T3: { value: "30", unit: "C" },
    });
    expect(Number(cycle.points[1].pressureBarAbsolute)).toBe(4);
    expect(Number(cycle.points[2].pressureBarAbsolute)).toBeCloseTo(
      Number(high),
      8,
    );
  });

  it.each(["40", "40.00", "40,00", "+40,00"])(
    "returns the exact dew source %s after alternate-boundary and unit views",
    (raw) => {
      const source: CycleEntry = Object.freeze({
        kind: "temperature",
        value: raw,
        unit: "C",
        side: "dew",
      });
      const pressure = cyclePressure("r452a", source, "1.01325");
      for (let i = 0; i < 10; i++) {
        expect(
          Number(display(source, { mode: "temperature", side: "bubble" })),
        ).toBeCloseTo(36.6, 2);
        expect(
          Number(
            display(source, {
              mode: "temperature",
              side: "bubble",
              tempUnit: "F",
            }),
          ),
        ).toBeCloseTo(97.9, 1);
        expect(
          display(source, { mode: "temperature", side: "dew", tempUnit: "F" }),
        ).toBe("104");
        expect(
          Number(
            display(source, { pressureUnit: "kPa(g)", atmosphere: "0.9" }),
          ),
        ).toBeCloseTo((Number(pressure) - 0.9) * 100, 7);
        expect(display(source, { mode: "temperature", side: "dew" })).toBe(raw);
        expect(cyclePressure("r452a", source, "0.9")).toBe(pressure);
      }
      expect(source.value).toBe(raw);
      expect(source.side).toBe("dew");
    },
  );

  it.each([
    [{ kind: "pressure", value: "3,00", unit: "bar(g)" }, "1", "4"],
    [{ kind: "pressure", value: "3,00", unit: "bar(g)" }, "0.9", "3.9"],
    [{ kind: "pressure", value: "300,00", unit: "kPa(g)" }, "1", "4"],
    [{ kind: "pressure", value: "300,00", unit: "kPa(g)" }, "0.9", "3.9"],
    [{ kind: "pressure", value: "4,00", unit: "bar(a)" }, "0.9", "4"],
  ] as const)(
    "keeps mixed gauge/reference inputs independent for %o at atmosphere %s",
    (entry, atmosphere, expectedLow) => {
      const source = Object.freeze(entry);
      const hp: CycleEntry = Object.freeze({
        kind: "temperature",
        value: "40,00",
        unit: "C",
        side: "dew",
      });
      const high = cyclePressure("r452a", hp, "1.01325");
      expect(cyclePressure("r452a", source, atmosphere)).toBe(expectedLow);
      expect(
        Number(
          display(source, { pressureUnit: "bar(a)", atmosphere }).replace(
            ",",
            ".",
          ),
        ),
      ).toBe(Number(expectedLow));
      expect(
        Number(display(source, { pressureUnit: "kPa(a)", atmosphere })),
      ).toBeCloseTo(Number(expectedLow) * 100, 10);
      expect(
        Number(
          display(source, { mode: "temperature", side: "dew", atmosphere }),
        ),
      ).toBeLessThan(0);
      expect(cyclePressure("r452a", source, atmosphere)).toBe(expectedLow);
      expect(display(source, { pressureUnit: source.unit, atmosphere })).toBe(
        source.value,
      );
      expect(cyclePressure("r452a", hp, atmosphere)).toBe(high);
      expect(
        Number(display(hp, { pressureUnit: "bar(g)", atmosphere })),
      ).toBeCloseTo(Number(high) - Number(atmosphere), 10);
      expect(
        display(hp, { mode: "temperature", side: "dew", atmosphere }),
      ).toBe("40,00");
    },
  );

  it("supports partial circuits without manufacturing missing pressures and rejects invalid or unavailable entries", () => {
    expect(
      cyclePressure("r452a", { ...evaporation, value: "" }, "1"),
    ).toBeUndefined();
    expect(() =>
      cyclePressure("r452a", { ...evaporation, value: "nonsense" }, "1"),
    ).toThrow();
    expect(() =>
      cyclePressure("r452a", { ...evaporation, value: "400" }, "1"),
    ).toThrow("pt_out_of_range");
    expect(() => cyclePressure("unknown", evaporation, "1")).toThrow(
      "pt_unsupported_refrigerant_or_side",
    );
    expect(() =>
      cyclePressure(
        "r452a",
        { kind: "pressure", value: "0", unit: "bar(a)" },
        "1",
      ),
    ).toThrow("nonpositive_absolute_pressure");
    expect(() =>
      cyclePressure(
        "r452a",
        { kind: "pressure", value: "3", unit: "bar(g)" },
        "0",
      ),
    ).toThrow("invalid_atmospheric_reference");
  });
});
