import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderAboutPage } from "../apps/web/about/render";
import releases from "../data/releases.json";
import {
  buildAboutPages,
  renderAboutRobots,
  renderAboutSitemap,
} from "../scripts/about-build";

describe("static about publication", () => {
  for (const locale of ["fi", "en"] as const) {
    it(`keeps ${locale} actions and content usable without executable JavaScript`, () => {
      const html = renderAboutPage(locale);
      const scripts = [
        ...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g),
      ];
      expect(scripts).toHaveLength(1);
      expect(scripts[0][1]).toContain('type="application/ld+json"');
      const schema = JSON.parse(scripts[0][2]);
      expect(schema["@context"]).toBe("https://schema.org");
      const software = schema["@graph"].find(
        (node: { "@type": string }) => node["@type"] === "SoftwareApplication",
      );
      expect(software.url).toBe("https://phasekit.app/");
      expect(software.softwareVersion).toBe(
        releases.find((release) => release.channel === "stable")?.version,
      );
      const primaryActions = [
        ...html.matchAll(/<a class="button" href="([^"]+)"/g),
      ];
      expect(primaryActions.length).toBeGreaterThanOrEqual(2);
      expect(
        primaryActions.every((action) => action[1] === "https://phasekit.app/"),
      ).toBe(true);
      expect(html).toContain("<details><summary>");
      expect(html).not.toMatch(/\son\w+\s*=|javascript:/i);
    });

    it(`limits ${locale} LinkedIn links to the author and footer`, () => {
      const html = renderAboutPage(locale);
      const author = html.match(
        /<section class="author-section[\s\S]*?<\/section>/,
      )?.[0];
      const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)?.[0];
      expect(author).toContain('href="https://www.linkedin.com/in/hupli"');
      expect(footer).toContain('href="https://www.linkedin.com/in/hupli"');
      const remainingBody = html
        .slice(html.indexOf("<body>"))
        .replace(author!, "")
        .replace(footer!, "");
      expect(remainingBody).not.toContain("linkedin.com");
    });
  }

  it("builds both language routes as complete HTML with shared tokens", () => {
    const output = mkdtempSync(join(tmpdir(), "phasekit-about-"));
    try {
      buildAboutPages(output);
      for (const [locale, route] of [
        ["fi", "tietoa"],
        ["en", "about"],
      ] as const) {
        const html = readFileSync(join(output, route, "index.html"), "utf8");
        expect(html).toMatch(/<!doctype html>/i);
        expect(html).toContain(`lang="${locale}"`);
        expect(html).toContain(`https://phasekit.app/${route}/`);
        expect(html).toContain('hreflang="fi"');
        expect(html).toContain('hreflang="en"');
        expect(html).toContain("/about/tokens.css");
        expect(html).toContain("/about/about.css");
      }
      expect(readFileSync(join(output, "about/tokens.css"), "utf8")).toBe(
        readFileSync("packages/ui/src/tokens.css", "utf8"),
      );
      expect(readFileSync(join(output, "sitemap.xml"), "utf8")).toBe(
        renderAboutSitemap(),
      );
    } finally {
      rmSync(output, { recursive: true, force: true });
    }
  });

  it("limits the sitemap to stable public about pages and excludes beta crawlers", () => {
    expect(renderAboutSitemap().match(/<loc>/g)).toHaveLength(2);
    expect(renderAboutRobots(true)).toBe("User-agent: *\nDisallow: /\n");
    expect(renderAboutRobots(false)).toContain(
      "Sitemap: https://phasekit.app/sitemap.xml",
    );
  });

  it("normalises public route slashes before the SPA catchall", () => {
    const redirects = readFileSync("netlify.toml", "utf8");
    expect(redirects.indexOf('from = "/about"')).toBeLessThan(
      redirects.indexOf('from = "/*"'),
    );
    expect(redirects.indexOf('from = "/tietoa"')).toBeLessThan(
      redirects.indexOf('from = "/*"'),
    );
  });
});
