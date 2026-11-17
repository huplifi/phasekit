import {
  getPTAvailability,
  type SaturationSide,
} from "../../../../packages/core/src/pt";
import {
  calculatePT,
  type TemperatureUnit,
} from "../../../../packages/core/src/tool-calculations";
import {
  convertPressure,
  parseDecimal,
  type PressureUnit,
} from "../../../../packages/core/src/units";

/** The user's actual measurement stays intact when the displayed boundary or units change. */
export type PTAnchor =
  | { kind: "pressure"; value: string; unit: PressureUnit }
  | {
      kind: "temperature";
      value: string;
      unit: TemperatureUnit;
      side: SaturationSide;
    };

export function formatPTReading(
  value: string,
  quantity: PTAnchor["kind"],
): string {
  const number = parseDecimal(value);
  return quantity === "pressure" && number.abs().lt(1)
    ? number.toSignificantDigits(3).toFixed()
    : number.toFixed(2);
}

export function convertPTTemperature(
  value: string,
  from: TemperatureUnit,
  to: TemperatureUnit,
): string {
  const parsed = parseDecimal(value);
  if (from === to) return value;
  return (
    to === "F" ? parsed.mul(9).div(5).plus(32) : parsed.minus(32).mul(5).div(9)
  )
    .toSignificantDigits(12)
    .toFixed();
}

export function resolvePTSide(
  id: string,
  pure: boolean,
  side: SaturationSide,
): SaturationSide {
  return pure
    ? getPTAvailability(id, "dew").supported
      ? "dew"
      : "bubble"
    : side;
}

export function calculatePTView(input: {
  refrigerantId: string;
  pure: boolean;
  anchor: PTAnchor;
  side: SaturationSide;
  pressureUnit: PressureUnit;
  temperatureUnit: TemperatureUnit;
  atmosphere: string;
}) {
  const { refrigerantId, anchor, pressureUnit, temperatureUnit } = input;
  const side = resolvePTSide(refrigerantId, input.pure, input.side);
  const enteredSide =
    anchor.kind === "temperature"
      ? resolvePTSide(refrigerantId, input.pure, anchor.side)
      : undefined;
  const atmosphere = { value: input.atmosphere, unit: "bar(a)" as const };
  // Recalculate from the original measurement, never from a rounded displayed temperature.
  const source =
    anchor.kind === "temperature"
      ? calculatePT({
          refrigerantId,
          side: enteredSide!,
          direction: "pressure_at_temperature",
          temperature: { value: anchor.value, unit: anchor.unit },
          outputPressureUnit: "bar(a)",
        })
      : undefined;
  const pressureBarAbsolute =
    source?.pressure.value ??
    convertPressure(
      {
        value: anchor.value,
        unit: anchor.kind === "pressure" ? anchor.unit : "bar(a)",
      },
      "bar(a)",
      atmosphere,
    );
  const pressure = {
    value: convertPressure(
      { value: pressureBarAbsolute, unit: "bar(a)" },
      pressureUnit,
      atmosphere,
    ),
    unit: pressureUnit,
  };
  const calculated =
    source && anchor.kind === "temperature" && side === enteredSide
      ? {
          ...source,
          temperature: {
            value: convertPTTemperature(
              anchor.value,
              anchor.unit,
              temperatureUnit,
            ),
            unit: temperatureUnit,
          },
        }
      : calculatePT({
          refrigerantId,
          side,
          direction: "temperature_at_pressure",
          pressure: { value: pressureBarAbsolute, unit: "bar(a)" },
          outputTemperatureUnit: temperatureUnit,
        });
  return {
    result: { ...calculated, pressure },
    pressureBarAbsolute,
    enteredSide,
  };
}
