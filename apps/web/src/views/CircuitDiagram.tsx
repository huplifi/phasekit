import type {
  AssessmentMode,
  PortRole,
} from "../../../../packages/core/src/operating-assessment";

export type CircuitLayout = "split" | "industrial";
export type HighSideKind = "condenser" | "gas_cooler" | "unresolved";
interface CircuitLabels {
  leftTitle: string;
  leftFunction: string;
  rightTitle: string;
  rightFunction: string;
  liquid: string;
  gas: string;
  compressor: string;
  expansion: string;
  port: string;
  returnFlow: string;
}

/** A reading aid, in refrigerant flow order; not an installation drawing. */
export function CircuitDiagram({
  layout,
  mode,
  portRole,
  highSide,
  labels,
  ariaLabel,
}: {
  layout: CircuitLayout;
  mode: AssessmentMode;
  portRole: PortRole;
  highSide: HighSideKind;
  labels: CircuitLabels;
  ariaLabel: string;
}) {
  const reversed = layout === "split" && mode === "heating";
  const high = reversed ? labels.rightFunction : labels.leftFunction;
  const low =
    layout === "industrial"
      ? labels.rightTitle
      : reversed
        ? labels.leftFunction
        : labels.rightFunction;
  const highLocation = reversed ? labels.rightTitle : labels.leftTitle;
  const lowLocation = reversed ? labels.leftTitle : labels.rightTitle;
  const stages = [
    { name: labels.compressor, detail: "", role: "hot_gas" },
    {
      name: high,
      detail: highLocation === high ? "" : highLocation,
      role: "liquid",
    },
    { name: labels.expansion, detail: "", role: null },
    {
      name: low,
      detail: lowLocation === low ? "" : lowLocation,
      role: "suction",
    },
  ];
  return (
    <figure className="circuit-figure" aria-label={ariaLabel}>
      <ol className="circuit-flow-list" aria-label={ariaLabel}>
        {stages.map((stage, index) => (
          <li
            key={index}
            className={
              index === 1 && highSide === "unresolved" ? "is-open" : undefined
            }
          >
            <div className="circuit-stage">
              <span className="circuit-step" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{stage.name}</strong>
                {stage.detail && (
                  <span className="secondary">{stage.detail}</span>
                )}
              </div>
            </div>
            {portRole !== "unknown" && stage.role === portRole && (
              <p className="circuit-measurement">{labels.port}</p>
            )}
            <span className="circuit-arrow" aria-hidden="true">
              ↓
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="caption secondary">
        {labels.returnFlow}
        {portRole === "unknown" && (
          <span className="circuit-unknown">{labels.port}</span>
        )}
      </figcaption>
    </figure>
  );
}
