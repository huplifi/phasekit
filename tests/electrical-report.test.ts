import { describe, expect, it } from "vitest";
import type { ReportRow, ToolRecord } from "../apps/web/src/storage";
import { emptyData, parseBackup } from "../apps/web/src/storage";
import {
  primaryReportOutputs,
  reportSummary,
  formatReportRow,
} from "../apps/web/src/report-summary";
const row = (
  fi: string,
  en: string,
  value: string,
  unit?: string,
): ReportRow => ({ label: { fi, en }, value, ...(unit ? { unit } : {}) });
const report = (target?: string, mode = "dc"): ToolRecord => ({
  id: "electrical-inverse",
  tool: "electrical",
  title: "Sähkölaskuri",
  createdAt: "2026-09-28T08:00:00Z",
  notes: "",
  inputs: [
    row("Laskenta", "Calculation", mode),
    ...(target
      ? [row("Ratkaistava suure", "Electrical solve for", target)]
      : []),
  ],
  outputs: [
    row("Pätöteho", "Real power", "12", "W"),
    row("Virta", "Current", "0.5", "A"),
    row("Jännite", "Voltage", "24", "V"),
    row("Resistanssi", "Resistance", "48", "Ω"),
  ],
  sources: [],
});
describe("electrical inverse report headlines", () => {
  it.each([
    ["power", "Real power"],
    ["current", "Current"],
    ["voltage", "Voltage"],
    ["resistance", "Resistance"],
  ])("selects %s even when another output comes first", (target, label) => {
    const saved = parseBackup(
      JSON.stringify({ ...emptyData(), toolRecords: [report(target)] }),
    ).toolRecords[0];
    expect(primaryReportOutputs(saved).map((r) => r.label.en)).toEqual([label]);
  });
  it("shows current and its unit in the saved list", () => {
    expect(reportSummary(report("current"), "fi")).toBe(
      "Sähkölaskuri · Virta · 0,5 A",
    );
    expect(reportSummary(report("current"), "en")).toBe(
      "Electrical calculator · Current · 0.5 A",
    );
  });
  it("retains legacy power and Ohm headlines", () => {
    expect(primaryReportOutputs(report()).map((r) => r.label.en)).toEqual([
      "Real power",
    ]);
    expect(
      primaryReportOutputs(report(undefined, "ohm")).map((r) => r.label.en),
    ).toEqual(["Real power", "Current"]);
  });
  it("does not translate electrical power as thermal power", () => {
    expect(
      formatReportRow(
        row("Ratkaistava suure", "Electrical solve for", "power"),
        "fi",
      ),
    ).toBe("Pätöteho");
  });
});
