import { useId } from "react";
import type { SaturationSide } from "../../../../packages/core/src/pt";
import { useApp } from "../context";

export function PhaseSwitch({
  side,
  label,
  onChange,
}: {
  side: SaturationSide;
  label: string;
  onChange: (side: SaturationSide) => void;
}) {
  const fi = useApp().data.locale === "fi";
  const valueId = useId();
  const vapour = side === "dew";
  return (
    <label className="switch-label phase-switch">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        aria-describedby={valueId}
        checked={vapour}
        onChange={(event) => onChange(event.target.checked ? "dew" : "bubble")}
      />
      <span id={valueId}>
        {vapour ? (fi ? "Höyry" : "Vapour") : fi ? "Neste" : "Liquid"}
      </span>
    </label>
  );
}
