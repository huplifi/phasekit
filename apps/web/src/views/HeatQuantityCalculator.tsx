import { useState } from "react";
import {
  calculateHeatQuantity,
  type HeatMode,
  type HeatQuantityInput,
  type HeatQuantityResult,
} from "../../../../packages/core/src/heat-quantity";
import { useApp } from "../context";
import { useDraftGuard } from "../useDraftGuard";
import { Back } from "../components/Common";
import { ReportSave } from "../components/ReportSave";
import type { ReportRow } from "../storage";
import { heatMaterials, heatFormulaSource } from "../heat-materials";
import "./field-tools.css";
import "./heat-quantity.css";

const modes: { id: HeatMode; fi: string; en: string }[] = [
  { id: "energy", fi: "Lämpömäärä", en: "Heat energy" },
  {
    id: "time",
    fi: "Lämmitys- tai jäähdytysaika",
    en: "Heating or cooling time",
  },
  { id: "power", fi: "Tarvittava lämpöteho", en: "Required thermal power" },
  { id: "mass", fi: "Massa", en: "Mass" },
  { id: "temperature", fi: "Loppulämpötila", en: "Final temperature" },
  {
    id: "specific-heat",
    fi: "Ominaislämpökapasiteetti",
    en: "Specific heat capacity",
  },
];
const row = (
  fi: string,
  en: string,
  value: string,
  unit?: string,
): ReportRow => ({
  label: { fi, en },
  value,
  ...(unit ? { unit } : {}),
});
const errors: Record<string, [string, string]> = {
  positive_mass_required: [
    "Massan tai tilavuuden on oltava nollaa suurempi.",
    "Mass or volume must be greater than zero.",
  ],
  positive_properties_required: [
    "Ominaislämpökapasiteetin ja käytetyn tiheyden on oltava nollaa suurempia.",
    "Specific heat and any density used must be greater than zero.",
  ],
  positive_power_required: [
    "Lämpötehon on oltava nollaa suurempi.",
    "Thermal power must be greater than zero.",
  ],
  positive_duration_required: [
    "Ajan on oltava nollaa suurempi.",
    "Duration must be greater than zero.",
  ],
  invalid_temperature: [
    "Lämpötila ei voi olla alle −273,15 °C.",
    "Temperature cannot be below −273.15 °C.",
  ],
  nonzero_temperature_difference_required: [
    "Tässä laskennassa alku- ja loppulämpötilan on oltava eri suuret.",
    "This calculation requires different initial and final temperatures.",
  ],
  inconsistent_heat_direction: [
    "Lämpeneminen vaatii positiivisen ja jäähtyminen negatiivisen lämpömäärän.",
    "Heating requires positive energy and cooling requires negative energy.",
  ],
  water_temperature_range: [
    "Veden laskenta koskee nestemäistä vettä normaalissa ilmanpaineessa: alku- ja loppulämpötilan on oltava yli 0 ja alle 100 °C. Olomuodon muutosta ei lasketa.",
    "Water calculations apply to liquid water at normal atmospheric pressure: both temperatures must be above 0 and below 100 °C. Phase change is not included.",
  ],
  nonfinite_result: [
    "Arvot ovat liian suuria laskettavaksi. Tarkista luvut ja yksiköt.",
    "Values are too large to calculate. Check numbers and units.",
  ],
};

function Numeric({
  label,
  value,
  onChange,
  signed = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
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
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function HeatQuantityCalculator() {
  const { data } = useApp();
  const setDraftDirty = useDraftGuard();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const number = (value: string) =>
    new Intl.NumberFormat(data.locale === "fi" ? "fi-FI" : "en-GB", {
      maximumSignificantDigits: 6,
      notation:
        Math.abs(Number(value)) >= 1e7 ||
        (Number(value) !== 0 && Math.abs(Number(value)) < 1e-4)
          ? "scientific"
          : "standard",
    }).format(Number(value));
  const [materialId, setMaterialId] = useState("water");
  const material = heatMaterials.find((item) => item.id === materialId)!;
  const [input, setInput] = useState<HeatQuantityInput>(() => {
    const water = heatMaterials.find((item) => item.id === "water")!;
    return {
      mode: "energy",
      amount: "",
      amountUnit: "kg",
      densityKgM3: water.densityKgM3,
      specificHeatKJkgK: water.specificHeatKJkgK,
      inletC: "",
      outletC: "",
      energy: "",
      energyUnit: "kWh",
      powerKW: "",
      durationMinutes: "",
    };
  });
  const [customCp, setCustomCp] = useState(false);
  const [customDensity, setCustomDensity] = useState(false);
  const [result, setResult] = useState<HeatQuantityResult | null>(null);
  const [error, setError] = useState("");
  const resetResult = () => {
    setResult(null);
    setError("");
    setDraftDirty(true);
  };
  const change = <K extends keyof HeatQuantityInput>(
    key: K,
    value: HeatQuantityInput[K],
  ) => {
    setInput((previous) => ({ ...previous, [key]: value }));
    if (key === "specificHeatKJkgK") setCustomCp(true);
    if (key === "densityKgM3") setCustomDensity(true);
    resetResult();
  };
  const selectMaterial = (id: string) => {
    const next = heatMaterials.find((item) => item.id === id)!;
    setMaterialId(id);
    setInput((previous) => ({
      ...previous,
      specificHeatKJkgK: next.specificHeatKJkgK,
      densityKgM3: next.densityKgM3,
    }));
    setCustomCp(false);
    setCustomDensity(false);
    resetResult();
  };
  const inverse = ["mass", "temperature", "specific-heat"].includes(input.mode);
  const usesDensity = input.mode !== "mass" && input.amountUnit === "l";
  const usesCp = input.mode !== "specific-heat";
  const presetCp = usesCp && !customCp && material.specificHeatKJkgK !== "";
  const presetDensity =
    usesDensity && !customDensity && material.densityKgM3 !== "";
  const propertySources = presetCp || presetDensity ? material.sources : [];
  const sources = [
    ...new Map(
      [heatFormulaSource, ...propertySources].map((source) => [
        source.id,
        source,
      ]),
    ).values(),
  ];
  const target = modes.find((mode) => mode.id === input.mode)!;
  const sourceLabel = (preset: boolean) =>
    preset
      ? material.estimated
        ? l("Koostumuksesta arvioitu", "Composition estimate")
        : l("Taulukkoarvo", "Reference value")
      : l("Käyttäjän syöttämä", "User-supplied");
  const assumptions = l(
    "Q = m · c · (T₂ − T₁). Vakio-ominaisuudet, ei olomuodon muutosta. Lämpöhäviöitä tai astian lämpenemistä ei huomioida. Teho tarkoittaa aineeseen siirtyvää tai siitä poistuvaa lämpötehoa, ei laitteen sähkötehoa.",
    "Q = m · c · (T₂ − T₁). Constant properties, no phase change. Heat losses and container heating are excluded. Power is heat transferred to or from the material, not electrical input.",
  );
  const inputs: ReportRow[] = [
    row("Ratkaistava suure", "Solve for", input.mode),
    row("Aine", "Material", material.name[data.locale]),
    ...(input.mode !== "mass"
      ? [
          row(
            input.amountUnit === "kg" ? "Syötetty massa" : "Syötetty tilavuus",
            input.amountUnit === "kg" ? "Entered mass" : "Entered volume",
            input.amount,
            input.amountUnit,
          ),
        ]
      : []),
    row("Alkulämpötila", "Initial temperature", input.inletC, "°C"),
    ...(input.mode !== "temperature"
      ? [row("Loppulämpötila", "Final temperature", input.outletC, "°C")]
      : []),
    ...(usesCp
      ? [
          row(
            "Käytetty ominaislämpökapasiteetti",
            "Specific heat used",
            input.specificHeatKJkgK,
            "kJ/(kg·K)",
          ),
          row(
            "Ominaislämpöarvon alkuperä",
            "Specific heat provenance",
            sourceLabel(presetCp),
          ),
        ]
      : []),
    ...(usesDensity
      ? [
          row("Käytetty tiheys", "Density used", input.densityKgM3, "kg/m³"),
          row(
            "Tiheyden alkuperä",
            "Density provenance",
            sourceLabel(presetDensity),
          ),
        ]
      : []),
    ...(presetCp || presetDensity
      ? [
          row(
            "Taulukkoarvojen vertailuolosuhteet",
            "Reference conditions for preset values",
            material.reference[data.locale],
          ),
        ]
      : []),
    ...(inverse
      ? [
          row(
            "Syötetty lämpömäärä",
            "Entered heat energy",
            input.energy,
            input.energyUnit,
          ),
        ]
      : []),
    ...(input.mode === "time"
      ? [
          row(
            "Lämpöteho aineeseen / aineesta",
            "Heat transfer rate to / from material",
            input.powerKW,
            "kW",
          ),
        ]
      : []),
    ...(input.mode === "power"
      ? [row("Aika", "Duration", input.durationMinutes, "min")]
      : []),
    row(
      "Laskentaperuste ja rajaus",
      "Calculation basis and scope",
      assumptions,
    ),
  ];
  const outputs: ReportRow[] = result
    ? [
        row("Lämpömäärä", "Energy", result.energyKWh, "kWh"),
        row("Lämpömäärä", "Heat quantity", result.energyKJ, "kJ"),
        row("Massa", "Mass", result.massKg, "kg"),
        row("Lämpötilan muutos", "Temperature change", result.differenceK, "K"),
        ...(input.mode === "temperature"
          ? [
              row(
                "Laskettu loppulämpötila",
                "Final temperature",
                result.outletC,
                "°C",
              ),
            ]
          : []),
        ...(input.mode === "specific-heat"
          ? [
              row(
                "Laskettu ominaislämpökapasiteetti",
                "Specific heat capacity",
                result.specificHeatKJkgK,
                "kJ/(kg·K)",
              ),
            ]
          : []),
        ...(result.durationMinutes !== null
          ? [row("Ideaalinen aika", "Duration", result.durationMinutes, "min")]
          : []),
        ...(result.powerKW !== null
          ? [
              row(
                "Lämpöteho aineeseen / aineesta",
                "Thermal power",
                result.powerKW,
                "kW",
              ),
            ]
          : []),
      ]
    : [];
  const primary = result
    ? {
        energy: [result.energyKWh, "kWh"],
        time: [result.durationMinutes!, "min"],
        power: [result.powerKW!, "kW"],
        mass: [result.massKg, "kg"],
        temperature: [result.outletC, "°C"],
        "specific-heat": [result.specificHeatKJkgK, "kJ/(kg·K)"],
      }[input.mode]
    : null;

  return (
    <div className="field-tools heat-quantity">
      <Back to="/tools" />
      <h1>{l("Lämpömäärä ja lämmitysaika", "Heat energy and heating time")}</h1>
      <p>
        {l(
          "Laske aineen lämmittämiseen tai jäähdyttämiseen tarvittava energia tai ratkaise muu puuttuva suure.",
          "Calculate the energy needed to heat or cool a material, or solve another missing quantity.",
        )}
      </p>
      <form
        onChangeCapture={() => setDraftDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          try {
            const next = calculateHeatQuantity(input);
            if (
              materialId === "water" &&
              [next.inletC, next.outletC].some(
                (value) => Number(value) <= 0 || Number(value) >= 100,
              )
            )
              throw new Error("water_temperature_range");
            setResult(next);
            setError("");
          } catch (err) {
            setResult(null);
            setError((err as Error).message);
          }
        }}
      >
        <div className="field-tool-grid heat-choices">
          <label>
            {l("Ratkaise", "Solve for")}
            <select
              value={input.mode}
              onChange={(event) =>
                change("mode", event.target.value as HeatMode)
              }
            >
              {modes.map((mode) => (
                <option key={mode.id} value={mode.id}>
                  {l(mode.fi, mode.en)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {l("Aine", "Material")}
            <select
              value={materialId}
              onChange={(event) => selectMaterial(event.target.value)}
            >
              {heatMaterials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name[data.locale]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {materialId === "kiisseli" && (
          <p className="supporting-copy heat-material-note">
            {l(
              "Kotitehtävistä tuttu kiisseli. Voit muuttaa ominaislämpöarviota tehtävän mukaan.",
              "The homework favourite, now with a heat-capacity estimate. Adjust it to match your assignment.",
            )}
          </p>
        )}
        <div className="field-tool-grid">
          {input.mode !== "mass" && (
            <>
              <Numeric
                label={l("Määrä", "Material amount")}
                value={input.amount}
                onChange={(value) => change("amount", value)}
              />
              <label>
                {l("Määrän yksikkö", "Amount unit")}
                <select
                  value={input.amountUnit}
                  onChange={(event) =>
                    change("amountUnit", event.target.value as "kg" | "l")
                  }
                >
                  <option value="kg">kg</option>
                  <option value="l">l</option>
                </select>
              </label>
            </>
          )}
          <Numeric
            signed
            label={l("Alkulämpötila · °C", "Initial temperature · °C")}
            value={input.inletC}
            onChange={(value) => change("inletC", value)}
          />
          {input.mode !== "temperature" && (
            <Numeric
              signed
              label={l("Loppulämpötila · °C", "Final temperature · °C")}
              value={input.outletC}
              onChange={(value) => change("outletC", value)}
            />
          )}
          {inverse && (
            <>
              <Numeric
                signed
                label={l("Lämpömäärä", "Heat energy")}
                value={input.energy}
                onChange={(value) => change("energy", value)}
              />
              <label>
                {l("Energian yksikkö", "Energy unit")}
                <select
                  value={input.energyUnit}
                  onChange={(event) =>
                    change("energyUnit", event.target.value as "kJ" | "kWh")
                  }
                >
                  <option value="kWh">kWh</option>
                  <option value="kJ">kJ</option>
                </select>
              </label>
            </>
          )}
          {input.mode === "time" && (
            <Numeric
              label={l("Lämpöteho · kW", "Thermal power · kW")}
              value={input.powerKW}
              onChange={(value) => change("powerKW", value)}
            />
          )}
          {input.mode === "power" && (
            <Numeric
              label={l("Aika · min", "Duration · min")}
              value={input.durationMinutes}
              onChange={(value) => change("durationMinutes", value)}
            />
          )}
        </div>
        {inverse && (
          <p className="supporting-copy">
            {l(
              "Lämpömäärä: positiivinen lämmityksessä, negatiivinen jäähdytyksessä.",
              "Energy: positive for heating, negative for cooling.",
            )}
          </p>
        )}
        {(usesCp || usesDensity) && (
          <fieldset className="heat-properties">
            <legend>{l("Aineen ominaisuudet", "Material properties")}</legend>
            <div className="field-tool-grid">
              {usesCp && (
                <div>
                  <Numeric
                    label={l(
                      "Ominaislämpökapasiteetti · kJ/(kg·K)",
                      "Specific heat capacity · kJ/(kg·K)",
                    )}
                    value={input.specificHeatKJkgK}
                    onChange={(value) => change("specificHeatKJkgK", value)}
                  />
                  <p className="caption secondary">{sourceLabel(presetCp)}</p>
                </div>
              )}
              {usesDensity && (
                <div>
                  <Numeric
                    label={l("Tiheys · kg/m³", "Density · kg/m³")}
                    value={input.densityKgM3}
                    onChange={(value) => change("densityKgM3", value)}
                  />
                  <p className="caption secondary">
                    {sourceLabel(presetDensity)}
                  </p>
                </div>
              )}
            </div>
            {(presetCp || presetDensity) && (
              <p className="supporting-copy">
                {material.reference[data.locale]}
              </p>
            )}
          </fieldset>
        )}
        <p className="supporting-copy">
          {l(
            "Ominaislämpökapasiteetti oletetaan vakioksi koko lämpötilavälillä. Käytä tarkoitukseen sopivaa arvoa; sulaminen, jäätyminen ja höyrystyminen eivät sisälly laskentaan.",
            "Specific heat is assumed constant over the whole temperature interval. Use an appropriate value; melting, freezing and vaporisation are not included.",
          )}
        </p>
        <button className="primary" type="submit">
          {l("Laske", "Calculate")}
        </button>
        {error && (
          <p className="field-error" role="alert">
            {l(
              ...(errors[error] ?? [
                "Täytä laskennan kentät kelvollisilla luvuilla.",
                "Complete the calculation fields with valid numbers.",
              ]),
            )}
          </p>
        )}
      </form>
      {result && primary && (
        <>
          <section
            className="result-card field-result"
            aria-label={l("Lämpölaskennan tulos", "Heat calculation result")}
            aria-live="polite"
          >
            <h2>
              {input.mode === "time"
                ? l(
                    "Ideaalinen lämmitys- tai jäähdytysaika",
                    "Ideal heating or cooling time",
                  )
                : l(target.fi, target.en)}
            </h2>
            <p className="field-result-value">
              {number(primary[0])} {primary[1]}
            </p>
            <p>
              {material.name[data.locale]} · {number(result.massKg)} kg ·{" "}
              {number(result.inletC)} → {number(result.outletC)} °C
            </p>
            <dl className="heat-result-details">
              <div>
                <dt>{l("Lämpömäärä", "Heat energy")}</dt>
                <dd>
                  {number(result.energyKWh)} kWh · {number(result.energyKJ)} kJ
                </dd>
              </div>
              <div>
                <dt>{l("Lämpötilan muutos", "Temperature change")}</dt>
                <dd>{number(result.differenceK)} K</dd>
              </div>
              {result.durationMinutes !== null && (
                <div>
                  <dt>{l("Ideaalinen aika", "Ideal duration")}</dt>
                  <dd>{number(result.durationMinutes)} min</dd>
                </div>
              )}
              {result.powerKW !== null && (
                <div>
                  <dt>{l("Lämpöteho", "Thermal power")}</dt>
                  <dd>{number(result.powerKW)} kW</dd>
                </div>
              )}
            </dl>
            <p className="supporting-copy">
              {l(
                "Positiivinen lämpömäärä lämmittää, negatiivinen jäähdyttää. Aika ja teho ovat ideaalinen arvio ilman lämpöhäviöitä ja astian lämpenemistä. Teho tarkoittaa aineeseen siirtyvää tai siitä poistuvaa lämpötehoa, ei sähkötehoa.",
                "Positive heat energy warms the material; negative heat energy cools it. Time and power are ideal estimates excluding losses and container heating. Power means heat transferred to or from the material, not electrical input.",
              )}
            </p>
          </section>
          <details className="heat-formula">
            <summary>
              {l("Kaava ja sijoitus", "Formula and substitution")}
            </summary>
            <p className="field-formula">Q = m · c · (T₂ − T₁)</p>
            <p className="field-formula">
              {number(result.energyKJ)} kJ = {number(result.massKg)} kg ×{" "}
              {number(result.specificHeatKJkgK)} kJ/(kg·K) × (
              {number(result.outletC)} − {number(result.inletC)}) K
            </p>
            {input.mode === "mass" && (
              <p className="field-formula">m = Q / (c · ΔT)</p>
            )}
            {input.mode === "temperature" && (
              <p className="field-formula">T₂ = T₁ + Q / (m · c)</p>
            )}
            {input.mode === "specific-heat" && (
              <p className="field-formula">c = Q / (m · ΔT)</p>
            )}
            {input.mode === "time" &&
              result.durationMinutes !== null &&
              result.powerKW !== null && (
                <p className="field-formula">
                  t = |Q| / P = |{number(result.energyKJ)}| kJ /{" "}
                  {number(result.powerKW)} kW / 60 ={" "}
                  {number(result.durationMinutes)} min
                </p>
              )}
            {input.mode === "power" &&
              result.durationMinutes !== null &&
              result.powerKW !== null && (
                <p className="field-formula">
                  P = |Q| / t = |{number(result.energyKJ)}| kJ / (
                  {number(result.durationMinutes)} × 60) s ={" "}
                  {number(result.powerKW)} kW
                </p>
              )}
            <p className="supporting-copy">
              {l(
                "Näytön arvot on pyöristetty. Tallennus säilyttää laskennan tarkat luvut.",
                "Displayed values are rounded. Saved records retain the exact calculated values.",
              )}
            </p>
          </details>
          <ReportSave
            key={JSON.stringify({
              input,
              materialId,
              customCp,
              customDensity,
              result,
            })}
            content={{
              tool: "heat-quantity",
              title: `${material.name[data.locale]} · ${l(target.fi, target.en)}`,
              inputs,
              outputs,
              sources,
            }}
          />
        </>
      )}
      <details className="field-sources">
        <summary>
          {l("Laskentaperuste ja lähteet", "Calculation basis and sources")}
        </summary>
        <p>{assumptions}</p>
        <ul>
          {sources.map((source) => (
            <li key={source.id}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.title}
              </a>
            </li>
          ))}
        </ul>
      </details>
      <p className="supporting-copy">
        <a href="#/thermal-power">
          {l(
            "Virtaavan nesteen lämpöteho →",
            "Thermal power of a flowing liquid →",
          )}
        </a>
      </p>
    </div>
  );
}
