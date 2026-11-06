import { useEffect, useMemo, useState } from "react";
import type { Fact, Refrigerant } from "../../../../packages/core/src/contracts";
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
import { ExclusiveChoices } from "../components/ExclusiveChoices";
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
  const suggested = suggestedPortRole(draft.system, mode);

  useEffect(() => {
    setDraftDirty(draft.pressure.trim().length > 0 || draft.secondPressure.trim().length > 0);
    return () => setDraftDirty(false);
  }, [draft.pressure, draft.secondPressure, setDraftDirty]);

  function patch(next: Partial<Draft>, keepDemo = false) {
    setDraft((current) => ({ ...current, ...next, demo: keepDemo ? current.demo : false }));
  }

  function chooseSystem(system: AssessmentSystem) {
    setDraft((current) => {
      const mode = system === "dx_cooling" ? "cooling" : current.mode;
      const role = current.roleTouched ? current.role : suggestedPortRole(system, mode);
      return { ...current, system, mode, role, demo: false };
    });
  }

  function chooseMode(mode: AssessmentMode) {
    setDraft((current) => ({
      ...current,
      mode,
      role: current.roleTouched ? current.role : suggestedPortRole(current.system, mode),
      demo: false,
    }));
  }

  function changeUnit(next: PressureUnit) {
    const reference = { value: draft.atmosphere, unit: "bar(a)" as const };
    try {
      patch({
        pressureUnit: next,
        pressure: convertReading(draft.pressure, draft.pressureUnit, next, reference),
        secondPressure: convertReading(draft.secondPressure, draft.pressureUnit, next, reference),
        uncertainty: scaleUncertainty(draft.uncertainty, draft.pressureUnit, next, reference),
        oemSuction: convertReading(draft.oemSuction, draft.pressureUnit, next, reference),
        oemHigh: convertReading(draft.oemHigh, draft.pressureUnit, next, reference),
      });
      setUnitError(false);
    } catch {
      setUnitError(true);
    }
  }

  const result = useMemo(() => {
    if (!draft.pressure.trim() && !draft.secondPressure.trim()) return undefined;
    const criticalPressure = verifiedFact(refrigerant?.facts.critical_pressure_bar_abs);
    const criticalTemperature = verifiedFact(refrigerant?.facts.critical_temp_c);
    return assessOperation({
      ...(id ? { refrigerantId: id } : {}),
      ...(criticalPressure
        ? {
            criticalPressureBarAbsolute: criticalPressure,
            criticalSourceIds: refrigerant?.facts.critical_pressure_bar_abs?.sourceIds ?? [],
          }
        : {}),
      ...(criticalTemperature ? { criticalTemperatureC: criticalTemperature } : {}),
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
              ...(draft.uncertainty.trim() ? { uncertainty: draft.uncertainty } : {}),
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
              ...(draft.secondPipeC.trim() ? { pipeTemperatureC: draft.secondPipeC } : {}),
            },
          }
        : {}),
      ...(draft.indoorC.trim() ? { indoorAirC: draft.indoorC } : {}),
      ...(draft.outdoorC.trim() ? { outdoorAirC: draft.outdoorC } : {}),
      ...(draft.processC.trim() ? { processTemperatureC: draft.processC } : {}),
      stability: draft.stability,
      capacity: draft.capacity,
      ...(draft.model.trim() ? { modelName: draft.model } : {}),
      ...(draft.oemSuction.trim() ? { oemSuctionPressure: draft.oemSuction } : {}),
      ...(draft.oemHigh.trim() ? { oemHighPressure: draft.oemHigh } : {}),
      ...(draft.oemSh.trim() ? { oemSuperheatK: draft.oemSh } : {}),
      ...(draft.oemSc.trim() ? { oemSubcoolingK: draft.oemSc } : {}),
    });
  }, [draft, id, refrigerant, showEvaporator]);

  const highSide: HighSideKind =
    result?.circuit.highSide ?? (id === "r744" ? "unresolved" : "condenser");
  const labels = circuitCopy(draft, mode, highSide, l);
  const text = (copy: { fi: string; en: string }) => copy[locale];
  const invalid = new Set(result?.fieldErrors.map((error) => error.field));

  return (
    <>
      <Back to="/tools" />
      <h1>{t("assessment")}</h1>
      <p className="secondary assessment-intro">
        {l(
          "Kirjaa paine. Tulistus, alijäähdytys ja tulkinta täydentyvät, jos lisäät mittauksia.",
          "Enter a pressure. Superheat, subcooling and the reading fill in as you add measurements.",
        )}
      </p>
      <div className="assessment-actions">
        <button type="button" className="secondary-button" onClick={() => applyDemo(id, setId, setDraft)}>
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
            "Esimerkki. Nämä luvut eivät ole mitattu kohde.",
            "Example. These figures are not a measured installation.",
          )}
        </p>
      )}
      <RefrigerantPicker
        value={id}
        onChange={(next) => {
          setId(next);
          patch({});
        }}
      />
      <div className="assessment-choices">
        <ExclusiveChoices
          label={l("Järjestelmä", "System")}
          value={draft.system}
          onChange={chooseSystem}
          options={[
            { value: "air_air", label: l("Ilma–ilma", "Air-to-air") },
            { value: "dx_cooling", label: l("Vain jäähdytys", "Cooling only") },
            { value: "hydronic", label: l("Vesi", "Water") },
            { value: "industrial", label: l("Teollisuus", "Industrial") },
          ]}
        />
        <p className="caption secondary">{systemHint(draft.system, l)}</p>
      </div>
      <div className="assessment-choices">
        <ExclusiveChoices
          label={l("Käyttö", "Mode")}
          value={draft.system === "dx_cooling" ? "cooling" : draft.mode}
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
      <CircuitDiagram
        layout={draft.system === "industrial" ? "industrial" : "split"}
        mode={mode}
        portRole={draft.role}
        highSide={highSide}
        labels={labels}
        ariaLabel={labels.aria}
      />
      <div className="assessment-pressure">
        <div className="field-group">
          <label htmlFor="assessment-pressure">{l("Paine", "Pressure")}</label>
          <input
            id="assessment-pressure"
            className="mono"
            inputMode="text"
            autoComplete="off"
            value={draft.pressure}
            aria-invalid={invalid.has("primaryPressure") || undefined}
            onChange={(event) => patch({ pressure: event.target.value })}
          />
        </div>
        <div className="field-group">
          <label htmlFor="assessment-unit">{l("Yksikkö", "Unit")}</label>
          <select
            id="assessment-unit"
            value={draft.pressureUnit.split("(")[0]}
            onChange={(event) =>
              changeUnit(
                `${event.target.value}(${draft.pressureUnit.endsWith("(a)") ? "a" : "g"})` as PressureUnit,
              )
            }
          >
            {pressureBases.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="help-heading pressure-reference-toggle">
        <label className="switch-label">
          <input
            type="checkbox"
            role="switch"
            checked={draft.pressureUnit.endsWith("(a)")}
            onChange={(event) => {
              const base = draft.pressureUnit.split("(")[0];
              changeUnit(`${base}(${event.target.checked ? "a" : "g"})` as PressureUnit);
            }}
          />
          <span>{l("Absoluuttinen paine", "Absolute pressure")}</span>
        </label>
      </div>
      <p className="caption secondary">
        {l(
          "Pois päältä: mittaripaine. Päälle: absoluuttinen paine, nolla tyhjiössä. Vaihto muuntaa kirjatun luvun.",
          "Off: gauge pressure. On: absolute pressure, zero at vacuum. Switching converts the entered figure.",
        )}
      </p>
      {draft.pressureUnit.endsWith("(g)") && (
        <div className="field-group">
          <label htmlFor="assessment-atmosphere">
            {l("Ilmanpaine, bar(a)", "Atmospheric pressure, bar(a)")}
          </label>
          <input
            id="assessment-atmosphere"
            className="mono"
            inputMode="decimal"
            autoComplete="off"
            value={draft.atmosphere}
            aria-invalid={invalid.has("atmosphere") || undefined}
            onChange={(event) => patch({ atmosphere: event.target.value })}
          />
          <p className="caption secondary">
            {l(
              "Oletus 1,01325 bar(a) on standardi-ilmakehä. Se lisätään mittaripaineeseen kerran.",
              "The default 1.01325 bar(a) is standard atmosphere. It is added to gauge pressure once.",
            )}
          </p>
        </div>
      )}
      {unitError && (
        <p className="notice warning">
          {l(
            "Lukua ei voitu muuntaa uuteen yksikköön. Tarkista luku ja ilmanpaine.",
            "The figure could not be converted to the new unit. Check the number and the atmosphere.",
          )}
        </p>
      )}
      <div className="assessment-choices">
        <ExclusiveChoices
          label={l("Portin rooli", "Port role")}
          value={draft.role}
          onChange={(role) => patch({ role, roleTouched: true })}
          options={[
            { value: "suction", label: l("Imu", "Suction") },
            { value: "hot_gas", label: l("Kuumakaasu", "Hot gas") },
            { value: "liquid", label: l("Neste", "Liquid") },
            { value: "unknown", label: l("Ei varma", "Not sure") },
          ]}
        />
        <p className="caption secondary">
          {l(
            "Vahvista rooli. Avoin rooli näyttää kyllästyslämpötilan, mutta ei tulistusta eikä korkeapäätelmää.",
            "Confirm the role. An open role shows the saturation temperature, but not superheat or a high-side conclusion.",
          )}
        </p>
        {suggested !== "unknown" && draft.role !== suggested && (
          <p className="caption">
            {l(
              `Kaasulinjan tavallinen rooli tässä käytössä on ${roleName(suggested, l)}. Valinta jää siksi, jonka vahvistit.`,
              `The usual gas-line role in this mode is ${roleName(suggested, l)}. The confirmed choice is kept.`,
            )}
          </p>
        )}
      </div>
      <div className="field-group">
        <label htmlFor="assessment-pipe">
          {l("Putken lämpötila, °C, jos mitattu", "Pipe temperature, °C, if measured")}
        </label>
        <input
          id="assessment-pipe"
          className="mono"
          inputMode="text"
          autoComplete="off"
          value={draft.pipeC}
          aria-invalid={invalid.has("primaryTemperature") || undefined}
          onChange={(event) => patch({ pipeC: event.target.value })}
        />
      </div>
      {showEvaporator && (
        <div className="assessment-choices">
          <ExclusiveChoices
            label={l("Höyrystin", "Evaporator")}
            value={draft.evaporator}
            onChange={(evaporator) => patch({ evaporator })}
            options={[
              { value: "unknown", label: l("Ei tiedossa", "Unknown") },
              { value: "dx", label: l("Suorahöyrystys", "Direct expansion") },
              { value: "flooded", label: l("Tulvitettu", "Flooded") },
            ]}
          />
          <p className="caption secondary">
            {l(
              "Tulvitettu ja suorahöyrysteinen tulistus eivät tarkoita samaa. Tyhjä valinta ei tee tulistuksesta vajauspäätöstä.",
              "Flooded and direct-expansion superheat do not mean the same thing. An unknown choice does not turn superheat into a shortage decision.",
            )}
          </p>
        </div>
      )}
      {result?.fieldErrors.length ? (
        <div className="notice error" role="alert">
          {result.fieldErrors.map((error) => (
            <p key={`${error.field}-${error.code}`}>
              {fieldLabel(error.field, l)}: {errorLabel(error.code, l)}
            </p>
          ))}
        </div>
      ) : null}
      <section className="result-card info assessment-result" aria-live="polite">
        {result?.focus ? (
          <>
            <p className="result-label">{text(result.focus.label)}</p>
            <p className="result-number">
              <span className="mono">{text(result.focus.value)}</span>{" "}
              <span className="pt-result-unit">{text(result.focus.unit)}</span>
            </p>
            {result.focus.note && <p>{text(result.focus.note)}</p>}
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
            {result.summary.map((line) => (
              <p key={line.fi}>{text(line)}</p>
            ))}
          </div>
        )}
      </section>
      {result && result.checks.length > 0 && (
        <section>
          <h2>{l("Seuraavaksi", "Next")}</h2>
          <ol className="assessment-next">
            {result.checks.map((check) => (
              <li key={check.fi}>{text(check)}</li>
            ))}
          </ol>
        </section>
      )}
      <details className="assessment-disclosure">
        <summary>{l("Lisää mittauksia", "More measurements")}</summary>
        <div className="field-group">
          <label htmlFor="assessment-uncertainty">
            {l("Mittarin epävarmuus ±", "Gauge uncertainty ±")}
          </label>
          <input
            id="assessment-uncertainty"
            className="mono"
            inputMode="decimal"
            autoComplete="off"
            value={draft.uncertainty}
            aria-invalid={invalid.has("primaryUncertainty") || undefined}
            onChange={(event) => patch({ uncertainty: event.target.value })}
          />
          <p className="caption secondary">
            {l(
              "Sama yksikkö kuin paineella. Epävarmuus ei sisällä toista ilmakehää.",
              "Same unit as the pressure. Uncertainty does not include a second atmosphere.",
            )}
          </p>
        </div>
        <div className="assessment-pressure">
          <div className="field-group">
            <label htmlFor="assessment-second">
              {l("Toinen paine, jos mitattu", "Second pressure, if measured")}
            </label>
            <input
              id="assessment-second"
              className="mono"
              inputMode="text"
              autoComplete="off"
              value={draft.secondPressure}
              aria-invalid={invalid.has("secondaryPressure") || undefined}
              onChange={(event) => patch({ secondPressure: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="assessment-second-pipe">
              {l("Sen putki, °C", "Its pipe, °C")}
            </label>
            <input
              id="assessment-second-pipe"
              className="mono"
              inputMode="text"
              autoComplete="off"
              value={draft.secondPipeC}
              aria-invalid={invalid.has("secondaryTemperature") || undefined}
              onChange={(event) => patch({ secondPipeC: event.target.value })}
            />
          </div>
        </div>
        <ExclusiveChoices
          label={l("Toisen paineen rooli", "Second pressure role")}
          value={draft.secondRole}
          onChange={(secondRole) => patch({ secondRole })}
          options={[
            { value: "unknown", label: l("Ei varma", "Not sure") },
            { value: "suction", label: l("Imu", "Suction") },
            { value: "hot_gas", label: l("Kuumakaasu", "Hot gas") },
            { value: "liquid", label: l("Neste", "Liquid") },
          ]}
        />
        <div className="assessment-pressure">
          <div className="field-group">
            <label htmlFor="assessment-indoor">{l("Sisäilma, °C", "Indoor air, °C")}</label>
            <input
              id="assessment-indoor"
              className="mono"
              inputMode="text"
              autoComplete="off"
              value={draft.indoorC}
              aria-invalid={invalid.has("indoorAir") || undefined}
              onChange={(event) => patch({ indoorC: event.target.value })}
            />
          </div>
          <div className="field-group">
            <label htmlFor="assessment-outdoor">{l("Ulkoilma, °C", "Outdoor air, °C")}</label>
            <input
              id="assessment-outdoor"
              className="mono"
              inputMode="text"
              autoComplete="off"
              value={draft.outdoorC}
              aria-invalid={invalid.has("outdoorAir") || undefined}
              onChange={(event) => patch({ outdoorC: event.target.value })}
            />
          </div>
        </div>
        {draft.system === "industrial" && (
          <div className="field-group">
            <label htmlFor="assessment-process">
              {l("Jäähdytettävän kohteen lämpötila, °C", "Cooled-source temperature, °C")}
            </label>
            <input
              id="assessment-process"
              className="mono"
              inputMode="text"
              autoComplete="off"
              value={draft.processC}
              aria-invalid={invalid.has("processTemperature") || undefined}
              onChange={(event) => patch({ processC: event.target.value })}
            />
          </div>
        )}
        <div className="field-group">
          <label htmlFor="assessment-model">{l("Malli, jos tiedossa", "Model, if known")}</label>
          <input
            id="assessment-model"
            autoComplete="off"
            value={draft.model}
            onChange={(event) => patch({ model: event.target.value })}
          />
        </div>
        <ExclusiveChoices
          label={l("Käynnin vaihe", "Running state")}
          value={draft.stability}
          onChange={(stability) => patch({ stability })}
          options={[
            { value: "unknown", label: l("Ei tiedossa", "Unknown") },
            { value: "just_started", label: l("Juuri käynnistynyt", "Just started") },
            { value: "running", label: l("Käy", "Running") },
            { value: "oem_stable", label: l("Ohjeen mukaan vakaa", "Stable per instruction") },
            { value: "defrost", label: l("Sulatus", "Defrost") },
          ]}
        />
        <p className="caption secondary">
          {l(
            "Vakautus luetaan laitteen ohjeesta. Yleistä minuuttimäärää ei käytetä.",
            "Stabilisation is read from the equipment instruction. No universal number of minutes is used.",
          )}
        </p>
        <ExclusiveChoices
          label={l("Teho", "Capacity")}
          value={draft.capacity}
          onChange={(capacity) => patch({ capacity })}
          options={[
            { value: "unknown", label: l("Ei tiedossa", "Unknown") },
            { value: "reduced", label: l("Osateho", "Part load") },
            { value: "full", label: l("Täysi teho", "Full capacity") },
          ]}
        />
        <p className="caption">
          {l(
            "Ohjearvot ovat samassa yksikössä ja paineviitteessä kuin mittaus. Ne ovat kirjaamiasi lukuja.",
            "Targets use the same unit and pressure reference as the measurement. They are figures you enter.",
          )}
        </p>
        <div className="assessment-pressure">
          <NumberField
            id="assessment-oem-suction"
            label={l("Ohjeen imupaine", "Instruction suction pressure")}
            value={draft.oemSuction}
            invalid={invalid.has("oemSuction")}
            onChange={(oemSuction) => patch({ oemSuction })}
          />
          <NumberField
            id="assessment-oem-high"
            label={l("Ohjeen korkeapaine", "Instruction high pressure")}
            value={draft.oemHigh}
            invalid={invalid.has("oemHigh")}
            onChange={(oemHigh) => patch({ oemHigh })}
          />
        </div>
        <div className="assessment-pressure">
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
      {result && result.hypotheses.length > 0 && (
        <details className="assessment-disclosure">
          <summary>{l("Mitä tämä voi tarkoittaa", "What this can mean")}</summary>
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
          <summary>{l("Teho ja COP", "Capacity and COP")}</summary>
          {result.efficiency.map((line) => (
            <p key={line.fi}>{text(line)}</p>
          ))}
        </details>
      )}
      {result && (
        <details className="assessment-disclosure">
          <summary>{l("Tekniset perusteet", "Technical basis")}</summary>
          {result.technical.map((line) => (
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
          <SourceNote ids={[...result.ptSourceIds, ...result.criticalSourceIds]} />
        </details>
      )}
    </>
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
  if (!fact || fact.state !== "verified" || fact.value === null || fact.value === "") return undefined;
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
      compressor: l("K", "C"),
      expansion: l("Paisunta", "Expansion"),
      port: l(`Portti: ${port}`, `Port: ${port}`),
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
    compressor: l("K", "C"),
    expansion: l("Paisunta", "Expansion"),
    port: l(`Portti: ${port}`, `Port: ${port}`),
    aria: l(
      `${heating ? "Lämmitys" : "Jäähdytys"}. Kaasulinja on ${heating ? "kuumakaasua" : "imua"}. Portti: ${port}.`,
      `${heating ? "Heating" : "Cooling"}. The gas line is ${heating ? "hot gas" : "suction"}. Port: ${port}.`,
    ),
  };
}

function systemHint(system: AssessmentSystem, l: (fi: string, en: string) => string): string {
  if (system === "dx_cooling") {
    return l(
      "Lauhdutin ja höyrystin. Lämmityskäyttöä ei ole.",
      "Condenser and evaporator. There is no heating mode.",
    );
  }
  if (system === "hydronic") {
    return l(
      "Ulkoilma ja vesi- tai liuospiiri. Kaasulinjan rooli vaihtuu käytön mukaan.",
      "Outdoor air and a water or brine circuit. The gas-line role changes with the mode.",
    );
  }
  if (system === "industrial") {
    return l(
      "Kompressori, korkeapainepuoli ja höyrystin. Portin roolia ei arvata.",
      "Compressor, high side and evaporator. The port role is not guessed.",
    );
  }
  return l(
    "Ulko- ja sisäyksikkö. Kaasulinjan portti on jäähdytyksessä usein imu ja lämmityksessä usein kuumakaasu.",
    "Outdoor and indoor units. The gas-line port is often suction in cooling and hot gas in heating.",
  );
}

function roleName(role: PortRole, l: (fi: string, en: string) => string): string {
  if (role === "suction") return l("Imu", "Suction");
  if (role === "hot_gas") return l("Kuumakaasu", "Hot gas");
  if (role === "liquid") return l("Neste", "Liquid");
  return l("Rooli avoin", "Role open");
}

function fieldLabel(field: AssessmentField, l: (fi: string, en: string) => string): string {
  const labels: Record<AssessmentField, [string, string]> = {
    atmosphere: ["Ilmanpaine", "Atmosphere"],
    primaryPressure: ["Paine", "Pressure"],
    primaryUncertainty: ["Epävarmuus", "Uncertainty"],
    primaryTemperature: ["Putken lämpötila", "Pipe temperature"],
    secondaryPressure: ["Toinen paine", "Second pressure"],
    secondaryUncertainty: ["Toisen paineen epävarmuus", "Second uncertainty"],
    secondaryTemperature: ["Toisen putken lämpötila", "Second pipe temperature"],
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

function errorLabel(code: AssessmentFieldErrorCode, l: (fi: string, en: string) => string): string {
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
