import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderAboutPage } from "../apps/web/about/render";
import packageInfo from "../package.json";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

export function renderAboutSitemap() {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://phasekit.app/about/</loc></url>\n  <url><loc>https://phasekit.app/tietoa/</loc></url>\n</urlset>\n`;
}

export function renderAboutRobots(isBetaBuild: boolean) {
  return isBetaBuild
    ? "User-agent: *\nDisallow: /\n"
    : "User-agent: *\nAllow: /\nSitemap: https://phasekit.app/sitemap.xml\n";
}

export function buildAboutPages(
  outputDirectory = resolve(repositoryRoot, "apps/web/dist"),
) {
  for (const locale of ["fi", "en"] as const) {
    const destination = resolve(
      outputDirectory,
      locale === "fi" ? "tietoa/index.html" : "about/index.html",
    );
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, renderAboutPage(locale));
  }
  copyFileSync(
    resolve(repositoryRoot, "packages/ui/src/tokens.css"),
    resolve(outputDirectory, "about/tokens.css"),
  );
  writeFileSync(resolve(outputDirectory, "sitemap.xml"), renderAboutSitemap());
  writeFileSync(
    resolve(outputDirectory, "robots.txt"),
    renderAboutRobots(
      packageInfo.version.includes("-beta.") ||
        process.env.VITE_RELEASE_CHANNEL === "beta",
    ),
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  buildAboutPages();
  console.log("Generated bilingual about pages, sitemap and robots.txt");
}
