import type {
  AssessmentMode,
  PortRole,
} from "../../../../packages/core/src/operating-assessment";

export type CircuitLayout = "split" | "industrial";
export type HighSideKind = "condenser" | "gas_cooler" | "unresolved";
type PortPlace = "gas" | "liquid" | "stub" | "discharge" | "detached";

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
}

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
  const place = portPlace(layout, mode, portRole);
  return (
    <figure className="circuit-figure">
      <svg
        className="circuit-svg"
        viewBox={layout === "industrial" ? "0 0 640 320" : "0 0 640 280"}
        role="img"
        aria-label={ariaLabel}
      >
        {layout === "split" ? (
          <SplitCircuit
            labels={labels}
            place={place}
            mode={mode}
            highSide={highSide}
          />
        ) : (
          <IndustrialCircuit
            labels={labels}
            place={place}
            highSide={highSide}
          />
        )}
      </svg>
      <figcaption className="circuit-key">
        <span>{labels.leftTitle}</span>
        <strong>{labels.leftFunction}</strong>
        <span>{labels.rightTitle}</span>
        <strong>{labels.rightFunction}</strong>
        <span>{labels.port}</span>
      </figcaption>
    </figure>
  );
}

function SplitCircuit({
  labels,
  place,
  mode,
  highSide,
}: {
  labels: CircuitLabels;
  place: PortPlace;
  mode: AssessmentMode;
  highSide: HighSideKind;
}) {
  const heating = mode === "heating";
  const point = splitPoint(place, mode);
  return (
    <>
      <Unit
        x={28}
        y={46}
        title={labels.leftTitle}
        fn={labels.leftFunction}
        hot={!heating}
        unresolved={highSide === "unresolved" && !heating}
      />
      <Unit
        x={416}
        y={46}
        title={labels.rightTitle}
        fn={labels.rightFunction}
        hot={heating}
        unresolved={highSide === "unresolved" && heating}
      />
      <Pipe
        x1={224}
        x2={416}
        y={96}
        hot={!heating}
        label={labels.liquid}
        labelY={78}
      />
      <Valve x={320} y={96} />
      <text className="circuit-fn" x={320} y={124} textAnchor="middle">
        {labels.expansion}
      </text>
      <Pipe
        x1={224}
        x2={416}
        y={196}
        hot={heating}
        label={labels.gas}
        labelY={184}
        wide
      />
      <Flow x={320} y={196} toward={heating ? "right" : "left"} />
      <circle className="circuit-machine" cx={118} cy={196} r={28} />
      <text className="circuit-fn" x={118} y={201} textAnchor="middle">
        {labels.compressor}
      </text>
      <line
        className={heating ? "circuit-stub is-cold" : "circuit-stub is-hot"}
        x1={150}
        y1={120}
        x2={150}
        y2={168}
      />
      <Port cx={point.x} cy={point.y} />
    </>
  );
}

function IndustrialCircuit({
  labels,
  place,
  highSide,
}: {
  labels: CircuitLabels;
  place: PortPlace;
  highSide: HighSideKind;
}) {
  const point = industrialPoint(place);
  return (
    <>
      <Unit
        x={36}
        y={24}
        title={labels.leftTitle}
        fn={labels.leftFunction}
        hot
        unresolved={highSide === "unresolved"}
      />
      <Unit
        x={404}
        y={24}
        title={labels.rightTitle}
        fn={labels.rightFunction}
        hot={false}
      />
      <Pipe x1={232} x2={404} y={74} hot label={labels.liquid} labelY={58} />
      <Valve x={318} y={74} />
      <text className="circuit-fn" x={318} y={104} textAnchor="middle">
        {labels.expansion}
      </text>
      <path className="circuit-pipe is-hot is-wide" d="M126 174 V148" />
      <path className="circuit-pipe is-cold is-wide" d="M502 148 V236 H158" />
      <text className="circuit-fn" x={360} y={222} textAnchor="middle">
        {labels.gas}
      </text>
      <circle className="circuit-machine" cx={126} cy={210} r={32} />
      <text className="circuit-fn" x={126} y={214} textAnchor="middle">
        {labels.compressor}
      </text>
      <Port cx={point.x} cy={point.y} />
    </>
  );
}

function Unit({
  x,
  y,
  title,
  fn,
  hot,
  unresolved = false,
}: {
  x: number;
  y: number;
  title: string;
  fn: string;
  hot: boolean;
  unresolved?: boolean;
}) {
  const tone = unresolved ? "is-open" : hot ? "is-hot" : "is-cold";
  return (
    <>
      <rect
        className={`circuit-unit ${tone}`}
        x={x}
        y={y}
        width={200}
        height={160}
        rx={18}
      />
      <text
        className="circuit-title"
        x={x + 100}
        y={y + 36}
        textAnchor="middle"
      >
        {title}
      </text>
      <text className="circuit-fn" x={x + 100} y={y + 58} textAnchor="middle">
        {fn}
      </text>
    </>
  );
}

function Pipe({
  x1,
  x2,
  y,
  hot,
  label,
  labelY,
  wide = false,
}: {
  x1: number;
  x2: number;
  y: number;
  hot: boolean;
  label: string;
  labelY: number;
  wide?: boolean;
}) {
  return (
    <>
      <line
        className={`circuit-pipe ${hot ? "is-hot" : "is-cold"} ${wide ? "is-wide" : ""}`}
        x1={x1}
        y1={y}
        x2={x2}
        y2={y}
      />
      <text
        className="circuit-fn"
        x={(x1 + x2) / 2}
        y={labelY}
        textAnchor="middle"
      >
        {label}
      </text>
    </>
  );
}

function Valve({ x, y }: { x: number; y: number }) {
  return (
    <path
      className="circuit-valve"
      d={`M${x - 14} ${y - 9} L${x} ${y} L${x - 14} ${y + 9} Z M${x + 14} ${y - 9} L${x} ${y} L${x + 14} ${y + 9} Z`}
    />
  );
}

function Flow({
  x,
  y,
  toward,
}: {
  x: number;
  y: number;
  toward: "left" | "right";
}) {
  const dir = toward === "right" ? 1 : -1;
  return (
    <path
      className="circuit-flow"
      d={`M${x - dir * 7} ${y - 6} L${x + dir * 8} ${y} L${x - dir * 7} ${y + 6}`}
    />
  );
}

function Port({ cx, cy }: { cx: number; cy: number }) {
  return <circle className="circuit-port" cx={cx} cy={cy} r={12} />;
}

function portPlace(
  layout: CircuitLayout,
  mode: AssessmentMode,
  role: PortRole,
): PortPlace {
  if (layout === "industrial") {
    if (role === "unknown") return "detached";
    if (role === "liquid") return "liquid";
    if (role === "hot_gas") return "discharge";
    return "gas";
  }
  const lineSet = mode === "heating" ? "hot_gas" : "suction";
  if (role === "liquid") return "liquid";
  if (role === "unknown") return "detached";
  if (role === lineSet) return "gas";
  return "stub";
}

function splitPoint(
  place: PortPlace,
  mode: AssessmentMode,
): { x: number; y: number } {
  if (place === "liquid") return { x: mode === "heating" ? 370 : 270, y: 96 };
  if (place === "stub") return { x: 150, y: 136 };
  if (place === "detached") return { x: 320, y: 250 };
  return { x: 224, y: 196 };
}

function industrialPoint(place: PortPlace): { x: number; y: number } {
  if (place === "liquid") return { x: 270, y: 74 };
  if (place === "discharge") return { x: 126, y: 160 };
  if (place === "detached") return { x: 318, y: 292 };
  return { x: 330, y: 236 };
}
