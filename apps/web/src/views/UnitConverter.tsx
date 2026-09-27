import { useDraftGuard } from "../useDraftGuard";
import { useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import {
  convertUnits,
  conversionGroups,
  type ConversionGroup,
  type PressureReference,
} from "../../../../packages/core/src/conversions";
import { useApp } from "../context";
import { ReportSave, type ReportContent } from "../components/ReportSave";
import type { ReportRow } from "../storage";
import { Back } from "../components/Common";
import "./unit-converter.css";
const labels: Record<ConversionGroup, [string, string]> = {
  pressure: ["Paine", "Pressure"],
  temperature: ["Lämpötila", "Temperature"],
  temperature_difference: ["Lämpötilaero", "Temperature difference"],
  mass: ["Massa", "Mass"],
  energy: ["Energia", "Energy"],
  power: ["Teho", "Power"],
  vacuum: ["Tyhjiö · absoluuttinen paine", "Vacuum · absolute pressure"],
  length: ["Pituus", "Length"],
  volume: ["Tilavuus", "Volume"],
  volume_flow: ["Tilavuusvirta", "Volume flow"],
};
export function UnitConverter() {
  const setDraftDirty = useDraftGuard();
  const { data } = useApp();
  const fi = data.locale === "fi";
  const l = (a: string, b: string) => (fi ? a : b);
  const [group, setGroup] = useState<ConversionGroup>("pressure");
  const [from, setFrom] = useState("bar");
  const [to, setTo] = useState("kPa");
  const [value, setValue] = useState("");
  const [fromReference, setFromReference] =
    useState<PressureReference>("absolute");
  const [toReference, setToReference] = useState<PressureReference>("absolute");
  const [atmosphere, setAtmosphere] = useState("1.01325");
  let result: string | null = null,
    error = "";
  if (value.trim())
    try {
      result = convertUnits({
        group,
        value,
        from,
        to,
        fromReference,
        toReference,
        atmosphereBar: atmosphere,
      });
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      error =
        code === "below_absolute_zero"
          ? l(
              "Lämpötila on absoluuttisen nollapisteen alapuolella.",
              "Temperature is below absolute zero.",
            )
          : code === "negative_absolute_pressure"
            ? l(
                "Absoluuttinen paine ei voi olla negatiivinen. Tarkista paineviite.",
                "Absolute pressure cannot be negative. Check the pressure reference.",
              )
            : l(
                "Tarkista arvot. Käytä desimaalipilkkua tai -pistettä. Ilmanpaineen on oltava positiivinen.",
                "Check the values. Use a decimal comma or point. Atmospheric pressure must be positive.",
              );
    }
  const row = (
    fi: string,
    en: string,
    value: string,
    unit?: string,
  ): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
  const report: ReportContent | undefined =
    result !== null
      ? {
          tool: "convert",
          title: `${labels[group][fi ? 0 : 1]} · ${value} ${from} → ${result} ${to}`,
          dataVersion: "unit-conversions-v2",
          inputs: [
            row(
              "Suure",
              "Quantity",
              `${labels[group][0]} / ${labels[group][1]}`,
            ),
            row("Syötetty arvo", "Entered value", value, from),
            row("Kohdeyksikkö", "To unit", to),
            ...(group === "pressure"
              ? [
                  row(
                    "Lähtöpaineen viite",
                    "From pressure reference",
                    fromReference,
                  ),
                  row(
                    "Kohdepaineen viite",
                    "To pressure reference",
                    toReference,
                  ),
                  ...(fromReference === "gauge" || toReference === "gauge"
                    ? [
                        row(
                          "Ilmanpaineviite",
                          "Atmospheric reference",
                          atmosphere,
                          "bar(a)",
                        ),
                      ]
                    : []),
                ]
              : []),
          ],
          outputs: [row("Tulos", "Result", result, to)],
          sources: [
            {
              id: "nist-sp811-unit-conversions",
              title: "NIST SP 811 · Appendix B.9 conversion factors",
              url: "https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9",
              version: "SP 811 (2008)",
              checkedAt: "2026-09-26",
              license:
                "Source terms apply; conversion constants are factual data.",
            },
          ],
        }
      : undefined;
  const format = (entry: string) =>
    new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
      maximumSignificantDigits: 12,
    }).format(Number(entry));
  return (
    <>
      <Back to="/tools" />
      <h1>{l("Yksikkömuunnin", "Unit converter")}</h1>
      <div
        className="unit-converter"
        onChangeCapture={() => setDraftDirty(true)}
      >
        <label>
          {l("Suure", "Quantity")}
          <select
            value={group}
            onChange={(e) => {
              const next = e.target.value as ConversionGroup;
              setGroup(next);
              const defaults: Partial<
                Record<ConversionGroup, [string, string]>
              > = {
                power: ["Btu_IT/h", "kW"],
                vacuum: ["µmHg", "Pa"],
                length: ["in", "mm"],
                pressure: ["psi", "bar"],
                volume_flow: ["L/min", "m³/h"],
              };
              const pair = defaults[next] ?? [
                conversionGroups[next][0],
                conversionGroups[next][1],
              ];
              setFrom(pair[0]);
              setTo(pair[1]);
              setValue("");
            }}
          >
            {Object.entries(labels).map(([key, label]) => (
              <option value={key} key={key}>
                {label[fi ? 0 : 1]}
              </option>
            ))}
          </select>
        </label>
        <p className="caption secondary">
          {l(
            "Esimerkiksi psi → bar, BTU/h → kW, tyhjiömittarin mikronit → Pa tai tuumat → mm.",
            "For example psi → bar, BTU/h → kW, vacuum microns → Pa or inches → mm.",
          )}
        </p>
        {group === "power" && (
          <p className="caption secondary">
            {l(
              "Btu_IT/h käyttää kansainvälisen taulukon BTU:ta. TR tarkoittaa yhdysvaltalaista kylmätonnia (12 000 Btu_IT/h), ei massaa.",
              "Btu_IT/h uses the International Table BTU. TR means a US refrigeration ton (12,000 Btu_IT/h), not mass.",
            )}
          </p>
        )}
        {group === "vacuum" && (
          <p className="caption secondary">
            {l(
              "Tyhjiömittarin mikroni (µmHg) on paineyksikkö. Kaikki tämän ryhmän arvot ovat absoluuttisia; ilmanpainetta ei lisätä.",
              "A vacuum micron (µmHg) is a pressure unit. All values in this group are absolute; atmospheric pressure is not added.",
            )}
          </p>
        )}
        {group === "length" && (
          <p className="caption secondary">
            {l(
              "Pituusmuunnos ei muuta putken nimelliskokoa todelliseksi sisä- tai ulkohalkaisijaksi.",
              "Length conversion does not convert nominal pipe sizes into actual internal or external diameters.",
            )}
          </p>
        )}
        <div className="unit-converter-pair">
          <label>
            {l("Lähtöyksikkö", "From unit")}
            <select value={from} onChange={(e) => setFrom(e.target.value)}>
              {conversionGroups[group].map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="unit-converter-swap"
            aria-label={l("Vaihda yksiköt keskenään", "Swap units")}
            onClick={() => {
              setFrom(to);
              setTo(from);
              setFromReference(toReference);
              setToReference(fromReference);
              if (result !== null) setValue(result);
            }}
          >
            <ArrowLeftRight aria-hidden="true" />
          </button>
          <label>
            {l("Kohdeyksikkö", "To unit")}
            <select value={to} onChange={(e) => setTo(e.target.value)}>
              {conversionGroups[group].map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
        </div>
        {group === "pressure" && (
          <>
            <div className="unit-converter-references">
              {(
                [
                  ["from", fromReference, setFromReference],
                  ["to", toReference, setToReference],
                ] as const
              ).map(([side, ref, set]) => (
                <label key={side}>
                  {side === "from"
                    ? l("Lähtöpaine", "From pressure")
                    : l("Kohdepaine", "To pressure")}
                  <select
                    value={ref}
                    onChange={(e) => set(e.target.value as PressureReference)}
                  >
                    <option value="absolute">
                      {l("Absoluuttinen", "Absolute")}
                    </option>
                    <option value="gauge">{l("Mittaripaine", "Gauge")}</option>
                  </select>
                </label>
              ))}
            </div>
            {(fromReference === "gauge" || toReference === "gauge") && (
              <label>
                {l("Ilmanpaine · bar(a)", "Atmospheric pressure · bar(a)")}
                <input
                  value={atmosphere}
                  inputMode="decimal"
                  autoComplete="off"
                  onChange={(e) => setAtmosphere(e.target.value)}
                />
                <span className="caption secondary">
                  {l(
                    "Oletus 1,01325 bar(a) on standardi-ilmakehä. Voit syöttää paikallisen mitatun ilmanpaineen.",
                    "The default 1.01325 bar(a) is the standard atmosphere. You can enter the measured local atmospheric pressure.",
                  )}
                </span>
              </label>
            )}
          </>
        )}
        {group === "temperature_difference" && (
          <p className="caption secondary">
            {l(
              "Lämpötilaerossa ei käytetä nollapisteen siirtoa. 1 K = 1 °C:n ero. Etumerkki säilyy.",
              "Temperature differences use no zero-point offset. 1 K = a difference of 1 °C. The sign is preserved.",
            )}
          </p>
        )}
        <label>
          {l("Arvo", "Value")} · {from}
          <input
            inputMode="text"
            autoComplete="off"
            className="mono"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "conversion-error" : undefined}
          />
        </label>
        <div aria-live="polite">
          {error && (
            <p id="conversion-error" className="notice error">
              {error}
            </p>
          )}
          {result !== null && (
            <section className="result-card info">
              <h2>{l("Tulos", "Result")}</h2>
              <output className="calculator-number mono">
                {format(result)} {to}
                {group === "pressure"
                  ? toReference === "absolute"
                    ? " (a)"
                    : " (g)"
                  : ""}
              </output>
            </section>
          )}
        </div>
        {report && <ReportSave key={JSON.stringify(report)} content={report} />}
        <details>
          <summary>{l("Muunnosten perusteet", "Conversion basis")}</summary>
          <p>
            {l(
              "Yksikkömuunnokset toimivat ilman verkkoyhteyttä. Energiaa ja tehoa ei muunneta keskenään ilman aikaa; tilavuusvirta on erotettu tilavuudesta.",
              "Conversions work offline. Energy and power cannot be converted into each other without a time interval; volume flow is separate from volume.",
            )}
          </p>
          <a
            href="https://www.nist.gov/pml/special-publication-811/nist-guide-si-appendix-b-conversion-factors/nist-guide-si-appendix-b9"
            target="_blank"
            rel="noreferrer"
          >
            NIST SP 811 · {l("muunnoskertoimet", "conversion factors")}
          </a>
        </details>
      </div>
    </>
  );
}
