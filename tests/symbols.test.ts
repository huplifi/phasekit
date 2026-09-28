import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  symbols,
  searchSymbols,
  symbolSources,
  categoryLabels,
  representationLabels,
  statusLabels,
} from "../apps/web/src/symbols";

describe("schematic reference library", () => {
  it("keeps the two disciplines separate, including identical geometry", () => {
    expect(searchSymbols("", "cold")).toHaveLength(18);
    expect(searchSymbols("", "electrical")).toHaveLength(59);
    expect(
      searchSymbols("kompressori", "cold").every(
        (s) => s.category === "kylmakierto",
      ),
    ).toBe(true);
    expect(
      searchSymbols("", "electrical").some((s) => s.id === "kompressori"),
    ).toBe(true);
    expect(searchSymbols("", "cold").some((s) => s.id === "kompressori")).toBe(
      false,
    );
  });
  it("finds aliases, English names and unaccented Finnish within selected category", () => {
    const symbol = symbols.find(
      (s) => s.aliases_fi.length && s.category === "kylmakierto",
    )!;
    expect(
      searchSymbols(symbol.aliases_fi[0], "cold").map((s) => s.id),
    ).toContain(symbol.id);
    expect(searchSymbols("hoyrystin", "cold").map((s) => s.id)).toContain(
      "kylma-hoyrystin",
    );
    expect(searchSymbols("evaporator", "cold").map((s) => s.id)).toContain(
      "kylma-hoyrystin",
    );
    expect(searchSymbols("  nonexistent  ", "electrical")).toEqual([]);
    expect(
      searchSymbols("", "electrical", "maadoitus").every(
        (s) => s.category === "maadoitus",
      ),
    ).toBe(true);
  });
  it("retains caveats, source references and known shared shapes", () => {
    expect(new Set(symbols.map((s) => s.id)).size).toBe(77);
    for (const symbol of symbols) {
      expect(categoryLabels[symbol.category]).toBeTruthy();
      expect(representationLabels[symbol.representation]).toBeTruthy();
      expect(statusLabels[symbol.status]).toBeTruthy();
      if (symbol.status !== "lahdevertailtu") expect(symbol.notes).not.toBe("");
      for (const source of symbol.sources)
        expect(symbolSources[source.source]).toBeTruthy();
      if (symbol.same_geometry_as)
        expect(symbols.some((s) => s.id === symbol.same_geometry_as)).toBe(
          true,
        );
    }
    expect(JSON.stringify(symbolSources)).not.toContain("Liitteet");
  });
  it("ships only self-contained vector assets with every catalogue entry", () => {
    const directory = "apps/web/public/symbols";
    expect(readdirSync(directory).sort()).toEqual(
      symbols.map((s) => s.file).sort(),
    );
    for (const symbol of symbols) {
      expect(symbol.file).toMatch(/^[a-z0-9-]+\.svg$/);
      const svg = readFileSync(`${directory}/${symbol.file}`, "utf8");
      expect(svg).toContain('viewBox="0 0 64 64"');
      expect(svg).toContain("<title>");
      expect(svg).not.toMatch(
        /<script|<foreignObject|<image|\bon\w+\s*=|(?:xlink:)?href\s*=|url\s*\(/i,
      );
    }
  });
});
