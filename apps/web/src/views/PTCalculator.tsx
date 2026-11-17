import { useEffect, useState } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import { calculatePT } from "../../../../packages/core/src/tool-calculations";
import {
  convertPressure,
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
import { PhaseSwitch } from "../components/PhaseSwitch";
import { PressureReferenceSwitch } from "../components/PressureReferenceSwitch";
import { SignedDecimalInput } from "../components/SignedDecimalInput";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import {
  calculatePTView,
  formatPTReading,
  convertPTTemperature,
  resolvePTSide,
  type PTAnchor,
} from "./pt-state";
import "./calculator.css";
import "./pt-result.css";

type Anchor = PTAnchor;
const units = ["bar", "kPa", "MPa", "psi"] as const;
export function PTCalculator({ initial }: { initial?: Refrigerant }) {
  const { t, data, setDraftDirty } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const [id, setId] = useState(initial?.id ?? "");
  const [anchor, setAnchor] = useState<Anchor>({
    kind: "pressure",
    value: "",
    unit: "bar(a)",
  });
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("bar(a)");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [side, setSide] = useState<"dew" | "bubble">("dew");
  const [atmosphere, setAtmosphere] = useState("1.01325");
  const [unitError, setUnitError] = useState(false);
  const r = byId.get(id);
  const effectiveSide = resolvePTSide(id, r?.kind === "pure", side);
  const enteredSide =
    anchor.kind === "temperature"
      ? resolvePTSide(id, r?.kind === "pure", anchor.side)
      : undefined;
  const enteredValue = anchor.value;
  const enteredUnit =
    anchor.kind === "pressure" ? anchor.unit : `°${anchor.unit}`;
  const available = getPTAvailability(id, effectiveSide);
  const formatLimit = (value: number) =>
    new Intl.NumberFormat(data.locale === "fi" ? "fi-FI" : "en-GB", {
      maximumSignificantDigits: 5,
    }).format(value);
  const temperatureRange = available.supported
    ? [available.minimumTemperatureC!, available.maximumTemperatureC!]
        .map((value) =>
          formatLimit(
            tempUnit === "F" ? (Number(value) * 9) / 5 + 32 : Number(value),
          ),
        )
        .join("…") + ` °${tempUnit}`
    : "";
  let pressureRange = "";
  if (available.supported) {
    try {
      pressureRange =
        [
          available.minimumPressureBarAbsolute!,
          available.maximumPressureBarAbsolute!,
        ]
          .map((value) =>
            formatLimit(
              Number(
                convertPressure({ value, unit: "bar(a)" }, pressureUnit, {
                  value: atmosphere,
                  unit: "bar(a)",
                }),
              ),
            ),
          )
          .join("…") + ` ${pressureUnit}`;
    } catch {
      // The calculation below reports an invalid atmospheric reference.
    }
  }
  useEffect(() => () => setDraftDirty(false), [setDraftDirty]);

  let view: ReturnType<typeof calculatePTView> | undefined;
  let result: ReturnType<typeof calculatePT> | undefined;
  let error = "";
  const unfinished = /^[+-]?$|^[+-]?[.,]$/.test(anchor.value.trim());
  if (r && available.supported && !unfinished) {
    try {
      view = calculatePTView({
        refrigerantId: id,
        pure: r.kind === "pure",
        anchor,
        side,
        pressureUnit,
        temperatureUnit: tempUnit,
        atmosphere,
      });
      result = view.result;
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      error =
        code === "pt_out_of_range"
          ? l(
              `Arvo on laskenta-aineiston ulkopuolella. Valitun lämpötilapisteen tuettu alue on noin ${temperatureRange}${pressureRange ? ` / ${pressureRange}` : ""}. Tämä ei ole laitteen käyttöraja.`,
              `Value is outside the calculation data. The supported range for the selected phase boundary is approximately ${temperatureRange}${pressureRange ? ` / ${pressureRange}` : ""}. This is not an equipment operating limit.`,
            )
          : code === "pt_unsupported_refrigerant_or_side"
            ? l(
                "Syötetyn lämpötilapisteen P–T-aineisto puuttuu. Syötetty arvo säilyy, mutta vastinarvoa ei lasketa.",
                "P–T data is unavailable for the entered temperature boundary. Your input is retained, but no counterpart is calculated.",
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
  const isTemperatureConverted =
    anchor.kind === "temperature" && enteredSide !== effectiveSide;
  const pressureIsEntered = anchor.kind === "pressure";
  const temperatureIsEntered =
    anchor.kind === "temperature" && !isTemperatureConverted;
  const referenceName = (unit: PressureUnit) =>
    unit.endsWith("(a)")
      ? l("Absoluuttinen paine", "Absolute pressure")
      : l("Mittaripaine", "Gauge pressure");
  const boundaryName = (boundary: "dew" | "bubble") =>
    r?.kind === "pure"
      ? l("Kyllästyslämpötila", "Saturation temperature")
      : boundary === "dew"
        ? l("Kastepiste", "Dew point")
        : l("Kuplapiste", "Bubble point");
  const fieldStatus = (entered: boolean) => {
    if (entered && anchor.value.trim()) return l("Syötetty", "Entered");
    return result ? l("Laskettu", "Calculated") : "";
  };
  const displayNumber = (value: string) =>
    data.locale === "fi" ? value.replace(".", ",") : value.replace(",", ".");
  const temperatureResult = pressureIsEntered || isTemperatureConverted;
  let pressure = result
    ? formatPTReading(result.pressure.value, "pressure")
    : "";
  if (anchor.kind === "pressure") {
    try {
      pressure =
        anchor.unit === pressureUnit
          ? anchor.value
          : convertPressure(
              { value: anchor.value, unit: anchor.unit },
              pressureUnit,
              { value: atmosphere, unit: "bar(a)" },
            );
    } catch {
      pressure = anchor.unit === pressureUnit ? anchor.value : "";
    }
  }
  let temperature = result
    ? formatPTReading(result.temperature.value, "temperature")
    : "";
  if (anchor.kind === "temperature" && !isTemperatureConverted) {
    try {
      temperature = convertPTTemperature(anchor.value, anchor.unit, tempUnit);
    } catch {
      temperature = anchor.unit === tempUnit ? anchor.value : "";
    }
  }
  function edit(kind: Anchor["kind"], value: string) {
    setAnchor(
      kind === "pressure"
        ? { kind, value, unit: pressureUnit }
        : { kind, value, unit: tempUnit, side: effectiveSide },
    );
    setUnitError(false);
    setDraftDirty(Boolean(value));
  }
  function changePressureUnit(next: PressureUnit) {
    if (anchor.kind === "pressure" && anchor.value.trim()) {
      try {
        convertPressure({ value: anchor.value, unit: anchor.unit }, next, {
          value: atmosphere,
          unit: "bar(a)",
        });
      } catch {
        setUnitError(true);
        return;
      }
    }
    setUnitError(false);
    setPressureUnit(next);
  }
  function changeTemperatureUnit(next: "C" | "F") {
    if (anchor.kind === "temperature" && anchor.value.trim()) {
      try {
        convertPTTemperature(anchor.value, anchor.unit, next);
      } catch {
        setUnitError(true);
        return;
      }
    }
    setUnitError(false);
    setTempUnit(next);
  }
  const row = (
    fi: string,
    en: string,
    value: string,
    unit?: string,
  ): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
  const report: ReportContent | undefined =
    result && view && r && !unitError && !error
      ? {
          tool: "pt",
          title: `${r.designation} · P–T`,
          dataVersion: dataset.version,
          inputs: [
            row("Kylmäaine", "Refrigerant", `${r.designation} (${r.id})`),
            row("Syötetty suure", "Entered quantity", anchor.kind),
            row("Syötetty arvo", "Entered value", enteredValue, enteredUnit),
            ...(enteredSide
              ? [
                  row(
                    "Syötetty lämpötilapiste",
                    "Entered phase boundary",
                    enteredSide,
                  ),
                ]
              : []),
            row("Faasiraja", "Phase boundary", effectiveSide),
            row(
              "Paineyksikkö ja viite",
              "Pressure unit and reference",
              pressureUnit,
            ),
            ...(pressureUnit.endsWith("(g)") ||
            (anchor.kind === "pressure" && anchor.unit.endsWith("(g)"))
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
              view.pressureBarAbsolute,
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
    <div className="pt-calculator">
      <Back to="/tools" />
      <header className="pt-header">
        <h1 className="long-heading">{t("pt")}</h1>
        <RefrigerantPicker
          value={id}
          onChange={(next) => {
            setId(next);
            setUnitError(false);
          }}
        />
        {!anchor.value.trim() && (
          <p className="secondary pt-instruction">
            {l(
              "Muuta painetta tai lämpötilaa.",
              "Edit pressure or temperature.",
            )}
          </p>
        )}
      </header>
      {r?.kind === "blend" && (
        <div className="help-heading pt-phase-switch">
          <PhaseSwitch
            side={effectiveSide}
            label={l("Höyry / Neste", "Vapour / Liquid")}
            onChange={setSide}
          />
          <InfoHelp label={l("Faasiraja", "Phase boundary")}>
            {l(
              "Kastepisteessä höyry on kylläistä. Kuplapisteessä neste on kylläistä. Seoksilla lämpötilat voivat erota samalla paineella. Käytä kastepistettä tulistukseen ja kuplapistettä alijäähdytykseen.",
              "At the dew point, vapour is saturated. At the bubble point, liquid is saturated. Blends can have different temperatures at the same pressure. Use dew for superheat and bubble for subcooling.",
            )}
          </InfoHelp>
        </div>
      )}
      <div
        className="pt-pair"
        role="group"
        aria-label={l("Paine ja lämpötila", "Pressure and temperature")}
      >
        <div
          className={`pt-value-field ${pressureIsEntered ? "is-input" : "is-calculated"}`}
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
                <option key={unit} value={unit}>
                  {unit}({pressureUnit.endsWith("(a)") ? "a" : "g"})
                </option>
              ))}
            </select>
          </div>
          <SignedDecimalInput
            id="pt-pressure"
            className="mono"
            signed={pressureUnit.endsWith("(g)")}
            value={pressureIsEntered ? pressure : displayNumber(pressure)}
            onValueChange={(value) => edit("pressure", value)}
            aria-describedby="pt-feedback pt-pressure-status"
            aria-invalid={
              (anchor.kind === "pressure" && Boolean(error)) || undefined
            }
          />
          <span id="pt-pressure-status" className="pt-field-status">
            {isTemperatureConverted && result
              ? l("Sama paine", "Same pressure")
              : fieldStatus(pressureIsEntered)}
          </span>
        </div>
        <ArrowLeftRight className="pt-relation" size={20} aria-hidden="true" />
        <div
          className={`pt-value-field ${temperatureIsEntered ? "is-input" : "is-calculated"}`}
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
          <SignedDecimalInput
            id="pt-temperature"
            className="mono"
            value={
              temperatureIsEntered ? temperature : displayNumber(temperature)
            }
            onValueChange={(value) => edit("temperature", value)}
            aria-describedby="pt-feedback pt-temperature-status"
            aria-invalid={
              (anchor.kind === "temperature" && Boolean(error)) || undefined
            }
          />
          <span id="pt-temperature-status" className="pt-field-status">
            {fieldStatus(temperatureIsEntered)}
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
              "Syötettä ei voitu muuntaa. Tarkista arvo ennen yksikön vaihtamista.",
              "The value could not be converted. Check it before changing units.",
            )}
          </p>
        )}
        {!result &&
          r &&
          anchor.kind === "temperature" &&
          enteredSide &&
          isTemperatureConverted && (
            <p className="pt-source-note">
              {l("Syötetty", "Entered")}{" "}
              {enteredSide === "dew"
                ? l("kastepiste", "dew point")
                : l("kuplapiste", "bubble point")}{" "}
              <strong className="mono">
                {enteredValue} {enteredUnit}
              </strong>
            </p>
          )}
      </div>
      <div aria-live="polite" aria-atomic="true">
        {result && r && !unitError && !error && (
          <section className="pt-reading" aria-labelledby="pt-result-title">
            <h2 id="pt-result-title">
              {temperatureResult
                ? boundaryName(effectiveSide)
                : referenceName(pressureUnit)}
            </h2>
            <p className="pt-reading-value">
              <span className="mono">
                {displayNumber(temperatureResult ? temperature : pressure)}
              </span>{" "}
              <span className="pt-reading-unit">
                {temperatureResult ? `°${tempUnit}` : pressureUnit}
              </span>
            </p>
            <p className="pt-source-note">
              {anchor.kind === "pressure"
                ? referenceName(anchor.unit)
                : isTemperatureConverted
                  ? enteredSide === "dew"
                    ? l("Syötetty kastepiste", "Entered dew point")
                    : l("Syötetty kuplapiste", "Entered bubble point")
                  : boundaryName(effectiveSide)}{" "}
              {displayNumber(enteredValue)} {enteredUnit}
            </p>
          </section>
        )}
      </div>
      <PressureReferenceSwitch
        unit={pressureUnit}
        onChange={changePressureUnit}
      />
      {pressureUnit.endsWith("(g)") && (
        <details className="pt-atmosphere">
          <summary>
            {l("Ilmanpaine", "Atmospheric pressure")}{" "}
            {displayNumber(atmosphere)} bar(a)
          </summary>
          <div className="field-group">
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
        </details>
      )}
      {report && <ReportSave key={JSON.stringify(report)} content={report} />}
      {r && available.supported && (
        <details className="calculation-details">
          <summary>
            {l("Tietojen tausta ja käyttöalue", "Data provenance and range")}
          </summary>
          <h3>{l("Laskentamalli", "Calculation model")}</h3>
          <p>
            {l(
              "CoolProp 7.2.0 -malliin perustuva offline-interpolointi neste–höyry-tasapainolle. Ei mittaustulos; kriittisen pisteen lähialue on rajattu pois.",
              "Offline interpolation of the CoolProp 7.2.0 liquid–vapour equilibrium model. Not a measurement; the near-critical region is excluded.",
            )}
          </p>
          <h3>{l("Käyttöalue", "Supported range")}</h3>
          <p className="mono">
            {l(
              "Tuettu lämpötila-alue, noin",
              "Supported temperature range, approximately",
            )}{" "}
            {temperatureRange}
            <br />
            {formatLimit(Number(available.minimumPressureBarAbsolute))}…
            {formatLimit(Number(available.maximumPressureBarAbsolute))} bar(a)
          </p>
          <p className="caption">
            {l(
              "Interpoloinnin hyväksymisrajat suhteessa lähdemalliin: 0,1 °C ja 0,3 % paineesta. Mallin ja mittauksen epävarmuudet tulevat lisäksi.",
              "Interpolation acceptance against the source model: 0.1 °C and 0.3% pressure. Model and measurement uncertainty are additional.",
            )}
          </p>
          <p className="caption mono">
            {l("P–T-aineiston versio", "P–T dataset version")}:{" "}
            {offlinePTProvider.metadata.dataVersion}
          </p>
          <h3>{l("Lähteet", "Sources")}</h3>
          <SourceNote
            ids={offlinePTProvider.metadata.sourceIds}
            disclosure={false}
          />
        </details>
      )}
    </div>
  );
}
