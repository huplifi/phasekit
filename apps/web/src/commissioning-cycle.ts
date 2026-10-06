import { calculatePHCycle, getPHDiagram } from "../../../packages/core/src/ph";
import { offlinePTProvider } from "../../../packages/core/src/pt";
import { calculateSHSC } from "../../../packages/core/src/tool-calculations";
import {
  convertPressure,
  parseDecimal,
  type PressureUnit,
} from "../../../packages/core/src/units";
import { byId, dataset } from "./data";
import { createCycleChartSnapshot } from "./ph-chart-snapshot";
import type { ReportRow, ToolRecord } from "./storage";

const messages: Record<string, [string, string]> = {
  missing_measurements: [
    "Kaaviota varten tarvitaan kylmäaine, LP, HP sekä imu- ja nestelämpötila. Jos arvoja ei voida mitata, voit tehdä raportin ilman kaaviota.",
    "The chart requires a refrigerant, LP, HP, suction and liquid temperatures. If these cannot be measured, you can complete the report without the chart.",
  ],
  invalid_pressure_unit: [
    "Tarkista paineyksikkö ja paineviite.",
    "Check the pressure unit and reference.",
  ],
  atmospheric_reference_required: [
    "Syötä ylipaineen ilmanpaineviite.",
    "Enter the atmospheric reference for gauge pressure.",
  ],
  invalid_atmospheric_reference: [
    "Ilmanpaineviitteen on oltava positiivinen.",
    "The atmospheric reference must be positive.",
  ],
  high_pressure_must_exceed_low: [
    "HP-paineen on oltava LP-painetta suurempi.",
    "HP must exceed LP.",
  ],
  invalid_temperature: [
    "Lämpötila ei voi alittaa absoluuttista nollapistettä.",
    "Temperature cannot be below absolute zero.",
  ],
  nonpositive_absolute_pressure: [
    "Absoluuttisen paineen on oltava positiivinen.",
    "Absolute pressure must be positive.",
  ],
  negative_absolute_pressure: [
    "Absoluuttisen paineen on oltava positiivinen.",
    "Absolute pressure must be positive.",
  ],
  pt_unsupported_refrigerant_or_side: [
    "Kylmäaineelle ei ole tarvittavaa P–T-aineistoa.",
    "The required P–T data is unavailable for this refrigerant.",
  ],
  pt_out_of_range: [
    "Paine on P–T-aineiston käyttöalueen ulkopuolella.",
    "Pressure is outside the supported P–T range.",
  ],
  hot_gas_required: [
    "Tulistus ja alijäähdytys laskettu. Lisää kuumakaasun lämpötila kaaviota varten.",
    "Superheat and subcooling calculated. Add the hot-gas temperature for the diagram.",
  ],
  ph_unsupported_refrigerant: [
    "Tulistus ja alijäähdytys laskettu. Kylmäaineelle ei ole p–h-aineistoa.",
    "Superheat and subcooling calculated. No p–h data is available for this refrigerant.",
  ],
  ph_two_phase_or_boundary: [
    "Tulistus ja alijäähdytys laskettu. Kaaviota ei muodosteta: mittauspiste on faasirajalla tai väärällä faasialueella.",
    "Superheat and subcooling calculated. No diagram: a measured point is at a phase boundary or in the wrong phase region.",
  ],
  ph_out_of_range: [
    "Tulistus ja alijäähdytys laskettu. Kaavion mittauspiste on p–h-mallin käyttöalueen ulkopuolella.",
    "Superheat and subcooling calculated. A diagram point is outside the p–h model range.",
  ],
  ph_discharge_enthalpy_must_exceed_suction: [
    "Tulistus ja alijäähdytys laskettu. Kaaviota varten kuumakaasun entalpian on ylitettävä imukaasun entalpia.",
    "Superheat and subcooling calculated. Discharge enthalpy must exceed suction enthalpy for the diagram.",
  ],
  ph_point4_outside_two_phase: [
    "Tulistus ja alijäähdytys laskettu. Paisunnan jälkeinen piste ei ole mallin kaksifaasialueella.",
    "Superheat and subcooling calculated. The point after expansion is outside the model's two-phase region.",
  ],
};

export function commissioningCycleErrorText(
  code: string,
  locale: "fi" | "en",
): string {
  return (
    messages[code]?.[locale === "fi" ? 0 : 1] ??
    (locale === "fi"
      ? "Tarkista mittausarvot. Käytä desimaalipilkkua tai -pistettä."
      : "Check the measurements. Use a decimal comma or point.")
  );
}

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
const errorCode = (error: unknown) =>
  error instanceof Error ? error.message : "invalid_measurements";

/** Called explicitly when calculating; rendering a saved report never invokes a model.
 * A diagram-only failure keeps valid SH/SC measurements and records its limitation. */
export function buildCommissioningCycle(fields: Record<string, string>): {
  report?: ToolRecord;
  error?: string;
} {
  if (
    ["refrigerantId", "lp", "hp", "suctionC", "liquidC"].some(
      (key) => !fields[key]?.trim(),
    )
  )
    return { error: "missing_measurements" };
  const refrigerant = byId.get(fields.refrigerantId!);
  if (!refrigerant) return { error: "pt_unsupported_refrigerant_or_side" };
  if (
    !["bar", "kPa", "MPa", "psi"].includes(fields.pressureUnit!) ||
    !["absolute", "gauge"].includes(fields.pressureReference!)
  )
    return { error: "invalid_pressure_unit" };
  const gauge = fields.pressureReference === "gauge";
  if (gauge && !fields.atmosphericReference?.trim())
    return { error: "atmospheric_reference_required" };
  const unit = `${fields.pressureUnit}(${gauge ? "g" : "a"})` as PressureUnit;
  const atmosphere = gauge
    ? { value: fields.atmosphericReference!, unit: "bar(a)" as const }
    : undefined;
  try {
    const lowPressure = { value: fields.lp!, unit };
    const highPressure = { value: fields.hp!, unit };
    const low = parseDecimal(
      convertPressure(lowPressure, "bar(a)", atmosphere),
    );
    const high = parseDecimal(
      convertPressure(highPressure, "bar(a)", atmosphere),
    );
    if (low.lte(0) || high.lte(0))
      throw new Error("nonpositive_absolute_pressure");
    if (high.lte(low)) throw new Error("high_pressure_must_exceed_low");
    for (const value of [fields.suctionC!, fields.liquidC!])
      if (parseDecimal(value).lt("-273.15"))
        throw new Error("invalid_temperature");
    const sh = calculateSHSC({
      refrigerantId: refrigerant.id,
      mode: "superheat",
      pressure: lowPressure,
      measuredTemperature: { value: fields.suctionC!, unit: "C" },
      atmosphere,
    });
    const sc = calculateSHSC({
      refrigerantId: refrigerant.id,
      mode: "subcooling",
      pressure: highPressure,
      measuredTemperature: { value: fields.liquidC!, unit: "C" },
      atmosphere,
    });
    const sourceIds = new Set([
      ...refrigerant.sourceIds,
      ...sh.saturation.provider.sourceIds,
      ...sc.saturation.provider.sourceIds,
    ]);
    const inputs = [
      row(
        "Kylmäaine",
        "Refrigerant",
        `${refrigerant.designation} (${refrigerant.id})`,
      ),
      row("LP · Imupaine", "LP · Suction pressure", fields.lp!, unit),
      row("HP · Korkeapaine", "HP · High pressure", fields.hp!, unit),
      row("Imu", "Suction", fields.suctionC!, "°C"),
      row("Neste", "Liquid", fields.liquidC!, "°C"),
    ];
    if (atmosphere)
      inputs.push(
        row(
          "Ilmanpaineviite",
          "Atmospheric reference",
          atmosphere.value,
          atmosphere.unit,
        ),
      );
    if (fields.dischargeC?.trim())
      inputs.push(row("Kuumakaasu", "Hot gas", fields.dischargeC, "°C"));
    const outputs = [
      row("Tulistus", "Superheat", sh.differenceK, "K"),
      row("Alijäähdytys", "Subcooling", sc.differenceK, "K"),
      row("Kastepiste", "Dew point", sh.saturation.temperatureC, "°C"),
      row("Kuplapiste", "Bubble point", sc.saturation.temperatureC, "°C"),
      row(
        "P–T-aineistoversio",
        "P–T dataset version",
        offlinePTProvider.metadata.dataVersion,
      ),
    ];
    let chartSnapshot: ToolRecord["chartSnapshot"];
    let error: string | undefined;
    try {
      if (!fields.dischargeC?.trim()) throw new Error("hot_gas_required");
      const cycle = calculatePHCycle({
        refrigerantId: refrigerant.id,
        lowPressure,
        highPressure,
        T1: { value: fields.suctionC!, unit: "C" },
        T2: { value: fields.dischargeC, unit: "C" },
        T3: { value: fields.liquidC!, unit: "C" },
        atmosphere,
      });
      chartSnapshot = createCycleChartSnapshot(
        getPHDiagram(refrigerant.id)!,
        cycle,
      );
      cycle.sourceIds.forEach((id) => sourceIds.add(id));
      for (const point of Object.values(cycle.points)) {
        outputs.push(
          row(
            `Piste ${point.label} · paine`,
            `Point ${point.label} · pressure`,
            point.pressureBarAbsolute,
            "bar(a)",
          ),
          row(
            `Piste ${point.label} · entalpia`,
            `Point ${point.label} · enthalpy`,
            point.enthalpyKJkg,
            "kJ/kg",
          ),
        );
        if (point.temperatureC !== null)
          outputs.push(
            row(
              `Piste ${point.label} · lämpötila`,
              `Point ${point.label} · temperature`,
              point.temperatureC,
              "°C",
            ),
          );
      }
      outputs.push(
        row("Pisteen 4 oletus", "Point 4 assumption", cycle.point4Assumption),
        row("p–h-aineistoversio", "p–h dataset version", cycle.dataVersion),
      );
    } catch (caught) {
      error = errorCode(caught);
      outputs.push(
        row(
          "Kaavion tila",
          "Diagram status",
          `${commissioningCycleErrorText(error, "fi")} / ${commissioningCycleErrorText(error, "en")}`,
        ),
      );
    }
    return {
      report: {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        tool: "cycle",
        title: `${refrigerant.designation} · Kylmäkierto / Refrigeration cycle`,
        notes: "",
        inputs,
        outputs,
        dataVersion: dataset.version,
        sources: structuredClone(
          dataset.sources.filter((source) => sourceIds.has(source.id)),
        ),
        ...(chartSnapshot ? { chartSnapshot } : {}),
      },
      ...(error ? { error } : {}),
    };
  } catch (caught) {
    return { error: errorCode(caught) };
  }
}
