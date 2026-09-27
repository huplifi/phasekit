import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import releases from "../data/releases.json";
import { version } from "../package.json";
import { renderChangelog, validateReleases } from "../scripts/releases";

describe("release publication contract", () => {
  it("keeps the current app, bilingual history and committed changelog in sync", () => {
    const validated = validateReleases(releases, version);
    expect(readFileSync("CHANGELOG.md", "utf8")).toBe(
      renderChangelog(validated),
    );
  });
  it("rejects missing release notes and inconsistent version/channel/date metadata", () => {
    expect(() => validateReleases(releases, "9.0.0")).toThrow(/Newest/);
    expect(() => validateReleases([...releases, releases[0]], version)).toThrow(
      /Duplicate/,
    );
    expect(() =>
      validateReleases([{ ...releases[0], channel: releases[0].channel === "beta" ? "stable" : "beta" }], version),
    ).toThrow(/channel/);
    expect(() =>
      validateReleases(
        [{ ...releases[0], changes: { fi: [], en: ["English"] } }],
        version,
      ),
    ).toThrow();
    expect(() =>
      validateReleases([{ ...releases[0], date: "2026-02-30" }], version),
    ).toThrow();
    expect(() =>
      validateReleases(
        [releases[0], { ...releases[1], date: "2027-01-01" }],
        version,
      ),
    ).toThrow(/newest first/);
  });
});
