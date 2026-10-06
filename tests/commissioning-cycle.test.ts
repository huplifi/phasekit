import { describe, expect, it } from "vitest";
import {
  buildCommissioningCycle,
  commissioningCycleErrorText,
} from "../apps/web/src/commissioning-cycle";
import { dataset } from "../apps/web/src/data";
import { renderCycleChartSvg } from "../apps/web/src/ph-chart-snapshot";

const readings = {
  refrigerantId: "r134a",
  lp: "2.5",
  hp: "10",
  pressureUnit: "bar",
  pressureReference: "absolute",
  suctionC: "10",
  dischargeC: "70",
  liquidC: "25",
};

describe("commissioning frozen cycle", () => {
  it("records R134a measurements, primary results, chart vectors and sourced model versions", () => {
    const { report, error } = buildCommissioningCycle(readings);
    expect(error).toBeUndefined();
    expect(report?.chartSnapshot?.kind).toBe("ph-cycle-v1");
    expect(report?.outputs.slice(0, 2).map((entry) => entry.label.en)).toEqual([
      "Superheat",
      "Subcooling",
    ]);
    expect(Number(report?.outputs[0]?.value)).toBeGreaterThan(14);
    expect(Number(report?.outputs[1]?.value)).toBeGreaterThan(14);
    expect(report?.chartSnapshot?.points[0]?.[1]).toBeCloseTo(
      408.55417789378623,
      0,
    );
    expect(report?.chartSnapshot?.points[1]?.[1]).toBeCloseTo(
      452.0005965967065,
      0,
    );
    expect(report?.chartSnapshot?.points[3]?.[1]).toBe(
      report?.chartSnapshot?.points[2]?.[1],
    );
    expect(report?.sources.map((source) => source.id)).toContain(
      "coolprop-ph-7.2.0",
    );
    expect(
      report?.outputs.find((entry) => entry.label.en === "P–T dataset version")
        ?.value,
    ).toBeTruthy();
    expect(
      report?.outputs.find((entry) => entry.label.en === "p–h dataset version")
        ?.value,
    ).toBe(report?.chartSnapshot?.dataVersion);
    expect(
      report?.inputs.find(
        (entry) => entry.label.en === "LP · Suction pressure",
      ),
    ).toMatchObject({ value: "2.5", unit: "bar(a)" });
  });

  it("requires explicit gauge reference and preserves equivalent gauge and absolute calculations", () => {
    const gauge = {
      ...readings,
      lp: "1,48675",
      hp: "8,98675",
      pressureReference: "gauge",
    };
    expect(buildCommissioningCycle(gauge)).toEqual({
      error: "atmospheric_reference_required",
    });
    const converted = buildCommissioningCycle({
      ...gauge,
      atmosphericReference: "1.01325",
    });
    const absolute = buildCommissioningCycle(readings);
    expect(converted.report?.chartSnapshot).toEqual(
      absolute.report?.chartSnapshot,
    );
    expect(converted.report?.outputs).toEqual(absolute.report?.outputs);
    expect(
      converted.report?.inputs.find(
        (entry) => entry.label.en === "Atmospheric reference",
      )?.value,
    ).toBe("1.01325");
    const kilopascal = buildCommissioningCycle({
      ...readings,
      lp: "250",
      hp: "1000",
      pressureUnit: "kPa",
    });
    expect(kilopascal.report?.chartSnapshot).toEqual(
      absolute.report?.chartSnapshot,
    );
  });

  it.each([
    [{ lp: "" }, "missing_measurements"],
    [{ liquidC: "", outdoorC: "-7.5", indoorC: "21" }, "missing_measurements"],
    [{ refrigerantId: "unknown" }, "pt_unsupported_refrigerant_or_side"],
    [{ hp: "2" }, "high_pressure_must_exceed_low"],
    [{ lp: "0" }, "nonpositive_absolute_pressure"],
    [{ lp: "not a number" }, "invalid_decimal"],
    [{ suctionC: "-274" }, "invalid_temperature"],
    [{ pressureUnit: "mbar" }, "invalid_pressure_unit"],
    [{ pressureReference: "" }, "invalid_pressure_unit"],
    [
      { pressureReference: "gauge", atmosphericReference: "0" },
      "invalid_atmospheric_reference",
    ],
  ])(
    "does not manufacture a result for invalid required readings %s",
    (change, error) => {
      expect(buildCommissioningCycle({ ...readings, ...change })).toEqual({
        error,
      });
    },
  );

  it.each([
    [{ dischargeC: "" }, "hot_gas_required"],
    [{ dischargeC: "200" }, "ph_out_of_range"],
    [{ suctionC: "-4" }, "ph_two_phase_or_boundary"],
  ])(
    "retains valid SH/SC but no chart when diagram is unavailable %s",
    (change, code) => {
      const result = buildCommissioningCycle({ ...readings, ...change });
      expect(result.error).toBe(code);
      expect(result.report?.chartSnapshot).toBeUndefined();
      expect(
        result.report?.outputs.slice(0, 2).every((entry) => entry.unit === "K"),
      ).toBe(true);
      expect(
        result.report?.outputs.find(
          (entry) => entry.label.en === "Diagram status",
        )?.value,
      ).toContain(commissioningCycleErrorText(code, "fi"));
    },
  );

  it("creates independent snapshots that retain exact inputs and render identically after later edits", () => {
    const fields = { ...readings };
    const report = buildCommissioningCycle(fields).report!;
    const saved = JSON.parse(JSON.stringify(report));
    const svg = renderCycleChartSvg(report.chartSnapshot!, "fi");
    fields.lp = "3";
    buildCommissioningCycle(fields);
    expect(report).toEqual(saved);
    expect(renderCycleChartSvg(saved.chartSnapshot, "fi")).toBe(svg);
    const currentSource = dataset.sources.find(
      (source) => source.id === report.sources[0]?.id,
    )!;
    expect(report.sources[0]).toEqual(currentSource);
    expect(report.sources[0]).not.toBe(currentSource);
  });
});
