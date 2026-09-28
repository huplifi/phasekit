import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteDB } from "idb";
import {
  calculateHeatQuantity,
  type HeatMode,
  type HeatQuantityInput,
} from "../packages/core/src/heat-quantity";
import { heatFormulaSource } from "../apps/web/src/heat-materials";
import {
  emptyData,
  loadData,
  parseBackup,
  saveData,
  type ReportRow,
  type ToolRecord,
} from "../apps/web/src/storage";
import {
  formatReportRow,
  primaryReportOutputs,
  reportSummary,
} from "../apps/web/src/report-summary";

const input: HeatQuantityInput = {
  mode: "energy",
  amount: "10",
  amountUnit: "kg",
  densityKgM3: "",
  specificHeatKJkgK: "3.2",
  inletC: "20",
  outletC: "70",
  energy: "1600",
  energyUnit: "kJ",
  powerKW: "2",
  durationMinutes: "20",
};

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

function record(mode: HeatMode, properties = input): ToolRecord {
  const result = calculateHeatQuantity({ ...properties, mode });
  return {
    id: `kiisseli-${mode}`,
    tool: "heat-quantity",
    title: "Kiisseli · Lämpömäärä",
    createdAt: "2026-09-28T07:00:00.000Z",
    notes: "Kotitehtävän ominaislämpöarvo; ei valmis ainearvo.",
    inputs: [
      row("Ratkaistava suure", "Solve for", mode),
      row("Aine", "Material", "Kiisseli"),
      row("Syötetty massa", "Entered mass", properties.amount, "kg"),
      row(
        "Käytetty ominaislämpökapasiteetti",
        "Specific heat used",
        properties.specificHeatKJkgK,
        "kJ/(kg·K)",
      ),
      row(
        "Ominaislämpöarvon alkuperä",
        "Specific heat provenance",
        "Käyttäjän arvo / User value",
      ),
      row("Alkulämpötila", "Initial temperature", properties.inletC, "°C"),
      row("Loppulämpötila", "Final temperature", properties.outletC, "°C"),
    ],
    // Deliberately preserve energy first: the primary result must follow the
    // solved quantity rather than whichever numeric row happens to be first.
    outputs: [
      row("Energia", "Energy", result.energyKWh, "kWh"),
      row("Lämpömäärä", "Heat quantity", result.energyKJ, "kJ"),
      row("Massa", "Mass", result.massKg, "kg"),
      row("Loppulämpötila", "Final temperature", result.outletC, "°C"),
      row(
        "Ominaislämpökapasiteetti",
        "Specific heat capacity",
        result.specificHeatKJkgK,
        "kJ/(kg·K)",
      ),
      ...(result.durationMinutes === null
        ? []
        : [row("Aika", "Duration", result.durationMinutes, "min")]),
      ...(result.powerKW === null
        ? []
        : [row("Lämpöteho", "Thermal power", result.powerKW, "kW")]),
    ],
    sources: [structuredClone(heatFormulaSource)],
  };
}

afterEach(async () => {
  await deleteDB("phasekit");
});

describe("saved sensible-heat reports", () => {
  it("round-trips exact calculated values, user properties and source metadata through backup and IndexedDB", async () => {
    const original = record("time");
    const backup = { ...emptyData(), toolRecords: [original] };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.toolRecords).toEqual([original]);
    await saveData(parsed);
    const restored = (await loadData()).toolRecords[0]!;
    expect(restored).toEqual(original);
    expect(
      restored.inputs.find((item) => item.label.en === "Specific heat used")
        ?.value,
    ).toBe("3.2");
    expect(restored.inputs.some((item) => /density/i.test(item.label.en))).toBe(
      false,
    );
    expect(restored.sources).toEqual(original.sources);
    expect(
      restored.outputs.find((item) => item.label.en === "Heat quantity")?.value,
    ).toBe("1600");
    const duration = restored.outputs.find(
      (item) => item.label.en === "Duration",
    )!;
    expect(duration.value.length).toBeGreaterThan(200);
    expect(Number(duration.value)).toBeCloseTo(40 / 3, 14);
    expect(formatReportRow(duration, "fi")).toBe("≈13,3333 min");
    expect(duration.value).toBe(
      original.outputs.find((item) => item.label.en === "Duration")!.value,
    );
  });

  it("keeps a saved calculation frozen when later calculations use changed material properties", async () => {
    const original = record("energy");
    const originalSnapshot = structuredClone(original);
    await saveData({ ...emptyData(), toolRecords: [original] });
    // A changed property and its source affect the new record only.
    const later = record("energy", { ...input, specificHeatKJkgK: "4.2" });
    later.id = "kiisseli-next-calculation";
    later.sources[0]!.version = "Later source revision";
    const state = await loadData();
    state.toolRecords.push(later);
    await saveData(state);
    const roundTrip = parseBackup(JSON.stringify(await loadData()));
    expect(roundTrip.toolRecords[0]).toEqual(originalSnapshot);
    expect(
      roundTrip.toolRecords[1]!.outputs.find(
        (item) => item.label.en === "Heat quantity",
      )?.value,
    ).toBe("2100");
    expect(roundTrip.toolRecords[0]!.sources[0]!.version).not.toBe(
      "Later source revision",
    );
  });

  it.each([
    ["energy", "Energy", "kWh", "≈0,444444 kWh"],
    ["time", "Duration", "min", "≈13,3333 min"],
    ["power", "Thermal power", "kW", "≈1,33333 kW"],
    ["mass", "Mass", "kg", "10 kg"],
    ["temperature", "Final temperature", "°C", "70 °C"],
    ["specific-heat", "Specific heat capacity", "kJ/(kg·K)", "3,2 kJ/(kg·K)"],
  ] as [HeatMode, string, string, string][])(
    "uses the solved %s result in cards and summaries",
    (mode, targetLabel, unit, rendered) => {
      const saved = record(mode);
      const before = structuredClone(saved);
      const primary = primaryReportOutputs(saved);
      expect(primary).toHaveLength(1);
      expect(primary[0]!.label.en).toBe(targetLabel);
      expect(primary[0]!.unit).toBe(unit);
      const summary = reportSummary(saved, "fi");
      expect(summary).toContain("Kiisseli");
      expect(summary).toContain(rendered);
      expect(summary).not.toContain(mode);
      expect(saved).toEqual(before);
    },
  );

  it("localizes mode metadata instead of showing its internal code", () => {
    const saved = record("specific-heat");
    const modeRow = saved.inputs[0]!;
    expect(formatReportRow(modeRow, "fi")).toBe("Ominaislämpökapasiteetti");
    expect(formatReportRow(modeRow, "en")).toBe("Specific heat capacity");
    const english = reportSummary(saved, "en");
    expect(english).toContain("Kiisseli");
    expect(english).toContain("3.2 kJ/(kg·K)");
    expect(english).not.toContain("specific-heat");
  });
});
