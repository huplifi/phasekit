import { describe, expect, it } from "vitest";
import { calculatePHCycle, getPHDiagram } from "../packages/core/src/ph";
import {
  createCycleChartSnapshot,
  cycleChartBounds,
  DEFAULT_PH_CHART_VIEW,
  renderCycleChartSvg,
  type PHChartView,
} from "../apps/web/src/ph-chart-snapshot";

const result = calculatePHCycle({
  refrigerantId: "r134a",
  lowPressure: { value: "2.5", unit: "bar(a)" },
  highPressure: { value: "10", unit: "bar(a)" },
  T1: { value: "10", unit: "C" },
  T2: { value: "70", unit: "C" },
  T3: { value: "25", unit: "C" },
});

describe("frozen cycle chart", () => {
  it("fits calculated points even when the saturation model extends far left", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result);
    const bounds = cycleChartBounds(snapshot.points);
    const smallestPointH = Math.min(
      ...snapshot.points.map((point) => point[1]),
    );
    const smallestDomeH = Math.min(...snapshot.dome.map((node) => node[1]));
    expect(bounds.xMin).toBeLessThan(smallestPointH);
    expect(bounds.xMin).toBeGreaterThan(smallestDomeH);
    for (const [pressure, enthalpy] of snapshot.points) {
      expect(enthalpy).toBeGreaterThan(bounds.xMin);
      expect(enthalpy).toBeLessThan(bounds.xMax);
      expect(Math.log(pressure)).toBeGreaterThan(bounds.pMin);
      expect(Math.log(pressure)).toBeLessThan(bounds.pMax);
    }
  });

  it("renders standalone SVG from frozen vectors and keeps cycle assumptions explicit", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result);
    const svg = renderCycleChartSvg(snapshot, "en");
    expect(snapshot.points[3][1]).toBe(snapshot.points[2][1]);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("Saturation boundaries are open");
    expect(svg).toContain('stroke-dasharray="3 4"');
    expect(svg).toContain("log p · bar(a)");
    expect(svg).not.toContain("var(");
    expect(renderCycleChartSvg(snapshot, "en")).toBe(svg);
  });

  it("retains fitted bounds and no invented guides for a legacy snapshot", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result);
    const legacy = {
      kind: snapshot.kind,
      dataVersion: snapshot.dataVersion,
      dome: snapshot.dome,
      points: snapshot.points,
    };
    const svg = renderCycleChartSvg(legacy, "en");
    const bounds = cycleChartBounds(legacy.points);
    const expectedFirstX =
      74 +
      ((legacy.points[0][1] - bounds.xMin) / (bounds.xMax - bounds.xMin)) * 620;
    expect(svg).toContain(`<circle cx="${expectedFirstX.toFixed(2)}"`);
    expect(svg).not.toContain('class="ph-guide-');
    expect(svg).toContain('viewBox="0 0 720 420"');
  });

  it("freezes only selected curves, view and provider version independently", () => {
    const diagram = structuredClone(getPHDiagram("r134a")!);
    const cycle = structuredClone(result);
    const view: PHChartView = {
      fitCycle: false,
      visibleKinds: { temperature: false, entropy: true, volume: true },
    };
    const snapshot = createCycleChartSnapshot(diagram, cycle, view);
    expect(
      snapshot.isolines!.every((line) => line.kind !== "temperature"),
    ).toBe(true);
    expect(snapshot.isolineDataVersion).toBe(
      diagram.provider.isolineDataVersion,
    );
    const before = JSON.stringify(snapshot);
    view.fitCycle = true;
    view.visibleKinds.entropy = false;
    diagram.isolines.find(
      (line) => line.kind === "entropy",
    )!.segments[0][0][1] = -999;
    diagram.provider.isolineDataVersion = "updated-provider";
    diagram.dome[0].liquidEnthalpyKJkg = "-999";
    cycle.points["1"].enthalpyKJkg = "-999";
    expect(JSON.stringify(snapshot)).toBe(before);
    const svg = renderCycleChartSvg(snapshot, "en");
    expect(svg).not.toContain('class="ph-guide-temperature"');
    expect(svg).toContain('class="ph-guide-entropy"');
    expect(svg).toContain('class="ph-guide-volume"');
  });

  it("uses the readable commissioning default without changing the whole-area UI default", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result);
    expect(snapshot.view).toEqual({
      fitCycle: true,
      visibleKinds: { temperature: true, entropy: false, volume: false },
    });
    expect(DEFAULT_PH_CHART_VIEW.fitCycle).toBe(false);
    expect(snapshot.isolines!.length).toBeGreaterThan(0);
    expect(
      snapshot.isolines!.every((line) => line.kind === "temperature"),
    ).toBe(true);
  });

  it("uses whole-model enthalpy extents including selected guides and dome pressure extents", () => {
    const diagram = structuredClone(getPHDiagram("r134a")!);
    diagram.isolines = [
      {
        kind: "temperature",
        phase: "vapour",
        level: 20,
        segments: [
          [
            [2.5, 5000],
            [10, 5010],
          ],
        ],
      },
    ];
    const snapshot = createCycleChartSnapshot(
      diagram,
      result,
      DEFAULT_PH_CHART_VIEW,
    );
    const allH = [
      ...snapshot.dome.flatMap((row) => [row[1], row[2]]),
      ...snapshot.points.map((row) => row[1]),
      5000,
      5010,
    ];
    const minH = Math.min(...allH);
    const maxH = Math.max(...allH);
    const pad = (maxH - minH) * 0.09;
    const x =
      74 +
      ((snapshot.points[0][1] - (minH - pad)) / (maxH - minH + 2 * pad)) * 620;
    expect(renderCycleChartSvg(snapshot, "en")).toContain(
      `<circle cx="${x.toFixed(2)}"`,
    );
    const fitted = { ...snapshot, view: { ...snapshot.view!, fitCycle: true } };
    expect(renderCycleChartSvg(fitted, "en")).not.toContain(
      `<circle cx="${x.toFixed(2)}"`,
    );
    expect(renderCycleChartSvg(snapshot, "en")).not.toContain("NaN");
  });

  it("renders fine enthalpy and all nine logarithmic subdivisions with different weights", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result);
    const svg = renderCycleChartSvg(snapshot, "en");
    const bounds = cycleChartBounds(snapshot.points);
    for (const pressure of [3, 4, 6, 7, 8, 9]) {
      const y =
        30 +
        ((bounds.pMax - Math.log(pressure)) / (bounds.pMax - bounds.pMin)) *
          330;
      expect(svg).toContain(
        `class="ph-grid-minor" x1="74" y1="${y.toFixed(2)}"`,
      );
    }
    expect(svg.match(/class="ph-grid-minor"/g)!.length).toBeGreaterThan(
      svg.match(/class="ph-grid-major"/g)!.length,
    );
    expect(svg).toContain('stroke="#e1e8eb" stroke-width="0.5"');
    expect(svg).toContain('stroke="#b8c9d1" stroke-width="0.9"');
  });

  it("keeps segment gaps open and puts localised guide values outside the plot", () => {
    const diagram = structuredClone(getPHDiagram("r134a")!);
    diagram.isolines = [
      {
        kind: "temperature",
        phase: "vapour",
        level: 7.25,
        segments: [
          [
            [3, 400],
            [4, 410],
          ],
          [
            [7, 420],
            [9, 430],
          ],
        ],
      },
    ];
    const snapshot = createCycleChartSnapshot(diagram, result);
    const svg = renderCycleChartSvg(snapshot, "fi");
    const paths = [
      ...svg.matchAll(/<path class="ph-guide-temperature" d="([^"]+)"/g),
    ];
    expect(paths).toHaveLength(2);
    for (const [, d] of paths) {
      expect(d.match(/M/g)).toHaveLength(1);
      expect(d.match(/L/g)).toHaveLength(1);
      expect(d).not.toContain("Z");
    }
    const clipped = svg
      .split('<g clip-path="url(#ph-cycle-clip)">')[1]
      .split("</g>")[0];
    expect(clipped).not.toContain("<text");
    expect(svg).toContain("T · °C: 7,25");
    expect(renderCycleChartSvg(snapshot, "en")).toContain("T · °C: 7.25");
    expect(svg.indexOf('class="ph-guide-temperature"')).toBeLessThan(
      svg.indexOf('stroke-width="2.5"'),
    );
  });

  it("does not show guide paths or legend when every optional kind is hidden", () => {
    const snapshot = createCycleChartSnapshot(getPHDiagram("r134a")!, result, {
      fitCycle: true,
      visibleKinds: { temperature: false, entropy: false, volume: false },
    });
    expect(snapshot.isolines).toEqual([]);
    const svg = renderCycleChartSvg(snapshot, "en");
    expect(svg).not.toContain('class="ph-guide-');
    expect(svg).toContain('viewBox="0 0 720 420"');
  });
});
