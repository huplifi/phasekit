import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderChangelog, validateReleases } from "./releases";

type Release = ReturnType<typeof validateReleases>[number];

export function compareVersions(a: string, b: string) {
  const parts = (version: string) => {
    const match = /^(\d+)\.(\d+)\.(\d+)(?:-beta\.(\d+))?$/.exec(version);
    if (!match) throw new Error(`Unsupported app version: ${version}`);
    return [
      Number(match[1]),
      Number(match[2]),
      Number(match[3]),
      match[4] === undefined ? Infinity : Number(match[4]),
    ];
  };
  const left = parts(a),
    right = parts(b);
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  }
  return 0;
}

export function validateReleaseChange(
  changedFiles: string[],
  previousVersion: string,
  version: string,
  previousReleases: Release[],
  releases: Release[],
) {
  const shipsChanges = changedFiles.some((path) =>
    /^(apps\/|packages\/|assets\/|design\/|data\/|scripts\/|package\.json$|pnpm-lock\.yaml$|netlify\.toml$|tsconfig\.json$)/.test(
      path,
    ),
  );
  if (shipsChanges && compareVersions(version, previousVersion) <= 0)
    throw new Error(
      "Shipped changes require a newer package.json version and bilingual release notes",
    );
  for (const previous of previousReleases) {
    const current = releases.find(
      (release) => release.version === previous.version,
    );
    if (JSON.stringify(current) !== JSON.stringify(previous))
      throw new Error(
        `Preserve published release history: ${previous.version}`,
      );
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  const releases = validateReleases(
    JSON.parse(readFileSync("data/releases.json", "utf8")),
    version,
  );
  if (readFileSync("CHANGELOG.md", "utf8") !== renderChangelog(releases))
    throw new Error("Run pnpm release:build and commit CHANGELOG.md");
  const base = process.env.RELEASE_BASE_REF || process.argv[2];
  if (!base || /^0+$/.test(base))
    throw new Error(
      "release:check requires RELEASE_BASE_REF or a Git base ref argument",
    );
  // A fixed event SHA avoids races with a moving remote branch; fail closed if unavailable.
  const baseSha = git("rev-parse", "--verify", `${base}^{commit}`);
  const previousVersion = JSON.parse(
    git("show", `${baseSha}:package.json`),
  ).version;
  const previousReleases = validateReleases(
    JSON.parse(git("show", `${baseSha}:data/releases.json`)),
    previousVersion,
  );
  validateReleaseChange(
    git("diff", "--name-only", baseSha, "HEAD").split("\n"),
    previousVersion,
    version,
    previousReleases,
    releases,
  );
  // Existing tags must describe the source being built. Do not create or move tags here.
  const tag = `v${version}`;
  if (
    version !== previousVersion &&
    git("tag", "--list", tag) &&
    git("rev-list", "-n", "1", tag) !== git("rev-parse", "HEAD")
  )
    throw new Error(`${tag} does not point to the candidate commit`);
  console.log(
    `Release ${version} checked against ${previousVersion}; version, history and tag checks passed`,
  );
}
