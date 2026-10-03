import { describe, expect, it } from "vitest";
import {
  savedReportPath,
  savedCheckPath,
  selectedSavedReport,
  selectedSavedReportId,
} from "../apps/web/src/saved-report-route";

describe("exact saved report links", () => {
  it("round-trips imported IDs containing route separators", () => {
    for (const id of ["a/b", "a?b", "a#b", "a%b", "a b"]) {
      expect(selectedSavedReportId(`#${savedReportPath(id)}`)).toBe(id);
    }
  });

  it("ignores malformed or unrelated hashes", () => {
    expect(selectedSavedReportId("#/saved/%ZZ")).toBe("");
    expect(selectedSavedReportId("#/equipment/a")).toBe("");
  });
});

it("distinguishes check routes from encoded tool IDs and supports aliases", () => {
  for (const id of ["check/a", "a/b", "a% b"]) {
    expect(selectedSavedReport(`#${savedReportPath(id)}`)).toEqual({
      kind: "tool",
      id,
    });
    expect(selectedSavedReport(`#${savedCheckPath(id)}`)).toEqual({
      kind: "check",
      id,
    });
    expect(
      selectedSavedReport(
        `#${savedCheckPath(id).replace("/reports/", "/saved/")}`,
      ),
    ).toEqual({ kind: "check", id });
  }
  expect(selectedSavedReport("#/reports/check/%ZZ")).toEqual({
    kind: "check",
    id: "",
  });
  expect(selectedSavedReport("#/reports")).toBeNull();
});
