import { describe, expect, it } from "vitest";
import {
  calculatePTView,
  resolvePTSide,
  type PTAnchor,
} from "../apps/web/src/views/pt-state";
import { getPTAvailability, offlinePTProvider } from "../packages/core/src/pt";
import { convertPressure, type PressureUnit } from "../packages/core/src/units";

const dew40: PTAnchor = {
  kind: "temperature",
  value: "40",
  unit: "C",
  side: "dew",
};
function view(
  anchor: PTAnchor,
  overrides: Partial<Parameters<typeof calculatePTView>[0]> = {},
) {
  return calculatePTView({
    refrigerantId: "r452a",
    pure: false,
    anchor,
    side: "dew",
    pressureUnit: "bar(a)",
    temperatureUnit: "C",
    atmosphere: "1.01325",
    ...overrides,
  });
}

describe("P–T boundary view retains the actual measurement", () => {
  it("converts dew 40°C to bubble at the same absolute pressure and returns to the exact entry", () => {
    const dew = view(dew40);
    const bubble = view(dew40, { side: "bubble" });
    expect(dew.pressureBarAbsolute).toBe("17.58539338552");
    expect(bubble.pressureBarAbsolute).toBe(dew.pressureBarAbsolute);
    expect(Number(bubble.result.temperature.value)).toBeCloseTo(36.603044, 6);
    expect(bubble.enteredSide).toBe("dew");
    expect(bubble.result.saturation.side).toBe("bubble");
    expect(view(dew40).result.temperature.value).toBe("40");
    expect(dew40).toEqual({
      kind: "temperature",
      value: "40",
      unit: "C",
      side: "dew",
    });
  });

  it("survives repeated boundaries, units and absolute/gauge reference switches without accumulating rounding", () => {
    const anchor: PTAnchor = { ...dew40, value: "40,0000001" };
    const original = view(anchor);
    const units: PressureUnit[] = ["psi(g)", "kPa(a)", "MPa(g)", "bar(a)"];
    for (let i = 0; i < 100; i++) {
      const current = view(anchor, {
        side: i % 2 ? "dew" : "bubble",
        pressureUnit: units[i % units.length],
        temperatureUnit: i % 2 ? "C" : "F",
        atmosphere: "0.97",
      });
      expect(current.pressureBarAbsolute).toBe(original.pressureBarAbsolute);
    }
    expect(view(anchor).result.temperature.value).toBe("40,0000001");
  });

  it("starts from bubble temperature too, and a newly edited field becomes the new measurement", () => {
    const bubble40: PTAnchor = { ...dew40, side: "bubble" };
    const fromBubble = view(bubble40);
    expect(Number(fromBubble.result.temperature.value)).toBeGreaterThan(40);
    expect(view(bubble40, { side: "bubble" }).result.temperature.value).toBe(
      "40",
    );
    expect(fromBubble.pressureBarAbsolute).toBe(
      view(bubble40, { side: "bubble" }).pressureBarAbsolute,
    );
    const initial = view(dew40, { side: "bubble" });
    const bubbleEntry: PTAnchor = {
      kind: "temperature",
      value: initial.result.temperature.value,
      unit: "C",
      side: "bubble",
    };
    const back = view(bubbleEntry);
    expect(Number(back.result.temperature.value)).toBeCloseTo(40, 5);
    const changedBubble = view(
      { ...bubbleEntry, value: "35" },
      { side: "bubble" },
    );
    expect(changedBubble.result.temperature.value).toBe("35");
    expect(changedBubble.pressureBarAbsolute).not.toBe(
      initial.pressureBarAbsolute,
    );
    const pressureEntry: PTAnchor = {
      kind: "pressure",
      value: "10",
      unit: "bar(a)",
    };
    expect(view(pressureEntry).pressureBarAbsolute).toBe("10");
    expect(view(pressureEntry, { side: "bubble" }).pressureBarAbsolute).toBe(
      "10",
    );
  });

  it("preserves exact pressure input beyond the provider's displayed pressure precision", () => {
    const anchor: PTAnchor = {
      kind: "pressure",
      value: "5.123456789123456789",
      unit: "bar(a)",
    };
    const current = view(anchor, { pressureUnit: "psi(g)", side: "bubble" });
    expect(current.pressureBarAbsolute).toBe(anchor.value);
    expect(current.result.pressure.value).toBe(
      convertPressure({ value: anchor.value, unit: "bar(a)" }, "psi(g)", {
        value: "1.01325",
        unit: "bar(a)",
      }),
    );
  });

  it("uses original temperature units and boundary when changing refrigerants", () => {
    const originalF: PTAnchor = {
      kind: "temperature",
      value: "104",
      unit: "F",
      side: "dew",
    };
    expect(view(originalF, { side: "bubble" }).pressureBarAbsolute).toBe(
      view(dew40).pressureBarAbsolute,
    );
    const changed = view(originalF, { refrigerantId: "r407c", side: "bubble" });
    expect(changed.pressureBarAbsolute).toBe(
      offlinePTProvider.pressureAtTemperature("r407c", "40", "dew")!
        .pressureBarAbsolute,
    );
    expect(changed.pressureBarAbsolute).not.toBe(
      view(dew40).pressureBarAbsolute,
    );
    expect(changed.enteredSide).toBe("dew");
  });

  it("lets local atmosphere reinterpret gauge measurements while preserving temperature and absolute measurements", () => {
    const gauge: PTAnchor = { kind: "pressure", value: "10", unit: "bar(g)" };
    expect(view(gauge, { atmosphere: "0.95" }).pressureBarAbsolute).toBe(
      "10.95",
    );
    expect(
      view(gauge, { atmosphere: "1.05", pressureUnit: "bar(a)" })
        .pressureBarAbsolute,
    ).toBe("11.05");
    const absolute: PTAnchor = {
      kind: "pressure",
      value: "10",
      unit: "bar(a)",
    };
    expect(
      view(absolute, { atmosphere: "0.95", pressureUnit: "bar(g)" })
        .pressureBarAbsolute,
    ).toBe("10");
    expect(
      view(dew40, {
        atmosphere: "0.95",
        pressureUnit: "bar(g)",
        side: "bubble",
      }).pressureBarAbsolute,
    ).toBe(view(dew40).pressureBarAbsolute);
  });

  it("keeps pure refrigerants on their single physical boundary", () => {
    expect(resolvePTSide("r134a", true, "bubble")).toBe("dew");
    const pure = view(
      { ...dew40, side: "bubble" },
      { refrigerantId: "r134a", pure: true, side: "bubble" },
    );
    expect(pure.result.saturation.side).toBe("dew");
    expect(pure.enteredSide).toBe("dew");
  });

  it("retains a valid selected point when the opposite boundary is outside its supported range", () => {
    const minimum = getPTAvailability("r452a", "dew").minimumTemperatureC!;
    const nearMinimum = view({ ...dew40, value: minimum });
    expect(nearMinimum.result.temperature.value).toBe(minimum);
    expect(() =>
      view({ ...dew40, value: minimum }, { side: "bubble" }),
    ).toThrow("pt_out_of_range");
    expect(view({ ...dew40, value: minimum }).result.temperature.value).toBe(
      minimum,
    );
  });

  it("rejects invalid entries, unsupported fluids and invalid pressure references without replacing the source", () => {
    const invalid: PTAnchor = { ...dew40, value: "invalid" };
    expect(() => view(invalid, { side: "bubble" })).toThrow("invalid_decimal");
    expect(invalid.value).toBe("invalid");
    expect(() => view({ ...dew40, value: "9999" })).toThrow("pt_out_of_range");
    expect(() => view(dew40, { refrigerantId: "r514a" })).toThrow(
      "pt_unsupported_refrigerant_or_side",
    );
    expect(() =>
      view(dew40, { atmosphere: "0", pressureUnit: "bar(g)" }),
    ).toThrow("invalid_atmospheric_reference");
    expect(() =>
      view({ kind: "pressure", value: "0", unit: "bar(a)" }),
    ).toThrow("nonpositive_absolute_pressure");
  });
});
