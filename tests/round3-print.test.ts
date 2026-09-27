import { describe, expect, it } from "vitest";
import type { CheckResult } from "../packages/core/src/contracts";
import {
  leakCheckPrintOverdue,
  leakCheckPrintSchedule,
} from "../apps/web/src/report-export";
import { primaryReportOutputs } from "../apps/web/src/report-summary";
import { planReportImage } from "../apps/web/src/report-image";
import type { ToolRecord } from "../apps/web/src/storage";

const assessment = {
  state: "required",
  months: 12,
  input: { asOf: "2026-09-26" },
} as CheckResult;

describe("round-three print schedule", () => {
  it("uses the completed previous check and the assessment's frozen interval", () => {
    expect(leakCheckPrintSchedule(assessment, "2025-09-01")).toEqual({
      status: "dated",
      previous: "2025-09-01",
      due: "2026-09-01",
    });
  });

  it("keeps missing, unsupported and invalid schedules explicit", () => {
    expect(leakCheckPrintSchedule(assessment)).toEqual({
      status: "no_previous",
    });
    expect(
      leakCheckPrintSchedule({ ...assessment, state: "exempt" }, "2025-09-01"),
    ).toEqual({ status: "no_schedule", previous: "2025-09-01" });
    expect(
      leakCheckPrintSchedule(
        { ...assessment, state: "unsupported" },
        "2025-09-01",
      ),
    ).toEqual({ status: "no_schedule", previous: "2025-09-01" });
    expect(leakCheckPrintSchedule(assessment, "2026-09-27")).toEqual({
      status: "invalid",
    });
  });

  it("marks only due dates before the frozen assessment day as overdue", () => {
    const sixMonths = { ...assessment, months: 6 };
    const overdue = leakCheckPrintSchedule(sixMonths, "2025-11-01");
    expect(overdue.due).toBe("2026-05-01");
    expect(leakCheckPrintOverdue(overdue, assessment.input.asOf)).toBe(true);
    const dueToday = leakCheckPrintSchedule(sixMonths, "2026-03-26");
    expect(dueToday.due).toBe("2026-09-26");
    expect(leakCheckPrintOverdue(dueToday, assessment.input.asOf)).toBe(false);
    expect(
      leakCheckPrintOverdue(
        leakCheckPrintSchedule(sixMonths, "2026-09-27"),
        assessment.input.asOf,
      ),
    ).toBe(false);
  });
});

describe("print and image hierarchy", () => {
  it("places a saved primary result ahead of inputs with stronger type", () => {
    const record: ToolRecord = {
      id: "print-hierarchy",
      tool: "convert",
      title: "Unit conversion",
      createdAt: "2026-09-26T09:00:00Z",
      notes: "",
      inputs: [
        {
          label: { fi: "Syötetty arvo", en: "Entered value" },
          value: "1000",
          unit: "W",
        },
      ],
      outputs: [
        { label: { fi: "Tulos", en: "Result" }, value: "1", unit: "kW" },
      ],
      sources: [],
    };
    const plan = planReportImage(record, "en", (text) => text.length * 16);
    const result = plan.lines.find((line) => line.text === "1 kW");
    const input = plan.lines.find((line) =>
      line.text.includes("Entered value:"),
    );
    expect(result).toBeDefined();
    expect(input).toBeDefined();
    expect(result!.y).toBeLessThan(input!.y);
    expect(result!.size).toBeGreaterThan(input!.size);
  });

  it("emphasises the calculated pressure for a temperature-to-pressure record", () => {
    const record: ToolRecord = {
      id: "pt-print",
      tool: "pt",
      title: "Pressure–temperature",
      createdAt: "2026-09-26T09:00:00Z",
      notes: "",
      inputs: [
        {
          label: { fi: "Syötetty suure", en: "Entered quantity" },
          value: "temperature",
        },
      ],
      outputs: [
        {
          label: { fi: "Lämpötila", en: "Temperature" },
          value: "20",
          unit: "°C",
        },
        { label: { fi: "Paine", en: "Pressure" }, value: "5", unit: "bar" },
      ],
      sources: [],
    };
    const lines = planReportImage(
      record,
      "en",
      (text) => text.length * 16,
    ).lines;
    expect(lines.find((line) => line.text === "5 bar")?.size).toBe(43);
    expect(lines.find((line) => line.text === "Temperature: 20 °C")?.size).toBe(
      24,
    );
  });
});

it.each(["dc", "single_phase", "three_phase", "ohm"])(
  "headlines only calculated electrical values in %s mode",
  (mode) => {
    const outputs = [
      { label: { fi: "Pätöteho", en: "Real power" }, value: "2300", unit: "W" },
      { label: { fi: "Virta", en: "Current" }, value: "10", unit: "A" },
    ];
    const result = primaryReportOutputs({
      tool: "electrical",
      inputs: [{ label: { fi: "Laskenta", en: "Calculation" }, value: mode }],
      outputs,
    });
    expect(result.map((row) => row.label.en)).toEqual(
      mode === "ohm" ? ["Real power", "Current"] : ["Real power"],
    );
  },
);
