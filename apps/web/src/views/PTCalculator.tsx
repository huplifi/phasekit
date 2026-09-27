import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import { calculatePT } from "../../../../packages/core/src/tool-calculations";
import {
  convertPressure,
  parseDecimal,
  type PressureUnit,
} from "../../../../packages/core/src/units";
import {
  getPTAvailability,
  offlinePTProvider,
} from "../../../../packages/core/src/pt";
import { useApp } from "../context";
import { byId, dataset } from "../data";
import { ReportSave, type ReportContent } from "../components/ReportSave";
import type { ReportRow } from "../storage";
import { Back, SourceNote } from "../components/Common";
import { InfoHelp } from "../components/InfoHelp";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import "./calculator.css";
import "./pt-result.css";

type Anchor = { kind: "pressure" | "temperature"; value: string };
const units = ["bar", "kPa", "MPa", "psi"] as const;
const editableNumber = (value: string, temperature = false) =>
  temperature
    ? parseDecimal(value).toDecimalPlaces(1).toFixed(1)
    : parseDecimal(value).toSignificantDigits(3).toFixed();

export function PTCalculator({ initial }: { initial?: Refrigerant }) {
  const { t, data, setDraftDirty } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const [id, setId] = useState(initial?.id ?? "");
  const [anchor, setAnchor] = useState<Anchor>({ kind: "pressure", value: "" });
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("bar(a)");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [side, setSide] = useState<"dew" | "bubble">("dew");
  const [atmosphere, setAtmosphere] = useState("1.01325");
  const [unitError, setUnitError] = useState(false);
  const r = byId.get(id);
  const effectiveSide =
    r?.kind === "pure"
      ? getPTAvailability(id, "dew").supported
        ? "dew"
        : "bubble"
      : side;
  const available = getPTAvailability(id, effectiveSide);
  useEffect(() => () => setDraftDirty(false), [setDraftDirty]);

  let result: ReturnType<typeof calculatePT> | undefined;
  let error = "";
  const unfinished = /^[+-]?$|^[+-]?[.,]$/.test(anchor.value.trim());
  if (r && available.supported && !unfinished) {
    try {
      result = calculatePT(
        anchor.kind === "pressure"
          ? {
              refrigerantId: id,
              side: effectiveSide,
              direction: "temperature_at_pressure",
              pressure: { value: anchor.value, unit: pressureUnit },
              outputTemperatureUnit: tempUnit,
              atmosphere: { value: atmosphere, unit: "bar(a)" },
            }
          : {
              refrigerantId: id,
              side: effectiveSide,
              direction: "pressure_at_temperature",
              temperature: { value: anchor.value, unit: tempUnit },
              outputPressureUnit: pressureUnit,
              atmosphere: { value: atmosphere, unit: "bar(a)" },
            },
      );
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      error =
        code === "pt_out_of_range"
          ? l(
              "Arvo on aineiston käyttöalueen ulkopuolella.",
              "Value is outside the available data range.",
            )
          : code === "negative_absolute_pressure" ||
              code === "nonpositive_absolute_pressure"
            ? l(
                "Absoluuttisen paineen on oltava nollaa suurempi.",
                "Absolute pressure must be positive.",
              )
            : code === "invalid_atmospheric_reference"
              ? l(
                  "Ilmanpaineen on oltava nollaa suurempi.",
                  "Atmospheric pressure must be positive.",
                )
              : l(
                  "Tarkista luku. Käytä desimaalipilkkua tai -pistettä.",
                  "Check the number. Use a decimal comma or point.",
                );
    }
  }
  const pressure =
    anchor.kind === "pressure"
      ? anchor.value
      : result
        ? editableNumber(result.pressure.value)
        : "";
  const temperature =
    anchor.kind === "temperature"
      ? anchor.value
      : result
        ? editableNumber(result.temperature.value, true)
        : "";
  function edit(kind: Anchor["kind"], value: string) {
    setAnchor({ kind, value });
    setUnitError(false);
    setDraftDirty(Boolean(value));
  }
  function changePressureUnit(next: PressureUnit) {
    if (anchor.kind === "pressure" && anchor.value.trim()) {
      try {
        setAnchor({
          kind: "pressure",
          value: convertPressure(
            { value: anchor.value, unit: pressureUnit },
            next,
            { value: atmosphere, unit: "bar(a)" },
          ),
        });
        setUnitError(false);
      } catch {
        setAnchor({ kind: "pressure", value: "" });
        setUnitError(true);
      }
    }
    setPressureUnit(next);
  }
  function changeTemperatureUnit(next: "C" | "F") {
    if (
      anchor.kind === "temperature" &&
      anchor.value.trim() &&
      next !== tempUnit
    ) {
      try {
        const value = parseDecimal(anchor.value);
        setAnchor({
          kind: "temperature",
          value: (next === "F"
            ? value.mul(9).div(5).plus(32)
            : value.minus(32).mul(5).div(9)
          )
            .toSignificantDigits(12)
            .toFixed(),
        });
        setUnitError(false);
      } catch {
        setAnchor({ kind: "temperature", value: "" });
        setUnitError(true);
      }
    }
    setTempUnit(next);
  }
  const row = (
    fi: string,
    en: string,
    value: string,
    unit?: string,
  ): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
  const report: ReportContent | undefined =
    result && r && !unitError && !error
      ? {
          tool: "pt",
          title: `${r.designation} · P–T`,
          dataVersion: dataset.version,
          inputs: [
            row("Kylmäaine", "Refrigerant", `${r.designation} (${r.id})`),
            row("Syötetty suure", "Entered quantity", anchor.kind),
            row(
              "Syötetty arvo",
              "Entered value",
              anchor.value,
              anchor.kind === "pressure" ? pressureUnit : `°${tempUnit}`,
            ),
            row("Faasiraja", "Phase boundary", effectiveSide),
            row(
              "Paineyksikkö ja viite",
              "Pressure unit and reference",
              pressureUnit,
            ),
            ...(pressureUnit.endsWith("(g)")
              ? [
                  row(
                    "Ilmanpaineviite",
                    "Atmospheric reference",
                    atmosphere,
                    "bar(a)",
                  ),
                ]
              : []),
          ],
          outputs: [
            row(
              "Paine",
              "Pressure",
              result.pressure.value,
              result.pressure.unit,
            ),
            row(
              "Lämpötila",
              "Temperature",
              result.temperature.value,
              `°${result.temperature.unit}`,
            ),
            row(
              "Absoluuttinen paine",
              "Absolute pressure",
              result.saturation.pressureBarAbsolute,
              "bar(a)",
            ),
            row(
              "P–T-aineistoversio",
              "P–T dataset version",
              result.saturation.provider.dataVersion,
            ),
          ],
          sources: dataset.sources.filter((source) =>
            new Set([
              ...r.sourceIds,
              ...result.saturation.provider.sourceIds,
            ]).has(source.id),
          ),
        }
      : undefined;
  return (
    <>
      <Back to="/tools" />
      <h1 className="long-heading">{t("pt")}</h1>
      <RefrigerantPicker
        value={id}
        onChange={(next) => {
          setId(next);
          setUnitError(false);
        }}
      />
      <p className="caption secondary pt-instruction">
        {l(
          "Muuta painetta tai lämpötilaa — toinen arvo päivittyy heti.",
          "Edit pressure or temperature — the other value updates immediately.",
        )}
      </p>
      <div className="pt-pair" role="group" aria-label={t("pt")}>
        <div
          className={`pt-value-field ${anchor.kind === "pressure" ? "is-input" : "is-calculated"}`}
        >
          <div className="pt-field-heading">
            <label htmlFor="pt-pressure">{l("Paine", "Pressure")}</label>
            <select
              aria-label={l("Paineyksikkö", "Pressure unit")}
              value={pressureUnit.split("(")[0]}
              onChange={(e) =>
                changePressureUnit(
                  `${e.target.value}(${pressureUnit.endsWith("(a)") ? "a" : "g"})` as PressureUnit,
                )
              }
            >
              {units.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </div>
          <input
            id="pt-pressure"
            className="mono"
            inputMode={pressureUnit.endsWith("(g)") ? "text" : "decimal"}
            autoComplete="off"
            value={pressure}
            onChange={(e) => edit("pressure", e.target.value)}
            aria-describedby="pt-feedback"
            aria-invalid={
              (anchor.kind === "pressure" && Boolean(error)) || undefined
            }
          />

          <span className="caption secondary">
            {anchor.kind === "pressure"
              ? l("Syötetty", "Entered")
              : l("Laskettu", "Calculated")}
          </span>
        </div>
        <ArrowLeftRight className="pt-relation" size={20} aria-hidden="true" />
        <div
          className={`pt-value-field ${anchor.kind === "temperature" ? "is-input" : "is-calculated"}`}
        >
          <div className="pt-field-heading">
            <label htmlFor="pt-temperature">
              {l("Lämpötila", "Temperature")}
            </label>
            <select
              aria-label={l("Lämpötilayksikkö", "Temperature unit")}
              value={tempUnit}
              onChange={(e) =>
                changeTemperatureUnit(e.target.value as "C" | "F")
              }
            >
              <option value="C">°C</option>
              <option value="F">°F</option>
            </select>
          </div>
          <input
            id="pt-temperature"
            className="mono"
            inputMode="text"
            autoComplete="off"
            value={temperature}
            onChange={(e) => edit("temperature", e.target.value)}
            aria-describedby="pt-feedback"
            aria-invalid={
              (anchor.kind === "temperature" && Boolean(error)) || undefined
            }
          />

          <span className="caption secondary">
            {anchor.kind === "temperature"
              ? l("Syötetty", "Entered")
              : l("Laskettu", "Calculated")}
          </span>
        </div>
      </div>
      <div id="pt-feedback" className="pt-feedback" aria-live="polite">
        {!r && (
          <p className="caption secondary">
            {l(
              "Valitse kylmäaine laskentaa varten.",
              "Select a refrigerant to calculate.",
            )}
          </p>
        )}
        {r && !available.supported && (
          <p className="notice">
            {l(
              "Tälle aineelle ei ole P–T-aineistoa valitulle lämpötilapisteelle. Syötetty arvo säilyy, mutta vastinarvoa ei lasketa.",
              "P–T data is unavailable for this refrigerant and phase boundary. Your input is retained, but no counterpart is calculated.",
            )}
          </p>
        )}
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {unitError && (
          <p className="notice warning">
            {l(
              "Virheellistä syötettä ei voitu muuntaa uuteen yksikköön. Syötä arvo uudelleen.",
              "The invalid input could not be converted to the new unit. Enter a value again.",
            )}
          </p>
        )}
        {result && r && !unitError && !error && (
          <section className="result-card info pt-live-result">
            <p className="result-label">
              {anchor.kind === "pressure"
                ? l("Laskettu lämpötila", "Calculated temperature")
                : l("Laskettu paine", "Calculated pressure")}
            </p>
            <p className="result-number">
              <span className="mono">
                {anchor.kind === "pressure"
                  ? editableNumber(result.temperature.value, true)
                  : editableNumber(result.pressure.value)}
              </span>{" "}
              <span className="pt-result-unit">
                {anchor.kind === "pressure" ? `°${tempUnit}` : pressureUnit}
              </span>
            </p>
            <p className="pt-result-context">
              <span>{r.designation} · </span>
              <span>
                {anchor.kind === "pressure"
                  ? l("Syötetystä paineesta", "Based on entered pressure")
                  : l(
                      "Syötetystä lämpötilasta",
                      "Based on entered temperature",
                    )}
              </span>
              <strong className="mono">
                {anchor.kind === "pressure"
                  ? `${pressure} ${pressureUnit}`
                  : `${temperature} °${tempUnit}`}
              </strong>
            </p>
            {r.kind === "blend" && (
              <p className="caption pt-result-phase">
                {effectiveSide === "dew"
                  ? l("Höyry · kastepiste", "Vapour · dew point")
                  : l("Neste · kuplapiste", "Liquid · bubble point")}
              </p>
            )}
            {pressureUnit.endsWith("(g)") && (
              <p className="caption secondary pt-gauge-reference">
                {l("Ilmanpaineviite", "Atmospheric reference")}: {atmosphere}{" "}
                bar(a)
                {Number(atmosphere.replace(",", ".")) === 1.01325
                  ? l(
                      " · standardi-ilmakehä (oletus)",
                      " · standard atmosphere (assumed)",
                    )
                  : ""}
              </p>
            )}
          </section>
        )}
      </div>
      {r?.kind === "blend" && (
        <div className="field-group">
          <div className="help-heading">
            <label htmlFor="pt-side">
              {l("Lämpötilapiste", "Temperature point")}
            </label>
            <InfoHelp label={l("Lämpötilapiste", "Temperature point")}>
              {l(
                "Kastepiste vastaa kylläistä höyryä, kuplapiste kylläistä nestettä. Seoksilla niiden lämpötilat voivat erota. Tulistuksessa käytetään kastepistettä ja alijäähdytyksessä kuplapistettä.",
                "Dew point describes saturated vapour; bubble point describes saturated liquid. Blends can have different temperatures at these boundaries. Use dew for superheat and bubble for subcooling.",
              )}
            </InfoHelp>
          </div>
          <select
            id="pt-side"
            value={side}
            onChange={(e) => setSide(e.target.value as typeof side)}
          >
            <option value="dew">
              {l("Höyry (kastepiste)", "Vapour (dew point)")}
            </option>
            <option value="bubble">
              {l("Neste (kuplapiste)", "Liquid (bubble point)")}
            </option>
          </select>
        </div>
      )}
      <div className="help-heading pressure-reference-toggle">
        <label className="switch-label">
          <input
            type="checkbox"
            role="switch"
            checked={pressureUnit.endsWith("(a)")}
            onChange={(event) =>
              changePressureUnit(
                `${pressureUnit.split("(")[0]}(${event.target.checked ? "a" : "g"})` as PressureUnit,
              )
            }
          />
          <span>{l("Absoluuttinen paine", "Absolute pressure")}</span>
        </label>
        <InfoHelp label={l("Paineviite", "Pressure reference")}>
          {l(
            "Päällä: absoluuttinen paine, jonka nollakohta on tyhjiö. Pois: mittaripaine suhteessa ilmanpaineeseen. Vaihto muuntaa syötetyn paineen; paikallinen ilmanpaine vaikuttaa muunnokseen.",
            "On: absolute pressure, referenced to vacuum. Off: gauge pressure, relative to atmosphere. Switching converts the entered pressure; local atmospheric pressure affects the conversion.",
          )}
        </InfoHelp>
      </div>
      {pressureUnit.endsWith("(g)") && (
        <div className="field-group pt-atmosphere">
          <label htmlFor="pt-atmosphere">
            {l("Ilmanpaine, bar(a)", "Atmospheric pressure, bar(a)")}
          </label>
          <input
            id="pt-atmosphere"
            className="mono"
            inputMode="decimal"
            value={atmosphere}
            onChange={(e) => setAtmosphere(e.target.value)}
          />
          <p className="caption secondary">
            {l(
              "Oletus 1,01325 bar(a) on standardi-ilmakehä. Muuta tarvittaessa paikalliseen mitattuun paineeseen.",
              "The default 1.01325 bar(a) is standard atmosphere. Adjust to measured local pressure when needed.",
            )}
          </p>
        </div>
      )}
      {report && <ReportSave key={JSON.stringify(report)} content={report} />}
      {r && available.supported && (
        <details className="calculation-details">
          <summary>
            {l("Tietojen tausta ja käyttöalue", "Data provenance and range")}
          </summary>
          <p>
            {l(
              "CoolProp 7.2.0 -malliin perustuva offline-interpolointi neste–höyry-tasapainolle. Ei mittaustulos; kriittisen pisteen lähialue on rajattu pois.",
              "Offline interpolation of the CoolProp 7.2.0 liquid–vapour equilibrium model. Not a measurement; the near-critical region is excluded.",
            )}
          </p>
          <p className="mono">
            {available.minimumTemperatureC}…{available.maximumTemperatureC} °C
            <br />
            {available.minimumPressureBarAbsolute}…
            {available.maximumPressureBarAbsolute} bar(a)
          </p>
          <p className="caption">
            {l(
              "Interpoloinnin hyväksymisrajat suhteessa lähdemalliin: 0,1 °C ja 0,3 % paineesta. Mallin ja mittauksen epävarmuudet tulevat lisäksi.",
              "Interpolation acceptance against the source model: 0.1 °C and 0.3% pressure. Model and measurement uncertainty are additional.",
            )}
          </p>
          <p className="caption mono">
            {offlinePTProvider.metadata.dataVersion}
          </p>
          <SourceNote ids={offlinePTProvider.metadata.sourceIds} />
        </details>
      )}
    </>
  );
}
