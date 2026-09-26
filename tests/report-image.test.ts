import { describe, expect, it } from "vitest";
import {
  planReportImage,
  wrapCanvasText,
  REPORT_IMAGE_MAX_HEIGHT,
} from "../apps/web/src/report-image";
import type { ToolRecord } from "../apps/web/src/storage";
import { renderCycleChartSvg } from "../apps/web/src/ph-chart-snapshot";

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
    expect(text).toContain("≈3,14159 kW");
    expect(text.replaceAll("\n", " ")).toContain(
      "JSON-vienti säilyttää tarkat tallennetut luvut",
    );
    expect(longer.outputs[0].value).toBe(raw);
  });

  it("reserves a printable area for a frozen cycle chart", () => {
    const withChart: ToolRecord = {
      ...record,
      tool: "cycle",
      chartSnapshot: {
        kind: "ph-cycle-v1",
        dataVersion: "heos-1",
        dome: [
          [1, 100, 200],
          [10, 120, 220],
        ],
        points: [
          [2, 210],
          [9, 240],
          [9, 110],
          [2, 110],
        ],
      },
    };
    const plan = planReportImage(withChart, "en", measure);
    expect(plan.chartTop).toBeGreaterThan(0);
    expect(plan.chartHeight).toBe(616);
    expect(plan.height).toBeGreaterThan(plan.chartTop! + 616);
    expect(plan.lines.map((line) => line.text).join(" ")).toContain(
      "Straight lines show cycle order",
    );

    const guides: ToolRecord = {
      ...withChart,
      chartSnapshot: {
        ...withChart.chartSnapshot!,
        view: {
          fitCycle: true,
          visibleKinds: { temperature: true, entropy: true, volume: true },
        },
        isolineDataVersion: "guides-1",
        isolines: (["temperature", "entropy", "volume"] as const).flatMap(
          (kind) =>
            Array.from({ length: 12 }, (_, index) => ({
              kind,
              phase: "vapour" as const,
              level: 1.23456 + index * 0.87654,
              segments: [
                [
                  [2, 210],
                  [9, 240],
                ] as [number, number][],
              ],
            })),
        ),
      },
    };
    for (const locale of ["fi", "en"] as const) {
      const guidedPlan = planReportImage(guides, locale, measure);
      const svg = renderCycleChartSvg(guides.chartSnapshot!, locale);
      const [, naturalWidth, naturalHeight] = svg.match(
        /viewBox="0 0 (\d+) (\d+)"/,
      )!;
      expect(guidedPlan.chartHeight).toBeCloseTo(
        (1056 * Number(naturalHeight)) / Number(naturalWidth),
      );
      expect(guidedPlan.chartHeight).toBeGreaterThan(616);
      const followingText = guidedPlan.lines.find(
        (line) => line.y > guidedPlan.chartTop!,
      );
      expect(followingText!.y - followingText!.size).toBeGreaterThan(
        guidedPlan.chartTop! + guidedPlan.chartHeight!,
      );
      expect(guidedPlan.height).toBeGreaterThan(
        guidedPlan.chartTop! + guidedPlan.chartHeight!,
      );
    }
  });
});
