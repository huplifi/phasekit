import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { measurementTypes } from "../apps/web/src/electrical";
import { ElectricalMeasurementGuide } from "../apps/web/src/components/ElectricalMeasurementGuide";
import { electricalLearningGuides } from "../apps/web/src/electrical-learning-guides";

describe("electrical study guidance", () => {
  it("provides both languages and traceable primary sources for every optional measurement type", () => {
    expect(Object.keys(electricalLearningGuides).sort()).toEqual(
      Object.keys(measurementTypes).sort(),
    );
    const primaryHosts = new Set([
      "media.fluke.com",
      "www.electrical-installation.org",
      "www.metrel.si",
    ]);
    for (const guide of Object.values(electricalLearningGuides)) {
      for (const locale of ["fi", "en"] as const) {
        expect(guide.purpose[locale].trim()).not.toBe("");
        expect(guide.preparation[locale].trim()).not.toBe("");
        expect(guide.interpretation[locale].trim()).not.toBe("");
      }
      expect(guide.sources.length).toBeGreaterThan(0);
      for (const source of guide.sources) {
        const url = new URL(source.url);
        expect(url.protocol).toBe("https:");
        expect(primaryHosts.has(url.hostname)).toBe(true);
        if (url.hostname === "media.fluke.com")
          expect(url.hash).toMatch(/^#page=\d+$/);
      }
    }
  });

  it("keeps study content inside the row disclosure without selecting a result or assessment", () => {
    for (const locale of ["fi", "en"] as const) {
      for (const type of Object.keys(measurementTypes) as Array<
        keyof typeof measurementTypes
      >) {
        const markup = renderToStaticMarkup(
          createElement(ElectricalMeasurementGuide, { type, locale }),
        );
        expect(markup).toContain(
          locale === "fi" ? "Tuloksen arviointi" : "Interpreting the result",
        );
        expect(markup).toContain('rel="noreferrer"');
        expect(markup).not.toMatch(/<(?:input|select|button|details)\b/);
        // No verified Finnish standard text was available for numeric limits.
        expect(markup).not.toMatch(
          /[<>≤≥]\s*\d|\b\d+(?:[.,]\d+)?\s*(?:MΩ|Ω|ms|mA)\b/,
        );
      }
    }
  });
});
