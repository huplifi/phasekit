import { parseDecimal } from "./units";
import type { FlowUnit } from "./field-tools";

/**
 * Steady, fully developed, single-phase flow in a straight circular pipe.
 * Darcy friction factor: 64/Re below 2,000; Swamee–Jain's explicit
 * Colebrook–White approximation above 4,000 (US EPA EPANET 2.2 manual).
 * The transition band is intentionally unsupported.
 */
export function calculateStraightPipePressureLoss(input: {
  diameterMm: string;
  lengthM: string;
  flow: string;
  flowUnit: FlowUnit;
  densityKgM3: string;
  dynamicViscosityPaS: string;
  roughnessMm: string;
}) {
  const diameter = parseDecimal(input.diameterMm).toNumber() / 1000;
  const length = parseDecimal(input.lengthM).toNumber();
  const flow = parseDecimal(input.flow).toNumber();
  const density = parseDecimal(input.densityKgM3).toNumber();
  const viscosity = parseDecimal(input.dynamicViscosityPaS).toNumber();
  const roughness = parseDecimal(input.roughnessMm).toNumber() / 1000;
  const divisor = { "l/s": 1000, "l/min": 60000, "m3/h": 3600 }[input.flowUnit];
  if (!divisor) throw new Error("invalid_unit");
  if (
    ![diameter, length, flow, density, viscosity, roughness].every(
      Number.isFinite,
    )
  )
    throw new Error("invalid_pipe_loss_inputs");
  if (
    diameter <= 0 ||
    length <= 0 ||
    flow < 0 ||
    density <= 0 ||
    viscosity <= 0 ||
    roughness < 0
  )
    throw new Error("invalid_pipe_loss_inputs");
  const relativeRoughness = roughness / diameter;
  if (relativeRoughness > 0.05) throw new Error("pipe_roughness_out_of_range");
  const flowM3S = flow / divisor;
  const area = (Math.PI * diameter ** 2) / 4;
  const velocity = flowM3S / area;
  const reynolds = (density * velocity * diameter) / viscosity;
  if (![velocity, reynolds].every(Number.isFinite))
    throw new Error("invalid_pipe_loss_inputs");
  if (flowM3S === 0) {
    return {
      regime: "no_flow" as const,
      reynolds: "0",
      frictionFactor: null,
      pressureLossPa: "0",
      velocityMS: "0",
      relativeRoughness: String(relativeRoughness),
    };
  }
  if (reynolds >= 2000 && reynolds <= 4000)
    throw new Error("pipe_transitional_flow");
  const regime =
    reynolds < 2000 ? ("laminar" as const) : ("turbulent" as const);
  const frictionFactor =
    regime === "laminar"
      ? 64 / reynolds
      : 0.25 /
        Math.log10(relativeRoughness / 3.7 + 5.74 / reynolds ** 0.9) ** 2;
  const pressureLossPa =
    (frictionFactor * (length / diameter) * density * velocity ** 2) / 2;
  if (
    ![frictionFactor, pressureLossPa].every(Number.isFinite) ||
    frictionFactor <= 0
  )
    throw new Error("invalid_pipe_loss_inputs");
  return {
    regime,
    reynolds: String(reynolds),
    frictionFactor: String(frictionFactor),
    pressureLossPa: String(pressureLossPa),
    velocityMS: String(velocity),
    relativeRoughness: String(relativeRoughness),
  };
}
