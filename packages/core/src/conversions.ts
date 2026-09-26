import { ExactDecimal, parseDecimal } from "./units";

export const conversionGroups = {
  pressure: ["Pa", "kPa", "MPa", "bar", "mbar", "psi"],
  temperature: ["°C", "°F", "K"],
  temperature_difference: ["K", "°C Δ", "°F Δ"],
  mass: ["kg", "g", "t", "lb"],
  energy: ["J", "kJ", "MJ", "Wh", "kWh"],
  power: ["W", "kW", "MW", "Btu_IT/h", "TR"],
  vacuum: ["Pa", "mbar", "Torr", "µmHg"],
  length: ["mm", "cm", "m", "in", "ft"],
  volume: ["L", "m³", "mL"],
  volume_flow: ["L/s", "L/min", "m³/h", "m³/s"],
} as const;
export type ConversionGroup = keyof typeof conversionGroups;
export type PressureReference = "absolute" | "gauge";
// NIST SP 811, Appendix B. PSI uses the exact pound, inch and standard gravity
// definitions; the recurring quotient is evaluated with decimal arithmetic.
const factors: Record<string, Record<string, string>> = {
  pressure: {
    Pa: "1",
    kPa: "1000",
    MPa: "1000000",
    bar: "100000",
    mbar: "100",
    psi: new ExactDecimal("0.45359237")
      .mul("9.80665")
      .div(new ExactDecimal("0.0254").pow(2))
      .toString(),
  },
  mass: { kg: "1", g: "0.001", t: "1000", lb: "0.45359237" },
  energy: { J: "1", kJ: "1000", MJ: "1000000", Wh: "3600", kWh: "3600000" },
  // Non-SI heat-flow and mercury factors use the precision published in
  // NIST SP 811 B.9. TR is a US refrigeration ton, not a unit of mass.
  power: {
    W: "1",
    kW: "1000",
    MW: "1000000",
    "Btu_IT/h": "0.2930711",
    TR: "3516.853",
  },
  vacuum: { Pa: "1", mbar: "100", Torr: "133.3224", µmHg: "0.1333224" },
  length: { mm: "0.001", cm: "0.01", m: "1", in: "0.0254", ft: "0.3048" },
  volume: { L: "1", "m³": "1000", mL: "0.001" },
  // Common base is litres per hour, preserving finite conversion factors.
  volume_flow: {
    "L/s": "3600",
    "L/min": "60",
    "m³/h": "1000",
    "m³/s": "3600000",
  },
};
export function convertUnits(input: {
  group: ConversionGroup;
  value: string;
  from: string;
  to: string;
  fromReference?: PressureReference;
  toReference?: PressureReference;
  atmosphereBar?: string;
}): string {
  const { group, from, to } = input;
  if (
    !(conversionGroups[group] as readonly string[] | undefined)?.includes(
      from,
    ) ||
    !(conversionGroups[group] as readonly string[]).includes(to)
  )
    throw new Error("invalid_unit");
  const value = parseDecimal(input.value);
  if (group === "vacuum" && value.lt(0))
    throw new Error("negative_absolute_pressure");
  let result;
  if (group === "temperature") {
    const kelvin =
      from === "K"
        ? value
        : from === "°C"
          ? value.plus("273.15")
          : value.plus("459.67").mul(5).div(9);
    if (kelvin.lt(0)) throw new Error("below_absolute_zero");
    result =
      to === "K"
        ? kelvin
        : to === "°C"
          ? kelvin.minus("273.15")
          : kelvin.mul(9).div(5).minus("459.67");
  } else if (group === "temperature_difference") {
    const kelvin = from === "°F Δ" ? value.mul(5).div(9) : value;
    result = to === "°F Δ" ? kelvin.mul(9).div(5) : kelvin;
  } else {
    let base = value.mul(factors[group][from]);
    if (group === "pressure") {
      if (!input.fromReference || !input.toReference)
        throw new Error("pressure_reference_required");
      const gauge =
        input.fromReference === "gauge" || input.toReference === "gauge";
      const atmosphere = gauge
        ? parseDecimal(input.atmosphereBar ?? "").mul(100000)
        : new ExactDecimal(0);
      if (gauge && atmosphere.lte(0)) throw new Error("invalid_atmosphere");
      if (input.fromReference === "gauge") base = base.plus(atmosphere);
      if (base.lt(0)) throw new Error("negative_absolute_pressure");
      if (input.toReference === "gauge") base = base.minus(atmosphere);
    }
    result = base.div(factors[group][to]);
  }
  return result.toSignificantDigits(14).toFixed();
}
