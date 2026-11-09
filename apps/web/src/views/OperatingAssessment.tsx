import { useEffect, useId, useMemo, useState } from "react";
import type {
  Fact,
  Refrigerant,
} from "../../../../packages/core/src/contracts";
import type { HighSideKind } from "./CircuitDiagram";
import {
  assessOperation,
  suggestedPortRole,
  type AssessmentField,
  type AssessmentFieldErrorCode,
  type AssessmentMode,
  type AssessmentSystem,
  type CapacityState,
  type EvaporatorStyle,
  type OperatingStability,
  type PortRole,
} from "../../../../packages/core/src/operating-assessment";
import {
  convertPressure,
  type PressureUnit,
} from "../../../../packages/core/src/units";
import { useApp } from "../context";
import { byId } from "../data";
import { Back, SourceNote } from "../components/Common";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import { CircuitDiagram } from "./CircuitDiagram";
import "./operating-assessment.css";

const pressureBases = ["bar", "kPa", "MPa", "psi"] as const;

interface Draft {
  system: AssessmentSystem;
  mode: AssessmentMode;
  pressureUnit: PressureUnit;
  atmosphere: string;
  pressure: string;
  uncertainty: string;
  role: PortRole;
  roleTouched: boolean;
  pipeC: string;
  secondPressure: string;
  secondRole: PortRole;
  secondPipeC: string;
  indoorC: string;
  outdoorC: string;
  processC: string;
  evaporator: EvaporatorStyle;
  stability: OperatingStability;
  capacity: CapacityState;
  model: string;
  oemSuction: string;
  oemHigh: string;
  oemSh: string;
  oemSc: string;
  demo: boolean;
}

const initialDraft = (id?: string): Draft => ({
  system: id === "r744" || id === "r717" ? "industrial" : "air_air",
  mode: "cooling",
  pressureUnit: "bar(g)",
  atmosphere: "1.01325",
  pressure: "",
  uncertainty: "",
  role: id === "r744" || id === "r717" ? "unknown" : "suction",
  roleTouched: false,
  pipeC: "",
  secondPressure: "",
  secondRole: "unknown",
  secondPipeC: "",
  indoorC: "",
  outdoorC: "",
  processC: "",
  evaporator: "unknown",
  stability: "unknown",
  capacity: "unknown",
  model: "",
  oemSuction: "",
  oemHigh: "",
  oemSh: "",
  oemSc: "",
  demo: false,
});

export function OperatingAssessment({ initial }: { initial?: Refrigerant }) {
  const { t, data, setDraftDirty } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const locale = data.locale;
  const [id, setId] = useState(initial?.id ?? "");
  const [draft, setDraft] = useState<Draft>(() => initialDraft(initial?.id));
  const [unitError, setUnitError] = useState(false);
  const refrigerant = id ? byId.get(id) : undefined;
  const showEvaporator = id === "r717" || draft.system === "industrial";
  const mode = draft.system === "dx_cooling" ? "cooling" : draft.mode;

  useEffect(() => {
    setDraftDirty(
      draft.pressure.trim().length > 0 ||
        draft.secondPressure.trim().length > 0,
    );
    return () => setDraftDirty(false);
  }, [draft.pressure, draft.secondPressure, setDraftDirty]);

  function patch(next: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...next }));
  }

  function chooseSystem(system: AssessmentSystem) {
    setDraft((current) => {
      const mode = system === "dx_cooling" ? "cooling" : current.mode;
      const role = current.roleTouched
        ? current.role
        : suggestedPortRole(system, mode);
      return { ...current, system, mode, role };
    });
  }

  function chooseMode(mode: AssessmentMode) {
    setDraft((current) => ({
      ...current,
      mode,
      role: current.roleTouched
        ? current.role
        : suggestedPortRole(current.system, mode),
    }));
  }

  function changeUnit(next: PressureUnit) {
    const reference = { value: draft.atmosphere, unit: "bar(a)" as const };
    try {
      patch({
        pressureUnit: next,
        pressure: convertReading(
          draft.pressure,
          draft.pressureUnit,
          next,
          reference,
        ),
        secondPressure: convertReading(
          draft.secondPressure,
          draft.pressureUnit,
          next,
          reference,
        ),
        uncertainty: scaleUncertainty(
          draft.uncertainty,
          draft.pressureUnit,
          next,
          reference,
        ),
        oemSuction: convertReading(
          draft.oemSuction,
          draft.pressureUnit,
          next,
          reference,
        ),
        oemHigh: convertReading(
          draft.oemHigh,
          draft.pressureUnit,
          next,
          reference,
        ),
      });
      setUnitError(false);
    } catch {
      setUnitError(true);
    }
  }

  const result = useMemo(() => {
    if (!draft.pressure.trim() && !draft.secondPressure.trim())
      return undefined;
    const criticalPressure = verifiedFact(
      refrigerant?.facts.critical_pressure_bar_abs,
    );
    const criticalTemperature = verifiedFact(
      refrigerant?.facts.critical_temp_c,
    );
    return assessOperation({
      ...(id ? { refrigerantId: id } : {}),
      ...(criticalPressure
        ? {
            criticalPressureBarAbsolute: criticalPressure,
            criticalSourceIds:
              refrigerant?.facts.critical_pressure_bar_abs?.sourceIds ?? [],
          }
        : {}),
      ...(criticalTemperature
        ? { criticalTemperatureC: criticalTemperature }
        : {}),
      system: draft.system,
      mode: draft.system === "dx_cooling" ? "cooling" : draft.mode,
      evaporatorStyle: showEvaporator ? draft.evaporator : "unknown",
      ...(draft.pressureUnit.endsWith("(g)")
        ? { atmosphere: { value: draft.atmosphere, unit: "bar(a)" as const } }
        : {}),
      ...(draft.pressure.trim()
        ? {
            primary: {
              value: draft.pressure,
              unit: draft.pressureUnit,
              role: draft.role,
              ...(draft.uncertainty.trim()
                ? { uncertainty: draft.uncertainty }
                : {}),
              ...(draft.pipeC.trim() ? { pipeTemperatureC: draft.pipeC } : {}),
            },
          }
        : {}),
      ...(draft.secondPressure.trim()
        ? {
            secondary: {
              value: draft.secondPressure,
              unit: draft.pressureUnit,
              role: draft.secondRole,
              ...(draft.secondPipeC.trim()
                ? { pipeTemperatureC: draft.secondPipeC }
                : {}),
            },
          }
        : {}),
      ...(draft.indoorC.trim() ? { indoorAirC: draft.indoorC } : {}),
      ...(draft.outdoorC.trim() ? { outdoorAirC: draft.outdoorC } : {}),
      ...(draft.processC.trim() ? { processTemperatureC: draft.processC } : {}),
      stability: draft.stability,
      capacity: draft.capacity,
      ...(draft.model.trim() ? { modelName: draft.model } : {}),
      ...(draft.oemSuction.trim()
        ? { oemSuctionPressure: draft.oemSuction }
        : {}),
      ...(draft.oemHigh.trim() ? { oemHighPressure: draft.oemHigh } : {}),
      ...(draft.oemSh.trim() ? { oemSuperheatK: draft.oemSh } : {}),
      ...(draft.oemSc.trim() ? { oemSubcoolingK: draft.oemSc } : {}),
    });
  }, [draft, id, refrigerant, showEvaporator]);

  const highSide: HighSideKind =
    result?.circuit.highSide ?? (id === "r744" ? "unresolved" : "condenser");
  const labels = circuitCopy(draft, mode, highSide, l);
  const text = (copy: { fi: string; en: string }) => copy[locale];
  const compactReading =
    result?.readings[0]?.regime === "saturated" && Boolean(result.focus);
  const invalid = new Set(result?.fieldErrors.map((error) => error.field));

  const roles = [
    { value: "unknown" as const, label: l("En tiedä", "Not sure") },
    {
      value: "suction" as const,
      label: l("Imu", "Suction"),
    },
    {
      value: "hot_gas" as const,
      label: l("Kuumakaasu", "Hot gas"),
    },
    {
      value: "liquid" as const,
      label: l("Neste", "Liquid"),
    },
  ];
  return (
    <div className="assessment-tool">
      <Back to="/tools" />
      <h1>{t("assessment")}</h1>
      <p className="secondary assessment-intro">
        {l(
          "Syötä tiedot, jotka tiedät. Saat kevyen arvion kylmäpiirin toiminnasta. Voit jättää muut kentät tyhjiksi.",
          "Enter what you know for a light assessment of the refrigeration circuit. Leave other fields blank.",
        )}
      </p>
      <div className="assessment-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={() => applyDemo(id, setId, setDraft)}
        >
          {l("Näytä esimerkki", "Show an example")}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            setDraft(initialDraft(id));
            setUnitError(false);
          }}
        >
          {l("Tyhjennä luvut", "Clear values")}
        </button>
      </div>
      {draft.demo && (
        <p className="notice">
          {l(
            "Esimerkkipohja. Mukana voi olla esimerkkilukuja myös muokkausten jälkeen. Aloita omat mittaukset painamalla Tyhjennä luvut.",
            "Example draft. Sample figures may remain after editing. Use Clear values to start your own measurements.",
          )}
        </p>
      )}
      <div className="assessment-workspace">
        <div className="assessment-inputs">
          <h2>{l("Tiedot ja mittaukset", "Details and measurements")}</h2>
          <RefrigerantPicker
            value={id}
            onChange={(next) => {
              setId(next);
              if (!draft.pressure.trim() && !draft.secondPressure.trim())
                setDraft(initialDraft(next));
            }}
          />
          <div className="assessment-pair">
            <AssessmentSelect
              label={l("Järjestelmä", "System")}
              value={draft.system}
              onChange={chooseSystem}
              options={[
                { value: "air_air", label: l("Ilma–ilma", "Air-to-air") },
                {
                  value: "dx_cooling",
                  label: l("Vain jäähdytys", "Cooling only"),
                },
                { value: "hydronic", label: l("Vesi", "Water") },
                { value: "industrial", label: l("Teollisuus", "Industrial") },
              ]}
            />
            <AssessmentSelect
              label={l("Käyttö", "Mode")}
              value={mode}
              onChange={chooseMode}
              options={[
                { value: "cooling", label: l("Jäähdytys", "Cooling") },
                {
                  value: "heating",
                  label: l("Lämmitys", "Heating"),
                  disabled: draft.system === "dx_cooling",
                },
              ]}
            />
          </div>
          <fieldset className="assessment-measurement">
            <legend>{l("Mittaus 1", "Measurement 1")}</legend>
            <AssessmentSelect
              label={l("Mittauskohta", "Measurement location")}
              value={draft.role}
              options={roles}
              onChange={(role) => patch({ role, roleTouched: true })}
            />
            <p className="caption secondary">
              {l(
                "Tarkista kohta laitteesta. Jos et tiedä, valitse En tiedä.",
                "Check the location on the equipment. If unsure, choose Not sure.",
              )}
            </p>
            <div className="assessment-pair">
              <NumberField
                id="assessment-pressure"
                label={`${l("Paine", "Pressure")}, ${draft.pressureUnit}`}
                value={draft.pressure}
                invalid={invalid.has("primaryPressure")}
                onChange={(pressure) => patch({ pressure })}
              />
              <NumberField
                id="assessment-pipe"
                label={l("Putken lämpötila, °C", "Pipe temperature, °C")}
                value={draft.pipeC}
                invalid={invalid.has("primaryTemperature")}
                onChange={(pipeC) => patch({ pipeC })}
              />
            </div>
            <p className="caption secondary">
              {l(
                "Paine riittää alkuun. Putken lämpötila samasta kohdasta tarkentaa arviota.",
                "Start with pressure. A pipe temperature at the same location adds detail.",
              )}
            </p>
            <details className="assessment-disclosure assessment-pressure-settings">
              <summary>
                {l("Paineen yksikkö ja mittari", "Pressure unit and gauge")}{" "}
                <span className="secondary">{draft.pressureUnit}</span>
              </summary>
              <div className="assessment-pair">
                <AssessmentSelect
                  label={l("Yksikkö", "Unit")}
                  value={draft.pressureUnit.split("(")[0]}
                  options={pressureBases.map((unit) => ({
                    value: unit,
                    label: unit,
                  }))}
                  onChange={(unit) =>
                    changeUnit(
                      `${unit}(${draft.pressureUnit.endsWith("(a)") ? "a" : "g"})` as PressureUnit,
                    )
                  }
                />
                <AssessmentSelect
                  label={l("Paineviite", "Pressure reference")}
                  value={draft.pressureUnit.endsWith("(a)") ? "a" : "g"}
                  options={[
                    { value: "g", label: l("Mittaripaine (g)", "Gauge (g)") },
                    {
                      value: "a",
                      label: l("Absoluuttinen (a)", "Absolute (a)"),
                    },
                  ]}
                  onChange={(reference) =>
                    changeUnit(
                      `${draft.pressureUnit.split("(")[0]}(${reference})` as PressureUnit,
                    )
                  }
                />
              </div>
              <p className="caption secondary">
                {l(
                  "Vaihto muuntaa kirjatut paineet. Sama yksikkö koskee molempia mittauksia ja ohjearvoja.",
                  "Changing this converts entered pressures. The unit applies to both measurements and instruction values.",
                )}
              </p>
              {draft.pressureUnit.endsWith("(g)") && (
                <NumberField
                  id="assessment-atmosphere"
                  label={l(
                    "Ilmanpaine, bar(a)",
                    "Atmospheric pressure, bar(a)",
                  )}
                  value={draft.atmosphere}
                  invalid={invalid.has("atmosphere")}
                  onChange={(atmosphere) => patch({ atmosphere })}
                />
              )}
              <NumberField
                id="assessment-uncertainty"
                label={`${l("Mittauksen 1 epävarmuus ±", "Measurement 1 uncertainty ±")}, ${draft.pressureUnit.split("(")[0]}`}
                value={draft.uncertainty}
                invalid={invalid.has("primaryUncertainty")}
                onChange={(uncertainty) => patch({ uncertainty })}
              />
              <p className="caption secondary">
                {l(
                  "Ilmanpaineen oletus on 1,01325 bar(a). Se lisätään mittaripaineeseen kerran. Epävarmuuden voi jättää tyhjäksi.",
                  "Atmospheric pressure defaults to 1.01325 bar(a), added to gauge pressure once. Uncertainty can be left blank.",
                )}
              </p>
            </details>
            {unitError && (
              <p className="notice warning" role="alert">
                {l(
                  "Yksikön vaihto ei onnistunut. Tarkista paineet ja ilmanpaine.",
                  "Unit conversion failed. Check the pressures and atmospheric reference.",
                )}
              </p>
            )}
          </fieldset>
          <details
            className="assessment-disclosure assessment-second-measurement"
            open={
              draft.demo && Boolean(draft.secondPressure) ? true : undefined
            }
          >
            <summary>
              {l("Toinen mittauskohta", "Second measurement location")}
              <span className="secondary">
                {draft.secondPressure
                  ? `${draft.secondPressure} ${draft.pressureUnit}`
                  : l("Valinnainen", "Optional")}
              </span>
            </summary>
            <AssessmentSelect
              label={l("Toinen mittauskohta", "Second measurement location")}
              value={draft.secondRole}
              options={roles}
              onChange={(secondRole) => patch({ secondRole })}
            />
            <div className="assessment-pair">
              <NumberField
                id="assessment-second"
                label={`${l("Toinen paine", "Second pressure")}, ${draft.pressureUnit}`}
                value={draft.secondPressure}
                invalid={invalid.has("secondaryPressure")}
                onChange={(secondPressure) => patch({ secondPressure })}
              />
              <NumberField
                id="assessment-second-pipe"
                label={l(
                  "Toisen putken lämpötila, °C",
                  "Second pipe temperature, °C",
                )}
                value={draft.secondPipeC}
                invalid={invalid.has("secondaryTemperature")}
                onChange={(secondPipeC) => patch({ secondPipeC })}
              />
            </div>
            <p className="caption secondary">
              {l(
                "Paine ja lämpötila kuuluvat samaan mittauskohtaan.",
                "Pressure and temperature belong to the same measurement location.",
              )}
            </p>
          </details>
          <details className="assessment-disclosure">
            <summary>
              {l("Olosuhteet ja käynti", "Conditions and running state")}
            </summary>
            <div className="assessment-pair">
              <NumberField
                id="assessment-indoor"
                label={l("Sisäilma, °C", "Indoor air, °C")}
                value={draft.indoorC}
                invalid={invalid.has("indoorAir")}
                onChange={(indoorC) => patch({ indoorC })}
              />
              <NumberField
                id="assessment-outdoor"
                label={l("Ulkoilma, °C", "Outdoor air, °C")}
                value={draft.outdoorC}
                invalid={invalid.has("outdoorAir")}
                onChange={(outdoorC) => patch({ outdoorC })}
              />
            </div>
            {draft.system === "industrial" && (
              <NumberField
                id="assessment-process"
                label={l(
                  "Jäähdytettävän kohteen lämpötila, °C",
                  "Cooled-source temperature, °C",
                )}
                value={draft.processC}
                invalid={invalid.has("processTemperature")}
                onChange={(processC) => patch({ processC })}
              />
            )}
            <AssessmentSelect
              label={l("Käynnin vaihe", "Running state")}
              value={draft.stability}
              onChange={(stability) => patch({ stability })}
              options={[
                { value: "unknown", label: l("Ei tiedossa", "Unknown") },
                {
                  value: "just_started",
                  label: l("Juuri käynnistynyt", "Just started"),
                },
                { value: "running", label: l("Käy", "Running") },
                {
                  value: "oem_stable",
                  label: l("Ohjeen mukaan vakaa", "Stable per instruction"),
                },
                { value: "defrost", label: l("Sulatus", "Defrost") },
              ]}
            />
            <AssessmentSelect
              label={l("Teho", "Capacity")}
              value={draft.capacity}
              onChange={(capacity) => patch({ capacity })}
              options={[
                { value: "unknown", label: l("Ei tiedossa", "Unknown") },
                { value: "reduced", label: l("Osateho", "Part load") },
                { value: "full", label: l("Täysi teho", "Full load") },
              ]}
            />
            {showEvaporator && (
              <AssessmentSelect
                label={l("Höyrystin", "Evaporator")}
                value={draft.evaporator}
                onChange={(evaporator) => patch({ evaporator })}
                options={[
                  { value: "unknown", label: l("Ei tiedossa", "Unknown") },
                  {
                    value: "dx",
                    label: l("Suorahöyrystys", "Direct expansion"),
                  },
                  { value: "flooded", label: l("Tulvitettu", "Flooded") },
                ]}
              />
            )}
          </details>
          <details className="assessment-disclosure">
            <summary>
              {l("Laitteen ohjearvot", "Equipment instruction values")}
            </summary>
            <p className="caption secondary">
              {l(
                "Täytä vain laitteen ohjeesta tunnetut arvot. Ilman ohjearvoja arviota ei verrata yleiseen hyvän tai huonon rajaan.",
                "Enter only values known from the equipment instructions. Without targets, the assessment does not use a universal good/bad threshold.",
              )}
            </p>
            <div className="field-group">
              <label htmlFor="assessment-model">
                {l("Laitteen malli", "Equipment model")}
              </label>
              <input
                id="assessment-model"
                value={draft.model}
                onChange={(event) => patch({ model: event.target.value })}
              />
            </div>
            <div className="assessment-pair">
              <NumberField
                id="assessment-oem-suction"
                label={`${l("Ohjeen imupaine", "Instruction suction pressure")}, ${draft.pressureUnit}`}
                value={draft.oemSuction}
                invalid={invalid.has("oemSuction")}
                onChange={(oemSuction) => patch({ oemSuction })}
              />
              <NumberField
                id="assessment-oem-high"
                label={`${l("Ohjeen korkeapaine", "Instruction high pressure")}, ${draft.pressureUnit}`}
                value={draft.oemHigh}
                invalid={invalid.has("oemHigh")}
                onChange={(oemHigh) => patch({ oemHigh })}
              />
              <NumberField
                id="assessment-oem-sh"
                label={l("Ohjeen tulistus, K", "Instruction superheat, K")}
                value={draft.oemSh}
                invalid={invalid.has("oemSuperheat")}
                onChange={(oemSh) => patch({ oemSh })}
              />
              <NumberField
                id="assessment-oem-sc"
                label={l("Ohjeen alijäähdytys, K", "Instruction subcooling, K")}
                value={draft.oemSc}
                invalid={invalid.has("oemSubcooling")}
                onChange={(oemSc) => patch({ oemSc })}
              />
            </div>
          </details>
          {result?.fieldErrors.length ? (
            <div className="notice error" role="alert">
              {result.fieldErrors.map((error) => (
                <p key={`${error.field}-${error.code}`}>
                  {fieldLabel(error.field, l)}: {errorLabel(error.code, l)}
                </p>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="primary assessment-show-result"
            onClick={() => {
              const result = document.getElementById("assessment-result");
              result?.focus({ preventScroll: true });
              result?.scrollIntoView({ block: "start" });
            }}
          >
            {l("Näytä arvio", "Show assessment")}
          </button>
        </div>
        <div className="assessment-output">
          <h2>
            {l("Arvio näillä tiedoilla", "Assessment with these readings")}
          </h2>
          <section
            id="assessment-result"
            tabIndex={-1}
            className="result-card info assessment-result"
            aria-live="polite"
            aria-label={l("Käyttöarvion tulos", "Operating assessment result")}
          >
            {result?.focus ? (
              <>
                <p className="result-label">{text(result.focus.label)}</p>
                <p className="result-number">
                  <span className="mono">{text(result.focus.value)}</span>{" "}
                  <span className="pt-result-unit">
                    {text(result.focus.unit)}
                  </span>
                </p>
                {result.focus.note && <p>{text(result.focus.note)}</p>}
              </>
            ) : !result || result.summary.length === 0 ? (
              <p>
                {l(
                  "Lisää paine, niin näet kyllästyslämpötilan.",
                  "Add a pressure to see the saturation temperature.",
                )}
              </p>
            ) : null}
            {result && result.summary.length > 0 && (
              <div className="assessment-summary">
                {(compactReading
                  ? result.summary.slice(1)
                  : result.summary
                ).map((line) => (
                  <p key={line.fi}>{text(line)}</p>
                ))}
              </div>
            )}
            {result && (result.rows.length > 0 || compactReading) && (
              <details className="assessment-calculation">
                <summary>
                  {l("Paine ja laskentaperuste", "Pressure and calculation")}
                </summary>
                {result.rows.length > 0 && (
                  <dl className="assessment-rows">
                    {result.rows.map((row) => (
                      <div key={row.label.fi}>
                        <dt>{text(row.label)}</dt>
                        <dd className="mono">{text(row.value)}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {compactReading && result.summary[0] && (
                  <p>{text(result.summary[0])}</p>
                )}
              </details>
            )}
          </section>

          {result && result.checks.length > 0 && (
            <section className="assessment-next-step">
              <h3>
                {l(
                  "Mikä tarkentaisi arviota?",
                  "What would refine the assessment?",
                )}
              </h3>
              <p>{text(result.checks[0])}</p>
              {result.checks.length > 1 && (
                <details className="assessment-disclosure">
                  <summary>
                    {l("Muut tarkentavat tiedot", "Other useful details")}
                  </summary>
                  <ul>
                    {result.checks.slice(1).map((check) => (
                      <li key={check.fi}>{text(check)}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          )}
          <details className="assessment-disclosure assessment-circuit">
            <summary>
              {l(
                "Mittauskohta kylmäpiirissä",
                "Measurement location in the circuit",
              )}
            </summary>
            <p className="caption secondary">
              {l(
                "Yksinkertaistettu kierto. Korostus näyttää mittauksen 1 kohdan, ei laitteen kuntoa.",
                "Simplified circuit. The highlight marks measurement 1, not equipment condition.",
              )}
            </p>
            <CircuitDiagram
              layout={draft.system === "industrial" ? "industrial" : "split"}
              mode={mode}
              portRole={draft.role}
              highSide={highSide}
              labels={labels}
              ariaLabel={labels.aria}
            />
          </details>
          {result && result.hypotheses.length > 0 && (
            <details className="assessment-disclosure">
              <summary>
                {l("Mitä tämä voi tarkoittaa", "What this can mean")}
              </summary>
              {result.hypotheses.map((item) => (
                <article className="assessment-hypothesis" key={item.id}>
                  <h3>{text(item.title)}</h3>
                  <p className="caption">
                    {text(item.strengthLabel)} · {text(item.evidence)}
                  </p>
                  <p>{text(item.text)}</p>
                  <p className="caption">{text(item.differentiate)}</p>
                </article>
              ))}
            </details>
          )}
          {result && (
            <details className="assessment-disclosure">
              <summary>{l("Tekniset perusteet", "Technical basis")}</summary>
              {result.technical.map((line) => (
                <p key={line.fi}>{text(line)}</p>
              ))}
              <h3>{l("Teho ja COP", "Capacity and COP")}</h3>
              {result.efficiency.map((line) => (
                <p key={line.fi}>{text(line)}</p>
              ))}
              <div className="assessment-links">
                {result.references.map((item) => (
                  <p className="caption" key={item.url}>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {text(item.title)}
                    </a>
                    <br />
                    {text(item.note)}
                  </p>
                ))}
              </div>
              <SourceNote
                ids={[...result.ptSourceIds, ...result.criticalSourceIds]}
              />
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  invalid,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="mono"
        inputMode="text"
        autoComplete="off"
        value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function verifiedFact(fact: Fact | undefined): string | undefined {
  if (
    !fact ||
    fact.state !== "verified" ||
    fact.value === null ||
    fact.value === ""
  )
    return undefined;
  return String(fact.value);
}

function convertReading(
  value: string,
  from: PressureUnit,
  to: PressureUnit,
  atmosphere: { value: string; unit: "bar(a)" },
): string {
  if (!value.trim() || from === to) return value;
  return convertPressure({ value, unit: from }, to, atmosphere);
}

function scaleUncertainty(
  value: string,
  from: PressureUnit,
  to: PressureUnit,
  atmosphere: { value: string; unit: "bar(a)" },
): string {
  if (!value.trim() || from.split("(")[0] === to.split("(")[0]) return value;
  const fromAbsolute = `${from.split("(")[0]}(a)` as PressureUnit;
  const toAbsolute = `${to.split("(")[0]}(a)` as PressureUnit;
  return convertPressure({ value, unit: fromAbsolute }, toAbsolute, atmosphere);
}

function applyDemo(
  id: string,
  setId: (value: string) => void,
  setDraft: (value: Draft) => void,
) {
  const refrigerantId = id || "r134a";
  setId(refrigerantId);
  const base = initialDraft(refrigerantId);
  if (refrigerantId === "r744") {
    setDraft({
      ...base,
      system: "industrial",
      mode: "cooling",
      pressureUnit: "bar(a)",
      pressure: "30",
      role: "suction",
      roleTouched: true,
      secondPressure: "90",
      secondRole: "hot_gas",
      demo: true,
    });
    return;
  }
  if (refrigerantId === "r717") {
    setDraft({
      ...base,
      system: "industrial",
      pressure: "2",
      role: "suction",
      roleTouched: true,
      evaporator: "unknown",
      demo: true,
    });
    return;
  }
  if (refrigerantId === "r449a") {
    setDraft({
      ...base,
      system: "dx_cooling",
      pressure: "5",
      role: "suction",
      roleTouched: true,
      demo: true,
    });
    return;
  }
  if (refrigerantId === "r32") {
    setDraft({
      ...base,
      system: "air_air",
      mode: "heating",
      pressure: "18",
      role: "hot_gas",
      roleTouched: true,
      pipeC: "70",
      demo: true,
    });
    return;
  }
  setDraft({
    ...base,
    system: "air_air",
    mode: "cooling",
    pressure: "3",
    role: "suction",
    roleTouched: true,
    demo: true,
  });
}

function circuitCopy(
  draft: Draft,
  mode: AssessmentMode,
  highSide: HighSideKind,
  l: (fi: string, en: string) => string,
) {
  const high =
    highSide === "gas_cooler"
      ? l("Kaasujäähdytin", "Gas cooler")
      : highSide === "unresolved"
        ? l("Korkeapaine", "High side")
        : l("Lauhdutin", "Condenser");
  const low = l("Höyrystin", "Evaporator");
  const heating = mode === "heating";
  const port = roleName(draft.role, l);
  if (draft.system === "industrial") {
    return {
      leftTitle: l("Korkeapaine", "High side"),
      leftFunction: high,
      rightTitle: low,
      rightFunction:
        draft.evaporator === "flooded"
          ? l("Tulvitettu", "Flooded")
          : draft.evaporator === "dx"
            ? l("Suorahöyrystys", "Direct expansion")
            : l("Tyyppi avoin", "Type open"),
      liquid: l("Neste", "Liquid"),
      gas: l("Imu", "Suction"),
      compressor: l("Kompressori", "Compressor"),
      expansion: l("Paisunta", "Expansion"),
      port: l(`Mittaus 1: ${port}`, `Measurement 1: ${port}`),
      returnFlow: l(
        "Kierto jatkuu kompressoriin",
        "The circuit returns to the compressor",
      ),
      aria: l(
        `Teollinen kierto. Korkeapainepuoli ja höyrystin. Portti: ${port}.`,
        `Industrial circuit. High side and evaporator. Port: ${port}.`,
      ),
    };
  }
  const outdoorHot = !heating;
  return {
    leftTitle:
      draft.system === "hydronic"
        ? l("Ulkoilma", "Outdoor air")
        : draft.system === "dx_cooling"
          ? high
          : l("Ulkoyksikkö", "Outdoor unit"),
    leftFunction: outdoorHot ? high : low,
    rightTitle:
      draft.system === "hydronic"
        ? l("Vesi", "Water")
        : draft.system === "dx_cooling"
          ? low
          : l("Sisäyksikkö", "Indoor unit"),
    rightFunction: outdoorHot ? low : high,
    liquid: l("Neste", "Liquid"),
    gas: heating ? l("Kuumakaasu", "Hot gas") : l("Imu", "Suction"),
    compressor: l("Kompressori", "Compressor"),
    expansion: l("Paisunta", "Expansion"),
    port: l(`Mittaus 1: ${port}`, `Measurement 1: ${port}`),
    returnFlow: l(
      "Kierto jatkuu kompressoriin",
      "The circuit returns to the compressor",
    ),
    aria: l(
      `${heating ? "Lämmitys" : "Jäähdytys"}. Kaasulinja on ${heating ? "kuumakaasua" : "imua"}. Portti: ${port}.`,
      `${heating ? "Heating" : "Cooling"}. The gas line is ${heating ? "hot gas" : "suction"}. Port: ${port}.`,
    ),
  };
}

function roleName(
  role: PortRole,
  l: (fi: string, en: string) => string,
): string {
  if (role === "suction") return l("Imu", "Suction");
  if (role === "hot_gas") return l("Kuumakaasu", "Hot gas");
  if (role === "liquid") return l("Neste", "Liquid");
  return l("Rooli avoin", "Role open");
}

function fieldLabel(
  field: AssessmentField,
  l: (fi: string, en: string) => string,
): string {
  const labels: Record<AssessmentField, [string, string]> = {
    atmosphere: ["Ilmanpaine", "Atmosphere"],
    primaryPressure: ["Paine", "Pressure"],
    primaryUncertainty: ["Epävarmuus", "Uncertainty"],
    primaryTemperature: ["Putken lämpötila", "Pipe temperature"],
    secondaryPressure: ["Toinen paine", "Second pressure"],
    secondaryUncertainty: ["Toisen paineen epävarmuus", "Second uncertainty"],
    secondaryTemperature: [
      "Toisen putken lämpötila",
      "Second pipe temperature",
    ],
    indoorAir: ["Sisäilma", "Indoor air"],
    outdoorAir: ["Ulkoilma", "Outdoor air"],
    processTemperature: ["Kohteen lämpötila", "Source temperature"],
    oemSuction: ["Ohjeen imupaine", "Instruction suction"],
    oemHigh: ["Ohjeen korkeapaine", "Instruction high pressure"],
    oemSuperheat: ["Ohjeen tulistus", "Instruction superheat"],
    oemSubcooling: ["Ohjeen alijäähdytys", "Instruction subcooling"],
  };
  return l(...labels[field]);
}

function errorLabel(
  code: AssessmentFieldErrorCode,
  l: (fi: string, en: string) => string,
): string {
  const labels: Record<AssessmentFieldErrorCode, [string, string]> = {
    invalid_number: [
      "Tarkista luku. Käytä desimaalipilkkua tai -pistettä.",
      "Check the number. Use a decimal comma or point.",
    ],
    below_absolute_zero: [
      "Lämpötila on absoluuttisen nollan alapuolella.",
      "Temperature is below absolute zero.",
    ],
    nonpositive_absolute: [
      "Absoluuttinen paine on nolla tai negatiivinen. Tarkista mittari- ja absoluuttivalinta.",
      "Absolute pressure is zero or negative. Check the gauge or absolute selection.",
    ],
    invalid_uncertainty: [
      "Epävarmuuden pitää olla nollaa suurempi.",
      "Uncertainty has to be greater than zero.",
    ],
    invalid_atmosphere: [
      "Ilmanpaineviitteen pitää olla nollaa suurempi.",
      "The atmospheric reference has to be greater than zero.",
    ],
    atmosphere_required: [
      "Mittaripaine tarvitsee ilmanpaineviitteen.",
      "Gauge pressure needs an atmospheric reference.",
    ],
  };
  return l(...labels[code]);
}
