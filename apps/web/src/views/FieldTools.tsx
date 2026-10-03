import { heatMaterials, heatFormulaSource } from "../heat-materials";
import { ExclusiveChoices } from "../components/ExclusiveChoices";
import { FormulaBlock } from "../components/FormulaBlock";
import { useDraftGuard } from "../useDraftGuard";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Download, Plus, Printer, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { ReportSave } from "../components/ReportSave";
import type { FieldReport, ReportRow } from "../storage";
import type { Source } from "../../../../packages/core/src/contracts";
import { Back } from "../components/Common";
import { InfoHelp } from "../components/InfoHelp";
import { printChecklistDraft } from "../report-export";
import { calculateStraightPipePressureLoss } from "../../../../packages/core/src/pipe-pressure-loss";
import {
  calculateElectrical,
  calculateThermalPower,
  calculatePipe,
  calculatePipeExpansion,
  pipeExpansionMaterials,
  checklistDefinitions,
  commonChecklistFields,
  checklistText,
  type ElectricalMode,
  type FlowUnit,
  type ChecklistKind,
  type ChecklistField,
  checklistEditorFields,
  commissioningMissingFields,
  commissioningProtocolStatus,
  combinedReportNotes,
  updateCombinedReportNotes,
  updateCommissioningFields,
  type PipeExpansionMaterial,
} from "../../../../packages/core/src/field-tools";
import "./field-tools.css";
import "./field-reports.css";
import { appVersion } from "../release";
import { byId, getFact, factKeys, dataset } from "../data";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import {
  buildCommissioningCycle,
  commissioningCycleErrorText,
} from "../commissioning-cycle";
import { renderCycleChartSvg } from "../ph-chart-snapshot";
import { evaluateCommissioningLeakCheck } from "../report-leak-check";

const reportRow = (
  fi: string,
  en: string,
  value: string,
  unit?: string,
): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
const formulaSource = (id: string, title: string, url: string): Source => ({
  id,
  title,
  url,
  version: "Web reference checked 2026-09-26",
  checkedAt: "2026-09-26",
  license: "Reference only; original source terms apply",
});
const thermalSource = formulaSource(
  "caleffi-hydronic-heat-rate",
  "Caleffi — On-Site Measurements of Circuit Performance",
  "https://www.caleffi.com/en-us/blog/3-site-measurements-circuit-performance",
);
const electricalSources = [
  formulaSource(
    "schneider-electrical-apparent-power",
    "Schneider Electric — Installed apparent power",
    "https://www.electrical-installation.org/enwiki/Installed_apparent_power_(kVA)",
  ),
  formulaSource(
    "fluke-ohms-law",
    "Fluke — Ohm's law",
    "https://www.fluke.com/en-sg/learn/blog/electrical/what-is-ohms-law",
  ),
].map((source) => ({
  ...source,
  checkedAt: "2026-09-28",
  version: "Web reference checked 2026-09-28",
}));
const pipeSources = [
  formulaSource(
    "wolfram-cylinder",
    "Wolfram MathWorld — Cylinder",
    "https://mathworld.wolfram.com/Cylinder.html",
  ),
  formulaSource(
    "nasa-mass-conservation",
    "NASA Glenn — Conservation of Mass",
    "https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/conservation-of-mass/",
  ),
];
const pipeLossSource = formulaSource(
  "epa-epanet-darcy-weisbach",
  "US EPA — EPANET 2.2 User Manual, Darcy–Weisbach friction factors",
  "https://nepis.epa.gov/Exe/ZyPURL.cgi?Dockey=P10113EM.TXT",
);

function useLabels() {
  const { data } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const number = (value: string) => {
    const numeric = Number(value);
    return new Intl.NumberFormat(data.locale === "fi" ? "fi-FI" : "en-GB", {
      maximumSignificantDigits: 6,
      notation:
        Math.abs(numeric) >= 1e7 || (numeric !== 0 && Math.abs(numeric) < 1e-4)
          ? "scientific"
          : "standard",
    }).format(numeric);
  };
  return { l, number, locale: data.locale };
}
function Numeric({
  label,
  value,
  onChange,
  signed = false,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  signed?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        className="mono"
        type="text"
        inputMode={signed ? "text" : "decimal"}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function FlowSelect({
  value,
  onChange,
}: {
  value: FlowUnit;
  onChange: (s: FlowUnit) => void;
}) {
  const { l } = useLabels();
  return (
    <label>
      {l("Virtaaman yksikkö", "Flow unit")}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FlowUnit)}
      >
        <option value="l/s">l/s</option>
        <option value="l/min">l/min</option>
        <option value="m3/h">m³/h</option>
      </select>
    </label>
  );
}
function Layout({
  title,
  children,
  backTo = "/",
}: {
  title: string;
  children: ReactNode;
  backTo?: string;
}) {
  return (
    <div className="field-tools">
      <Back to={backTo} />
      <h1>{title}</h1>
      {children}
    </div>
  );
}
function ErrorMessage({ error }: { error: string }) {
  const { l } = useLabels();
  const messages: Record<string, [string, string]> = {
    liquid_water_required: [
      "Vesivalinnan molempien lämpötilojen tulee olla yli 0 ja alle 100 °C. Laskenta ei sisällä jäätymistä tai kiehumista.",
      "The water preset requires both temperatures above 0 and below 100 °C. Freezing and boiling are not included.",
    ],
    negative_flow: [
      "Virtaama ei voi olla negatiivinen.",
      "Flow cannot be negative.",
    ],
    positive_properties_required: [
      "Tiheyden ja ominaislämpökapasiteetin on oltava nollaa suurempia.",
      "Density and specific heat capacity must be positive.",
    ],
    invalid_temperature: [
      "Lämpötila ei voi olla alle −273,15 °C.",
      "Temperature cannot be below −273.15 °C.",
    ],
    negative_electrical_quantity: [
      "Syötä jännite ja virta nollana tai positiivisena.",
      "Enter non-negative voltage and current.",
    ],
    positive_resistance_required: [
      "Resistanssin on oltava nollaa suurempi.",
      "Resistance must be positive.",
    ],
    invalid_power_factor: [
      "Tehokertoimen on oltava välillä 0–1.",
      "Power factor must be between 0 and 1.",
    ],
    invalid_pipe_dimensions: [
      "Sisähalkaisijan on oltava positiivinen. Pituus ja virtaama eivät voi olla negatiivisia.",
      "Internal diameter must be positive. Length and flow cannot be negative.",
    ],
    positive_expansion_length_required: [
      "Vertailupituuden on oltava nollaa suurempi.",
      "Reference length must be greater than zero.",
    ],
    expansion_temperature_out_of_range: [
      "Molempien lämpötilojen on oltava valitun materiaalin lähdealueella 20–100 °C.",
      "Both temperatures must be within the selected material's source range, 20–100 °C.",
    ],
    invalid_pipe_loss_inputs: [
      "Tarkista putken mitat, virtaama, tiheys, dynaaminen viskositeetti ja karheus. Pituuden, tiheyden ja viskositeetin on oltava positiivisia.",
      "Check pipe dimensions, flow, density, dynamic viscosity and roughness. Length, density and viscosity must be positive.",
    ],
    pipe_roughness_out_of_range: [
      "Suhteellisen karheuden on oltava enintään 0,05. Tarkista sisähalkaisija ja karheus.",
      "Relative roughness must be at most 0.05. Check bore and roughness.",
    ],
    pipe_transitional_flow: [
      "Reynoldsin luku on siirtymäalueella 2 000–4 000. Tällä mallilla ei anneta painehäviöarviota.",
      "Reynolds number is in the 2,000–4,000 transition range. This model does not give a pressure-loss estimate there.",
    ],
  };
  const msg = messages[error] ?? [
    "Täytä kaikki laskennan kentät kelvollisilla luvuilla.",
    "Complete all calculation fields with valid numbers.",
  ];
  return error ? (
    <p role="alert" className="field-error">
      {l(...msg)}
    </p>
  ) : null;
}
function Sources({ children, title }: { children: ReactNode; title?: string }) {
  const { l } = useLabels();
  return (
    <details className="field-sources">
      <summary>
        {title ??
          l("Laskentaperuste ja lähteet", "Calculation basis and sources")}
      </summary>
      {children}
    </details>
  );
}
export function ThermalPowerCalculator() {
  const [materialId, setMaterialId] = useState("custom");
  const material = heatMaterials.find((item) => item.id === materialId)!;
  const setDraftDirty = useDraftGuard();
  const { l, number } = useLabels();
  const [input, setInput] = useState({
    flow: "",
    flowUnit: "l/s" as FlowUnit,
    inletC: "",
    outletC: "",
    densityKgM3: "",
    specificHeatKJkgK: "",
  });
  const [result, setResult] = useState<ReturnType<
    typeof calculateThermalPower
  > | null>(null);
  const [error, setError] = useState("");
  const change = (key: keyof typeof input, value: string) => {
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setError("");
  };
  return (
    <Layout title={l("Nesteen lämpöteho", "Liquid thermal power")}>
      <p>
        {l(
          "Laske nesteeseen siirtyvä tai siitä poistuva lämpöteho virtaamasta ja lämpötilan muutoksesta.",
          "Calculate heat gained or lost by a liquid from its flow and temperature change.",
        )}
      </p>
      <form
        onChangeCapture={() => setDraftDirty(true)}
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const calculated = calculateThermalPower(input);
            if (
              materialId === "water" &&
              [input.inletC, input.outletC].some((value) => {
                const temperature = Number(value.replace(",", "."));
                return temperature <= 0 || temperature >= 100;
              })
            )
              throw new Error("liquid_water_required");
            setResult(calculated);
            setError("");
          } catch (err) {
            setResult(null);
            setError((err as Error).message);
          }
        }}
      >
        <div className="field-tool-grid">
          <Numeric
            label={l("Tilavuusvirta", "Volume flow")}
            value={input.flow}
            onChange={(v) => change("flow", v)}
          />
          <FlowSelect
            value={input.flowUnit}
            onChange={(v) => change("flowUnit", v)}
          />
          <Numeric
            label={l("Sisään · °C", "Inlet · °C")}
            signed
            value={input.inletC}
            onChange={(v) => change("inletC", v)}
          />
          <Numeric
            label={l("Ulos · °C", "Outlet · °C")}
            signed
            value={input.outletC}
            onChange={(v) => change("outletC", v)}
          />
        </div>
        <div className="help-heading">
          <h2>{l("Nesteen ominaisuudet", "Fluid properties")}</h2>
          <InfoHelp label={l("Nesteen ominaisuudet", "Fluid properties")}>
            {l(
              "Käytä nesteen valmistajan arvoja sisään- ja ulostulon keskilämpötilassa. Glykolilla myös laji ja pitoisuus vaikuttavat. Laskenta olettaa yksifaasisen nesteen ja vakion ominaislämpökapasiteetin lämpötilavälillä.",
              "Use fluid supplier values at the mean inlet/outlet temperature. Glycol type and concentration also matter. Calculation assumes single-phase liquid and constant specific heat over the temperature interval.",
            )}
          </InfoHelp>
        </div>
        <label>
          {l("Nesteen taulukkoarvot", "Liquid reference properties")}
          <select
            value={materialId}
            onChange={(event) => {
              const selected = heatMaterials.find(
                (item) => item.id === event.target.value,
              )!;
              setMaterialId(selected.id);
              setInput((previous) => ({
                ...previous,
                densityKgM3: selected.densityKgM3,
                specificHeatKJkgK: selected.specificHeatKJkgK,
              }));
              setResult(null);
              setError("");
            }}
          >
            <option value="custom">
              {l("Omat arvot", "Custom properties")}
            </option>
            <option value="water">
              {l(
                "Vesi — oppikirjan likiarvot",
                "Water — textbook approximations",
              )}
            </option>
          </select>
        </label>
        {materialId === "water" && (
          <p className="caption secondary">
            {l(material.reference.fi, material.reference.en)}
          </p>
        )}
        <div className="field-tool-grid">
          <Numeric
            label={l("Tiheys · kg/m³", "Density · kg/m³")}
            value={input.densityKgM3}
            onChange={(v) => change("densityKgM3", v)}
          />
          <Numeric
            label={l(
              "Ominaislämpökapasiteetti · kJ/(kg·K)",
              "Specific heat capacity · kJ/(kg·K)",
            )}
            value={input.specificHeatKJkgK}
            onChange={(v) => change("specificHeatKJkgK", v)}
          />
        </div>
        <button className="primary" type="submit">
          {l("Laske", "Calculate")}
        </button>
        <ErrorMessage error={error} />
      </form>
      {result && (
        <section
          className="result-card field-result"
          aria-label={l("Lämpötehon tulos", "Thermal power result")}
          aria-live="polite"
        >
          <h2>{l("Lämpöteho", "Thermal power")}</h2>
          <p className="field-result-value">{number(result.powerKW)} kW</p>
          <p>
            {l("Lämpötilan muutos", "Temperature change")}:{" "}
            {number(result.differenceK)} K · {l("Massavirta", "Mass flow")}:{" "}
            {number(result.massFlowKgS)} kg/s
          </p>
          <p>
            {l(
              "Positiivinen: neste lämpenee. Negatiivinen: neste jäähtyy. Tulos on nesteen lämpöteho, ei laitteen sähköteho tai COP.",
              "Positive: liquid heats up. Negative: liquid cools down. This is fluid heat transfer, not electrical input or COP.",
            )}
          </p>
        </section>
      )}
      {result && (
        <ReportSave
          key={JSON.stringify({ input, result })}
          content={{
            tool: "thermal-power",
            title: l("Nesteen lämpöteho", "Liquid thermal power"),
            inputs: [
              reportRow(
                "Aine",
                "Material",
                l(material.name.fi, material.name.en),
              ),
              reportRow(
                "Arvojen peruste",
                "Property basis",
                materialId === "water" &&
                  input.specificHeatKJkgK === material.specificHeatKJkgK &&
                  input.densityKgM3 === material.densityKgM3
                  ? l(material.reference.fi, material.reference.en)
                  : l(
                      "Käyttäjän syöttämät ominaisuudet",
                      "User-supplied properties",
                    ),
              ),
              reportRow(
                "Tilavuusvirta",
                "Volume flow",
                input.flow,
                input.flowUnit,
              ),
              reportRow("Sisään", "Inlet", input.inletC, "°C"),
              reportRow("Ulos", "Outlet", input.outletC, "°C"),
              reportRow("Tiheys", "Density", input.densityKgM3, "kg/m³"),
              reportRow(
                "Ominaislämpökapasiteetti",
                "Specific heat capacity",
                input.specificHeatKJkgK,
                "kJ/(kg·K)",
              ),
              reportRow(
                "Merkkisääntö / oletus",
                "Sign convention / assumption",
                "P = ρ · qᵥ · cₚ · (T_out − T_in); single-phase liquid; constant properties",
              ),
            ],
            outputs: [
              reportRow("Lämpöteho", "Thermal power", result.powerKW, "kW"),
              reportRow(
                "Lämpötilan muutos",
                "Temperature change",
                result.differenceK,
                "K",
              ),
              reportRow("Massavirta", "Mass flow", result.massFlowKgS, "kg/s"),
            ],
            sources:
              materialId === "water"
                ? [thermalSource, heatFormulaSource]
                : [thermalSource],
          }}
        />
      )}
      <aside className="related-tool">
        <h2>{l("Liittyvä työkalu", "Related tool")}</h2>
        <a href="#/heat-quantity">{l("Lämpömäärä", "Heat quantity")}</a>
      </aside>
      <Sources>
        <FormulaBlock
          formula={
            <>
              P = ρ · q<sub>v</sub> · c<sub>p</sub> · (T
              <sub>{l("ulos", "out")}</sub> − T<sub>{l("sisään", "in")}</sub>)
            </>
          }
        >
          <p>
            {l(
              "P = lämpöteho · kW; ρ = tiheys · kg/m³; qᵥ = tilavuusvirta · m³/s; cₚ = ominaislämpökapasiteetti · kJ/(kg·K); lämpötilaero · K.",
              "P = thermal power · kW; ρ = density · kg/m³; qᵥ = volume flow · m³/s; cₚ = specific heat capacity · kJ/(kg·K); temperature difference · K.",
            )}
          </p>
        </FormulaBlock>
        {materialId === "water" && (
          <p>
            <a href={heatFormulaSource.url} target="_blank" rel="noreferrer">
              {heatFormulaSource.title}
            </a>
          </p>
        )}
        <a
          href="https://www.caleffi.com/en-us/blog/3-site-measurements-circuit-performance"
          target="_blank"
          rel="noreferrer"
        >
          Caleffi — On-Site Measurements of Circuit Performance
        </a>
      </Sources>
    </Layout>
  );
}
export function ElectricalCalculator() {
  const setDraftDirty = useDraftGuard();
  const { l, number } = useLabels();
  const [input, setInput] = useState({
    mode: "single_phase" as ElectricalMode,
    solveFor: "power" as "power" | "current" | "voltage" | "resistance",
    voltageV: "",
    currentA: "",
    resistanceOhm: "",
    powerFactor: "",
    powerW: "",
  });
  const [result, setResult] = useState<ReturnType<
    typeof calculateElectrical
  > | null>(null);
  const [error, setError] = useState("");
  const change = (key: keyof typeof input, value: string) => {
    setInput((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "mode"
        ? {
            solveFor:
              value === "ohm" ? ("current" as const) : ("power" as const),
          }
        : {}),
    }));
    setResult(null);
    setError("");
  };
  const ac = input.mode === "single_phase" || input.mode === "three_phase";
  const ohm = input.mode === "ohm";
  const voltageLabel =
    input.mode === "three_phase"
      ? l("Pääjännite", "Line-to-line voltage")
      : l("Jännite", "Voltage");
  const quantities = {
    power: {
      label: l("Pätöteho", "Real power"),
      unit: "W",
      value: result?.powerW,
    },
    current: {
      label: l("Virta", "Current"),
      unit: "A",
      value: result?.currentA,
    },
    voltage: { label: voltageLabel, unit: "V", value: result?.voltageV },
    resistance: {
      label: l("Resistanssi", "Resistance"),
      unit: "Ω",
      value: result?.resistanceOhm,
    },
  };
  const primary = quantities[input.solveFor];
  const inverseErrors: Record<string, [string, string]> = {
    positive_voltage_required: [
      "Tässä laskennassa jännitteen on oltava nollaa suurempi.",
      "Voltage must be greater than zero in this calculation.",
    ],
    positive_current_required: [
      "Jännitteen tai resistanssin ratkaisemiseen virran on oltava nollaa suurempi.",
      "Current must be greater than zero to solve for voltage or resistance.",
    ],
    positive_power_factor_required: [
      "Virran tai jännitteen ratkaisemiseen tehokertoimen on oltava yli 0 ja enintään 1.",
      "Power factor must be above 0 and at most 1 to solve for current or voltage.",
    ],
    negative_electrical_quantity: [
      "Syötä jännite, virta ja teho nollana tai positiivisena.",
      "Enter non-negative voltage, current and power.",
    ],
    nonfinite_result: [
      "Laskennan arvot ovat liian suuria. Tarkista luvut ja yksiköt.",
      "The calculation values are too large. Check numbers and units.",
    ],
    invalid_electrical_target: [
      "Valitse tähän laskentaan sopiva ratkaistava suure.",
      "Select a valid quantity to solve for in this calculation.",
    ],
  };
  const inputRows = [
    reportRow("Laskenta", "Calculation", input.mode),
    reportRow("Ratkaistava suure", "Electrical solve for", input.solveFor),
    ...(input.solveFor !== "voltage"
      ? [
          reportRow(
            input.mode === "three_phase" ? "Pääjännite" : "Jännite",
            input.mode === "three_phase" ? "Line-to-line voltage" : "Voltage",
            input.voltageV,
            "V",
          ),
        ]
      : []),
    ...(!ohm && input.solveFor !== "power"
      ? [reportRow("Pätöteho", "Real power", input.powerW, "W")]
      : []),
    ...(input.solveFor !== "current"
      ? [reportRow("Virta", "Current", input.currentA, "A")]
      : []),
    ...(ohm && input.solveFor !== "resistance"
      ? [reportRow("Resistanssi", "Resistance", input.resistanceOhm, "Ω")]
      : []),
    ...(ac
      ? [
          reportRow("Tehokerroin", "Power factor", input.powerFactor),
          reportRow(
            "Oletus",
            "Assumption",
            input.mode === "three_phase"
              ? "Balanced sinusoidal three-phase load; RMS line quantities"
              : "Sinusoidal load; RMS quantities",
          ),
        ]
      : []),
  ];
  return (
    <Layout title={l("Sähkölaskuri", "Electrical calculator")}>
      <form
        onChangeCapture={() => setDraftDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            setResult(calculateElectrical(input));
            setError("");
          } catch (err) {
            setResult(null);
            setError((err as Error).message);
          }
        }}
      >
        <div className="field-tool-grid field-electrical-choices">
          <label>
            {l("Laskenta", "Calculation")}
            <select
              value={input.mode}
              onChange={(event) => change("mode", event.target.value)}
            >
              <option value="dc">{l("Tasavirta", "DC")}</option>
              <option value="single_phase">
                {l("1-vaihe", "Single phase")}
              </option>
              <option value="three_phase">{l("3-vaihe", "Three phase")}</option>
              <option value="ohm">
                {l("Ohmin laki · tasavirta", "Ohm’s law · DC")}
              </option>
            </select>
          </label>
          <label>
            {l("Ratkaise", "Solve for")}
            <select
              value={input.solveFor}
              onChange={(event) => change("solveFor", event.target.value)}
            >
              {(!ohm
                ? (["power", "current", "voltage"] as const)
                : (["current", "voltage", "resistance"] as const)
              ).map((target) => (
                <option key={target} value={target}>
                  {quantities[target].label} · {quantities[target].unit}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p>
          {input.mode === "three_phase"
            ? l(
                "Tasapainoinen 3-vaihekuorma: jännite tarkoittaa pääjännitettä (vaiheiden väli), virta yhden johtimen virtaa. Käytä RMS-arvoja.",
                "Balanced three-phase load: voltage is line-to-line and current is current in one line. Use RMS values.",
              )
            : ac
              ? l(
                  "1-vaihekuorma: kuorman yli mitattu jännite ja virta RMS-arvoina.",
                  "Single-phase load: RMS voltage across the load and RMS current.",
                )
              : l(
                  "Tasavirran jännite- ja virta-arvot. Ohmin laki olettaa resistiivisen kuorman.",
                  "DC voltage and current values. Ohm’s law assumes a resistive load.",
                )}
        </p>
        <div className="field-tool-grid">
          {input.solveFor !== "voltage" && (
            <Numeric
              label={`${voltageLabel} · V`}
              value={input.voltageV}
              onChange={(value) => change("voltageV", value)}
            />
          )}
          {!ohm && input.solveFor !== "power" && (
            <Numeric
              label={l("Pätöteho · W", "Real power · W")}
              value={input.powerW}
              onChange={(value) => change("powerW", value)}
            />
          )}
          {input.solveFor !== "current" && (
            <Numeric
              label={l("Virta · A", "Current · A")}
              value={input.currentA}
              onChange={(value) => change("currentA", value)}
            />
          )}
          {ohm && input.solveFor !== "resistance" && (
            <Numeric
              label={l("Resistanssi · Ω", "Resistance · Ω")}
              value={input.resistanceOhm}
              onChange={(value) => change("resistanceOhm", value)}
            />
          )}
          {ac && (
            <Numeric
              label={l("Tehokerroin · 0–1", "Power factor · 0–1")}
              value={input.powerFactor}
              onChange={(value) => change("powerFactor", value)}
            />
          )}
        </div>
        <button className="primary" type="submit">
          {l("Laske", "Calculate")}
        </button>
        {inverseErrors[error] ? (
          <p className="field-error" role="alert">
            {l(...inverseErrors[error])}
          </p>
        ) : (
          <ErrorMessage error={error} />
        )}
      </form>
      {result && (
        <section
          className="result-card field-result"
          aria-label={l("Sähkölaskennan tulos", "Electrical result")}
          aria-live="polite"
        >
          <h2>{primary.label}</h2>
          <p className="field-result-value">
            {number(primary.value!)} {primary.unit}
          </p>
          {(
            [
              "power",
              "current",
              "voltage",
              ...(ohm ? ["resistance" as const] : []),
            ] as const
          )
            .filter((target) => target !== input.solveFor)
            .map((target) => (
              <p key={target}>
                {quantities[target].label}: {number(quantities[target].value!)}{" "}
                {quantities[target].unit}
              </p>
            ))}
          {result.apparentVA !== null && (
            <p>
              {l("Näennäisteho", "Apparent power")}: {number(result.apparentVA)}{" "}
              VA
            </p>
          )}
        </section>
      )}
      {result && (
        <ReportSave
          key={JSON.stringify({ input, result })}
          content={{
            tool: "electrical",
            title: l("Sähkölaskuri", "Electrical calculator"),
            inputs: inputRows,
            outputs: [
              reportRow("Pätöteho", "Real power", result.powerW, "W"),
              reportRow("Virta", "Current", result.currentA, "A"),
              reportRow(
                input.mode === "three_phase" ? "Pääjännite" : "Jännite",
                "Voltage",
                result.voltageV,
                "V",
              ),
              ...(ohm && result.resistanceOhm !== null
                ? [
                    reportRow(
                      "Resistanssi",
                      "Resistance",
                      result.resistanceOhm,
                      "Ω",
                    ),
                  ]
                : []),
              ...(result.apparentVA !== null
                ? [
                    reportRow(
                      "Näennäisteho",
                      "Apparent power",
                      result.apparentVA,
                      "VA",
                    ),
                  ]
                : []),
            ],
            sources: electricalSources,
          }}
        />
      )}
      <Sources>
        <FormulaBlock
          formula={
            input.mode === "ohm" ? (
              <>I = U / R; U = R · I; R = U / I</>
            ) : input.mode === "three_phase" ? (
              <>
                P = √3 · U<sub>LL</sub> · I<sub>L</sub> · PF
              </>
            ) : input.mode === "single_phase" ? (
              <>P = U · I · PF</>
            ) : (
              <>P = U · I</>
            )
          }
        >
          <p>
            {l(
              "P = pätöteho · W; U = jännite · V; I = virta · A; R = resistanssi · Ω; PF = tehokerroin. Kolmivaiheella Uₗₗ on pääjännite ja Iₗ vaihejohtimen virta.",
              "P = real power · W; U = voltage · V; I = current · A; R = resistance · Ω; PF = power factor. For three-phase, Uₗₗ is line-to-line voltage and Iₗ is line current.",
            )}
          </p>
        </FormulaBlock>
        <p>
          {l(
            "Vaihtovirtalaskenta olettaa sinimuotoisen kuorman (PF = cos φ), kolmivaihelaskenta myös tasapainoiset vaiheet. Teho on sähköinen ottoteho; hyötysuhdetta tai moottorin akselitehoa ei lasketa. Laskuri ei mitoita suojalaitteita tai kaapeleita.",
            "AC calculation assumes sinusoidal conditions (PF = cos φ); three-phase also assumes a balanced load. Power is electrical input power; efficiency and motor shaft power are not calculated. This tool does not size protective devices or cables.",
          )}
        </p>
        <p>
          {l(
            "Virran ja jännitteen ratkaisemisessa jakajan on oltava positiivinen. Vaihtovirralla tämä koskee myös tehokerrointa; pelkkä pätöteho ei määritä virtaa tai jännitettä, jos PF = 0.",
            "When solving for current or voltage, the divisor must be positive. For AC this includes the power factor; real power alone cannot determine current or voltage when PF = 0.",
          )}
        </p>
        <p>
          <a
            href="https://www.electrical-installation.org/enwiki/Installed_apparent_power_(kVA)"
            target="_blank"
            rel="noreferrer"
          >
            Schneider Electric — Electrical Installation Guide
          </a>
        </p>
        <a
          href="https://www.fluke.com/en-sg/learn/blog/electrical/what-is-ohms-law"
          target="_blank"
          rel="noreferrer"
        >
          Fluke — Ohm’s law
        </a>
      </Sources>
    </Layout>
  );
}
export function PipeCalculator() {
  const setDraftDirty = useDraftGuard();
  const { l, number, locale } = useLabels();
  const [mode, setMode] = useState<"geometry" | "expansion" | "loss">(
    "geometry",
  );
  const [input, setInput] = useState({
    diameterMm: "",
    lengthM: "",
    flow: "",
    flowUnit: "l/s" as FlowUnit,
  });
  const [result, setResult] = useState<ReturnType<typeof calculatePipe> | null>(
    null,
  );
  const [error, setError] = useState("");
  const [expansionInput, setExpansionInput] = useState({
    material: "copper_c12200" as PipeExpansionMaterial,
    referenceLengthM: "",
    initialC: "",
    finalC: "",
  });
  const [expansionResult, setExpansionResult] = useState<ReturnType<
    typeof calculatePipeExpansion
  > | null>(null);
  const [expansionError, setExpansionError] = useState("");
  const [lossInput, setLossInput] = useState({
    densityKgM3: "",
    dynamicViscosityPaS: "",
    roughnessMm: "",
  });
  const [lossResult, setLossResult] = useState<ReturnType<
    typeof calculateStraightPipePressureLoss
  > | null>(null);
  const [lossError, setLossError] = useState("");
  const selectedMaterial = pipeExpansionMaterials[expansionInput.material];
  const changeExpansion = (key: keyof typeof expansionInput, value: string) => {
    setExpansionInput((previous) => ({ ...previous, [key]: value }));
    setExpansionResult(null);
    setExpansionError("");
  };
  const change = (key: keyof typeof input, value: string) => {
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setError("");
    setLossResult(null);
    setLossError("");
  };
  const changeLoss = (key: keyof typeof lossInput, value: string) => {
    setLossInput((previous) => ({ ...previous, [key]: value }));
    setLossResult(null);
    setLossError("");
  };
  return (
    <Layout title={l("Putkilaskurit", "Pipe calculators")}>
      <ExclusiveChoices
        className="field-pipe-modes"
        label={l("Putkilaskurin tila", "Pipe calculator mode")}
        value={mode}
        options={[
          {
            value: "geometry",
            label: l("Tilavuus ja virtaus", "Volume and flow"),
          },
          {
            value: "expansion",
            label: l("Lämpölaajeneminen", "Thermal expansion"),
          },
          { value: "loss", label: l("Painehäviö", "Pressure loss") },
        ]}
        onChange={setMode}
      />
      <section hidden={mode !== "geometry"}>
        <p>
          {l(
            "Suoran, pyöreän putken sisätilavuus ja keskimääräinen virtausnopeus. Käytä todellista sisähalkaisijaa, älä nimelliskokoa.",
            "Internal volume and mean flow velocity of a straight circular pipe. Use actual internal diameter, not nominal size.",
          )}
        </p>
        <form
          onChangeCapture={() => setDraftDirty(true)}
          onSubmit={(e) => {
            e.preventDefault();
            try {
              setResult(calculatePipe(input));
              setError("");
            } catch (err) {
              setResult(null);
              setError((err as Error).message);
            }
          }}
        >
          <div className="field-tool-grid">
            <Numeric
              label={l("Sisähalkaisija · mm", "Internal diameter · mm")}
              value={input.diameterMm}
              onChange={(v) => change("diameterMm", v)}
            />
            <Numeric
              label={l("Pituus · m", "Length · m")}
              value={input.lengthM}
              onChange={(v) => change("lengthM", v)}
            />
            <Numeric
              label={l("Tilavuusvirta", "Volume flow")}
              value={input.flow}
              onChange={(v) => change("flow", v)}
            />
            <FlowSelect
              value={input.flowUnit}
              onChange={(v) => change("flowUnit", v)}
            />
          </div>
          <button className="primary" type="submit">
            {l("Laske", "Calculate")}
          </button>
          <ErrorMessage error={error} />
        </form>
        {result && (
          <section
            className="result-card field-result"
            aria-label={l("Putkilaskennan tulos", "Pipe result")}
            aria-live="polite"
          >
            <h2>{l("Sisätilavuus", "Internal volume")}</h2>
            <p className="field-result-value">
              {number(result.volumeLitres)} l
            </p>
            <p>
              {l("Keskimääräinen virtausnopeus", "Mean flow velocity")}:{" "}
              {number(result.velocityMS)} m/s
            </p>
          </section>
        )}
        {result && (
          <ReportSave
            key={JSON.stringify({ input, result })}
            content={{
              tool: "pipe",
              title: l("Putken tilavuus ja virtaus", "Pipe volume and flow"),
              inputs: [
                reportRow(
                  "Sisähalkaisija",
                  "Internal diameter",
                  input.diameterMm,
                  "mm",
                ),
                reportRow("Pituus", "Length", input.lengthM, "m"),
                reportRow(
                  "Tilavuusvirta",
                  "Actual volume flow",
                  input.flow,
                  input.flowUnit,
                ),
                reportRow(
                  "Oletus",
                  "Assumption",
                  "Straight circular bore; geometry only; no pressure-drop or sizing model",
                ),
              ],
              outputs: [
                reportRow(
                  "Sisätilavuus",
                  "Internal volume",
                  result.volumeLitres,
                  "l",
                ),
                reportRow(
                  "Keskimääräinen virtausnopeus",
                  "Mean flow velocity",
                  result.velocityMS,
                  "m/s",
                ),
                reportRow(
                  "Poikkipinta-ala",
                  "Cross-sectional area",
                  result.areaM2,
                  "m²",
                ),
              ],
              sources: pipeSources,
            }}
          />
        )}
      </section>
      <section className="field-pipe-loss" hidden={mode !== "loss"}>
        <h2>{l("Suoran putken painehäviö", "Straight-pipe pressure loss")}</h2>
        <p>
          {l(
            "Arvio tasaiselle, yksifaasille virtaukselle suorassa pyöreässä putkessa. Anna todellinen sisähalkaisija, pituus, käyttöolosuhteiden tilavuusvirta, fluidin tiheys ja dynaaminen viskositeetti sekä putken sisäpinnan karheus.",
            "Estimate for steady, single-phase flow in a straight circular pipe. Enter actual bore, length, operating volume flow, fluid density and dynamic viscosity, and internal pipe roughness.",
          )}
        </p>
        <form
          onChangeCapture={() => setDraftDirty(true)}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              setLossResult(
                calculateStraightPipePressureLoss({ ...input, ...lossInput }),
              );
              setLossError("");
            } catch (err) {
              setLossResult(null);
              setLossError((err as Error).message);
            }
          }}
        >
          <div className="field-tool-grid">
            <Numeric
              label={l("Sisähalkaisija · mm", "Internal diameter · mm")}
              value={input.diameterMm}
              onChange={(value) => change("diameterMm", value)}
            />
            <Numeric
              label={l("Pituus · m", "Length · m")}
              value={input.lengthM}
              onChange={(value) => change("lengthM", value)}
            />
            <Numeric
              label={l("Tilavuusvirta", "Volume flow")}
              value={input.flow}
              onChange={(value) => change("flow", value)}
            />
            <FlowSelect
              value={input.flowUnit}
              onChange={(value) => change("flowUnit", value)}
            />
            <Numeric
              label={l("Tiheys · kg/m³", "Density · kg/m³")}
              value={lossInput.densityKgM3}
              onChange={(value) => changeLoss("densityKgM3", value)}
            />
            <Numeric
              label={l(
                "Dynaaminen viskositeetti · Pa·s",
                "Dynamic viscosity · Pa·s",
              )}
              value={lossInput.dynamicViscosityPaS}
              onChange={(value) => changeLoss("dynamicViscosityPaS", value)}
            />
            <Numeric
              label={l("Sisäpinnan karheus · mm", "Internal roughness · mm")}
              value={lossInput.roughnessMm}
              onChange={(value) => changeLoss("roughnessMm", value)}
            />
          </div>
          <button className="primary" type="submit">
            {l("Arvioi painehäviö", "Estimate pressure loss")}
          </button>
          <ErrorMessage error={lossError} />
        </form>
        {lossResult && (
          <section className="result-card field-result" aria-live="polite">
            <h3>
              {l("Suoran putken painehäviö", "Straight-pipe pressure loss")}
            </h3>
            <p className="field-result-value">
              {number(String(Number(lossResult.pressureLossPa) / 1000))} kPa
            </p>
            <p>
              {l("Virtausalue", "Flow regime")}:{" "}
              {lossResult.regime === "laminar"
                ? l("laminaarinen", "laminar")
                : lossResult.regime === "turbulent"
                  ? l("turbulentti", "turbulent")
                  : l("ei virtausta", "no flow")}
            </p>
            <p>
              Re = {number(lossResult.reynolds)} · f ={" "}
              {lossResult.frictionFactor === null
                ? "—"
                : number(lossResult.frictionFactor)}
            </p>
            <p>
              {l("Virtausnopeus", "Velocity")}: {number(lossResult.velocityMS)}{" "}
              m/s
            </p>
          </section>
        )}
        {lossResult && (
          <ReportSave
            key={JSON.stringify({ input, lossInput, lossResult })}
            content={{
              tool: "pipe",
              title: l(
                "Suoran putken painehäviö",
                "Straight-pipe pressure loss",
              ),
              inputs: [
                reportRow(
                  "Sisähalkaisija",
                  "Actual internal diameter",
                  input.diameterMm,
                  "mm",
                ),
                reportRow("Pituus", "Straight length", input.lengthM, "m"),
                reportRow(
                  "Tilavuusvirta",
                  "Volume flow at operating conditions",
                  input.flow,
                  input.flowUnit,
                ),
                reportRow(
                  "Tiheys",
                  "Density at operating conditions",
                  lossInput.densityKgM3,
                  "kg/m³",
                ),
                reportRow(
                  "Dynaaminen viskositeetti",
                  "Dynamic viscosity at operating conditions",
                  lossInput.dynamicViscosityPaS,
                  "Pa·s",
                ),
                reportRow(
                  "Sisäpinnan karheus",
                  "Internal roughness",
                  lossInput.roughnessMm,
                  "mm",
                ),
                reportRow(
                  "Oletus",
                  "Assumption",
                  "Steady, fully developed, single-phase, constant-property flow in a straight circular bore",
                ),
              ],
              outputs: [
                reportRow(
                  "Painehäviö",
                  "Pressure loss",
                  lossResult.pressureLossPa,
                  "Pa",
                ),
                reportRow("Virtausalue", "Flow regime", lossResult.regime),
                reportRow(
                  "Reynoldsin luku",
                  "Reynolds number",
                  lossResult.reynolds,
                ),
                reportRow(
                  "Darcy-kitkakerroin",
                  "Darcy friction factor",
                  lossResult.frictionFactor ?? "—",
                ),
                reportRow(
                  "Virtausnopeus",
                  "Velocity",
                  lossResult.velocityMS,
                  "m/s",
                ),
              ],
              sources: [pipeLossSource],
            }}
          />
        )}
        <p className="supporting-copy">
          {l(
            "Vain suoran putken yksifaasivirtaus. Ei putkikoon mitoitukseen; tarkemmat rajaukset laskentaperusteissa.",
            "Single-phase flow in a straight pipe only. Not for pipe sizing; see calculation basis for detailed limits.",
          )}
        </p>
      </section>
      <section className="field-expansion" hidden={mode !== "expansion"}>
        <h2>{l("Putken lämpölaajeneminen", "Pipe thermal expansion")}</h2>
        <p>
          {l(
            "Arvio vapaan, tasalämpöisen putken pituuden muutoksesta. Valitse tunnettu materiaali ja anna pituus alkulämpötilassa.",
            "Estimate the length change of a free, uniformly heated pipe. Select a known material and enter its length at the initial temperature.",
          )}
        </p>
        <form
          onChangeCapture={() => setDraftDirty(true)}
          onSubmit={(event) => {
            event.preventDefault();
            try {
              setExpansionResult(calculatePipeExpansion(expansionInput));
              setExpansionError("");
            } catch (err) {
              setExpansionResult(null);
              setExpansionError((err as Error).message);
            }
          }}
        >
          <div className="field-tool-grid">
            <label>
              {l("Materiaali", "Material")}
              <select
                value={expansionInput.material}
                onChange={(event) =>
                  changeExpansion("material", event.target.value)
                }
              >
                {Object.entries(pipeExpansionMaterials).map(
                  ([id, material]) => (
                    <option key={id} value={id}>
                      {material[locale]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <Numeric
              label={l("Vertailupituus · m", "Reference length · m")}
              value={expansionInput.referenceLengthM}
              onChange={(value) => changeExpansion("referenceLengthM", value)}
            />
            <Numeric
              label={l("Alkulämpötila · °C", "Initial temperature · °C")}
              value={expansionInput.initialC}
              onChange={(value) => changeExpansion("initialC", value)}
            />
            <Numeric
              label={l("Loppulämpötila · °C", "Final temperature · °C")}
              value={expansionInput.finalC}
              onChange={(value) => changeExpansion("finalC", value)}
            />
          </div>
          <p className="supporting-copy mono">
            α = {number(selectedMaterial.coefficientPerK)} /K ·{" "}
            {l("lähdealue", "source range")}: {selectedMaterial.minC}–
            {selectedMaterial.maxC} °C
          </p>
          <button className="primary" type="submit">
            {l("Laske pituuden muutos", "Calculate length change")}
          </button>
          <ErrorMessage error={expansionError} />
        </form>
        {expansionResult && (
          <section
            className="result-card field-result field-expansion-result"
            aria-live="polite"
          >
            <h3>{l("Pituuden muutos", "Length change")}</h3>
            <p className="field-result-value">
              {Number(expansionResult.changeMm) > 0 ? "+" : ""}
              {number(expansionResult.changeMm)} mm
            </p>
            <p>
              {Number(expansionResult.changeMm) > 0
                ? l("Putki pitenee", "The pipe expands")
                : Number(expansionResult.changeMm) < 0
                  ? l("Putki lyhenee", "The pipe contracts")
                  : l("Pituus ei muutu", "No length change")}
            </p>
            <p>
              {l("Loppupituus", "Final length")}:{" "}
              {number(expansionResult.finalLengthM)} m
            </p>
            <p className="supporting-copy">
              {l("Lämpötilaero", "Temperature difference")}:{" "}
              {number(expansionResult.differenceK)} K
            </p>
          </section>
        )}
        {expansionResult && (
          <ReportSave
            key={JSON.stringify({ expansionInput, expansionResult })}
            content={{
              tool: "pipe",
              title: l("Putken lämpölaajeneminen", "Pipe thermal expansion"),
              inputs: [
                reportRow("Materiaali", "Material", selectedMaterial.en),
                reportRow(
                  "Vertailupituus",
                  "Reference length",
                  expansionInput.referenceLengthM,
                  "m",
                ),
                reportRow(
                  "Alkulämpötila",
                  "Initial temperature",
                  expansionInput.initialC,
                  "°C",
                ),
                reportRow(
                  "Loppulämpötila",
                  "Final temperature",
                  expansionInput.finalC,
                  "°C",
                ),
                reportRow(
                  "Laajenemiskerroin",
                  "Expansion coefficient",
                  expansionResult.coefficientPerK,
                  "/K",
                ),
                reportRow(
                  "Oletus",
                  "Assumption",
                  "Free, uniform axial expansion; source range 20–100 °C",
                ),
              ],
              outputs: [
                reportRow(
                  "Pituuden muutos",
                  "Length change",
                  expansionResult.changeMm,
                  "mm",
                ),
                reportRow(
                  "Loppupituus",
                  "Final length",
                  expansionResult.finalLengthM,
                  "m",
                ),
              ],
              sources: [
                formulaSource(
                  `expansion-${expansionInput.material}`,
                  selectedMaterial.sourceTitle,
                  selectedMaterial.sourceUrl,
                ),
              ],
            }}
          />
        )}
        <p className="supporting-copy">
          {l(
            "Arvio ei mitoita kiinnikkeitä, jännityksiä eikä paisuntalenkkejä. Lähdearvoa ei sovelleta 20–100 °C alueen ulkopuolelle.",
            "This estimate does not design supports, stress or expansion loops. The source coefficient is not applied outside 20–100 °C.",
          )}
        </p>
      </section>
      <Sources>
        {mode === "geometry" && (
          <>
            <FormulaBlock
              formula={
                <>
                  A = π · d<sup>2</sup> / 4; V = A · L; v = q<sub>v</sub> / A
                </>
              }
            >
              <p>
                {l(
                  "A = poikkipinta-ala · m²; d = sisähalkaisija · m; V = tilavuus · m³; L = pituus · m; v = virtausnopeus · m/s; qᵥ = tilavuusvirta · m³/s.",
                  "A = cross-sectional area · m²; d = inner diameter · m; V = volume · m³; L = length · m; v = flow velocity · m/s; qᵥ = volume flow · m³/s.",
                )}
              </p>
            </FormulaBlock>
            <p>
              {l(
                "Virtaama on tilavuusvirta putken käyttöolosuhteissa. Laskenta ei huomioi painehäviöitä, liittimiä, kaksifaasivirtausta tai öljynpalautumista eikä valitse sopivaa kylmäaineputkikokoa.",
                "Flow is the actual volume flow at pipe operating conditions. Calculation does not cover pressure losses, fittings, two-phase flow or oil return, and does not select refrigerant pipe size.",
              )}
            </p>
            {pipeSources.map((source) => (
              <p key={source.id}>
                <a href={source.url} target="_blank" rel="noreferrer">
                  {source.title}
                </a>
              </p>
            ))}
          </>
        )}
        {mode === "loss" && (
          <>
            <FormulaBlock
              formula={
                <>
                  Δp = f · (L/D) · ρv<sup>2</sup>/2; Re = ρvD/μ
                </>
              }
            >
              <p>
                {l(
                  "Δp = painehäviö · Pa; f = Darcy-kitkakerroin; L = pituus · m; D = sisähalkaisija · m; ρ = tiheys · kg/m³; v = nopeus · m/s; μ = dynaaminen viskositeetti · Pa·s; Re = Reynoldsin luku.",
                  "Δp = pressure loss · Pa; f = Darcy friction factor; L = length · m; D = inner diameter · m; ρ = density · kg/m³; v = velocity · m/s; μ = dynamic viscosity · Pa·s; Re = Reynolds number.",
                )}
              </p>
              <p>f = 64/Re (Re &lt; 2,000) · Swamee–Jain (Re &gt; 4,000)</p>
            </FormulaBlock>
            <p>
              {l(
                "Darcy–Weisbachin yhtälö. Siirtymäalue 2 000–4 000 estetään. Ei sisällä kaksifaasivirtausta, kaasun merkittävää kokoonpuristumista, liittimiä, korkeuseroa, öljynpalautumista eikä putkikoon valintaa.",
                "Darcy–Weisbach equation. The transition range 2,000–4,000 is blocked. It excludes two-phase flow, significant gas compressibility, fittings, elevation, oil return and pipe-size selection.",
              )}
            </p>
            <p>
              <a href={pipeLossSource.url} target="_blank" rel="noreferrer">
                {pipeLossSource.title}
              </a>
            </p>
          </>
        )}
        {mode === "expansion" && (
          <>
            <FormulaBlock
              formula={
                <>
                  ΔL = α · L<sub>0</sub> · (T<sub>1</sub> − T<sub>0</sub>)
                </>
              }
            >
              <p>
                {l(
                  "ΔL = pituuden muutos · m; α = lämpölaajenemiskerroin · 1/K; L₀ = alkupituus · m; T₁ − T₀ = lämpötilan muutos · K.",
                  "ΔL = length change · m; α = thermal expansion coefficient · 1/K; L₀ = initial length · m; T₁ − T₀ = temperature change · K.",
                )}
              </p>
            </FormulaBlock>
            {Object.values(pipeExpansionMaterials).map((material) => (
              <p key={material.sourceUrl}>
                <a href={material.sourceUrl} target="_blank" rel="noreferrer">
                  {material.sourceTitle}
                </a>
              </p>
            ))}
          </>
        )}
      </Sources>
    </Layout>
  );
}
export function WorkChecklists() {
  const { data, setData, persistenceStatus, go } = useApp();
  const { l, locale } = useLabels();
  const routeId = () => {
    const id = window.location.hash.replace(/^#\/checklists\/?/, "");
    try {
      return id === "new" ? "" : decodeURIComponent(id);
    } catch {
      return id;
    }
  };
  const [kind, setKind] = useState<ChecklistKind>("tightness");
  const [selected, setSelected] = useState(routeId);
  const [deletePending, setDeletePending] = useState(false);
  const [printError, setPrintError] = useState(false);
  const [formError, setFormError] = useState("");
  const [cycleError, setCycleError] = useState("");
  const focusField = (id: string) => {
    const wrapper = document.getElementById(`report-field-${id}`);
    if (!wrapper) return;
    let ancestor = wrapper.parentElement;
    while (ancestor) {
      if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      ancestor = ancestor.parentElement;
    }
    wrapper.scrollIntoView({ block: "center", behavior: "smooth" });
    wrapper
      .querySelector<HTMLElement>("input, select, textarea, button")
      ?.focus({ preventScroll: true });
  };
  useEffect(() => {
    const sync = () => {
      setSelected(routeId());
      setDeletePending(false);
      setFormError("");
      setCycleError("");
    };
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const draft = data.checklistDrafts.find((d) => d.id === selected);
  const definition = draft ? checklistDefinitions[draft.kind] : null;
  const final = draft?.status === "final";
  const longNotesReports = useRef(new Set<string>());
  if (draft && combinedReportNotes(draft).length > 10000)
    longNotesReports.current.add(draft.id);
  const preserveSeparateNotes = Boolean(
    draft && longNotesReports.current.has(draft.id),
  );
  const update = (patch: Partial<FieldReport>) => {
    if (!draft || final) return;
    setFormError("");
    setCycleError("");
    const nextFields =
      draft.kind === "commissioning" && patch.fields
        ? updateCommissioningFields(draft.fields, patch.fields)
        : undefined;
    const leakInputs = [
      "performedOn",
      "refrigerantId",
      "chargeKg",
      "refrigerantGwp",
      "refrigerantGwpBasis",
      "leakEquipment",
      "leakDetection",
      "leakHermetic",
      "leakHermeticLabel",
      "leakResidential",
    ];
    const leakPatch =
      nextFields && leakInputs.some((id) => nextFields[id] !== draft.fields[id])
        ? evaluateCommissioningLeakCheck(nextFields).fieldPatch
        : undefined;
    setData((current) => ({
      ...current,
      checklistDrafts: current.checklistDrafts.map((d) =>
        d.id === selected && d.status !== "final"
          ? {
              ...d,
              ...patch,
              ...(d.kind === "commissioning"
                ? {
                    fields: {
                      ...(nextFields ?? d.fields),
                      ...leakPatch,
                      ...((patch.title !== undefined &&
                        patch.title !== d.title) ||
                      (patch.notes !== undefined && patch.notes !== d.notes) ||
                      (patch.checkedIds !== undefined &&
                        JSON.stringify(patch.checkedIds) !==
                          JSON.stringify(d.checkedIds)) ||
                      ("equipmentId" in patch &&
                        patch.equipmentId !== d.equipmentId)
                        ? { operatorDeclaration: "" }
                        : {}),
                    },
                  }
                : {}),
              ...(!("cycleReport" in patch) &&
              patch.fields &&
              [
                "refrigerantId",
                "lp",
                "hp",
                "pressureUnit",
                "pressureReference",
                "atmosphericReference",
                "suctionC",
                "dischargeC",
                "liquidC",
              ].some((key) => patch.fields?.[key] !== d.fields[key])
                ? { cycleReport: undefined }
                : {}),
              updatedAt: new Date().toISOString(),
            }
          : d,
      ),
    }));
  };
  const open = (id: string) => {
    setSelected(id);
    setDeletePending(false);
    go(`/checklists/${encodeURIComponent(id)}`);
  };
  const create = () => {
    if (data.checklistDrafts.length >= 1000) return;
    const record: FieldReport = {
      id: crypto.randomUUID(),
      kind,
      title: "",
      updatedAt: new Date().toISOString(),
      checkedIds: [],
      fields:
        kind === "commissioning"
          ? {
              pressureUnit: "bar",
              commissioningPurpose: "installation",
              pressureReference: "gauge",
              atmosphericReference: "1.01325",
              pressureTestRequired: "not_assessed",
            }
          : kind === "evacuation"
            ? { vacuumUnit: "mbar" }
            : {},
      notes: "",
      status: "draft",
      revision: 1,
      appVersion,
    };
    setData((current) => ({
      ...current,
      checklistDrafts: [...current.checklistDrafts, record],
    }));
    open(record.id);
  };
  const finalise = () => {
    if (!draft || final) return;
    if (
      !draft.title.trim() ||
      !draft.fields.performedOn ||
      !/^\d{4}-\d{2}-\d{2}$/.test(draft.fields.performedOn) ||
      !Number.isFinite(Date.parse(`${draft.fields.performedOn}T12:00:00Z`)) ||
      new Date(`${draft.fields.performedOn}T12:00:00Z`)
        .toISOString()
        .slice(0, 10) !== draft.fields.performedOn ||
      !draft.fields.technician?.trim()
    ) {
      setFormError(
        l(
          "Täytä kohteen nimi, suorituspäivä ja tekijä ennen raportin viimeistelyä. Luonnos tallentuu silti.",
          "Enter site name, work date and technician before finalising. Your draft is still saved.",
        ),
      );
      focusField(
        !draft.title.trim()
          ? "title"
          : !draft.fields.performedOn
            ? "performedOn"
            : "technician",
      );
      return;
    }
    if (
      draft.kind === "commissioning" &&
      commissioningMissingFields(draft.fields).length
    ) {
      setFormError(
        l(
          "Täydennä asennustodistuksen tiedot ennen raportin lukitsemista. Luonnos säilyy tallennettuna.",
          "Complete the installation-certificate fields before locking this report. Your draft remains saved.",
        ),
      );
      focusField(commissioningMissingFields(draft.fields)[0].id);
      return;
    }
    update({
      status: "final",
      cycleReport: draft.cycleReport,
      finalizedAt: new Date().toISOString(),
      appVersion,
      revision: draft.revision ?? 1,
    });
  };
  const revise = () => {
    if (!draft || data.checklistDrafts.length >= 1000) return;
    const revision: FieldReport = {
      ...draft,
      id: crypto.randomUUID(),
      status: "draft",
      revision: (draft.revision ?? 1) + 1,
      previousRevisionId: draft.id,
      ...(draft.kind === "commissioning"
        ? { fields: { ...draft.fields, operatorDeclaration: "" } }
        : {}),
      finalizedAt: undefined,
      appVersion,
      updatedAt: new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      checklistDrafts: [...current.checklistDrafts, revision],
    }));
    open(revision.id);
  };
  const download = () => {
    if (!draft) return;
    const url = URL.createObjectURL(
      new Blob([checklistText(draft, locale)], {
        type: "text/plain;charset=utf-8",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `phasekit-${draft.kind}-${draft.id.slice(0, 8)}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const saveState = () => (
    <p className="field-report-save-state caption" role="status">
      {persistenceStatus === "saving"
        ? l("Tallennetaan…", "Saving…")
        : persistenceStatus === "error"
          ? l(
              "Tallennus epäonnistui — pidä sivu auki ja vie kirjaus talteen.",
              "Save failed — keep this page open and export your record.",
            )
          : l(
              "Tallennettu automaattisesti tähän selaimeen",
              "Saved automatically in this browser",
            )}
    </p>
  );
  const renderField = (field: ChecklistField) => {
    if (!draft) return null;
    if (
      field.id === "atmosphericReference" &&
      draft.fields.pressureReference !== "gauge"
    )
      return null;
    const change = (value: string) => {
      const refrigerant =
        field.id === "refrigerantId" ? byId.get(value) : undefined;
      const safety = refrigerant
        ? getFact(refrigerant, ...factKeys.safety)
        : undefined;
      const gwp = refrigerant
        ? getFact(refrigerant, ...factKeys.gwp)
        : undefined;
      const sourced = (fact: typeof safety) =>
        fact?.state === "verified" &&
        fact.value !== null &&
        fact.sourceIds.length > 0;
      update({
        fields: {
          ...draft.fields,
          [field.id]: value,
          ...(field.id === "refrigerantId"
            ? {
                refrigerantDesignation: refrigerant?.designation ?? value,
                refrigerantSafetyClass: sourced(safety)
                  ? String(safety!.value)
                  : "",
                refrigerantGwp: sourced(gwp) ? String(gwp!.value) : "",
                refrigerantGwpBasis: sourced(gwp)
                  ? (gwp!.basis ?? "gwp_eu_2024_573_100yr")
                  : "",
                refrigerantSourceNote: sourced(gwp)
                  ? `PhaseKit ${dataset.version} · ${[...new Set([...(sourced(safety) ? safety!.sourceIds : []), ...gwp!.sourceIds])].join(", ")}`
                  : "",
              }
            : {}),
        },
      });
    };
    const name = `${field.label[locale]}${field.legacy ? l(" · aiempi vapaateksti", " · original free text") : ""}`;
    return (
      <div
        key={field.id}
        id={`report-field-${field.id}`}
        className={`field-report-field ${field.type === "decimal" ? "field-report-numeric" : ""} ${["pressureUnit", "pressureReference"].includes(field.id) ? "field-report-choice" : ""} ${field.legacy ? "field-report-legacy" : ""} ${["atmosphericReference", "equipment", "chargeKg", "evacuationMinutes"].includes(field.id) ? "field-report-full" : ""}`}
      >
        {field.id === "leakCheckInterval" ? (
          <div>
            <p className="field-report-declaration-title">{name}</p>
            <p className="supporting-copy">
              {draft.fields.leakCheckInterval ||
                l(
                  "Täydennä laskennan lähtötiedot.",
                  "Complete the calculation inputs.",
                )}
            </p>
            {draft.fields.leakCheckInterval &&
              !draft.fields.leakCheckEvidence && (
                <p className="supporting-copy">
                  {l(
                    "Aiemmin kirjattu arvio. Lähtötietojen muuttaminen päivittää laskennan.",
                    "Previously recorded assessment. Changing the inputs updates the calculation.",
                  )}
                </p>
              )}
          </div>
        ) : field.type === "declaration" ? (
          <div>
            <p className="field-report-declaration-title">{name}</p>
            <label className="checkbox field-checklist-choice">
              <input
                type="checkbox"
                aria-label={name}
                checked={draft.fields[field.id] === "confirmed"}
                onChange={(event) =>
                  change(event.target.checked ? "confirmed" : "")
                }
              />
              {field.options?.[0].label[locale]}
            </label>
          </div>
        ) : field.type === "refrigerant" ? (
          final ? (
            <label>
              {name}
              <input
                readOnly
                value={
                  draft.fields.refrigerantDesignation ??
                  draft.fields[field.id] ??
                  ""
                }
              />
            </label>
          ) : (
            <RefrigerantPicker
              label={name}
              value={draft.fields[field.id]}
              onChange={change}
            />
          )
        ) : (
          <label>
            {name}
            {field.type === "select" ? (
              <select
                value={
                  draft.fields[field.id] ??
                  (field.id.endsWith("RecordMode")
                    ? draft.fields[
                        (
                          {
                            tightnessRecordMode: "tightnessTestReportReference",
                            evacuationRecordMode: "evacuationReportReference",
                            testRunRecordMode: "testRunReportReference",
                          } as Record<string, string>
                        )[field.id]
                      ]?.trim()
                      ? "external"
                      : "internal"
                    : field.id === "commissioningPurpose"
                      ? "installation"
                      : "")
                }
                onChange={(e) => change(e.target.value)}
              >
                <option value="">{l("Valitse", "Choose")}</option>
                {field.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label[locale]}
                  </option>
                ))}
              </select>
            ) : field.type === "textarea" ||
              [
                "initialCondition",
                "workPerformed",
                "measurements",
                "criterion",
                "evacuationFinding",
                "testRunFinding",
                "tightnessFinding",
              ].includes(field.id) ? (
              <textarea
                rows={3}
                value={draft.fields[field.id] ?? ""}
                maxLength={2000}
                onChange={(e) => change(e.target.value)}
              />
            ) : (
              <input
                type={field.type === "date" ? "date" : "text"}
                inputMode={field.type === "decimal" ? "decimal" : undefined}
                value={draft.fields[field.id] ?? ""}
                maxLength={2000}
                onChange={(e) => change(e.target.value)}
              />
            )}
          </label>
        )}
        {field.help && <p className="supporting-copy">{field.help[locale]}</p>}
      </div>
    );
  };
  const reportFields = draft
    ? checklistEditorFields(draft).filter(
        (field) => field.id !== "leakCheckEvidence",
      )
    : [];
  const leakAssessment =
    draft?.kind === "commissioning"
      ? evaluateCommissioningLeakCheck(draft.fields)
      : undefined;
  const missingFields =
    draft?.kind === "commissioning"
      ? commissioningMissingFields(draft.fields)
      : [];
  const reviewMissingFields: {
    id: string;
    label: { fi: string; en: string };
  }[] = draft
    ? [
        ...(!draft.title.trim()
          ? [{ id: "title", label: { fi: "Kohteen nimi", en: "Site name" } }]
          : []),
        ...(!draft.fields.performedOn ||
        !/^\d{4}-\d{2}-\d{2}$/.test(draft.fields.performedOn) ||
        !Number.isFinite(Date.parse(`${draft.fields.performedOn}T12:00:00Z`)) ||
        new Date(`${draft.fields.performedOn}T12:00:00Z`)
          .toISOString()
          .slice(0, 10) !== draft.fields.performedOn
          ? commonChecklistFields.filter((field) => field.id === "performedOn")
          : []),
        ...(!draft.fields.technician?.trim()
          ? commonChecklistFields.filter((field) => field.id === "technician")
          : []),
        ...missingFields,
      ].filter(
        (field, index, fields) =>
          fields.findIndex((candidate) => candidate.id === field.id) === index,
      )
    : [];
  const renderReportSection = (
    group: string,
    fi: string,
    en: string,
    fields: ChecklistField[],
    initiallyOpen = false,
  ) => {
    if (!draft || !fields.length) return null;
    const protocol =
      draft.kind === "commissioning"
        ? commissioningProtocolStatus(draft.fields).find(
            (item) => item.id === group,
          )
        : undefined;
    const recorded = fields.filter(
      (field) =>
        !field.id.endsWith("RecordMode") &&
        !["pressureUnit", "pressureReference", "atmosphericReference"].includes(
          field.id,
        ) &&
        Boolean(draft.fields[field.id]?.trim()) &&
        draft.fields[field.id] !== "not_assessed",
    ).length;
    const sectionSummary =
      group === "refrigerant"
        ? [
            draft.fields.refrigerantDesignation ||
              byId.get(draft.fields.refrigerantId)?.designation ||
              draft.fields.refrigerantId,
            draft.fields.chargeKg ? `${draft.fields.chargeKg} kg` : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : protocol?.mode === "external"
          ? l("Erillinen pöytäkirja", "Separate test record")
          : group === "installation"
            ? [draft.fields.installerCompany, draft.fields.responsiblePerson]
                .filter(Boolean)
                .join(" · ")
            : recorded
              ? `${recorded} ${l("kenttää kirjattu", "fields recorded")}`
              : "";
    const refrigerantDetails = fields.filter((field) =>
      [
        "refrigerantSafetyClass",
        "refrigerantGwp",
        "refrigerantGwpBasis",
        "refrigerantSourceNote",
      ].includes(field.id),
    );
    const visibleFields =
      group === "refrigerant"
        ? fields.filter((field) => !refrigerantDetails.includes(field))
        : fields;
    return (
      <details
        className="field-report-optional"
        open={initiallyOpen || undefined}
        key={group}
      >
        <summary>
          <span>{l(fi, en)}</span>
          <span className="field-report-section-summary">
            {sectionSummary || l("Ei vielä kirjauksia", "No entries yet")}
          </span>
        </summary>
        {group === "leak-check" && !final && leakAssessment && (
          <div className="field-report-leak-result" role="status">
            <p>{leakAssessment.summary[locale]}</p>
            {leakAssessment.state !== "resolved" && (
              <p className="supporting-copy">
                {l(
                  "Täydennä soveltuvat lähtötiedot. Tuntematon tieto ei tarkoita vapautusta.",
                  "Complete the applicable inputs. Unknown information does not mean an exemption.",
                )}
              </p>
            )}
          </div>
        )}
        {protocol && (
          <p className="supporting-copy">
            {protocol.mode === "internal"
              ? l(
                  "Pöytäkirja sisältyy tämän asiakirjan mittausosaan.",
                  "The test record is included in this document’s measurement section.",
                )
              : protocol.mode === "external"
                ? l(
                    "Erillinen pöytäkirja yksilöidään viitteellä ja toimitetaan asiakkaalle erikseen.",
                    "The separate test record is identified by reference and supplied separately.",
                  )
                : l(
                    "Täytä tämän osion kirjaukset tai valitse erillinen pöytäkirja.",
                    "Complete this section or select a separate test record.",
                  )}
          </p>
        )}
        <div className="field-report-grid field-report-measurements">
          {[...visibleFields]
            .sort(
              (a, b) =>
                Number(b.id.endsWith("RecordMode")) -
                Number(a.id.endsWith("RecordMode")),
            )
            .map(renderField)}
          {group === "refrigerant" && refrigerantDetails.length > 0 && (
            <div className="field-report-full field-report-refrigerant-facts">
              {draft.fields.refrigerantId ||
              refrigerantDetails.some((field) =>
                draft.fields[field.id]?.trim(),
              ) ? (
                <dl>
                  {refrigerantDetails.map((field) => (
                    <div key={field.id}>
                      <dt>{field.label[locale]}</dt>
                      <dd>
                        {field.id === "refrigerantGwpBasis" &&
                        draft.fields[field.id] === "gwp_eu_2024_573_100yr"
                          ? l(
                              "EU 2024/573 · 100 vuotta",
                              "EU 2024/573 · 100 years",
                            )
                          : draft.fields[field.id] ||
                            l("Tieto puuttuu", "Data unavailable")}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="supporting-copy">
                  {l(
                    "Valitse kylmäaine, niin saatavilla olevat ainetiedot täyttyvät automaattisesti.",
                    "Select a refrigerant to fill the available substance details automatically.",
                  )}
                </p>
              )}
              {!final && (
                <details className="field-report-refrigerant-edit">
                  <summary>
                    {l(
                      "Muokkaa kylmäaineen tietoja",
                      "Edit refrigerant details",
                    )}
                  </summary>
                  <p className="supporting-copy">
                    {l(
                      "Kylmäaineen valinta tuo saatavilla olevat tiedot aineistosta. Tarkista peruste ja lähde; voit korjata tiedot tässä.",
                      "Selecting a refrigerant fills the available dataset values. Check the basis and source; you can correct the details here.",
                    )}
                  </p>
                  <div className="field-report-grid">
                    {refrigerantDetails.map(renderField)}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </details>
    );
  };
  return (
    <Layout
      backTo="/reports"
      title={
        draft && definition
          ? definition.name[locale]
          : l("Uusi raportti", "New report")
      }
    >
      {!draft && (
        <>
          <div className="field-tool-grid checklist-create field-checklist-controls">
            <label>
              {l("Raporttipohja", "Report template")}
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as ChecklistKind)}
              >
                {Object.entries(checklistDefinitions).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.name[locale]}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-button"
              disabled={data.checklistDrafts.length >= 1000}
              onClick={create}
            >
              <Plus size={18} />
              {l("Luo raportti", "Create report")}
            </button>
          </div>
          {selected && (
            <p role="status">
              {l(
                "Raporttia ei löytynyt tästä selaimesta.",
                "Report not found in this browser.",
              )}
            </p>
          )}
        </>
      )}
      {data.checklistDrafts.length >= 1000 && (
        <p role="status">
          {l(
            "Enintään 1 000 raporttia. Vie ja poista vanhoja raportteja ennen uuden luontia.",
            "Limit of 1,000 reports. Export and remove old records before creating another.",
          )}
        </p>
      )}
      {draft && definition && (
        <section className="checklist-record field-report-editor">
          <div className="field-checklist-save-state">
            {saveState()}
            <p className="field-report-status caption">
              {final ? l("Valmis", "Final") : l("Luonnos", "Draft")} ·{" "}
              {l("Versio", "Revision")} {draft.revision ?? 1}
            </p>
          </div>
          {final && (
            <div className="field-report-final-note">
              <p>
                {l(
                  "Tämä raportti on viimeistelty. Muutokset tehdään uutena versiona, alkuperäinen säilyy.",
                  "This report is finalised. Changes create a new revision while preserving the original.",
                )}
              </p>
              <button
                className="secondary-button"
                onClick={revise}
                disabled={data.checklistDrafts.length >= 1000}
              >
                {l("Luo uusi versio", "Create new revision")}
              </button>
            </div>
          )}
          <fieldset disabled={final} className="field-report-fields">
            <legend className="sr-only">
              {l("Raportin tiedot", "Report details")}
            </legend>
            {!final && data.equipment.length > 0 && (
              <label>
                {l("Liitä laitteeseen", "Link to equipment")}
                <select
                  value={draft.equipmentId ?? ""}
                  onChange={(e) => {
                    const equipment = data.equipment.find(
                      (item) => item.id === e.target.value,
                    );
                    update({
                      equipmentId: equipment?.id,
                      ...(equipment
                        ? {
                            title: equipment.location || equipment.name,
                            fields: {
                              ...draft.fields,
                              equipment: equipment.name,
                              ...(draft.kind === "commissioning" &&
                              equipment.location
                                ? { installationLocation: equipment.location }
                                : {}),
                            },
                          }
                        : {}),
                    });
                  }}
                >
                  <option value="">{l("Ei liitetty", "Unlinked")}</option>
                  {data.equipment.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {reportFields
              .filter((field) => field.id === "commissioningPurpose")
              .map(renderField)}
            <label id="report-field-title">
              {l("Kohteen nimi", "Site name")}
              <input
                value={draft.title}
                maxLength={300}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <div className="field-report-grid">
              {reportFields
                .filter((field) =>
                  commonChecklistFields.some(
                    (common) => common.id === field.id,
                  ),
                )
                .map(renderField)}
            </div>
            {renderReportSection(
              "installation",
              "Asentaja ja vastuuhenkilö",
              "Installer and responsible person",
              reportFields.filter((field) => field.group === "installation"),
            )}
            {renderReportSection(
              "refrigerant",
              "Kylmäaine ja täyttö",
              "Refrigerant and charge",
              reportFields.filter((field) => field.group === "refrigerant"),
              true,
            )}
            {renderReportSection(
              "leak-check",
              "Vuototarkastusväli",
              "Leak-check interval",
              reportFields.filter((field) => field.group === "leak-check"),
              true,
            )}
            {renderReportSection(
              "tightness",
              "Tiiviyskoe",
              "Tightness test",
              reportFields.filter((field) => field.group === "tightness"),
            )}
            {renderReportSection(
              "evacuation",
              "Tyhjiöinti ja pitokoe",
              "Evacuation and standing test",
              reportFields.filter((field) => field.group === "evacuation"),
            )}
            {renderReportSection(
              "measurements",
              "Mittaukset",
              "Measurements",
              reportFields.filter(
                (field) =>
                  !field.group &&
                  field.id !== "commissioningPurpose" &&
                  !commonChecklistFields.some(
                    (common) => common.id === field.id,
                  ),
              ),
              true,
            )}
            {renderReportSection(
              "test-run",
              "Koekäyttö",
              "Test run",
              reportFields.filter((field) => field.group === "test-run"),
            )}
            {draft.kind === "commissioning" && !final && (
              <div className="field-report-cycle-action">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const result = buildCommissioningCycle(draft.fields);
                    if (result.report) {
                      update({ cycleReport: result.report });
                      if (result.error) setCycleError(result.error);
                    } else setCycleError(result.error ?? "invalid_input");
                  }}
                >
                  {l("Muodosta log(p)–h-kaavio", "Generate log(p)–h chart")}
                </button>
                <p className="supporting-copy">
                  {l(
                    "Valinnainen kaavio käyttää kirjattuja käyntiarvoja. Mittausten muuttaminen poistaa aiemman kaavion.",
                    "The optional chart uses the recorded operating readings. Editing those readings removes the previous chart.",
                  )}
                </p>
              </div>
            )}
            {renderReportSection(
              "test-reports",
              "Painekoe, asiakirjat ja vakuutus",
              "Pressure test, documents and declaration",
              reportFields.filter((field) => field.group === "test-reports"),
            )}
            <h3>{l("Työvaiheet", "Work steps")}</h3>
            <p className="small">
              {
                draft.checkedIds.filter((id) =>
                  definition.steps.some((step) => step.id === id),
                ).length
              }{" "}
              / {definition.steps.length} {l("merkitty", "marked")}
            </p>
            {definition.steps.map((step) => (
              <label className="checkbox field-checklist-choice" key={step.id}>
                <input
                  type="checkbox"
                  checked={draft.checkedIds.includes(step.id)}
                  onChange={(e) =>
                    update({
                      checkedIds: e.target.checked
                        ? [...draft.checkedIds, step.id]
                        : draft.checkedIds.filter((id) => id !== step.id),
                    })
                  }
                />
                {step.label[locale]}
              </label>
            ))}
            {preserveSeparateNotes && draft.fields.finding && (
              <span className="field-report-preserved-note">
                {l(
                  "Aiemmat havainnot säilyvät erillään, koska yhdistetty teksti ylittää muistiinpanojen enimmäispituuden.",
                  "The previous observations are retained separately because the combined text exceeds the notes limit.",
                )}
                <span>{draft.fields.finding}</span>
              </span>
            )}
            <label>
              {l("Havainnot ja muistiinpanot", "Observations and notes")}
              <textarea
                rows={4}
                value={
                  preserveSeparateNotes
                    ? draft.notes
                    : combinedReportNotes(draft)
                }
                maxLength={10000}
                onChange={(e) =>
                  update(
                    preserveSeparateNotes
                      ? { notes: e.target.value }
                      : updateCombinedReportNotes(draft, e.target.value),
                  )
                }
              />
            </label>
          </fieldset>
          {cycleError && (
            <p role="alert">
              {commissioningCycleErrorText(cycleError, locale)}
            </p>
          )}
          {draft.cycleReport && (
            <section className="field-report-cycle">
              <h3>{l("Tallennettava kiertokaavio", "Recorded cycle chart")}</h3>
              {draft.cycleReport.chartSnapshot && (
                <img
                  alt={l(
                    "Kylmäkierron log(p)–h-kaavio",
                    "Refrigeration log(p)–h chart",
                  )}
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCycleChartSvg(draft.cycleReport.chartSnapshot, locale))}`}
                />
              )}
              <div className="field-report-grid">
                {draft.cycleReport.outputs.map((row, index) => (
                  <p key={index}>
                    {row.label[locale]}:{" "}
                    <strong>
                      {row.value} {row.unit}
                    </strong>
                  </p>
                ))}
              </div>
            </section>
          )}
          {!final && (
            <details
              className="field-report-review"
              open={Boolean(formError) || undefined}
            >
              <summary>
                {l("Tarkista ja viimeistele", "Review and finalise")}
              </summary>
              <p className="supporting-copy">
                {l(
                  "Tarkistus seuraa valittua asiakirjatyyppiä ja kirjaustapaa. Luonnos tallentuu myös keskeneräisenä.",
                  "The review follows the selected document type and recording method. Incomplete drafts are saved too.",
                )}
              </p>
              {reviewMissingFields.length ? (
                <>
                  <p>
                    {reviewMissingFields.length}{" "}
                    {l(
                      "täydennettävää ennen lukitsemista",
                      "fields to complete before locking",
                    )}
                  </p>
                  <ul>
                    {reviewMissingFields.map((field) => (
                      <li key={field.id}>
                        <button
                          type="button"
                          className="text-button field-report-missing-link"
                          onClick={() =>
                            focusField(
                              field.id === "leakCheckInterval"
                                ? (leakAssessment?.missing[0] ??
                                    "leakEquipment")
                                : field.id,
                            )
                          }
                        >
                          {field.label[locale]}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p>
                  {l(
                    "Tiedot täytetty. Tarkista sisältö ja soveltuvuus ennen lukitsemista.",
                    "Fields filled. Review the content and applicability before locking.",
                  )}
                </p>
              )}
              <p className="supporting-copy">
                {l(
                  "Lukitseminen säilyttää tämän version. Kenttien täyttö, tekninen hyväksyntä ja allekirjoitus ovat erillisiä vaiheita.",
                  "Locking preserves this revision. Completing fields, technical acceptance and signing are separate steps.",
                )}
              </p>
            </details>
          )}
          {draft.kind === "commissioning" &&
            draft.fields.commissioningPurpose !== "technical" && (
              <details className="field-report-document-context">
                <summary>
                  {l(
                    "Asiakirjan tarkoitus ja säädöstausta",
                    "Document purpose and regulatory context",
                  )}
                </summary>
                <p className="supporting-copy">
                  {l(
                    "Tuloste kokoaa asennustodistuksen tiedot ja tähän kirjatut koepöytäkirjat. Ulkoisilla viitteillä yksilöidyt liitteet toimitetaan erikseen. Raportin lukitseminen ei ole tekninen hyväksyntä tai allekirjoitus. Vastuuhenkilö tarkastaa ja allekirjoittaa asiakirjan.",
                    "The printout combines the installation-certificate details and test records entered here. Attachments identified by external references must be supplied separately. Locking is not technical approval or a signature. The responsible person reviews and signs the document.",
                  )}
                </p>
                <p className="supporting-copy">
                  <a
                    href="https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l(
                      "Lähde: VNa 1063/2025, 9 § (Finlex)",
                      "Source: Finnish Decree 1063/2025, section 9 (Finlex)",
                    )}
                  </a>
                </p>
              </details>
            )}
          {saveState()}
          {formError && <p role="alert">{formError}</p>}
          <div className="field-actions">
            {!final && (
              <button
                className="primary"
                onClick={finalise}
                disabled={persistenceStatus !== "saved"}
              >
                {l("Lukitse raportti", "Lock report")}
              </button>
            )}
            <button
              className="secondary-button"
              onClick={() => setPrintError(!printChecklistDraft(draft, locale))}
            >
              <Printer size={18} />
              {l("Tulosta / PDF", "Print / PDF")}
            </button>
            <button className="secondary-button" onClick={download}>
              <Download size={18} />
              {l("Vie tekstinä", "Export text")}
            </button>
            <button
              className="text-button danger-text"
              onClick={() => setDeletePending(true)}
            >
              <Trash2 size={18} />
              {l("Poista raportti", "Delete report")}
            </button>
          </div>
          {printError && (
            <p role="alert" className="field-error">
              {l(
                "Tulostusikkuna estettiin. Salli ponnahdusikkunat tälle sivustolle ja yritä uudelleen.",
                "Print window was blocked. Allow pop-ups for this site and try again.",
              )}
            </p>
          )}
          {deletePending && (
            <div className="field-confirm">
              <p>
                {l(
                  "Poistetaanko tämä raportti? Poistoa ei voi perua.",
                  "Delete this report? This cannot be undone.",
                )}
              </p>
              <button
                className="secondary-button"
                onClick={() => setDeletePending(false)}
              >
                {l("Peruuta", "Cancel")}
              </button>
              <button
                className="text-button danger-text"
                onClick={() => {
                  setData((current) => ({
                    ...current,
                    checklistDrafts: current.checklistDrafts.filter(
                      (d) => d.id !== selected,
                    ),
                  }));
                  go("/reports");
                }}
              >
                {l("Vahvista poisto", "Confirm deletion")}
              </button>
            </div>
          )}
        </section>
      )}
      <Sources
        title={l(
          "Raporttipohjan tausta ja lähteet",
          "Report template background and sources",
        )}
      >
        <p>
          {l(
            "Raportit ovat yleisiä kirjauspohjia. Valmistajan ohje määrää työjärjestyksen, koeväliaineet, rajat ja hyväksymisen. Valmis raportti tai rastit eivät tarkoita teknistä hyväksyntää. Kirjaa poikkeamat muistiinpanoihin.",
            "Reports are generic recording templates. Manufacturer instructions determine the sequence, media, limits and acceptance. A final report or checked steps do not imply technical acceptance. Record exceptions in Notes.",
          )}
        </p>
        <p className="supporting-copy">
          {l(
            "Kirjaukset säilyvät tässä selaimessa ja sisältyvät asetusten varmuuskopioon.",
            "Records stay in this browser and are included in Settings backups.",
          )}
        </p>
        {!draft && kind === "commissioning" && (
          <p>
            <a
              href="https://www.finlex.fi/api/media/statute/893594/mainPdf/main.pdf"
              target="_blank"
              rel="noreferrer"
            >
              {l(
                "VNa 1063/2025, 9 § — asennustodistuksen tiedot",
                "Government Decree 1063/2025, section 9 — installation-certificate content",
              )}
            </a>
          </p>
        )}
        <a
          href="https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEM&PDF=AE-105"
          target="_blank"
          rel="noreferrer"
        >
          Copeland — Refrigeration Manual, Part 5: Installation and Service
        </a>
      </Sources>
    </Layout>
  );
}
