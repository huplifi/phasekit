import { useDraftGuard } from "../useDraftGuard";
import { useState, type ReactNode } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { ReportSave } from "../components/ReportSave";
import type { ReportRow } from "../storage";
import type { Source } from "../../../../packages/core/src/contracts";
import { Back } from "../components/Common";
import { InfoHelp } from "../components/InfoHelp";
import {
  calculateElectrical,
  calculateThermalPower,
  calculatePipe,
  checklistDefinitions,
  commonChecklistFields,
  checklistText,
  type ElectricalMode,
  type FlowUnit,
  type ChecklistKind,
  type ChecklistDraft,
} from "../../../../packages/core/src/field-tools";
import "./field-tools.css";

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
];
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
function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="field-tools">
      <Back />
      <h1>{title}</h1>
      {children}
    </div>
  );
}
function ErrorMessage({ error }: { error: string }) {
  const { l } = useLabels();
  const messages: Record<string, [string, string]> = {
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
function Sources({ children }: { children: ReactNode }) {
  const { l } = useLabels();
  return (
    <details className="field-sources">
      <summary>
        {l("Laskentaperuste ja lähteet", "Calculation basis and sources")}
      </summary>
      {children}
    </details>
  );
}
export function ThermalPowerCalculator() {
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
            setResult(calculateThermalPower(input));
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
          <h2>{number(result.powerKW)} kW</h2>
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
            sources: [thermalSource],
          }}
        />
      )}
      <Sources>
        <p className="mono">P = ρ · qᵥ · cₚ · (Tᵤₗₒₛ − Tₛᵢₛääₙ)</p>
        <p>
          {l(
            "Tiheys kg/m³, virtaama m³/s ja ominaislämpökapasiteetti kJ/(kg·K) tuottavat tehon kilowatteina.",
            "Density in kg/m³, flow in m³/s and specific heat in kJ/(kg·K) give power in kW.",
          )}
        </p>
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
    voltageV: "",
    currentA: "",
    resistanceOhm: "",
    powerFactor: "",
  });
  const [result, setResult] = useState<ReturnType<
    typeof calculateElectrical
  > | null>(null);
  const [error, setError] = useState("");
  const change = (key: keyof typeof input, value: string) => {
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setError("");
  };
  const ac = input.mode === "single_phase" || input.mode === "three_phase";
  return (
    <Layout title={l("Sähkölaskuri", "Electrical calculator")}>
      <form
        onChangeCapture={() => setDraftDirty(true)}
        onSubmit={(e) => {
          e.preventDefault();
          try {
            setResult(calculateElectrical(input));
            setError("");
          } catch (err) {
            setResult(null);
            setError((err as Error).message);
          }
        }}
      >
        <label>
          {l("Laskenta", "Calculation")}
          <select
            value={input.mode}
            onChange={(e) => change("mode", e.target.value)}
          >
            <option value="dc">{l("Tasavirta · teho", "DC · power")}</option>
            <option value="single_phase">
              {l("1-vaihe · teho", "Single phase · power")}
            </option>
            <option value="three_phase">
              {l("3-vaihe · teho", "Three phase · power")}
            </option>
            <option value="ohm">
              {l("Ohmin laki · tasavirta", "Ohm’s law · DC")}
            </option>
          </select>
        </label>
        <p>
          {input.mode === "three_phase"
            ? l(
                "Tasapainoinen 3-vaihekuorma: syötä pääjännite (vaiheiden väli) ja yhden johtimen virta. Käytä RMS-arvoja.",
                "Balanced three-phase load: enter line-to-line voltage and current in one line. Use RMS values.",
              )
            : ac
              ? l(
                  "1-vaihekuorma: syötä kuorman yli mitattu jännite ja virta RMS-arvoina.",
                  "Single-phase load: enter RMS voltage across the load and RMS current.",
                )
              : l(
                  "Tasavirran jännite- ja virta-arvot. Ohmin laki olettaa resistiivisen kuorman.",
                  "DC voltage and current values. Ohm’s law assumes a resistive load.",
                )}
        </p>
        <div className="field-tool-grid">
          <Numeric
            label={
              input.mode === "three_phase"
                ? l("Pääjännite · V", "Line-to-line voltage · V")
                : l("Jännite · V", "Voltage · V")
            }
            value={input.voltageV}
            onChange={(v) => change("voltageV", v)}
          />
          {input.mode === "ohm" ? (
            <Numeric
              label={l("Resistanssi · Ω", "Resistance · Ω")}
              value={input.resistanceOhm}
              onChange={(v) => change("resistanceOhm", v)}
            />
          ) : (
            <Numeric
              label={l("Virta · A", "Current · A")}
              value={input.currentA}
              onChange={(v) => change("currentA", v)}
            />
          )}
          {ac && (
            <Numeric
              label={l("Tehokerroin · 0–1", "Power factor · 0–1")}
              value={input.powerFactor}
              onChange={(v) => change("powerFactor", v)}
            />
          )}
        </div>
        <button className="primary" type="submit">
          {l("Laske", "Calculate")}
        </button>
        <ErrorMessage error={error} />
      </form>
      {result && (
        <section
          className="result-card field-result"
          aria-label={l("Sähkölaskennan tulos", "Electrical result")}
          aria-live="polite"
        >
          <h2>
            {l("Pätöteho", "Real power")}: {number(result.powerW)} W
          </h2>
          {result.apparentVA && (
            <p>
              {l("Näennäisteho", "Apparent power")}: {number(result.apparentVA)}{" "}
              VA
            </p>
          )}
          {input.mode === "ohm" && (
            <p>
              {l("Virta", "Current")}: {number(result.currentA)} A
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
            inputs: [
              reportRow("Laskenta", "Calculation", input.mode),
              reportRow(
                input.mode === "three_phase" ? "Pääjännite" : "Jännite",
                input.mode === "three_phase"
                  ? "Line-to-line voltage"
                  : "Voltage",
                input.voltageV,
                "V",
              ),
              ...(input.mode === "ohm"
                ? [
                    reportRow(
                      "Resistanssi",
                      "Resistance",
                      input.resistanceOhm,
                      "Ω",
                    ),
                  ]
                : [reportRow("Virta", "Current", input.currentA, "A")]),
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
            ],
            outputs: [
              reportRow("Pätöteho", "Real power", result.powerW, "W"),
              reportRow("Virta", "Current", result.currentA, "A"),
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
        <p className="mono">
          DC: P = U · I · · · I = U / R<br />
          1~: P = U · I · PF
          <br />
          3~: P = √3 · Uₗₗ · Iₗ · PF
        </p>
        <p>
          {l(
            "Vaihtovirtalaskenta olettaa sinimuotoisen kuorman (PF = cos φ), kolmivaihelaskenta myös tasapainoiset vaiheet. Tulos on sähköinen ottoteho; hyötysuhdetta tai moottorin akselitehoa ei lasketa. Laskuri ei mitoita suojalaitteita tai kaapeleita.",
            "AC calculation assumes sinusoidal conditions (PF = cos φ); three-phase also assumes a balanced load. Result is electrical input power; efficiency and motor shaft power are not calculated. This tool does not size protective devices or cables.",
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
  const { l, number } = useLabels();
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
  const change = (key: keyof typeof input, value: string) => {
    setInput((v) => ({ ...v, [key]: value }));
    setResult(null);
    setError("");
  };
  return (
    <Layout title={l("Putken tilavuus ja virtaus", "Pipe volume and flow")}>
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
          <h2>{number(result.volumeLitres)} l</h2>
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
      <Sources>
        <p className="mono">A = π · d² / 4 · · · V = A · L · · · v = qᵥ / A</p>
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
      </Sources>
    </Layout>
  );
}
export function WorkChecklists() {
  const { data, setData } = useApp();
  const { l, locale } = useLabels();
  const [kind, setKind] = useState<ChecklistKind>("tightness");
  const [selected, setSelected] = useState("");
  const [deletePending, setDeletePending] = useState(false);
  const draft = data.checklistDrafts.find((d) => d.id === selected);
  const definition = draft ? checklistDefinitions[draft.kind] : null;
  const update = (patch: Partial<ChecklistDraft>) => {
    setData((current) => ({
      ...current,
      checklistDrafts: current.checklistDrafts.map((d) =>
        d.id === selected
          ? { ...d, ...patch, updatedAt: new Date().toISOString() }
          : d,
      ),
    }));
  };
  const create = () => {
    if (data.checklistDrafts.length >= 1000) return;
    const record: ChecklistDraft = {
      id: crypto.randomUUID(),
      kind,
      title: "",
      updatedAt: new Date().toISOString(),
      checkedIds: [],
      fields: {},
      notes: "",
    };
    setData((current) => ({
      ...current,
      checklistDrafts: [...current.checklistDrafts, record],
    }));
    setSelected(record.id);
    setDeletePending(false);
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
  return (
    <Layout title={l("Tarkistuslistat", "Work checklists")}>
      <p>
        {l(
          "Kirjaa kohteen työvaiheet ja mittaukset. Määritä tavoitearvot valmistajan ohjeesta. Merkinnät eivät ole kokeen hyväksyntä tai määräystenmukaisuustodistus.",
          "Record work steps and measurements for your equipment. Use manufacturer instructions for target values. Checkmarks are not test acceptance or certification of compliance.",
        )}
      </p>
      <div className="field-tool-grid checklist-create">
        <label>
          {l("Uusi lista", "New checklist")}
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
          {l("Luo lista", "Create checklist")}
        </button>
      </div>
      {data.checklistDrafts.length >= 1000 && (
        <p role="status">
          {l(
            "Enintään 1 000 listaa. Vie ja poista vanhoja listoja ennen uuden luontia.",
            "Limit of 1,000 checklists. Export and remove old records before creating another.",
          )}
        </p>
      )}
      {data.checklistDrafts.length > 0 && (
        <label>
          {l("Omat listat", "Your checklists")}
          <select
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setDeletePending(false);
            }}
          >
            <option value="">{l("Valitse lista", "Choose a checklist")}</option>
            {data.checklistDrafts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title || checklistDefinitions[d.kind].name[locale]} ·{" "}
                {new Date(d.updatedAt).toLocaleDateString(locale)}
              </option>
            ))}
          </select>
        </label>
      )}
      {draft && definition && (
        <section className="checklist-record">
          <h2>{definition.name[locale]}</h2>
          <p className="muted small">
            {l(
              "Muutokset säilytetään tällä laitteella ja sisältyvät asetusten varmuuskopioon.",
              "Changes are stored on this device and included in Settings backups.",
            )}
          </p>
          <label>
            {l("Kohteen nimi", "Site name")}
            <input
              value={draft.title}
              maxLength={2000}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <div className="field-tool-grid">
            {commonChecklistFields.map((f) => (
              <label key={f.id}>
                {f.label[locale]}
                <input
                  value={draft.fields[f.id] ?? ""}
                  maxLength={2000}
                  onChange={(e) =>
                    update({
                      fields: { ...draft.fields, [f.id]: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
          <h3>{l("Työvaiheet", "Work steps")}</h3>
          <p className="small" role="status">
            {draft.checkedIds.length} / {definition.steps.length}{" "}
            {l("merkitty", "marked")}
          </p>
          {definition.steps.map((s) => (
            <label className="checkbox" key={s.id}>
              <input
                type="checkbox"
                checked={draft.checkedIds.includes(s.id)}
                onChange={(e) =>
                  update({
                    checkedIds: e.target.checked
                      ? [...draft.checkedIds, s.id]
                      : draft.checkedIds.filter((id) => id !== s.id),
                  })
                }
              />
              {s.label[locale]}
            </label>
          ))}
          <h3>
            {l("Mittaukset ja havainnot", "Measurements and observations")}
          </h3>
          {definition.fields.map((f) => (
            <label key={f.id}>
              {f.label[locale]}
              <input
                value={draft.fields[f.id] ?? ""}
                maxLength={2000}
                onChange={(e) =>
                  update({
                    fields: { ...draft.fields, [f.id]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          <label>
            {l("Muistiinpanot", "Notes")}
            <textarea
              rows={4}
              value={draft.notes}
              maxLength={10000}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </label>
          <div className="field-actions">
            <button className="secondary-button" onClick={download}>
              <Download size={18} />
              {l("Vie tekstinä", "Export text")}
            </button>
            <button
              className="text-button danger-text"
              onClick={() => setDeletePending(true)}
            >
              <Trash2 size={18} />
              {l("Poista lista", "Delete checklist")}
            </button>
          </div>
          {deletePending && (
            <div className="field-confirm">
              <p>
                {l(
                  "Poistetaanko tämä lista? Poistoa ei voi perua.",
                  "Delete this checklist? This cannot be undone.",
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
                  setSelected("");
                  setDeletePending(false);
                }}
              >
                {l("Vahvista poisto", "Confirm deletion")}
              </button>
            </div>
          )}
        </section>
      )}
      <Sources>
        <p>
          {l(
            "Listat ovat PhaseKitin yleisiä kirjauspohjia. Kohteen valmistajan ohje määrää työjärjestyksen, koeväliaineet, rajat ja hyväksymisen. Poikkeavat tai soveltumattomat kohdat kirjataan muistiinpanoihin.",
            "These are generic PhaseKit recording templates. Equipment manufacturer instructions determine sequence, media, limits and acceptance. Record exceptions or non-applicable steps in Notes.",
          )}
        </p>
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
