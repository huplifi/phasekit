import { describe, expect, it } from "vitest";
import {
  addCalendarMonths,
  isCalendarDate,
  nextInspectionDate,
} from "./schedule";
import type { CheckResult } from "./contracts";

describe("inspection calendar dates", () => {
  it("adds calendar months through leap years and short months", () => {
    expect(addCalendarMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addCalendarMonths("2027-11-30", 3)).toBe("2028-02-29");
    expect(addCalendarMonths("2024-02-29", 12)).toBe("2025-02-28");
    expect(addCalendarMonths("2026-09-26", 24)).toBe("2028-09-26");
  });
  it("rejects impossible dates and non-calendar intervals", () => {
    for (const value of ["2026-02-29", "2026-13-01", "", "2026-1-1"])
      expect(isCalendarDate(value)).toBe(false);
    expect(() => addCalendarMonths("2026-01-31", 0)).toThrow();
    expect(() => addCalendarMonths("2026-01-31", 1.5)).toThrow();
  });
  it("does not invent a deadline for unsupported or exempt results", () => {
    const result = {
      state: "required",
      months: 12,
      input: { asOf: "2026-09-26" },
    } as CheckResult;
    expect(nextInspectionDate(result, "2025-09-01")).toBe("2026-09-01");
    expect(
      nextInspectionDate({ ...result, state: "exempt" }, "2025-09-01"),
    ).toBeNull();
    expect(
      nextInspectionDate(
        { ...result, state: "insufficient_data" },
        "2025-09-01",
      ),
    ).toBeNull();
    expect(() => nextInspectionDate(result, "2026-09-27")).toThrow(
      "inspection_after_assessment",
    );
  });
});
