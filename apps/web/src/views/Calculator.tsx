import { ExclusiveChoices } from "../components/ExclusiveChoices";
import { SignedDecimalInput } from "../components/SignedDecimalInput";
import {
  calculatePHCycle,
  getPHAvailability,
  getPHDiagram,
  type PHCycleResult,
} from "../../../../packages/core/src/ph";
import { PHDiagramPanel, phErrorText } from "./PHCalculator";
import {
  createCycleChartSnapshot,
  DEFAULT_PH_CHART_VIEW,
  type PHChartView,
} from "../ph-chart-snapshot";
import { ArrowLeftRight } from "lucide-react";
import { CO2eBreakdown } from "../components/CO2eBreakdown";
import { InfoHelp } from "../components/InfoHelp";
import { useEffect, useRef, useState } from "react";
import {
  calculateSHSC,
  convertCO2e,
} from "../../../../packages/core/src/tool-calculations";
import {
  getPTAvailability,
  offlinePTProvider,
  type PTResult,
  type SaturationSide,
} from "../../../../packages/core/src/pt";
import {
  convertPressure,
  parseDecimal,
  type PressureUnit,
} from "../../../../packages/core/src/units";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import { formatDecimal } from "../../../../packages/i18n/src";
import { useApp } from "../context";
import { byId, dataset } from "../data";
import { ReportSave, type ReportContent } from "../components/ReportSave";
import type { ReportRow } from "../storage";
import { co2eBreakdown } from "../../../../packages/core/src/co2e-breakdown";
import { Back, SourceNote } from "../components/Common";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import { formatPTReading, convertPTTemperature } from "./pt-state";
import {
  cycleEntryDisplay,
  cyclePressure,
  type CycleEntry,
  type CycleInputMode,
} from "./cycle-input";
import "./calculator.css";

type Tool = "shsc" | "co2e";
function defaultGwpKey(refrigerant?: Refrigerant) {
  return (
    ["gwp_eu_2024_573_100yr", "gwp_eu_2024_590_100yr"].find((key) => {
      const fact = refrigerant?.facts[key];
      return (
        fact?.state === "verified" &&
        fact.value !== null &&
        fact.basis &&
        fact.sourceIds.length > 0
      );
    }) ?? ""
  );
}
interface Output {
  value: string;
  unit: string;
  mode?: "superheat" | "subcooling";
  saturation?: PTResult;
  sourceIds: string[];
  basis?: string;
  kg?: string;
  negative?: boolean;
  measuredC?: string;
  differenceK?: string;
}
const formatNumber = (value: number, locale: "fi" | "en", digits: number) =>
  new Intl.NumberFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    maximumFractionDigits: digits,
  }).format(value);
const formatPressure = (value: number, locale: "fi" | "en") =>
  new Intl.NumberFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    maximumSignificantDigits: 3,
    notation:
      value !== 0 && (Math.abs(value) < 0.001 || Math.abs(value) > 100000)
        ? "scientific"
        : "standard",
  }).format(value);
const pressureUnits = ["bar", "kPa", "MPa", "psi"] as const;
const errors: Record<string, [string, string]> = {
  high_pressure_must_exceed_low: [
    "HP-paineen on oltava LP-painetta suurempi.",
    "HP must exceed LP.",
  ],
  invalid_temperature: [
    "Lämpötila ei voi olla absoluuttisen nollapisteen alapuolella.",
    "Temperature cannot be below absolute zero.",
  ],
  negative_quantity: [
    "Määrä ei voi olla negatiivinen.",
    "Quantity cannot be negative.",
  ],
  negative_gwp: ["GWP ei voi olla negatiivinen.", "GWP cannot be negative."],
  invalid_atmospheric_reference: [
    "Ilmanpaineen on oltava nollaa suurempi.",
    "Atmospheric pressure must be positive.",
  ],
  nonpositive_absolute_pressure: [
    "Absoluuttisen paineen on oltava nollaa suurempi.",
    "Absolute pressure must be positive.",
  ],
  negative_absolute_pressure: [
    "Syöte tuottaa negatiivisen absoluuttisen paineen. Tarkista yksikkö ja ilmanpaineviite.",
    "This input produces negative absolute pressure. Check the unit and atmospheric reference.",
  ],
  decimal_precision_exceeded: [
    "Syötä enintään 40 numeroa.",
    "Enter at most 40 digits.",
  ],

  pt_unsupported_refrigerant_or_side: [
    "Tälle kylmäaineelle ei ole vielä P–T-aineistoa valitulle faasirajalle.",
    "No P–T data is available for this refrigerant and phase boundary.",
  ],
  pt_out_of_range: [
    "Arvo on aineiston käyttöalueen ulkopuolella. Katso rajat alta.",
    "The value is outside the data range. See the limits below.",
  ],
  verified_gwp_with_basis_required: [
    "Valitse varmennettu GWP ja sen laskentaperuste.",
    "Select a verified GWP and its basis.",
  ],
  positive_gwp_required: [
    "Käänteinen muunnos edellyttää nollaa suurempaa GWP-arvoa.",
    "The inverse conversion requires a positive GWP.",
  ],
  zero_gwp_inverse_undefined: [
    "Kun GWP on nolla, CO₂e-arvosta ei voida päätellä massaa.",
    "Mass cannot be inferred from CO₂e when GWP is zero.",
  ],
};
export function Calculator({
  tool,
  initial,
}: {
  tool: Tool;
  initial?: Refrigerant;
}) {
  const { data, t, setDraftDirty } = useApp();
  const fi = data.locale === "fi";
  const l = (a: string, b: string) => (fi ? a : b);
  const [id, setId] = useState(initial?.id ?? "");
  const [direction, setDirection] = useState(false);
  const [inputMode, setInputMode] = useState<CycleInputMode>("pressure");
  const [lowEntry, setLowEntry] = useState<CycleEntry>({
    kind: "pressure",
    value: "",
    unit: "bar(a)",
  });
  const [highEntry, setHighEntry] = useState<CycleEntry>({
    kind: "pressure",
    value: "",
    unit: "bar(a)",
  });
  const [lowSide, setLowSide] = useState<SaturationSide>("dew");
  const [highSide, setHighSide] = useState<SaturationSide>("dew");
  const [resolvedPressures, setResolvedPressures] = useState<{
    low?: string;
    high?: string;
  } | null>(null);
  const [hotGas, setHotGas] = useState("");
  const [liquid, setLiquid] = useState("");
  const [value, setValue] = useState("");
  const [measured, setMeasured] = useState("");
  const [pressureUnit, setPressureUnit] = useState<PressureUnit>("bar(a)");
  const [tempUnit, setTempUnit] = useState<"C" | "F">("C");
  const [atmosphere, setAtmosphere] = useState("1.01325");
  const [gwpKey, setGwpKey] = useState(() => defaultGwpKey(initial));
  const [cycle, setCycle] = useState<PHCycleResult | null>(null);
  const [chartView, setChartView] = useState<PHChartView>(
    DEFAULT_PH_CHART_VIEW,
  );
  const [diagramMessage, setDiagramMessage] = useState("");
  const [output, setOutput] = useState<Output[] | null>(null);
  const [error, setError] = useState("");
  const [unitError, setUnitError] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const r = byId.get(id);
  const available = getPTAvailability(id, "dew");
  const liquidAvailable = getPTAvailability(id, "bubble");
  const gwps = Object.entries(r?.facts ?? {}).filter(
    ([key, fact]) =>
      key.startsWith("gwp_") &&
      fact.state === "verified" &&
      fact.value !== null &&
      fact.basis &&
      fact.sourceIds.length,
  );
  const selectedGwp = gwps.find(([key]) => key === gwpKey)?.[1];
  useEffect(() => () => setDraftDirty(false), [setDraftDirty]);
  function changed() {
    setOutput(null);
    setResolvedPressures(null);
    setCycle(null);
    setChartView((previous) => ({ ...previous, fitCycle: false }));
    setDiagramMessage("");
    setError("");
    setUnitError(false);
    setDraftDirty(true);
  }
  function selectId(next: string) {
    setId(next);
    setGwpKey(defaultGwpKey(byId.get(next)));
    changed();
  }
  function displayedEntry(entry: CycleEntry, side: SaturationSide) {
    try {
      const display = cycleEntryDisplay({
        id,
        entry,
        mode: inputMode,
        side,
        pressureUnit,
        tempUnit,
        atmosphere,
      });
      return display && entry.kind !== inputMode
        ? formatPTReading(display, inputMode)
        : display;
    } catch {
      // Preserve an unfinished original entry; a derived counterpart is unavailable.
      return entry.kind === inputMode &&
        entry.unit === (inputMode === "pressure" ? pressureUnit : tempUnit)
        ? entry.value
        : "";
    }
  }
  const lowInput = displayedEntry(lowEntry, lowSide);
  const highInput = displayedEntry(highEntry, highSide);
  function editEntry(high: boolean, next: string) {
    const entry: CycleEntry =
      inputMode === "pressure"
        ? { kind: "pressure", value: next, unit: pressureUnit }
        : {
            kind: "temperature",
            value: next,
            unit: tempUnit,
            side: high ? highSide : lowSide,
          };
    (high ? setHighEntry : setLowEntry)(entry);
    changed();
  }
  function changeBoundary(high: boolean, side: SaturationSide) {
    // A boundary selector describes the entered temperature, not the SH/SC reference.
    const current = high ? highInput : lowInput;
    (high ? setHighSide : setLowSide)(side);
    if ((high ? highEntry : lowEntry).kind === "temperature")
      (high ? setHighEntry : setLowEntry)({
        kind: "temperature",
        value: current,
        unit: tempUnit,
        side,
      });
    changed();
  }
  function changePressureUnit(next: PressureUnit) {
    if (next === pressureUnit) return;
    try {
      for (const entry of [lowEntry, highEntry]) {
        if (entry.value.trim() && entry.kind === "pressure")
          convertPressure({ value: entry.value, unit: entry.unit }, next, {
            value: atmosphere,
            unit: "bar(a)",
          });
      }
    } catch {
      setUnitError(true);
      return;
    }
    setPressureUnit(next);
    changed();
  }
  function changeAtmosphere(next: string) {
    // Keep the entered gauge measurement; the new reference changes its
    // derived absolute pressure.
    setAtmosphere(next);
    changed();
  }
  function changeTemperatureUnit(next: "C" | "F") {
    if (next === tempUnit) return;
    try {
      for (const entry of [lowEntry, highEntry]) {
        if (entry.kind === "temperature" && entry.value.trim())
          cycleEntryDisplay({
            id,
            entry,
            mode: "temperature",
            side: entry.side,
            pressureUnit,
            tempUnit: next,
            atmosphere,
          });
      }
      const converted = [measured, hotGas, liquid].map((entry) => {
        if (!entry.trim()) return entry;
        return convertPTTemperature(entry, tempUnit, next);
      });
      setMeasured(converted[0]);
      setHotGas(converted[1]);
      setLiquid(converted[2]);
      setUnitError(false);
    } catch {
      setUnitError(true);
      return;
    }
    setTempUnit(next);
    changed();
  }
  function calculate() {
    setOutput(null);
    setResolvedPressures(null);
    setCycle(null);
    setDiagramMessage("");
    setError("");
    if (!r) {
      setError(l("Valitse kylmäaine.", "Select a refrigerant."));
      return;
    }
    try {
      const atm = { value: atmosphere, unit: "bar(a)" as const };
      if (tool === "co2e") {
        if (!selectedGwp) throw new Error("verified_gwp_with_basis_required");
        const result = convertCO2e({
          direction: direction ? "tonnes_co2e_to_kg" : "kg_to_tonnes_co2e",
          value,
          gwpFact: selectedGwp,
        });
        setOutput([
          {
            value: direction ? result.kg : result.tonnesCO2e,
            unit: direction ? "kg" : "t CO₂e",
            kg: result.kg,
            basis: `${result.gwpBasis} · GWP ${formatDecimal(result.gwp, data.locale)}`,
            sourceIds: result.sourceIds,
          },
        ]);
      } else if (tool === "shsc") {
        const low = cyclePressure(id, lowEntry, atmosphere);
        const high = cyclePressure(id, highEntry, atmosphere);
        if (low && high && parseDecimal(high).lte(low))
          throw new Error("high_pressure_must_exceed_low");
        for (const entry of [measured, liquid].filter((entry) =>
          entry.trim(),
        )) {
          const temperature = parseDecimal(entry);
          if (temperature.lt(tempUnit === "C" ? "-273.15" : "-459.67"))
            throw new Error("invalid_temperature");
        }
        const results = (["superheat", "subcooling"] as const).flatMap(
          (mode): Output[] => {
            const pressure = mode === "superheat" ? low : high;
            const temperature = mode === "superheat" ? measured : liquid;
            if (!pressure || !temperature.trim()) return [];
            const result = calculateSHSC({
              refrigerantId: id,
              mode,
              pressure: {
                value: pressure,
                unit: "bar(a)",
              },
              measuredTemperature: {
                value: mode === "superheat" ? measured : liquid,
                unit: tempUnit,
              },
              atmosphere: atm,
            });
            return [
              {
                mode,
                value:
                  tempUnit === "C" ? result.differenceK : result.differenceF,
                unit: tempUnit === "C" ? "K" : "°F Δ",
                saturation: result.saturation,
                sourceIds: result.saturation.provider.sourceIds,
                negative: Number(result.differenceK) < 0,
                measuredC: result.measuredTemperatureC,
                differenceK: result.differenceK,
              },
            ];
          },
        );
        if (!results.length) {
          setError(
            l(
              "Syötä vähintään LP ja imulämpötila tai HP ja nestelämpötila.",
              "Enter at least LP and suction temperature, or HP and liquid temperature.",
            ),
          );
          return;
        }
        setResolvedPressures({ low, high });
        setOutput(results);
        if (!getPHAvailability(id).supported) {
          setDiagramMessage(
            l(
              "Tälle kylmäaineelle ei ole p–h-aineistoa.",
              "No p–h data is available for this refrigerant.",
            ),
          );
        } else if (
          low &&
          high &&
          measured.trim() &&
          liquid.trim() &&
          !hotGas.trim()
        ) {
          setDiagramMessage(
            l(
              "Lisää Kuumakaasu-lämpötila, niin myös neljän pisteen kierto voidaan laskea.",
              "Add the hot-gas temperature to calculate the four-point cycle.",
            ),
          );
        } else if (
          !low ||
          !high ||
          !measured.trim() ||
          !liquid.trim() ||
          !hotGas.trim()
        ) {
          setDiagramMessage(
            l(
              "Täydennä molemmat puolet sekä imu-, kuumakaasu- ja nestelämpötilat neljän pisteen kiertoa varten.",
              "Complete both sides and the suction, hot-gas and liquid temperatures for the four-point cycle.",
            ),
          );
        } else {
          try {
            setCycle(
              calculatePHCycle({
                refrigerantId: id,
                lowPressure: { value: low, unit: "bar(a)" },
                highPressure: { value: high, unit: "bar(a)" },
                T1: { value: measured, unit: tempUnit },
                T2: { value: hotGas, unit: tempUnit },
                T3: { value: liquid, unit: tempUnit },
                atmosphere: atm,
              }),
            );
          } catch (caught) {
            setDiagramMessage(phErrorText(caught, fi));
          }
        }
      }
      setDraftDirty(false);
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setError(
        errors[code]?.[fi ? 0 : 1] ??
          l(
            "Tarkista luvut ja yksiköt. Käytä desimaalipilkkua tai -pistettä.",
            "Check values and units. Use a decimal comma or point.",
          ),
      );
    }
    requestAnimationFrame(() => resultRef.current?.focus());
  }
  const title = tool === "shsc" ? t("shsc") : "kg ↔ CO₂e";
  const reportRow = (
    fi: string,
    en: string,
    value: string,
    unit?: string,
  ): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
  let report: ReportContent | undefined;
  if (r && output && !error && !unitError) {
    const inputRows = [
      reportRow("Kylmäaine", "Refrigerant", `${r.designation} (${r.id})`),
      reportRow("Luokka", "Family", r.family),
    ];
    const outputRows = output.flatMap((item) => [
      reportRow(
        item.mode === "superheat"
          ? "Tulistus"
          : item.mode === "subcooling"
            ? "Alijäähdytys"
            : "Tulos",
        item.mode === "superheat"
          ? "Superheat"
          : item.mode === "subcooling"
            ? "Subcooling"
            : "Result",
        item.value,
        item.unit,
      ),
      ...(item.saturation
        ? [
            reportRow(
              item.mode === "superheat" ? "Kastepiste" : "Kuplapiste",
              item.mode === "superheat" ? "Dew point" : "Bubble point",
              item.saturation.temperatureC,
              "°C",
            ),
          ]
        : []),
    ]);
    const sourceIds = new Set([
      ...r.sourceIds,
      ...output.flatMap((item) => item.sourceIds),
    ]);
    if (tool === "co2e" && selectedGwp && output[0].kg !== undefined) {
      inputRows.push(
        reportRow(
          "Syötetty määrä",
          "Entered quantity",
          value,
          direction ? "t CO₂e" : "kg",
        ),
        reportRow("GWP", "GWP", String(selectedGwp.value)),
        reportRow("GWP-peruste", "GWP basis", selectedGwp.basis!),
      );
      const breakdown = co2eBreakdown({
        refrigerant: r,
        refrigerants: dataset.refrigerants,
        kg: output[0].kg,
        gwpKey,
      });
      for (const component of breakdown.rows) {
        component.sourceIds.forEach((id) => sourceIds.add(id));
        outputRows.push(
          reportRow(
            `${component.designation} · massaosuus`,
            `${component.designation} · mass fraction`,
            component.massPercent,
            "%",
          ),
          reportRow(
            `${component.designation} · massa`,
            `${component.designation} · mass`,
            component.massKg,
            "kg",
          ),
        );
        if (component.gwp !== null)
          outputRows.push(
            reportRow(
              `${component.designation} · GWP`,
              `${component.designation} · GWP`,
              component.gwp,
            ),
            reportRow(
              `${component.designation} · GWP-peruste`,
              `${component.designation} · GWP basis`,
              component.basis!,
            ),
          );
        outputRows.push(
          reportRow(
            `${component.designation} · CO₂e`,
            `${component.designation} · CO₂e`,
            component.tonnesCO2e ?? "unavailable",
            component.tonnesCO2e === null ? undefined : "t CO₂e",
          ),
        );
      }
      outputRows.push(
        reportRow(
          "Erittelyn tila",
          "Breakdown status",
          breakdown.status === "complete"
            ? breakdown.reconciled
              ? "reconciled"
              : "mismatch"
            : `unavailable: ${breakdown.reason}`,
        ),
      );
      if (breakdown.componentTonnesCO2e !== null)
        outputRows.push(
          reportRow(
            "Komponenttien summa",
            "Component total",
            breakdown.componentTonnesCO2e,
            "t CO₂e",
          ),
          reportRow(
            "Ero kokonaistulokseen",
            "Difference from headline total",
            breakdown.differenceTonnesCO2e!,
            "t CO₂e",
          ),
        );
    } else if (tool === "shsc") {
      for (const [sideLabel, entry] of [
        ["LP", lowEntry],
        ["HP", highEntry],
      ] as const) {
        if (!entry.value.trim()) continue;
        inputRows.push(
          entry.kind === "pressure"
            ? reportRow(
                sideLabel === "LP" ? "LP · Imupaine" : "HP · Korkeapaine",
                sideLabel === "LP"
                  ? "LP · Suction pressure"
                  : "HP · High pressure",
                entry.value,
                entry.unit,
              )
            : reportRow(
                sideLabel === "LP"
                  ? "LP · Syötetty höyrystymislämpötila"
                  : "HP · Syötetty lauhtumislämpötila",
                sideLabel === "LP"
                  ? "LP · Entered evaporation temperature"
                  : "HP · Entered condensation temperature",
                entry.value,
                "°" + entry.unit,
              ),
        );
        if (entry.kind === "temperature")
          inputRows.push(
            reportRow(
              sideLabel + " · Syötteen faasiraja",
              sideLabel + " · Entered phase boundary",
              entry.side,
            ),
          );
        const pressure =
          sideLabel === "LP" ? resolvedPressures?.low : resolvedPressures?.high;
        if (pressure)
          outputRows.push(
            reportRow(
              sideLabel + " · Laskettu absoluuttinen paine",
              sideLabel + " · Calculated absolute pressure",
              pressure,
              "bar(a)",
            ),
          );
      }
      if (measured.trim())
        inputRows.push(reportRow("Imu", "Suction", measured, "°" + tempUnit));
      if (liquid.trim())
        inputRows.push(reportRow("Neste", "Liquid", liquid, "°" + tempUnit));
      if (hotGas.trim())
        inputRows.push(
          reportRow("Kuumakaasu", "Hot gas", hotGas, `°${tempUnit}`),
        );
      if (
        [lowEntry, highEntry].some(
          (entry) => entry.kind === "pressure" && entry.unit.endsWith("(g)"),
        )
      )
        inputRows.push(
          reportRow(
            "Ilmanpaineviite",
            "Atmospheric reference",
            atmosphere,
            "bar(a)",
          ),
        );
      if (cycle) {
        cycle.sourceIds.forEach((id) => sourceIds.add(id));
        for (const point of Object.values(cycle.points)) {
          outputRows.push(
            reportRow(
              `Piste ${point.label} · paine`,
              `Point ${point.label} · pressure`,
              point.pressureBarAbsolute,
              "bar(a)",
            ),
            reportRow(
              `Piste ${point.label} · entalpia`,
              `Point ${point.label} · enthalpy`,
              point.enthalpyKJkg,
              "kJ/kg",
            ),
          );
          if (point.temperatureC !== null)
            outputRows.push(
              reportRow(
                `Piste ${point.label} · lämpötila`,
                `Point ${point.label} · temperature`,
                point.temperatureC,
                "°C",
              ),
            );
        }
        outputRows.push(
          reportRow(
            "Pisteen 4 oletus",
            "Point 4 assumption",
            cycle.point4Assumption,
          ),
          reportRow(
            "p–h-aineistoversio",
            "p–h dataset version",
            cycle.dataVersion,
          ),
        );
      } else if (diagramMessage)
        outputRows.push(
          reportRow("Kaavion tila", "Diagram status", diagramMessage),
        );
      outputRows.push(
        reportRow(
          "P–T-aineistoversio",
          "P–T dataset version",
          offlinePTProvider.metadata.dataVersion,
        ),
      );
    }
    report = {
      tool: tool === "shsc" ? "cycle" : "co2e",
      title: `${r.designation} · ${tool === "shsc" ? "Kylmäkierto / Refrigeration cycle" : "kg ↔ CO₂e"}`,
      inputs: inputRows,
      outputs: outputRows,
      dataVersion: dataset.version,
      sources: dataset.sources.filter((source) => sourceIds.has(source.id)),
      ...(cycle && getPHDiagram(id)
        ? {
            chartSnapshot: createCycleChartSnapshot(
              getPHDiagram(id)!,
              cycle,
              chartView,
            ),
          }
        : {}),
    };
  }
  return (
    <>
      <Back to="/tools" />
      <div className="help-heading calculator-heading">
        <h1 className="long-heading">
          {tool === "co2e" ? (
            <span className="conversion-title" aria-label="kg ↔ CO₂e">
              kg <ArrowLeftRight aria-hidden="true" /> CO₂e
            </span>
          ) : (
            title
          )}
        </h1>
        {tool === "co2e" && (
          <InfoHelp label={l("CO₂e-muunnos", "CO₂e conversion")}>
            {l(
              "Muunnos kuvaa koko kylmäainetäytöksen CO₂-ekvivalenttia. Vuototarkastusväli arvioidaan erillisellä työkalulla aineen koostumuksen ja laitteen tietojen perusteella.",
              "This converts the entire refrigerant charge to CO₂ equivalent. Use the separate leak-check tool to assess intervals from refrigerant composition and equipment details.",
            )}
          </InfoHelp>
        )}
      </div>
      <div className={tool === "shsc" ? "cycle-toolbar" : undefined}>
        <RefrigerantPicker value={id} onChange={selectId} />
        {tool === "shsc" && (
          <details className="cycle-unit-settings">
            <summary
              aria-label={
                l("Yksiköt ja paineviite", "Units and pressure reference") +
                " · " +
                pressureUnit +
                " · °" +
                tempUnit
              }
            >
              {pressureUnit} · °{tempUnit}
            </summary>
            <div className="form-grid shsc-unit-settings">
              <label>
                {l("Paineyksikkö", "Pressure unit")}
                <select
                  value={pressureUnit.split("(")[0]}
                  onChange={(e) =>
                    changePressureUnit(
                      `${e.target.value}(${pressureUnit.endsWith("(a)") ? "a" : "g"})` as PressureUnit,
                    )
                  }
                >
                  {pressureUnits.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </label>
              <label>
                {l("Lämpötilayksikkö", "Temperature unit")}
                <select
                  value={tempUnit}
                  onChange={(e) =>
                    changeTemperatureUnit(e.target.value as "C" | "F")
                  }
                >
                  <option value="C">°C</option>
                  <option value="F">°F</option>
                </select>
              </label>
            </div>
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
                  "Päällä: absoluuttinen paine. Pois: mittaripaine suhteessa ilmanpaineeseen. Vaihto muuntaa syötetyn paineen.",
                  "On: absolute pressure. Off: gauge pressure relative to atmosphere. Switching converts the entered pressure.",
                )}
              </InfoHelp>
            </div>
            {pressureUnit.endsWith("(g)") && (
              <label>
                {l("Ilmanpaine, bar(a)", "Atmospheric pressure, bar(a)")}
                <input
                  inputMode="decimal"
                  className="mono"
                  id="cycle-atmosphere"
                  value={atmosphere}
                  onChange={(e) => changeAtmosphere(e.target.value)}
                  required
                />
                <span className="caption">
                  {l(
                    "Oletus 1,01325 bar(a) on standardi-ilmakehä. Muuta tarvittaessa mitattuun paikalliseen paineeseen.",
                    "The default 1.01325 bar(a) is standard atmosphere. Adjust to measured local pressure when needed.",
                  )}
                </span>
              </label>
            )}
          </details>
        )}
      </div>
      <form
        className={`calculator-form${tool === "co2e" ? " co2e-form" : " cycle-form"}`}
        onSubmit={(e) => {
          e.preventDefault();
          calculate();
        }}
      >
        {tool === "co2e" && (
          <>
            <div className="field-group">
              <div className="help-heading">
                <label htmlFor="co2e-basis">
                  {l("GWP-laskentaperuste", "GWP basis")}
                </label>
                <InfoHelp label={l("GWP-laskentaperuste", "GWP basis")}>
                  {l(
                    "GWP riippuu käytetystä arvioinnista tai säädöksestä. Oletuksena on aineelle varmennettu EU-peruste. Valittu peruste ja sen arvo näkyvät myös tuloksessa.",
                    "GWP depends on the assessment or regulation used. The verified EU basis is selected by default when available. The result also shows the selected basis and value.",
                  )}
                </InfoHelp>
              </div>
              <select
                id="co2e-basis"
                value={selectedGwp ? gwpKey : ""}
                onChange={(e) => {
                  setGwpKey(e.target.value);
                  changed();
                }}
              >
                <option value="">
                  {l("Valitse laskentaperuste", "Select a basis")}
                </option>
                {gwps.map(([key, fact]) => (
                  <option value={key} key={key}>
                    {fact.basis} ·{" "}
                    {formatDecimal(String(fact.value), data.locale)}
                  </option>
                ))}
              </select>
            </div>
            {r && !gwps.length && (
              <p className="notice">
                {l(
                  "Kylmäaineelta puuttuu varmennettu GWP-arvo laskentaperusteineen.",
                  "This refrigerant has no verified GWP with a stated basis.",
                )}
              </p>
            )}
          </>
        )}
        {tool === "co2e" && (
          <div className="co2e-quantity">
            <div className="co2e-quantity-heading">
              <label htmlFor="co2e-quantity">
                {direction ? "t CO₂e" : l("Massa (kg)", "Mass (kg)")}
              </label>
              <ExclusiveChoices
                className="quantity-choices"
                label={l("Syötettävä yksikkö", "Input unit")}
                value={direction ? "co2e" : "mass"}
                options={[
                  { value: "mass", label: "kg" },
                  { value: "co2e", label: "t CO₂e" },
                ]}
                onChange={(next) => {
                  const inverse = next === "co2e";
                  if (direction === inverse) return;
                  setDirection(inverse);
                  setValue("");
                  changed();
                }}
              />
            </div>
            <input
              id="co2e-quantity"
              inputMode="decimal"
              autoComplete="off"
              className="mono"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                changed();
              }}
              required
            />
          </div>
        )}

        {tool === "shsc" && (
          <>
            <ExclusiveChoices
              className="cycle-input-mode"
              label={l("Syöttötapa", "Input mode")}
              value={inputMode}
              options={[
                { value: "pressure", label: l("Paineet", "Pressures") },
                {
                  value: "temperature",
                  label: l("Kyllästyslämpötilat", "Saturation temperatures"),
                },
              ]}
              onChange={(mode) => {
                setInputMode(mode);
                changed();
              }}
            />
            <div className="form-grid shsc-fields cycle-boundaries">
              {([false, true] as const).map((high) => {
                const side = high ? highSide : lowSide;
                const source = high ? highEntry : lowEntry;
                const fieldId =
                  inputMode === "pressure"
                    ? high
                      ? "shsc-hp"
                      : "shsc-lp"
                    : high
                      ? "cycle-condensation"
                      : "cycle-evaporation";
                return (
                  <div className="cycle-boundary" key={high ? "high" : "low"}>
                    <label htmlFor={fieldId}>
                      <span>
                        {inputMode === "pressure" && (high ? "HP · " : "LP · ")}
                        {inputMode === "pressure"
                          ? high
                            ? l("Korkeapaine", "High pressure")
                            : l("Imupaine", "Suction pressure")
                          : high
                            ? l("Lauhtuminen", "Condensation")
                            : l("Höyrystyminen", "Evaporation")}
                        <span className="cycle-input-unit">
                          {" "}
                          {inputMode === "pressure"
                            ? pressureUnit
                            : "°" + tempUnit}
                        </span>
                      </span>
                    </label>
                    <SignedDecimalInput
                      id={fieldId}
                      autoComplete="off"
                      className="mono"
                      value={high ? highInput : lowInput}
                      onValueChange={(next) => editEntry(high, next)}
                      signLabel={
                        inputMode === "temperature" ||
                        pressureUnit.endsWith("(g)")
                          ? l(
                              high
                                ? "Vaihda HP-arvon etumerkki"
                                : "Vaihda LP-arvon etumerkki",
                              high
                                ? "Change HP value sign"
                                : "Change LP value sign",
                            )
                          : undefined
                      }
                    />
                    {source.kind !== inputMode && source.value.trim() && (
                      <p className="caption secondary cycle-source-value">
                        {l("Syötetty", "Entered")} {source.value}{" "}
                        {source.kind === "temperature" ? "°" : ""}
                        {source.unit}
                        {source.kind === "temperature" &&
                          r?.kind === "blend" &&
                          (source.side === "dew"
                            ? l(" · kastepiste", " · dew point")
                            : l(" · kuplapiste", " · bubble point"))}
                      </p>
                    )}
                    {inputMode === "temperature" && r?.kind === "blend" && (
                      <label
                        className="cycle-boundary-choice"
                        htmlFor={
                          high ? "cycle-high-boundary" : "cycle-low-boundary"
                        }
                      >
                        <span className="sr-only">
                          {high
                            ? l(
                                "Lauhtumisen faasiraja",
                                "Condensation phase boundary",
                              )
                            : l(
                                "Höyrystymisen faasiraja",
                                "Evaporation phase boundary",
                              )}
                        </span>
                        <select
                          id={
                            high ? "cycle-high-boundary" : "cycle-low-boundary"
                          }
                          value={side}
                          onChange={(e) =>
                            changeBoundary(
                              high,
                              e.target.value as SaturationSide,
                            )
                          }
                        >
                          <option value="dew">
                            {l("Kylläinen höyry", "Saturated vapour")}
                          </option>
                          <option value="bubble">
                            {l("Kylläinen neste", "Saturated liquid")}
                          </option>
                        </select>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="help-heading temperature-heading">
              <h2>
                {l("Mittauslämpötilat", "Measured temperatures")}{" "}
                <span className="cycle-input-unit">°{tempUnit}</span>
              </h2>
              <InfoHelp label={l("Mittauspisteet", "Measurement points")}>
                {l(
                  "Kastepisteessä höyry on kylläistä. Kuplapisteessä neste on kylläistä. Valitse seokselle syötettyä lämpötilaa vastaava faasiraja. Tulistus on imukaasun lämpötilan ero imupaineen kastepisteeseen. Alijäähdytys on korkeapaineen kuplapisteen ja ennen paisuntaa mitatun nestelämpötilan erotus. Kompressorilta lähtevän kuumakaasun lämpötila tarvitaan kierron piirtämiseen.",
                  "At the dew point, vapour is saturated. At the bubble point, liquid is saturated. For a blend, select the phase boundary that matches the entered temperature. Superheat is suction temperature above the low-pressure dew point. Subcooling is the high-pressure bubble point minus liquid temperature before expansion. Discharge gas temperature is needed to plot the cycle.",
                )}
              </InfoHelp>
            </div>
            <div className="shsc-fields shsc-temperatures">
              <div className="cycle-measured-field">
                <label htmlFor="shsc-suction">
                  <span>{l("Imu", "Suction")}</span>
                </label>
                <SignedDecimalInput
                  id="shsc-suction"
                  signLabel={l(
                    "Vaihda imulämpötilan etumerkki",
                    "Change suction temperature sign",
                  )}
                  autoComplete="off"
                  className="mono"
                  value={measured}
                  onValueChange={(next) => {
                    setMeasured(next);
                    changed();
                  }}
                />
              </div>
              <div className="cycle-measured-field">
                <label htmlFor="shsc-hot-gas">
                  <span>
                    {l("Kuumakaasu", "Hot gas")}
                    <span className="sr-only">
                      {l("Kaaviota varten", "For the diagram")}
                    </span>
                  </span>
                </label>
                <SignedDecimalInput
                  id="shsc-hot-gas"
                  signLabel={l(
                    "Vaihda kuumakaasulämpötilan etumerkki",
                    "Change hot-gas temperature sign",
                  )}
                  autoComplete="off"
                  className="mono"
                  value={hotGas}
                  onValueChange={(next) => {
                    setHotGas(next);
                    changed();
                  }}
                />
              </div>
              <div className="cycle-measured-field">
                <label htmlFor="shsc-liquid">
                  <span>{l("Neste", "Liquid")}</span>
                </label>
                <SignedDecimalInput
                  id="shsc-liquid"
                  signLabel={l(
                    "Vaihda nestelämpötilan etumerkki",
                    "Change liquid temperature sign",
                  )}
                  autoComplete="off"
                  className="mono"
                  value={liquid}
                  onValueChange={(next) => {
                    setLiquid(next);
                    changed();
                  }}
                />
              </div>
            </div>
          </>
        )}
        {(tool !== "shsc" || !output) && (
          <div className={tool === "shsc" ? "cycle-submit" : undefined}>
            <button
              className="primary"
              disabled={
                !r ||
                (tool === "shsc" &&
                  (!available.supported || !liquidAvailable.supported))
              }
            >
              {l("Laske", "Calculate")}
            </button>
          </div>
        )}
      </form>
      <div
        ref={resultRef}
        tabIndex={-1}
        className={`calculator-result${tool === "shsc" ? " cycle-results" : ""}`}
        aria-live="polite"
      >
        {error && (
          <p className="notice error" role="alert">
            {error}
          </p>
        )}
        {unitError && (
          <p className="notice warning">
            {l(
              "Virheellistä syötettä ei voitu muuntaa uuteen yksikköön tai ilmanpaineviitteeseen. Syötä arvo uudelleen.",
              "The invalid input could not be converted to the new unit or atmospheric reference. Enter it again.",
            )}
          </p>
        )}
        {output && (
          <div className={tool === "shsc" ? "cycle-readings" : undefined}>
            {output.map((output) => (
              <section key={output.mode ?? "co2e"} className="result-card info">
                <p className="result-label">
                  {tool === "co2e" ? r?.designation + " · " : ""}
                  {output.mode === "superheat"
                    ? l("Tulistus", "Superheat")
                    : output.mode === "subcooling"
                      ? l("Alijäähdytys", "Subcooling")
                      : title}
                </p>
                <p className="calculator-number mono">
                  {tool === "co2e"
                    ? formatDecimal(output.value, data.locale)
                    : formatNumber(Number(output.value), data.locale, 1)}{" "}
                  <span className="reading-unit">{output.unit}</span>
                </p>
                {output.negative && (
                  <p>
                    {l(
                      output.mode === "superheat"
                        ? "Imu on kastepisteen alapuolella. Tämä on negatiivinen lämpötilaero, ei positiivinen tulistus. Tarkista mittauspiste ja paineviite."
                        : "Nesteen lämpötila on kuplapisteen yläpuolella. Tämä on negatiivinen lämpötilaero, ei positiivinen alijäähdytys. Tarkista mittauspiste ja paineviite.",
                      output.mode === "superheat"
                        ? "Suction is below the dew temperature. This is a negative temperature difference, not positive superheat. Check measurement location and pressure reference."
                        : "Liquid temperature is above the bubble temperature. This is a negative temperature difference, not positive subcooling. Check measurement location and pressure reference.",
                    )}
                  </p>
                )}
                {output.saturation && (
                  <p className="caption cycle-saturation">
                    {output.mode === "superheat"
                      ? l("Kastepiste", "Dew point")
                      : l("Kuplapiste", "Bubble point")}{" "}
                    <span>
                      {formatNumber(
                        Number(output.saturation.temperatureC),
                        data.locale,
                        1,
                      )}{" "}
                      °C
                    </span>
                  </p>
                )}
                {output.basis && <p className="caption mono">{output.basis}</p>}
                {tool === "co2e" && <SourceNote ids={output.sourceIds} />}
              </section>
            ))}{" "}
            {resolvedPressures && (
              <output
                className="caption mono cycle-resolved-pressures"
                aria-label={l("Absoluuttiset paineet", "Absolute pressures")}
              >
                {resolvedPressures.low && (
                  <span>
                    LP{" "}
                    {formatNumber(
                      Number(resolvedPressures.low),
                      data.locale,
                      2,
                    )}{" "}
                    bar(a)
                  </span>
                )}
                {resolvedPressures.high && (
                  <span>
                    HP{" "}
                    {formatNumber(
                      Number(resolvedPressures.high),
                      data.locale,
                      2,
                    )}{" "}
                    bar(a)
                  </span>
                )}
              </output>
            )}
          </div>
        )}
        {tool === "shsc" && output && (
          <details className="cycle-result-details">
            <summary>
              {l("Laskenta ja lähteet", "Calculation and sources")}
            </summary>
            {output.map(
              (output) =>
                output.saturation &&
                output.measuredC &&
                output.differenceK && (
                  <p className="caption" key={output.mode}>
                    <strong>
                      {output.mode === "superheat"
                        ? l("Tulistus", "Superheat")
                        : l("Alijäähdytys", "Subcooling")}
                    </strong>
                    {" · "}
                    <span className="mono">
                      {output.mode === "superheat"
                        ? `${formatNumber(Number(output.measuredC), data.locale, 2)} − (${formatNumber(Number(output.saturation.temperatureC), data.locale, 2)})`
                        : `${formatNumber(Number(output.saturation.temperatureC), data.locale, 2)} − (${formatNumber(Number(output.measuredC), data.locale, 2)})`}{" "}
                      °C ={" "}
                      {formatNumber(Number(output.differenceK), data.locale, 2)}{" "}
                      K
                    </span>
                  </p>
                ),
            )}
            {pressureUnit.endsWith("(g)") && (
              <p className="caption">
                {l("Ilmanpaineviite", "Atmospheric reference")}:{" "}
                <span className="mono">{atmosphere} bar(a)</span>
                {Number(atmosphere.replace(",", ".")) === 1.01325
                  ? l(
                      " · standardi-ilmakehä (oletus)",
                      " · standard atmosphere (assumed)",
                    )
                  : ""}
              </p>
            )}
            <SourceNote
              ids={[...new Set(output.flatMap((item) => item.sourceIds))]}
              disclosure={false}
            />
          </details>
        )}
      </div>
      {tool === "co2e" && r && output?.[0].kg !== undefined && (
        <CO2eBreakdown refrigerant={r} kg={output[0].kg} gwpKey={gwpKey} />
      )}
      {tool === "co2e" && report && (
        <ReportSave key={JSON.stringify(report)} content={report} />
      )}
      {tool === "shsc" && (
        <PHDiagramPanel
          id={id}
          result={cycle}
          message={diagramMessage}
          fi={fi}
          view={chartView}
          onViewChange={setChartView}
        />
      )}
      {tool === "shsc" && report && (
        <ReportSave
          key={JSON.stringify({ ...report, chartSnapshot: undefined })}
          content={report}
        />
      )}
      {r &&
        tool === "shsc" &&
        (available.supported && liquidAvailable.supported ? (
          <details className="calculation-details">
            <summary>
              {l("Tietojen tausta ja käyttöalue", "Data provenance and range")}
            </summary>
            <h3>{l("Laskentamalli", "Calculation model")}</h3>
            <p className="caption">
              {l(
                "CoolProp 7.2.0 -malliin perustuva offline-interpolointi. Ei mittaustulos; vain neste–höyry-tasapainolle. Kriittisen pisteen lähialue on rajattu pois.",
                "Offline interpolation from the CoolProp 7.2.0 model. Not a measurement; liquid–vapour equilibrium only. The near-critical region is excluded.",
              )}
            </p>
            <h3>{l("Käyttöalue", "Supported range")}</h3>
            <p className="mono">
              {formatNumber(
                Number(available.minimumTemperatureC),
                data.locale,
                2,
              )}
              …
              {formatNumber(
                Number(available.maximumTemperatureC),
                data.locale,
                2,
              )}{" "}
              °C
              <br />
              {formatPressure(
                Number(available.minimumPressureBarAbsolute),
                data.locale,
              )}
              …
              {formatPressure(
                Number(available.maximumPressureBarAbsolute),
                data.locale,
              )}{" "}
              bar(a)
            </p>
            <p className="caption">
              {l(
                "Interpoloinnin hyväksymisrajat suhteessa lähdemalliin: 0,1 °C ja 0,3 % paineesta. Mallin ja mittauksen omat epävarmuudet tulevat näiden lisäksi.",
                "Interpolation acceptance against the source model: 0.1 °C and 0.3% pressure. Model and measurement uncertainty are additional.",
              )}
            </p>
            <p className="caption mono">
              {l("P–T-aineiston versio", "P–T dataset version")}:{" "}
              {offlinePTProvider.metadata.dataVersion}
            </p>
            <h3>{l("Lähteet", "Sources")}</h3>
            <SourceNote ids={["coolprop-pt-7.2.0"]} disclosure={false} />
          </details>
        ) : (
          <p className="notice">
            {l(
              "Tälle aineelle ei ole vielä luotettavasti muodostettua P–T-käyrää. Laskenta avautuu, kun aineisto on saatavilla.",
              "A reliable P–T curve is not yet available for this fluid. Calculation is unavailable until data is added.",
            )}
          </p>
        ))}
    </>
  );
}
