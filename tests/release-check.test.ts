import { describe, expect, it } from "vitest";
import {
  compareVersions,
  validateReleaseChange,
} from "../scripts/release-check";
import releases from "../data/releases.json";
import { validateReleases } from "../scripts/releases";

describe("release increment gate", () => {
  const previous = validateReleases(releases.slice(1), releases[1].version);
  const current = validateReleases(releases, releases[0].version);
  it("blocks forgotten versions, including data, SVG and pipeline changes", () => {
    for (const path of [
      "apps/web/public/symbols/new.svg",
      "packages/core/src/index.ts",
      "data/releases.json",
      "scripts/releases.ts",
      "netlify.toml",
    ])
      expect(() =>
        validateReleaseChange(
          [path],
          "0.5.0-beta.4",
          "0.5.0-beta.4",
          previous,
          previous,
        ),
      ).toThrow(/newer/);
    expect(() =>
      validateReleaseChange(
        ["apps/web/src/App.tsx"],
        "0.5.0-beta.4",
        "0.4.1",
        previous,
        previous,
      ),
    ).toThrow(/newer/);
  });
  it("allows a new candidate and documentation-only follow-up without rewriting published notes", () => {
    expect(() =>
      validateReleaseChange(
        ["apps/web/src/symbol-data.json"],
        "0.5.0-beta.4",
        "0.5.0-beta.5",
        previous,
        current,
      ),
    ).not.toThrow();
    expect(() =>
      validateReleaseChange(
        ["docs/evidence.md", "README.md", "tests/releases.test.ts"],
        "0.5.0-beta.4",
        "0.5.0-beta.4",
        previous,
        previous,
      ),
    ).not.toThrow();
    expect(() =>
      validateReleaseChange(
        ["data/releases.json"],
        "0.5.0-beta.4",
        "0.5.0-beta.5",
        previous,
        [current[0]],
      ),
    ).toThrow(/Preserve/);
  });
  it("compares numeric beta versions and stable promotion correctly", () => {
    expect(compareVersions("0.5.0-beta.10", "0.5.0-beta.9")).toBe(1);
    expect(compareVersions("0.5.0", "0.5.0-beta.10")).toBe(1);
    expect(compareVersions("0.5.0-beta.1", "0.5.0")).toBe(-1);
    expect(compareVersions("0.5.0", "0.5.0")).toBe(0);
    expect(() => compareVersions("development", "0.5.0")).toThrow();
  });
});
