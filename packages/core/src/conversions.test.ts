import { describe, it, expect } from "vitest";
import { convertUnits } from "./conversions";
describe("general unit conversion", () => {
  it("supports refrigeration, vacuum and actual length conversions", () => {
    expect(
      Number(
        convertUnits({
          group: "power",
          value: "12000",
          from: "Btu_IT/h",
          to: "kW",
        }),
      ),
    ).toBeCloseTo(3.516853, 6);
    expect(
      convertUnits({ group: "power", value: "1", from: "TR", to: "kW" }),
    ).toBe("3.516853");
    expect(
      convertUnits({ group: "vacuum", value: "500", from: "µmHg", to: "Pa" }),
    ).toBe("66.6612");
    expect(
      convertUnits({ group: "vacuum", value: "500", from: "µmHg", to: "mbar" }),
    ).toBe("0.666612");
    expect(
      convertUnits({ group: "length", value: "3,5", from: "in", to: "mm" }),
    ).toBe("88.9");
    expect(() =>
      convertUnits({ group: "vacuum", value: "-1", from: "Pa", to: "Torr" }),
    ).toThrow("negative_absolute_pressure");
  });
  it("converts independently known mass, energy, power and flow values", () => {
    expect(
      convertUnits({ group: "mass", value: "1", from: "lb", to: "kg" }),
    ).toBe("0.45359237");
    expect(
      convertUnits({ group: "energy", value: "1,5", from: "kWh", to: "MJ" }),
    ).toBe("5.4");
    expect(
      convertUnits({ group: "power", value: "2500", from: "W", to: "kW" }),
    ).toBe("2.5");
    expect(
      convertUnits({
        group: "volume_flow",
        value: "60",
        from: "L/min",
        to: "m³/h",
      }),
    ).toBe("3.6");
    expect(
      convertUnits({ group: "volume", value: "2", from: "m³", to: "L" }),
    ).toBe("2000");
  });
  it("distinguishes temperature and signed differences", () => {
    expect(
      convertUnits({ group: "temperature", value: "32", from: "°F", to: "°C" }),
    ).toBe("0");
    expect(
      convertUnits({ group: "temperature", value: "0", from: "K", to: "°C" }),
    ).toBe("-273.15");
    expect(
      convertUnits({
        group: "temperature_difference",
        value: "-18",
        from: "°F Δ",
        to: "K",
      }),
    ).toBe("-10");
    expect(() =>
      convertUnits({ group: "temperature", value: "-1", from: "K", to: "°C" }),
    ).toThrow("below_absolute_zero");
  });
  it("requires explicit pressure references and applies atmosphere once", () => {
    expect(
      convertUnits({
        group: "pressure",
        value: "0",
        from: "bar",
        to: "kPa",
        fromReference: "gauge",
        toReference: "absolute",
        atmosphereBar: "1.01325",
      }),
    ).toBe("101.325");
    expect(
      convertUnits({
        group: "pressure",
        value: "0",
        from: "bar",
        to: "bar",
        fromReference: "absolute",
        toReference: "gauge",
        atmosphereBar: "1",
      }),
    ).toBe("-1");
    expect(
      Number(
        convertUnits({
          group: "pressure",
          value: "1",
          from: "psi",
          to: "Pa",
          fromReference: "absolute",
          toReference: "absolute",
        }),
      ),
    ).toBeCloseTo(6894.757293168, 8);
    expect(() =>
      convertUnits({ group: "pressure", value: "0", from: "bar", to: "bar" }),
    ).toThrow("pressure_reference_required");
    expect(() =>
      convertUnits({
        group: "pressure",
        value: "-2",
        from: "bar",
        to: "bar",
        fromReference: "gauge",
        toReference: "gauge",
        atmosphereBar: "1",
      }),
    ).toThrow("negative_absolute_pressure");
  });
  it.each(["", "NaN", "Infinity", "1e3", "1,2,3", "12kg"])(
    "rejects malformed value %s",
    (value) => {
      expect(() =>
        convertUnits({ group: "mass", value, from: "kg", to: "g" }),
      ).toThrow();
    },
  );
  it("rejects cross-dimension units", () =>
    expect(() =>
      convertUnits({ group: "mass", value: "1", from: "kg", to: "W" }),
    ).toThrow("invalid_unit"));
});
