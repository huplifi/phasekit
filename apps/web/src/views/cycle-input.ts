import {
  calculatePT,
  type TemperatureUnit,
} from "../../../../packages/core/src/tool-calculations";
import type { SaturationSide } from "../../../../packages/core/src/pt";
import {
  convertPressure,
  parseDecimal,
  type PressureUnit,
} from "../../../../packages/core/src/units";
import { convertPTTemperature, type PTAnchor } from "./pt-state";

export type CycleEntry = PTAnchor;
export type CycleInputMode = CycleEntry["kind"];
export function cyclePressure(
  id: string,
  entry: CycleEntry,
  atmosphere: string,
): string | undefined {
  if (!entry.value.trim()) return undefined;
  const pressure =
    entry.kind === "temperature"
      ? calculatePT({
          refrigerantId: id,
          side: entry.side,
          direction: "pressure_at_temperature",
          temperature: { value: entry.value, unit: entry.unit },
          outputPressureUnit: "bar(a)",
        }).pressure.value
      : convertPressure({ value: entry.value, unit: entry.unit }, "bar(a)", {
          value: atmosphere,
          unit: "bar(a)",
        });
  if (parseDecimal(pressure).lte(0))
    throw new Error("nonpositive_absolute_pressure");
  return pressure;
}
export function cycleEntryDisplay(input: {
  id: string;
  entry: CycleEntry;
  mode: CycleInputMode;
  side: SaturationSide;
  pressureUnit: PressureUnit;
  tempUnit: TemperatureUnit;
  atmosphere: string;
}): string {
  const { entry, mode, side, pressureUnit, tempUnit, atmosphere, id } = input;
  if (!entry.value.trim()) return entry.value;
  if (
    mode === "temperature" &&
    entry.kind === "temperature" &&
    entry.side === side
  )
    return convertPTTemperature(entry.value, entry.unit, tempUnit);
  if (mode === "pressure" && entry.kind === "pressure")
    return entry.unit === pressureUnit
      ? entry.value
      : convertPressure(
          { value: entry.value, unit: entry.unit },
          pressureUnit,
          { value: atmosphere, unit: "bar(a)" },
        );
  const pressure = cyclePressure(id, entry, atmosphere)!;
  return mode === "pressure"
    ? convertPressure({ value: pressure, unit: "bar(a)" }, pressureUnit, {
        value: atmosphere,
        unit: "bar(a)",
      })
    : calculatePT({
        refrigerantId: id,
        side,
        direction: "temperature_at_pressure",
        pressure: { value: pressure, unit: "bar(a)" },
        outputTemperatureUnit: tempUnit,
      }).temperature.value;
}
