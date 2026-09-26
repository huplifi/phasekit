import { describe, expect, it } from "vitest";
import {
  formatReportRow,
  reportHasRoundedValues,
  reportSummary,
} from "../apps/web/src/report-summary";
import type { ToolRecord } from "../apps/web/src/storage";

const row = (fi: string, en: string, value: string, unit?: string) => ({
  label: { fi, en },
  value,
  unit,
});

describe("saved report summaries", () => {
  it("localizes the quantity and preserves input/output units in old conversion records", () => {
    const report = {
      tool: "convert",
      title: "Yksikkömuunnos / Unit conversion",
      inputs: [
        row("Suure", "Quantity", "Teho / Power"),
        row("Syötetty arvo", "Entered value", "1000", "W"),
      ],
      outputs: [row("Tulos", "Result", "1", "kW")],
    } as Pick<ToolRecord, "tool" | "title" | "inputs" | "outputs">;
    expect(reportSummary(report, "fi")).toBe("Teho · 1 000 W → 1 kW");
    expect(reportSummary(report, "en")).toBe("Power · 1,000 W → 1 kW");
  });

  it("uses the localized tool name when legacy rows are absent", () => {
    const report = {
      tool: "pipe",
      title: "Putken tilavuus ja virtaus",
      inputs: [],
      outputs: [],
    } as Pick<ToolRecord, "tool" | "title" | "inputs" | "outputs">;
    expect(reportSummary(report, "en")).toBe("Pipe volume and flow");
  });

  it("marks long numeric presentation as rounded without changing stored precision", () => {
    const raw =
      "1.591549430918953357688837633725143620344682276130534458218958732038676225425961497279242849735771154916998812787446661035268564437750380641064109251431004199911517497385405636366394951811292683154328300358873628101829110898989414580599913529238236370050676";
    const report = {
      tool: "pipe",
      title: "Pipe volume and flow",
      inputs: [row("Sisähalkaisija", "Internal diameter", "20", "mm")],
      outputs: [row("Virtausnopeus", "Velocity", raw, "m/s")],
    } as Pick<ToolRecord, "tool" | "title" | "inputs" | "outputs">;
    expect(formatReportRow(report.outputs[0], "fi")).toBe("≈1,5915494 m/s");
    expect(reportSummary(report, "en")).toBe(
      "Pipe volume and flow · 20 mm → ≈1.5915494 m/s",
    );
    expect(reportHasRoundedValues(report)).toBe(true);
    expect(report.outputs[0].value).toBe(raw);
  });
});
