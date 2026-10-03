import { describe, expect, it } from "vitest";
import {
  durationPresentation,
  formatDurationMinutes,
} from "../apps/web/src/duration";
import {
  formatReportRow,
  reportDurationNote,
  reportHasRoundedValues,
} from "../apps/web/src/report-summary";

describe("readable heat durations", () => {
  it.each([
    ["0", "0 s"],
    ["0.001", "< 1 s"],
    ["0.025", "≈2 s"],
    ["3.9", "3 min 54 s"],
    ["5.135", "≈5 min 8 s"],
    ["5,135", "≈5 min 8 s"],
    ["59.999", "≈1 h"],
    ["60", "1 h"],
    ["175", "2 h 55 min"],
    ["1439.999", "≈1 vrk"],
    ["1440", "1 vrk"],
    ["1501", "1 vrk 1 h 1 min"],
    ["43200", "30 vrk"],
    ["43800", "≈1 kk"],
    ["525600", "≈1 v"],
    ["569400", "≈1 v 1 kk"],
    ["657000", "≈1 v 3 kk"],
    ["1007400", "≈1 v 11 kk"],
    ["617520", "≈1 v 2 kk 3 vrk"],
    ["5.256e17", "≈1e+12 v"],
  ])("formats %s minutes as %s", (minutes, expected) => {
    expect(formatDurationMinutes(minutes, "fi")).toBe(expected);
  });
  it("localizes long units and discloses calendar approximations", () => {
    expect(durationPresentation("617520", "en")).toEqual({
      text: "≈1 yr 2 mo 3 d",
      calendar: true,
    });
    expect(durationPresentation("1501", "en")).toEqual({
      text: "1 d 1 h 1 min",
      calendar: false,
    });
  });
  it.each(["-1", "NaN", "Infinity", "", "not a time", "1e99999999999999999"])(
    "rejects invalid duration %s",
    (value) => {
      expect(durationPresentation(value, "fi")).toBeNull();
    },
  );
  it("updates legacy report presentation without changing the exact stored minutes", () => {
    const duration = {
      label: { fi: "Ideaalinen aika", en: "Duration" },
      value: "5.135",
      unit: "min",
    };
    const snapshot = structuredClone(duration);
    expect(formatReportRow(duration, "fi")).toBe("≈5 min 8 s");
    expect(reportHasRoundedValues({ inputs: [], outputs: [duration] })).toBe(
      true,
    );
    expect(duration).toEqual(snapshot);
    expect(
      reportDurationNote({ inputs: [], outputs: [duration] }, "fi"),
    ).toBeNull();
    expect(
      reportDurationNote(
        { inputs: [], outputs: [{ ...duration, value: "525600" }] },
        "fi",
      ),
    ).toContain("365 vrk");
    // Explicit minute conversions retain their requested unit.
    expect(
      formatReportRow(
        { ...duration, label: { fi: "Tulos", en: "Result" } },
        "fi",
      ),
    ).toBe("5,135 min");
  });
});
