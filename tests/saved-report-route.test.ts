import { describe, expect, it } from "vitest";
import {
  savedReportPath,
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
