import type { ElectricalMeter, MeasurementType } from "../electrical";
import {
  electricalMeterGuide,
  flukeManualUrl,
  isSupportedElectricalMeter,
} from "../electrical-meter-guides";

/** Relative selector positions checked against Fluke manual, table 4, printed p. 7. */
function MeterSelectorDiagram({
  marker,
  locale,
}: {
  marker: string;
  locale: "fi" | "en";
}) {
  const positions = [
    { marker: "V", x: 40, y: 96, tipX: 91, tipY: 104 },
    { marker: "RISO", x: 67, y: 47, tipX: 108, tipY: 78 },
    { marker: "RLO", x: 140, y: 23, tipX: 140, tipY: 66 },
    { marker: "ZI", detail: "No Trip", x: 224, y: 48, tipX: 171, tipY: 78 },
    {
      marker: "ZI",
      detail: "Hi Current",
      x: 252,
      y: 103,
      tipX: 188,
      tipY: 105,
    },
    { marker: "ΔT", x: 248, y: 168, tipX: 187, tipY: 140 },
    { marker: "IΔN", x: 202, y: 219, tipX: 169, tipY: 165 },
  ];
  return (
    <svg
      className="electrical-selector-diagram"
      viewBox="0 0 300 245"
      role="img"
      aria-label={
        locale === "fi"
          ? `Mittarin valitsin: ${marker}. Korostetut toimintomerkinnät.`
          : `Meter selector: ${marker}. Highlighted function markings.`
      }
    >
      <circle cx="140" cy="119" r="52" className="electrical-dial-ring" />
      <circle cx="140" cy="119" r="7" className="electrical-dial-hub" />
      {positions.map((position, index) => {
        const selected =
          position.marker === marker ||
          (marker === "ZI Hi Current" && position.detail === "Hi Current");
        return (
          <g
            key={index}
            className={
              selected ? "electrical-dial-selected" : "electrical-dial-label"
            }
          >
            {selected && (
              <line
                x1="140"
                y1="119"
                x2={position.tipX}
                y2={position.tipY}
                className="electrical-dial-pointer"
              />
            )}
            <circle
              cx={position.tipX}
              cy={position.tipY}
              r={selected ? 4 : 2}
            />
            <text
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {position.marker}
            </text>
            {position.detail && (
              <text
                x={position.x}
                y={position.y + 16}
                className="electrical-dial-detail"
                textAnchor="middle"
              >
                {position.detail}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function ElectricalMeterHelp({
  meter,
  type,
  locale,
}: {
  meter: ElectricalMeter;
  type: MeasurementType;
  locale: "fi" | "en";
}) {
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const guide = electricalMeterGuide(meter, type);
  if (!guide)
    return (
      <p className="caption secondary">
        {isSupportedElectricalMeter(meter)
          ? l(
              "Tälle mittaustyypille ei ole tarkistettua mittariohjetta. Noudata valmistajan käyttöohjetta.",
              "No verified guide for this measurement type. Follow the manufacturer's manual.",
            )
          : l(
              "Valitse mittarimalli nähdäksesi mittarikohtaisen ohjeen",
              "Select a meter model to see model-specific guidance",
            )}
      </p>
    );
  return (
    <div className="electrical-meter-help">
      <p>
        {l("Mittarin toiminto", "Meter function")}:{" "}
        <strong className="mono">{guide.marker}</strong>
      </p>
      <details>
        <summary>{l("Näytä ohje", "Show guidance")}</summary>
        <figure className="electrical-function-figure">
          <MeterSelectorDiagram marker={guide.marker} locale={locale} />
          <figcaption className="caption">
            {l(
              "Yksinkertaistettu valitsin: valitse mittarista korostettu merkintä.",
              "Simplified selector: choose the highlighted marking on your meter.",
            )}{" "}
            {guide.marker === "ZI" &&
              l(
                "Valitse kohteeseen sopiva ZI-tila.",
                "Choose the ZI mode appropriate to the circuit.",
              )}{" "}
            <a
              href={`${flukeManualUrl}#page=11`}
              target="_blank"
              rel="noreferrer"
            >
              {l("Valmistajan kuva, s. 7", "Manufacturer diagram, p. 7")}
            </a>
          </figcaption>
        </figure>
        <ul>
          {guide.steps.map((step) => (
            <li key={step.en}>{step[locale]}</li>
          ))}
        </ul>
        <p className="caption">
          {l(
            "Ammattilaisen muistilista. Noudata käyttöohjetta ja kohteen mittaussuunnitelmaa.",
            "Professional reminder. Follow the manual and the site's test plan.",
          )}
        </p>
        <a
          href={`${flukeManualUrl}#page=${guide.pdfPage}`}
          target="_blank"
          rel="noreferrer"
        >
          Fluke {meter.model} · {l("Käyttöohje", "User manual")} Rev. 3
          (12/2024), {l("s.", "pp.")} {guide.pages}
        </a>
      </details>
    </div>
  );
}
