import { describe, expect, it } from "vitest";
import { toggleDecimalSign } from "../apps/web/src/components/SignedDecimalInput";
describe("native decimal input sign action", () => {
  it.each([["", "-"], ["-", ""], ["10,5", "-10,5"], ["-10,5", "10,5"], ["10.50", "-10.50"], ["+10,5", "-10,5"], [" 10,5", " -10,5"], ["-.5", ".5"], ["0", "-0"]])("toggles %s without parsing or reformatting", (value, expected) => {
    expect(toggleDecimalSign(value)).toBe(expected);
  });
});
