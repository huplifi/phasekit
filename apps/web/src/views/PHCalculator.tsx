import { useId } from "react";
import {
  getPHDiagram,
  PHPhaseBoundaryError,
  type PHCycleResult,
  type PHDiagram,
} from "../../../../packages/core/src/ph";
import { SourceNote } from "../components/Common";
import "./ph-calculator.css";
const pointLabels = ["1", "2", "3", "4"] as const;

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
}: {
  diagram: PHDiagram;
  result?: PHCycleResult | null;
  fi: boolean;
}) {
  const titleId = useId();
  const descriptionId = useId();
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
  // Use a pressure window around the calculated cycle. The uncalculated view
  // retains the whole available curve; both views keep the boundaries open.
  const lowCycleP = points.length
    ? Math.min(...points.map((point) => point.p))
    : 0;
  const highCycleP = points.length
    ? Math.max(...points.map((point) => point.p))
    : 0;
  const firstVisible = result
    ? allNodes.findIndex((node) => node.p >= lowCycleP / 2)
    : 0;
  const firstBeyond = result
    ? allNodes.findIndex((node) => node.p > highCycleP * 1.5)
    : -1;
  const nodes = result
    ? allNodes.slice(
        Math.max(0, firstVisible - 1),
        firstBeyond < 0
          ? undefined
          : Math.min(allNodes.length, firstBeyond + 1),
      )
    : allNodes;
  const allH = [
    ...nodes.flatMap((node) => [node.liquid, node.vapour]),
    ...points.map((point) => point.h),
  ];
  const lowH = Math.min(...allH);
  const highH = Math.max(...allH);
  const hPad = Math.max((highH - lowH) * 0.09, 5);
  const xMin = lowH - hPad;
  const xMax = highH + hPad;
  const logP = nodes.map((node) => Math.log(node.p));
  const logMin = Math.min(...logP);
  const logMax = Math.max(...logP);
  const logPad = Math.max((logMax - logMin) * 0.08, 0.05);
  const pMin = logMin - logPad;
  const pMax = logMax + logPad;
  const box = {
    left: 74,
    right: 26,
    top: 30,
    bottom: 60,
    width: 720,
    height: 420,
  };
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
  const rawStep = (xMax - xMin) / 6;
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
  return (
    <div
      className="ph-chart-scroll"
      tabIndex={0}
      role="region"
      aria-label={
        fi ? "Vieritettävä log(p)–h-kaavio" : "Scrollable log(p)–h chart"
      }
    >
      <svg
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
            ? `Pystyakseli on absoluuttisen paineen logaritminen asteikko, vaaka-akseli ominaisentalpia. Avoimet käyrät ovat rajatun malliaineiston kylläisyysrajat.${result ? " Suorat viivat yhdistävät laskettuja pisteitä 1–2–3–4 kaavamaisesti." : ""}`
            : `Vertical axis is logarithmic absolute pressure, horizontal axis is specific enthalpy. Open curves are saturation boundaries from a limited model domain.${result ? " Straight lines connect calculated points 1–2–3–4 schematically." : ""}`}
        </desc>
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
        <path className="ph-boundary ph-bubble" d={boundary("liquid")} />
        <path className="ph-boundary ph-dew" d={boundary("vapour")} />
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
  const diagram = id ? getPHDiagram(id) : null;
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
          <figure className="ph-figure">
            <PHChart diagram={diagram} result={result} fi={fi} />
            <figcaption className="caption secondary">
              {l(
                "Katkoviivaiset kylläisyysrajat ovat avoimia, koska malliaineisto kattaa vain rajatun painealueen.",
                "Dashed saturation boundaries remain open because the model covers only a limited pressure range.",
              )}{" "}
              {result &&
                l(
                  "Näkymä on rajattu lasketun kierron ympärille. Suorat pisteiden välit kuvaavat kierron järjestystä kaavamaisesti, eivät laskettua prosessireittiä.",
                  "The view is cropped around the calculated cycle. Straight connections show cycle order schematically, not a calculated process path.",
                )}
            </figcaption>
          </figure>
          <p className="ph-scroll-hint caption secondary">
            {l(
              "Pienellä näytöllä vieritä kaaviota vaakasuunnassa.",
              "On a small screen, scroll horizontally to see the full chart.",
            )}
          </p>
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
