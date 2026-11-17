import type { PressureUnit } from "../../../../packages/core/src/units";
import { useApp } from "../context";
import { InfoHelp } from "./InfoHelp";

export function PressureReferenceSwitch({
  unit,
  onChange,
}: {
  unit: PressureUnit;
  onChange: (unit: PressureUnit) => void;
}) {
  const fi = useApp().data.locale === "fi";
  return (
    <div className="help-heading pressure-reference-toggle">
      <label className="switch-label">
        <input
          type="checkbox"
          role="switch"
          checked={unit.endsWith("(a)")}
          onChange={(event) =>
            onChange(
              `${unit.split("(")[0]}(${event.target.checked ? "a" : "g"})` as PressureUnit,
            )
          }
        />
        <span>{fi ? "Absoluuttinen paine" : "Absolute pressure"}</span>
      </label>
      <InfoHelp label={fi ? "Paineviite" : "Pressure reference"}>
        {fi
          ? "Kun kytkin on pois päältä, paine näytetään mittaripaineena suhteessa paikalliseen ilmanpaineeseen. Kytkimen vaihto muuntaa painearvon."
          : "With the switch off, pressure is shown as gauge pressure relative to local atmospheric pressure. Switching converts the pressure value."}
      </InfoHelp>
    </div>
  );
}
