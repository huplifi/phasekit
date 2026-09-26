import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  getPHDiagram,
  PHPhaseBoundaryError,
  type PHCycleResult,
  type PHDiagram,
  type PHIsoline,
} from "../../../../packages/core/src/ph";
import { SourceNote } from "../components/Common";
import { cycleChartBounds } from "../ph-chart-snapshot";
import "./ph-calculator.css";
const pointLabels = ["1", "2", "3", "4"] as const;

type ChartRect = { left: number; top: number; right: number; bottom: number };
type ChartPoint = { x: number; y: number };

function overlaps(a: ChartRect, b: ChartRect, gap = 0) {
  return (
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap
  );
}

function lineCrossesRect(a: ChartPoint, b: ChartPoint, rect: ChartRect) {
  if (
    Math.max(a.x, b.x) < rect.left ||
    Math.min(a.x, b.x) > rect.right ||
    Math.max(a.y, b.y) < rect.top ||
    Math.min(a.y, b.y) > rect.bottom
  )
    return false;
  if (
    (a.x >= rect.left &&
      a.x <= rect.right &&
      a.y >= rect.top &&
      a.y <= rect.bottom) ||
    (b.x >= rect.left &&
      b.x <= rect.right &&
      b.y >= rect.top &&
      b.y <= rect.bottom)
  )
    return true;
  const edges: [ChartPoint, ChartPoint][] = [
    [
      { x: rect.left, y: rect.top },
      { x: rect.right, y: rect.top },
    ],
    [
      { x: rect.right, y: rect.top },
      { x: rect.right, y: rect.bottom },
    ],
    [
      { x: rect.right, y: rect.bottom },
      { x: rect.left, y: rect.bottom },
    ],
    [
      { x: rect.left, y: rect.bottom },
      { x: rect.left, y: rect.top },
    ],
  ];
  const cross = (p: ChartPoint, q: ChartPoint, r: ChartPoint) =>
    (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  return edges.some(([c, d]) => {
    const abC = cross(a, b, c),
      abD = cross(a, b, d);
    const cdA = cross(c, d, a),
      cdB = cross(c, d, b);
    return abC * abD <= 0 && cdA * cdB <= 0;
  });
}

function phaseBoundaryText(error: PHPhaseBoundaryError, fi: boolean): string {
  const number = (value: number) =>
    new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
      maximumFractionDigits: 2,
    }).format(value);
  const names = fi
    ? { "1": "Imu", "2": "Kuumakaasu", "3": "Neste" }
    : { "1": "Suction", "2": "Hot gas", "3": "Liquid" };
  const liquid = error.phase === "liquid";
  const point = `T${error.point} · ${names[error.point]}: ${number(error.temperatureC)} °C.`;
  if (fi)
    return `${point} Paineella ${number(error.pressureBarAbsolute)} bar(a) mallin ${liquid ? "kuplapiste" : "kastepiste"} on noin ${number(error.saturationTemperatureC)} °C. ${liquid ? "Alijäähdytys" : "Lämpötilaero kastepisteeseen"}: ${number(error.offsetK)} K. ${error.offsetK < 0 ? `Piste ei ole tässä mallissa ${liquid ? "alijäähtyneen nesteen" : "tulistetun höyryn"} puolella.` : "Piste on liian lähellä kylläisyysrajaa tämän taulukkomallin laskentaan."} Mallin pienin tuettu ero on 1 K; tämä ei ole laitteen toimintavaatimus. Tarkista myös, onko paine syötetty yli- vai absoluuttisena paineena.`;
  return `${point} At ${number(error.pressureBarAbsolute)} bar(a), the model ${liquid ? "bubble" : "dew"} temperature is approximately ${number(error.saturationTemperatureC)} °C. ${liquid ? "Subcooling" : "Temperature above dew"}: ${number(error.offsetK)} K. ${error.offsetK < 0 ? `The point is not on the ${liquid ? "subcooled-liquid" : "superheated-vapour"} side in this model.` : "The point is too close to saturation for this table model."} The minimum supported offset is 1 K; this is not an equipment operating requirement. Also check whether the pressure was entered as gauge or absolute.`;
}

function errorText(code: string, fi: boolean): string {
  const messages: Record<string, [string, string]> = {
    ph_unsupported_refrigerant: [
      "Tälle kylmäaineelle ei ole p–h-aineistoa.",
      "No p–h data is available for this refrigerant.",
    ],
    ph_out_of_range: [
      "Arvo on tämän malliaineiston käyttöalueen ulkopuolella. Tarkista paineet ja lämpötilat.",
      "A value is outside this model's range. Check pressures and temperatures.",
    ],
    ph_two_phase_or_boundary: [
      "Pisteen 1 ja 2 on oltava vähintään 1 K kastepisteen yläpuolella ja pisteen 3 vähintään 1 K kuplapisteen alapuolella.",
      "Points 1 and 2 must be at least 1 K above dew temperature, and point 3 at least 1 K below bubble temperature.",
    ],
    ph_invalid_temperature: [
      "Lämpötilan on oltava absoluuttisen nollapisteen yläpuolella.",
      "Temperature must be above absolute zero.",
    ],
    ph_high_pressure_must_exceed_low: [
      "Korkeapaineen on oltava matalapainetta suurempi.",
      "High pressure must exceed low pressure.",
    ],
    ph_discharge_enthalpy_must_exceed_suction: [
      "Kuumakaasun entalpian on oltava imukaasua suurempi.",
      "Discharge enthalpy must exceed suction enthalpy.",
    ],
    ph_point4_outside_two_phase: [
      "Paisunnan jälkeinen piste ei sijoitu matalapaineen kaksifaasialueelle tällä oletuksella.",
      "The post-expansion point does not fall within the low-pressure two-phase region under this assumption.",
    ],
    nonpositive_absolute_pressure: [
      "Absoluuttisen paineen on oltava nollaa suurempi.",
      "Absolute pressure must be positive.",
    ],
    negative_absolute_pressure: [
      "Absoluuttinen paine ei voi olla negatiivinen.",
      "Absolute pressure cannot be negative.",
    ],
    invalid_atmospheric_reference: [
      "Ympäristön ilmanpaineen on oltava nollaa suurempi.",
      "Atmospheric reference pressure must be positive.",
    ],
    missing: [
      "Täytä molemmat paineet ja kaikki kolme lämpötilaa.",
      "Enter both pressures and all three temperatures.",
    ],
    unit: [
      "Korjaa keskeneräinen luku ennen yksikön vaihtoa.",
      "Complete the number before changing units.",
    ],
  };
  return (messages[code] ?? [
    "Tarkista syöttämäsi luvut. Käytä desimaalipilkkua tai -pistettä.",
    "Check the entered numbers. Use a decimal comma or point.",
  ])[fi ? 0 : 1];
}

function PHChart({
  diagram,
  result,
  fi,
  fitCycle,
  visibleKinds,
  chartId,
  highlightedGuideIndex,
}: {
  diagram: PHDiagram;
  result?: PHCycleResult | null;
  fi: boolean;
  fitCycle: boolean;
  visibleKinds: Record<PHIsoline["kind"], boolean>;
  chartId: string;
  highlightedGuideIndex: number | null;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const clipId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(720);
  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const update = () => setContainerWidth(Math.round(element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const allNodes = diagram.dome.map((node) => ({
    p: Number(node.pressureBarAbsolute),
    liquid: Number(node.liquidEnthalpyKJkg),
    vapour: Number(node.vapourEnthalpyKJkg),
  }));
  const points = result
    ? pointLabels.map((label) => ({
        label,
        p: Number(result.points[label].pressureBarAbsolute),
        h: Number(result.points[label].enthalpyKJkg),
      }))
    : [];
  // Show the whole available model by default, with an optional cycle focus.
  // Neither view extrapolates or closes the saturation boundaries.
  const focusCycle = fitCycle && !!result;
  const lowCycleP = points.length
    ? Math.min(...points.map((point) => point.p))
    : 0;
  const highCycleP = points.length
    ? Math.max(...points.map((point) => point.p))
    : 0;
  const nodes = allNodes;
  const selectedIsolines = diagram.isolines.filter(
    (line) => visibleKinds[line.kind],
  );
  const isolinePoints = focusCycle
    ? []
    : selectedIsolines.flatMap((line) => line.segments.flat());
  const allH = focusCycle
    ? points.map((point) => point.h)
    : [
        ...nodes.flatMap((node) => [node.liquid, node.vapour]),
        ...points.map((point) => point.h),
        ...isolinePoints.map((point) => point[1]),
      ];
  const lowH = Math.min(...allH);
  const highH = Math.max(...allH);
  const hPad = Math.max((highH - lowH) * 0.09, 5);
  const cycleBounds = focusCycle
    ? cycleChartBounds(points.map((point) => [point.p, point.h] as const))
    : null;
  const xMin = cycleBounds?.xMin ?? lowH - hPad;
  const xMax = cycleBounds?.xMax ?? highH + hPad;
  const logP = (focusCycle ? points : [...nodes, ...points]).map((node) =>
    Math.log(node.p),
  );
  const logMin = Math.min(...logP);
  const logMax = Math.max(...logP);
  const logPad = Math.max((logMax - logMin) * 0.08, 0.05);
  const pMin = cycleBounds?.pMin ?? logMin - logPad;
  const pMax = cycleBounds?.pMax ?? logMax + logPad;
  const compact = containerWidth < 560;
  const box = compact
    ? {
        left: 54,
        right: 16,
        top: 24,
        bottom: 54,
        width: Math.max(300, containerWidth),
        height: 360,
      }
    : { left: 74, right: 26, top: 30, bottom: 60, width: 720, height: 420 };
  const width = box.width - box.left - box.right;
  const height = box.height - box.top - box.bottom;
  const x = (h: number) => box.left + ((h - xMin) / (xMax - xMin)) * width;
  const y = (p: number) =>
    box.top + ((pMax - Math.log(p)) / (pMax - pMin)) * height;
  const boundary = (side: "liquid" | "vapour") =>
    nodes
      .map(
        (node, index) =>
          `${index ? "L" : "M"} ${x(node[side]).toFixed(2)} ${y(node.p).toFixed(2)}`,
      )
      .join(" ");
  const rawStep = (xMax - xMin) / Math.max(3, Math.floor(width / 95));
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const hStep =
    ([1, 2, 5, 10].find((step) => step * magnitude >= rawStep) ?? 10) *
    magnitude;
  const hMinorStep = hStep / 5;
  const hGrid = Array.from(
    {
      length: Math.floor(xMax / hMinorStep) - Math.ceil(xMin / hMinorStep) + 1,
    },
    (_, index) => {
      const step = Math.ceil(xMin / hMinorStep) + index;
      return { value: step * hMinorStep, major: step % 5 === 0 };
    },
  );
  const pGrid: { value: number; major: boolean }[] = [];
  for (
    let decade = Math.floor(pMin / Math.LN10);
    decade <= Math.ceil(pMax / Math.LN10);
    decade++
  ) {
    for (let multiplier = 1; multiplier < 10; multiplier++) {
      const value = multiplier * 10 ** decade;
      if (Math.log(value) >= pMin && Math.log(value) <= pMax) {
        pGrid.push({ value, major: [1, 2, 5].includes(multiplier) });
      }
    }
  }
  const pointByLabel = Object.fromEntries(
    points.map((point) => [point.label, point]),
  ) as Record<(typeof pointLabels)[number], (typeof points)[number]>;
  const connections = [
    ["1", "2"],
    ["2", "3"],
    ["3", "4"],
    ["4", "1"],
  ] as const;
  const number = new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
    maximumSignificantDigits: 3,
  });
  const kindSymbol = { temperature: "T", entropy: "s", volume: "v" };
  const pointRects: ChartRect[] = points.flatMap((point) => {
    const px = x(point.h),
      py = y(point.p);
    const labelX = px + (point.label === "3" || point.label === "4" ? -13 : 12);
    const labelY = py + (point.label === "1" || point.label === "4" ? 19 : -11);
    return [
      { left: px - 8, top: py - 8, right: px + 8, bottom: py + 8 },
      {
        left: labelX - (point.label === "3" || point.label === "4" ? 14 : 0),
        top: labelY - 16,
        right: labelX + (point.label === "3" || point.label === "4" ? 0 : 14),
        bottom: labelY + 4,
      },
    ];
  });
  const boundarySegments = (["liquid", "vapour"] as const).flatMap((side) =>
    nodes.slice(1).map((node, index): [ChartPoint, ChartPoint] => [
      { x: x(nodes[index]![side]), y: y(nodes[index]!.p) },
      { x: x(node[side]), y: y(node.p) },
    ]),
  );
  const cycleSegments = points.length
    ? connections.map(([from, to]): [ChartPoint, ChartPoint] => [
        { x: x(pointByLabel[from].h), y: y(pointByLabel[from].p) },
        { x: x(pointByLabel[to].h), y: y(pointByLabel[to].p) },
      ])
    : [];
  const occupied: ChartRect[] = [...pointRects];
  const guideLabels = selectedIsolines.flatMap((line, lineIndex) =>
    line.segments.flatMap((segment, segmentIndex) => {
      const visible = segment.filter(
        ([p, h]) =>
          Math.log(p) >= pMin && Math.log(p) <= pMax && h >= xMin && h <= xMax,
      );
      if (visible.length < 3) return [];
      const label = `${kindSymbol[line.kind]}=${number.format(line.level)}`;
      const labelWidth = label.length * 7.4 + 6;
      const candidates = [0.5, 0.35, 0.65, 0.2, 0.8];
      for (const fraction of candidates) {
        const [p, h] = visible[Math.floor((visible.length - 1) * fraction)]!;
        const cx = x(h),
          baseline = y(p) - 6;
        const rect = {
          left: cx - labelWidth / 2,
          right: cx + labelWidth / 2,
          top: baseline - 13,
          bottom: baseline + 3,
        };
        if (
          rect.left < box.left + 5 ||
          rect.right > box.left + width - 5 ||
          rect.top < box.top + 5 ||
          rect.bottom > box.top + height - 5 ||
          occupied.some((other) => overlaps(rect, other, 5)) ||
          [...boundarySegments, ...cycleSegments].some(([a, b]) =>
            lineCrossesRect(a, b, {
              left: rect.left - 3,
              right: rect.right + 3,
              top: rect.top - 3,
              bottom: rect.bottom + 3,
            }),
          )
        )
          continue;
        occupied.push(rect);
        return [
          { key: `${lineIndex}-${segmentIndex}`, label, x: cx, y: baseline },
        ];
      }
      return [];
    }),
  );
  return (
    <div ref={containerRef} className="ph-chart-scroll">
      <svg
        id={chartId}
        className="ph-chart"
        viewBox={`0 0 ${box.width} ${box.height}`}
        role="img"
        aria-labelledby={`${titleId} ${descriptionId}`}
      >
        <title id={titleId}>
          {result
            ? fi
              ? "Kylmäkierron log(p)–h-kaavio"
              : "Refrigeration cycle log(p)–h diagram"
            : fi
              ? "Kylmäaineen log(p)–h-kylläisyysrajat"
              : "Refrigerant log(p)–h saturation boundaries"}
        </title>
        <desc id={descriptionId}>
          {fi
            ? `Pystyakseli on absoluuttisen paineen logaritminen asteikko, vaaka-akseli ominaisentalpia. Avoimet käyrät ovat rajatun malliaineiston kylläisyysrajat. Näkyvät apukäyrät ovat rajattuja yksifaasisen alueen malliarvoja.${result ? " Suorat viivat yhdistävät laskettuja pisteitä 1–2–3–4 kaavamaisesti." : ""}`
            : `Vertical axis is logarithmic absolute pressure, horizontal axis is specific enthalpy. Open curves are saturation boundaries from a limited model domain. Visible guide curves are bounded single-phase model values.${result ? " Straight lines connect calculated points 1–2–3–4 schematically." : ""}`}
        </desc>
        <defs>
          <clipPath id={clipId}>
            <rect x={box.left} y={box.top} width={width} height={height} />
          </clipPath>
        </defs>
        {hGrid.map(({ value: tick, major }, index) => (
          <g key={`h-${index}`}>
            <line
              className={`ph-gridline ${major ? "" : "ph-gridline-minor"}`}
              x1={x(tick)}
              x2={x(tick)}
              y1={box.top}
              y2={box.top + height}
            />
            {major && (
              <text
                className="ph-tick"
                x={x(tick)}
                y={box.top + height + 21}
                textAnchor="middle"
              >
                {Number(tick.toPrecision(8)).toLocaleString(
                  fi ? "fi-FI" : "en-GB",
                )}
              </text>
            )}
          </g>
        ))}
        {pGrid.map(({ value: tick, major }, index) => (
          <g key={`p-${index}`}>
            <line
              className={`ph-gridline ${major ? "" : "ph-gridline-minor"}`}
              x1={box.left}
              x2={box.left + width}
              y1={y(tick)}
              y2={y(tick)}
            />
            {major && (
              <text
                className="ph-tick"
                x={box.left - 9}
                y={y(tick) + 4}
                textAnchor="end"
              >
                {Number(tick.toPrecision(8)).toLocaleString(
                  fi ? "fi-FI" : "en-GB",
                  { maximumSignificantDigits: 3 },
                )}
              </text>
            )}
          </g>
        ))}
        <path
          className="ph-axis"
          d={`M ${box.left} ${box.top} V ${box.top + height} H ${box.left + width}`}
        />
        <g clipPath={`url(#${clipId})`}>
          {selectedIsolines.flatMap((line, lineIndex) =>
            line.segments.map((segment, segmentIndex) => (
              <path
                key={`${lineIndex}-${segmentIndex}`}
                className={`ph-isoline ph-isoline-${line.kind}${diagram.isolines.indexOf(line) === highlightedGuideIndex ? " ph-isoline-highlighted" : ""}`}
                data-guide-index={diagram.isolines.indexOf(line)}
                d={segment
                  .map(
                    ([p, h], index) =>
                      `${index ? "L" : "M"} ${x(h).toFixed(2)} ${y(p).toFixed(2)}`,
                  )
                  .join(" ")}
              />
            )),
          )}
          {guideLabels.map(({ key, label, x: labelX, y: labelY }) => (
            <text
              key={key}
              className="ph-isoline-label"
              x={labelX}
              y={labelY}
              textAnchor="middle"
            >
              {label}
            </text>
          ))}
          <path className="ph-boundary ph-bubble" d={boundary("liquid")} />
          <path className="ph-boundary ph-dew" d={boundary("vapour")} />
        </g>
        {result &&
          [lowCycleP, highCycleP].map((pressure) => (
            <line
              key={pressure}
              className="ph-pressure-guide"
              x1={box.left}
              x2={box.left + width}
              y1={y(pressure)}
              y2={y(pressure)}
            />
          ))}
        {result &&
          connections.map(([from, to]) => (
            <line
              key={`${from}-${to}`}
              className={`ph-cycle ph-cycle-line ${from === "3" ? "ph-assumed-line" : ""}`}
              x1={x(pointByLabel[from].h)}
              y1={y(pointByLabel[from].p)}
              x2={x(pointByLabel[to].h)}
              y2={y(pointByLabel[to].p)}
            />
          ))}
        {points.map((point) => (
          <g key={point.label}>
            <circle
              className="ph-point"
              cx={x(point.h)}
              cy={y(point.p)}
              r="6"
            />
            <text
              className="ph-point-label"
              x={
                x(point.h) +
                (point.label === "3" || point.label === "4" ? -13 : 12)
              }
              y={
                y(point.p) +
                (point.label === "1" || point.label === "4" ? 19 : -11)
              }
              textAnchor={
                point.label === "3" || point.label === "4" ? "end" : "start"
              }
            >
              {point.label}
            </text>
          </g>
        ))}
        <text
          className="ph-axis-label"
          x={box.left + width / 2}
          y={box.height - 7}
          textAnchor="middle"
        >
          h · kJ/kg
        </text>
        <text
          className="ph-axis-label"
          transform={`translate(20 ${box.top + height / 2}) rotate(-90)`}
          textAnchor="middle"
        >
          log p · bar(a)
        </text>
      </svg>
    </div>
  );
}

export function phErrorText(caught: unknown, fi: boolean) {
  return caught instanceof PHPhaseBoundaryError
    ? phaseBoundaryText(caught, fi)
    : errorText(caught instanceof Error ? caught.message : "", fi);
}

export function PHDiagramPanel({
  id,
  result,
  message,
  fi,
}: {
  id: string;
  result: PHCycleResult | null;
  message: string;
  fi: boolean;
}) {
  const [fitCycle, setFitCycle] = useState(false);
  const chartId = useId();
  const [selectedGuide, setSelectedGuide] = useState<{
    diagramId: string;
    index: number;
  } | null>(null);
  useEffect(() => {
    if (!result) setFitCycle(false);
  }, [result]);
  const [visibleKinds, setVisibleKinds] = useState<
    Record<PHIsoline["kind"], boolean>
  >({
    temperature: true,
    entropy: false,
    volume: false,
  });
  const diagram = id ? getPHDiagram(id) : null;
  const selectedLine =
    diagram && selectedGuide?.diagramId === id
      ? diagram.isolines[selectedGuide.index]
      : null;
  const highlightedGuideIndex =
    selectedLine && visibleKinds[selectedLine.kind]
      ? selectedGuide!.index
      : null;
  const highlightedLine =
    selectedLine && highlightedGuideIndex !== null ? selectedLine : null;
  const fittedBounds =
    fitCycle && result
      ? cycleChartBounds(
          pointLabels.map(
            (label) =>
              [
                Number(result.points[label].pressureBarAbsolute),
                Number(result.points[label].enthalpyKJkg),
              ] as const,
          ),
        )
      : null;
  const highlightedGuideVisible =
    !fittedBounds ||
    !highlightedLine ||
    highlightedLine.segments.some((segment) =>
      segment.some(
        ([p, h]) =>
          Math.log(p) >= fittedBounds.pMin &&
          Math.log(p) <= fittedBounds.pMax &&
          h >= fittedBounds.xMin &&
          h <= fittedBounds.xMax,
      ),
    );
  const l = (a: string, b: string) => (fi ? a : b);
  const formatted = (value: string) =>
    new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
      maximumFractionDigits: 2,
    }).format(Number(value));
  const phase = (value: string) =>
    value === "vapour"
      ? l("Höyry", "Vapour")
      : value === "liquid"
        ? l("Neste", "Liquid")
        : l("Kaksifaasinen", "Two-phase");
  const sourceIds = result?.sourceIds ?? diagram?.availability.sourceIds ?? [];
  return (
    <>
      {message && (
        <div className="notice warning ph-diagram-message" role="status">
          <strong>{l("Kiertoa ei piirretty", "Cycle not plotted")}</strong>
          <p>{message}</p>
          <p>
            {l(
              "Tulistus ja alijäähdytys näkyvät yllä, jos niiden lähtötiedot ovat riittävät.",
              "Superheat and subcooling remain available above when their inputs are sufficient.",
            )}
          </p>
        </div>
      )}
      {!diagram && id && !message && (
        <p className="caption secondary">
          {l(
            "Tälle kylmäaineelle ei ole log(p)–h-aineistoa. Tulistus ja alijäähdytys lasketaan P–T-aineistosta, jos se on saatavilla.",
            "No log(p)–h data is available for this refrigerant. Superheat and subcooling use P–T data where available.",
          )}
        </p>
      )}
      {diagram && (
        <section
          className="ph-diagram-section"
          aria-labelledby="ph-diagram-title"
        >
          <h2 id="ph-diagram-title">
            {l("log(p)–h-kaavio", "log(p)–h diagram")}
          </h2>
          <div className="ph-view-controls">
            <label className="switch-label">
              <input
                type="checkbox"
                role="switch"
                checked={fitCycle && !!result}
                disabled={!result}
                aria-describedby={!result ? "ph-fit-unavailable" : undefined}
                onChange={(event) => setFitCycle(event.target.checked)}
              />
              <span>{l("Sovita kiertoon", "Fit to cycle")}</span>
            </label>
            {!result && (
              <p id="ph-fit-unavailable" className="caption secondary">
                {l(
                  "Laske kelvollinen kierto, jotta kaavio voidaan sovittaa siihen.",
                  "Calculate a valid cycle to fit the chart to it.",
                )}
              </p>
            )}
          </div>
          {diagram.isolines.length > 0 && (
            <div
              className="ph-isoline-controls"
              role="group"
              aria-label={l("Apukäyrät", "Guide curves")}
            >
              {(
                [
                  ["temperature", l("Lämpötila T", "Temperature T"), "°C"],
                  ["entropy", l("Entropia s", "Entropy s"), "kJ/(kg·K)"],
                  [
                    "volume",
                    l("Ominaistilavuus v", "Specific volume v"),
                    "m³/kg",
                  ],
                ] as const
              ).map(([kind, name, unit]) => {
                const available = diagram.isolines.some(
                  (line) => line.kind === kind,
                );
                return (
                  <button
                    type="button"
                    key={kind}
                    className={`ph-isoline-toggle ph-isoline-toggle-${kind}`}
                    aria-pressed={visibleKinds[kind] && available}
                    disabled={!available}
                    onClick={() =>
                      setVisibleKinds((previous) => ({
                        ...previous,
                        [kind]: !previous[kind],
                      }))
                    }
                  >
                    <span
                      className={`ph-isoline-key ph-isoline-key-${kind}`}
                      aria-hidden="true"
                    />
                    {name} · {unit}
                  </button>
                );
              })}
            </div>
          )}
          <figure className="ph-figure">
            <PHChart
              diagram={diagram}
              result={result}
              fi={fi}
              fitCycle={fitCycle}
              visibleKinds={visibleKinds}
              chartId={chartId}
              highlightedGuideIndex={highlightedGuideIndex}
            />
            <figcaption className="caption secondary">
              {l(
                "Katkoviivaiset kylläisyysrajat ovat avoimia, koska malliaineisto kattaa vain rajatun painealueen.",
                "Dashed saturation boundaries remain open because the model covers only a limited pressure range.",
              )}{" "}
              {result &&
                l(
                  "Suorat pisteiden välit kuvaavat kierron järjestystä kaavamaisesti, eivät laskettua prosessireittiä.",
                  "Straight connections show cycle order schematically, not a calculated process path.",
                )}
              {diagram.isolines.length > 0 && " "}
              {diagram.isolines.length > 0 &&
                l(
                  "Apukäyriä on vain muutamalla tasolla. Ne näyttävät CoolPropista lasketut, tarkistetut yksifaasisen alueen osat; puuttuvia alueita ei yhdistetä.",
                  "Guide curves cover only a few levels. They show checked single-phase segments calculated from CoolProp; missing regions remain gaps.",
                )}{" "}
              {result
                ? l(
                    "Kaavio sovittuu näytön leveyteen; tarkat pistearvot näkyvät alla taulukossa.",
                    "The chart fits the screen width; exact point values appear in the table below.",
                  )
                : l(
                    "Kaavio sovittuu näytön leveyteen.",
                    "The chart fits the screen width.",
                  )}
            </figcaption>
          </figure>
          {diagram.isolines.length > 0 &&
            diagram.isolines.some((line) => visibleKinds[line.kind]) && (
              <details className="ph-guide-list caption">
                <summary>
                  {l("Näytä apukäyrien arvot", "Show guide curve values")}
                </summary>
                <p className="secondary">
                  {l(
                    "Valitse arvo korostaaksesi sen käyrää. Myös kaaviosta pois jätetyt tunnisteet ovat tässä.",
                    "Select a value to highlight its curve. Values without an inline chart label are listed here too.",
                  )}
                </p>
                {(["temperature", "entropy", "volume"] as const)
                  .filter(
                    (kind) =>
                      visibleKinds[kind] &&
                      diagram.isolines.some((line) => line.kind === kind),
                  )
                  .map((kind) => {
                    const lines = diagram.isolines
                      .map((line, index) => ({ line, index }))
                      .filter(({ line }) => line.kind === kind)
                      .sort((a, b) => a.line.level - b.line.level);
                    const name =
                      kind === "temperature"
                        ? l("Lämpötila T", "Temperature T")
                        : kind === "entropy"
                          ? l("Entropia s", "Entropy s")
                          : l("Ominaistilavuus v", "Specific volume v");
                    const unit =
                      kind === "temperature"
                        ? "°C"
                        : kind === "entropy"
                          ? "kJ/(kg·K)"
                          : "m³/kg";
                    const symbol =
                      kind === "temperature"
                        ? "T"
                        : kind === "entropy"
                          ? "s"
                          : "v";
                    return (
                      <div className="ph-guide-group" key={kind}>
                        <strong>
                          {name} · {unit}:
                        </strong>
                        <div className="ph-guide-values">
                          {lines.map(({ line, index }) => (
                            <button
                              key={index}
                              type="button"
                              className="ph-guide-value"
                              data-guide-index={index}
                              aria-controls={chartId}
                              aria-pressed={highlightedGuideIndex === index}
                              onFocus={() =>
                                setSelectedGuide({ diagramId: id, index })
                              }
                              onClick={() =>
                                setSelectedGuide({ diagramId: id, index })
                              }
                            >
                              {symbol}=
                              {new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
                                maximumSignificantDigits: 3,
                              }).format(line.level)}{" "}
                              {unit} ·{" "}
                              {line.phase === "liquid"
                                ? l("nestepuoli", "liquid side")
                                : l("höyrypuoli", "vapour side")}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                {highlightedLine && (
                  <p className="ph-guide-selection" role="status">
                    {highlightedGuideVisible
                      ? l(
                          "Valittu käyrä on korostettu kaaviossa.",
                          "Selected curve highlighted in the chart.",
                        )
                      : l(
                          "Valittu käyrä on sovitetun näkymän ulkopuolella. Poista Sovita kiertoon käytöstä nähdäksesi sen.",
                          "Selected curve is outside the fitted view. Turn off Fit to cycle to see it.",
                        )}
                  </p>
                )}
              </details>
            )}
          <div className="ph-legend caption">
            <span className="ph-legend-bubble">
              {l("Kuplapisteraja", "Bubble boundary")}
            </span>
            <span className="ph-legend-dew">
              {l("Kastepisteraja", "Dew boundary")}
            </span>
            {result && (
              <span className="ph-legend-cycle">
                {l("Kiertopisteet", "Cycle points")}
              </span>
            )}
          </div>
        </section>
      )}
      {result && diagram && (
        <section
          className="ph-results ph-result"
          aria-labelledby="ph-result-title"
        >
          <h2 id="ph-result-title" tabIndex={-1}>
            {l("Laskettu kierto", "Calculated cycle")}
          </h2>
          <div
            className="ph-table-scroll"
            tabIndex={0}
            role="region"
            aria-label={l(
              "Vieritettävä pistetaulukko",
              "Scrollable state-point table",
            )}
          >
            <table className="ph-point-table">
              <caption>
                {l(
                  "Lasketut tilapisteet; paineet absoluuttisia",
                  "Calculated state points; absolute pressures",
                )}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{l("Piste", "Point")}</th>
                  <th scope="col">{l("Tila", "State")}</th>
                  <th scope="col">p · bar(a)</th>
                  <th scope="col">T · °C</th>
                  <th scope="col">h · kJ/kg</th>
                </tr>
              </thead>
              <tbody>
                {pointLabels.map((label) => {
                  const point = result.points[label];
                  return (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      <td>{phase(point.phase)}</td>
                      <td className="mono">
                        {formatted(point.pressureBarAbsolute)}
                      </td>
                      <td className="mono">
                        {point.temperatureC === null
                          ? point.temperatureBoundsC
                            ? `${formatted(point.temperatureBoundsC[0])}–${formatted(point.temperatureBoundsC[1])} *`
                            : "—"
                          : formatted(point.temperatureC)}
                      </td>
                      <td className="mono">{formatted(point.enthalpyKJkg)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="caption secondary">
            *{" "}
            {l(
              "Pisteen 4 lämpötila on kupla- ja kastepisteen välinen rajaus, ei yksittäinen laskettu arvo. h₄ = h₃ on isentalpisen paisunnan oletus.",
              "Point 4 temperature is bounded by bubble and dew values, not a single calculated value. h₄ = h₃ is the isenthalpic expansion assumption.",
            )}
          </p>
          <p className="caption secondary">
            {l(
              "Entalpiat perustuvat CoolProp HEOS -malliin ja rajattuun offline-ruudukkoon. Tulokset ovat malliarvioita; vertaa niitä laite- ja mittaustietoihin.",
              "Enthalpies come from the CoolProp HEOS model and a bounded offline grid. Results are model estimates; compare them with equipment and measurement data.",
            )}
          </p>
        </section>
      )}
      {sourceIds.length > 0 && <SourceNote ids={sourceIds} />}
    </>
  );
}
