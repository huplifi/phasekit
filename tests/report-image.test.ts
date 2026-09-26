import { describe, expect, it } from "vitest";
import {
  planReportImage,
  wrapCanvasText,
  REPORT_IMAGE_MAX_HEIGHT,
} from "../apps/web/src/report-image";
import type { ToolRecord } from "../apps/web/src/storage";

const record: ToolRecord = {
  id: "report-1",
  createdAt: "2026-09-26T09:00:00.000Z",
  tool: "convert",
  title: "Unit conversion",
  equipmentName: "Workshop",
  notes: '<script>alert("unsafe")</script>',
  inputs: [
    {
      label: { fi: "Syötetty arvo", en: "Entered value" },
      value: "1000",
      unit: "W",
    },
  ],
  outputs: [{ label: { fi: "Tulos", en: "Result" }, value: "1", unit: "kW" }],
  dataVersion: "unit-conversions-v2",
  sources: [
    {
      id: "nist",
      title: "NIST SP 811",
      url: "https://example.org/long-source",
      version: "2008",
      checkedAt: "2026-09-26",
      license: "Source terms",
      note: "Reference",
    },
  ],
};

describe("saved report image plan", () => {
  const measure = (text: string) => text.length * 16;

  it("includes all recorded details and leaves note markup literal", () => {
    const plan = planReportImage(record, "en", measure);
    const text = plan.lines.map((line) => line.text).join("\n");
    expect(plan.tooLarge).toBe(false);
    for (const value of [
      "1,000 W",
      "1 kW",
      "Workshop",
      "unit-conversions-v2",
      "NIST SP 811",
      "ID: nist",
      "Version: 2008",
      "Checked: 2026-09-26",
      "Source URL:",
      '<script>alert("unsafe")</script>',
    ])
      expect(text).toContain(value);
  });

  it("wraps long unbroken values within the measured width", () => {
    const lines = wrapCanvasText("x".repeat(100), 160, measure);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line) => measure(line) <= 160)).toBe(true);
    expect(lines.join("")).toBe("x".repeat(100));
  });

  it("rejects an oversized card rather than truncating it", () => {
    const plan = planReportImage(
      { ...record, notes: "long paragraph\n".repeat(1000) },
      "fi",
      measure,
    );
    expect(plan.height).toBeGreaterThan(REPORT_IMAGE_MAX_HEIGHT);
    expect(plan.tooLarge).toBe(true);
  });

  it("uses rounded readable output on the card while retaining the raw record", () => {
    const raw = "3.141592653589793238462643383279502884197";
    const longer = {
      ...record,
      outputs: [{ ...record.outputs[0], value: raw }],
    };
    const text = planReportImage(longer, "fi", measure)
      .lines.map((line) => line.text)
      .join("\n");
    expect(text).toContain("≈3,1415927 kW");
    expect(text.replaceAll("\n", " ")).toContain(
      "JSON-vienti säilyttää tarkat tallennetut luvut",
    );
    expect(longer.outputs[0].value).toBe(raw);
  });
});
