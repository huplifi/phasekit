import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";

const releaseSchema = z
  .object({
    version: z.string().regex(/^\d+\.\d+\.\d+(?:-beta\.\d+)?$/),
    date: z.iso.date(),
    channel: z.enum(["beta", "stable"]),
    title: z.object({
      fi: z.string().trim().min(1),
      en: z.string().trim().min(1),
    }),
    changes: z.object({
      fi: z.array(z.string().trim().min(1)).min(1),
      en: z.array(z.string().trim().min(1)).min(1),
    }),
  })
  .strict();

export function validateReleases(input: unknown, appVersion: string) {
  const releases = z.array(releaseSchema).min(1).parse(input);
  if (releases[0].version !== appVersion)
    throw new Error("Newest release must match package.json version");
  const versions = new Set<string>();
  for (const [index, release] of releases.entries()) {
    if (versions.has(release.version))
      throw new Error("Duplicate release version");
    versions.add(release.version);
    if (release.version.includes("-beta.") !== (release.channel === "beta"))
      throw new Error("Release channel does not match version");
    if (index && release.date > releases[index - 1].date)
      throw new Error("Release dates must be newest first");
  }
  return releases;
}

export function renderChangelog(releases: ReturnType<typeof validateReleases>) {
  return `# Changelog\n\nGenerated from [data/releases.json](data/releases.json). Edit that bilingual source, then run \`pnpm release:build\`. The same notes are bundled in the app under Settings → Release history.\n\nDates describe versions, not the build time of each deployment. Beta releases do not update the stable site. The history starts with the recorded 0.1.0 stable baseline; earlier unversioned updates are not reconstructed.\n\n${releases.map((release) => `## ${release.version} — ${release.date} · ${release.channel === "beta" ? "Beta" : "Stable"}\n\n${release.title.en}\n\n${release.changes.en.map((change) => `- ${change}`).join("\n")}\n`).join("\n")}`;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const input: unknown = JSON.parse(readFileSync("data/releases.json", "utf8"));
  const { version } = JSON.parse(readFileSync("package.json", "utf8"));
  writeFileSync(
    "CHANGELOG.md",
    renderChangelog(validateReleases(input, version)),
  );
  console.log("Validated release history and generated CHANGELOG.md");
}
