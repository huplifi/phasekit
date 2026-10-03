import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import supplement from "../../../data/coolprop-supplement/manifest.json";
import curves from "../generated/pt-curves.json";
import solverFailures from "../../../data/pt/solver-failures.json";
import { getPTAvailability, offlinePTProvider } from "./pt";

describe("P–T coverage regressions", () => {
  it("pins every added EOS file and preserves the exact canonical blend mass recipes", () => {
    expect(curves.modelSupplement).toEqual(supplement);
    for (const entry of supplement.fluids) {
      const bytes = readFileSync(
        new URL(
          `../../../data/coolprop-supplement/${entry.file}`,
          import.meta.url,
        ),
      );
      expect(createHash("sha256").update(bytes).digest("hex")).toBe(
        entry.sha256,
      );
    }
    const components = parse(
      readFileSync(
        new URL("../../../data/components.csv", import.meta.url),
        "utf8",
      ),
      { columns: true },
    ) as Record<string, string>[];
    for (const [id, recipe] of Object.entries(curves.explicitBlendRecipes)) {
      const expected = components.filter((part) => part.refrigerant_id === id);
      expect(
        recipe.components.map((part) => [
          part.refrigerantId,
          part.massFraction,
          part.sourceId,
        ]),
      ).toEqual(
        expected.map((part) => [
          part.component_refrigerant_id,
          part.mass_fraction,
          part.source_id,
        ]),
      );
    }
  });

  it("excludes independently observed numerical holes on the affected branch", () => {
    for (const failure of solverFailures.failures) {
      const side = failure.side as "bubble" | "dew";
      const range = getPTAvailability(failure.refrigerantId, side);
      expect(
        offlinePTProvider.pressureAtTemperature(
          failure.refrigerantId,
          String(failure.temperatureC),
          side,
        ),
      ).toBeNull();
      expect(
        Number(range.maximumTemperatureC) <
          failure.temperatureC - solverFailures.guardK ||
          Number(range.minimumTemperatureC) >
            failure.temperatureC + solverFailures.guardK,
      ).toBe(true);
    }
  });
  it.each([
    ["r410a", 56, 35.17586685, 35.09373957],
    ["r404a", 60, 28.850001, 28.712194],
    ["r407c", 56, 25.36997942, 22.99843514],
    ["r507a", 56, 27.01168195, 26.99119364],
    ["r411a", 20, 8.56030918, 8.12878347],
    ["r511a", 20, 8.38520166, 8.38504813],
    ["r1123", 20, 18.72476339, 18.72476339],
    ["r1130e", 20, 0.3645319, 0.3645319],
    ["r1132a", 20, 35.94719165, 35.94719165],
    ["r1132e", 20, 14.53032711, 14.53032711],
    ["r1336mzzz", 20, 0.60232485, 0.60232485],
    ["r1224ydz", 20, 1.23047088, 1.23047088],
    ["r452b", 20, 13.8550461, 13.4163616],
    ["r454c", 20, 10.4309416, 8.47055551],
    ["r455a", 20, 12.3847586, 9.06867121],
    ["r513b", 20, 6.13511523, 6.13507232],
    ["r718", 190, 12.55236155, 12.55236155],
    ["r11", 190, 39.24965539, 39.24965539],
    ["r113", 190, 23.69165822, 23.69165822],
    ["r141b", 190, 34.05283484, 34.05283484],
    ["r601", 190, 30.45177035, 30.45177035],
  ])(
    "%s supports ordinary working temperatures on both branches",
    (id, temperature, bubble, dew) => {
      // Fresh pinned CoolProp 7.2.0 evaluations, not values interpolated from our table.
      for (const [side, expected] of [
        ["bubble", bubble],
        ["dew", dew],
      ] as const) {
        const result = offlinePTProvider.pressureAtTemperature(
          id,
          String(temperature),
          side,
        );
        expect(result).not.toBeNull();
        expect(
          Math.abs(Number(result!.pressureBarAbsolute) / expected - 1),
        ).toBeLessThan(0.003);
      }
    },
  );

  it("supports the R410A field case against an independent manufacturer table", () => {
    // Chemours Freon 410A SI table p.6: 56 C, dew 3493.1 kPa absolute.
    // Different equations of state: 1% cross-source tolerance, separate from interpolation tolerance.
    const result = offlinePTProvider.pressureAtTemperature(
      "r410a",
      "56",
      "dew",
    );
    expect(result).not.toBeNull();
    expect(
      Math.abs(Number(result!.pressureBarAbsolute) / 34.931 - 1),
    ).toBeLessThan(0.01);
  });

  it("keeps every published branch monotonic and bounded in both directions", () => {
    for (const [id, curve] of Object.entries(curves.curves)) {
      for (const side of ["bubble", "dew"] as const) {
        const nodes = (curve.sides as Partial<Record<typeof side, number[][]>>)[
          side
        ];
        if (!nodes) continue;
        expect(nodes.length).toBeGreaterThanOrEqual(3);
        const first = nodes[0]!;
        const last = nodes.at(-1)!;
        expect(getPTAvailability(id, side).minimumTemperatureC).toBe(
          String(first[0]),
        );
        expect(getPTAvailability(id, side).maximumTemperatureC).toBe(
          String(last[0]),
        );
        for (let i = 1; i < nodes.length; i++) {
          expect(nodes[i]![0]).toBeGreaterThan(nodes[i - 1]![0]!);
          expect(nodes[i]![1]).toBeGreaterThan(nodes[i - 1]![1]!);
        }
        for (const node of [first, last]) {
          expect(
            offlinePTProvider.pressureAtTemperature(id, String(node[0]), side),
          ).not.toBeNull();
          expect(
            offlinePTProvider.temperatureAtPressure(
              id,
              node[1]!.toFixed(30),
              side,
            ),
          ).not.toBeNull();
        }
        expect(
          offlinePTProvider.pressureAtTemperature(
            id,
            String(first[0]! - 0.01),
            side,
          ),
        ).toBeNull();
        expect(
          offlinePTProvider.pressureAtTemperature(
            id,
            String(last[0]! + 0.01),
            side,
          ),
        ).toBeNull();
        expect(
          offlinePTProvider.temperatureAtPressure(
            id,
            (first[1]! * 0.99).toFixed(30),
            side,
          ),
        ).toBeNull();
        expect(
          offlinePTProvider.temperatureAtPressure(
            id,
            (last[1]! * 1.01).toFixed(25),
            side,
          ),
        ).toBeNull();
      }
    }
  });
});
