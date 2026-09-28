import type Decimal from "decimal.js";
import { parseDecimal } from "./units";

export type HeatMode =
  "energy" | "time" | "power" | "mass" | "temperature" | "specific-heat";

export interface HeatQuantityInput {
  mode: HeatMode;
  amount: string;
  amountUnit: "kg" | "l";
  densityKgM3: string;
  specificHeatKJkgK: string;
  inletC: string;
  outletC: string;
  energy: string;
  energyUnit: "kJ" | "kWh";
  powerKW: string;
  durationMinutes: string;
}

export interface HeatQuantityResult {
  energyKJ: string;
  energyKWh: string;
  massKg: string;
  specificHeatKJkgK: string;
  differenceK: string;
  inletC: string;
  outletC: string;
  powerKW: string | null;
  durationMinutes: string | null;
}

/** Errors emitted in addition to the shared decimal parser's errors. */
export type HeatQuantityErrorCode =
  | "invalid_mode"
  | "invalid_unit"
  | "positive_mass_required"
  | "positive_properties_required"
  | "positive_power_required"
  | "positive_duration_required"
  | "invalid_temperature"
  | "nonzero_temperature_difference_required"
  | "inconsistent_heat_direction"
  | "nonfinite_result";

function positive(value: Decimal, code: HeatQuantityErrorCode): Decimal {
  if (!value.isFinite()) throw new Error("nonfinite_result");
  if (value.lte(0)) throw new Error(code);
  return value;
}

function temperature(value: Decimal): Decimal {
  if (!value.isFinite()) throw new Error("nonfinite_result");
  if (value.lt("-273.15")) throw new Error("invalid_temperature");
  return value;
}

function mass(input: HeatQuantityInput): Decimal {
  if (input.amountUnit !== "kg" && input.amountUnit !== "l")
    throw new Error("invalid_unit");
  const amount = positive(parseDecimal(input.amount), "positive_mass_required");
  if (input.amountUnit === "kg") return amount;
  const density = positive(
    parseDecimal(input.densityKgM3),
    "positive_properties_required",
  );
  return amount.mul(density).div(1000);
}

/**
 * Constant-property sensible heat Q = m c (Tout − Tin), without phase change
 * or heat losses. Energy is signed; time and thermal power are magnitudes.
 * Only the selected mode's inputs are parsed. Outputs retain the shared
 * Decimal precision (256 significant digits for recurring divisions).
 */
export function calculateHeatQuantity(
  input: HeatQuantityInput,
): HeatQuantityResult {
  if (
    ![
      "energy",
      "time",
      "power",
      "mass",
      "temperature",
      "specific-heat",
    ].includes(input.mode)
  )
    throw new Error("invalid_mode");

  const inlet = temperature(parseDecimal(input.inletC));
  let outlet: Decimal;
  let delta: Decimal;
  let massKg: Decimal;
  let cp: Decimal;
  let energy: Decimal;
  let power: Decimal | null = null;
  let duration: Decimal | null = null;

  if (["energy", "time", "power"].includes(input.mode)) {
    massKg = mass(input);
    cp = positive(
      parseDecimal(input.specificHeatKJkgK),
      "positive_properties_required",
    );
    outlet = temperature(parseDecimal(input.outletC));
    delta = outlet.minus(inlet);
    energy = massKg.mul(cp).mul(delta);
    if (input.mode === "time") {
      power = positive(parseDecimal(input.powerKW), "positive_power_required");
      duration = energy.abs().div(power.mul(60));
    } else if (input.mode === "power") {
      duration = positive(
        parseDecimal(input.durationMinutes),
        "positive_duration_required",
      );
      power = energy.abs().div(duration.mul(60));
    }
  } else {
    if (input.energyUnit !== "kJ" && input.energyUnit !== "kWh")
      throw new Error("invalid_unit");
    energy = parseDecimal(input.energy).mul(
      input.energyUnit === "kWh" ? 3600 : 1,
    );
    if (input.mode === "temperature") {
      massKg = mass(input);
      cp = positive(
        parseDecimal(input.specificHeatKJkgK),
        "positive_properties_required",
      );
      delta = energy.div(massKg.mul(cp));
      outlet = temperature(inlet.plus(delta));
    } else {
      outlet = temperature(parseDecimal(input.outletC));
      delta = outlet.minus(inlet);
      if (delta.isZero())
        throw new Error("nonzero_temperature_difference_required");
      if (!energy.isZero() && energy.isNegative() !== delta.isNegative())
        throw new Error("inconsistent_heat_direction");
      if (input.mode === "mass") {
        cp = positive(
          parseDecimal(input.specificHeatKJkgK),
          "positive_properties_required",
        );
        massKg = positive(energy.div(cp.mul(delta)), "positive_mass_required");
      } else {
        massKg = mass(input);
        cp = positive(
          energy.div(massKg.mul(delta)),
          "positive_properties_required",
        );
      }
    }
  }

  const values = {
    energyKJ: energy,
    energyKWh: energy.div(3600),
    massKg,
    specificHeatKJkgK: cp,
    differenceK: delta,
    inletC: inlet,
    outletC: outlet,
  };
  if (
    [...Object.values(values), power, duration].some(
      (value) => value !== null && !value.isFinite(),
    )
  )
    throw new Error("nonfinite_result");

  return {
    energyKJ: values.energyKJ.toString(),
    energyKWh: values.energyKWh.toString(),
    massKg: values.massKg.toString(),
    specificHeatKJkgK: values.specificHeatKJkgK.toString(),
    differenceK: values.differenceK.toString(),
    inletC: values.inletC.toString(),
    outletC: values.outletC.toString(),
    powerKW: power?.toString() ?? null,
    durationMinutes: duration?.toString() ?? null,
  };
}
