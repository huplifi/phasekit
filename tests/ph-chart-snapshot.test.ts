import { describe, expect, it } from "vitest";
import { calculatePHCycle, getPHDiagram } from "../packages/core/src/ph";
import {
  createCycleChartSnapshot,
  cycleChartBounds,
  renderCycleChartSvg,
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
});
