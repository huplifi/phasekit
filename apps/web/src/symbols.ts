import library from "./symbol-data.json";

export type SchematicSymbol = (typeof library.symbols)[number];
export type SymbolDomain = "cold" | "electrical";
export const symbols = library.symbols;
export const symbolSources: Record<
  string,
  { title: string; url?: string; note: string }
> = library.source_documents;
type Labels = Record<string, { fi: string; en: string }>;
export const categoryLabels: Labels = {
  kylmakierto: { fi: "Kylmäkierto", en: "Refrigeration circuit" },
  johtimet: { fi: "Johtimet ja yhteydet", en: "Conductors and connections" },
  ohjaus: { fi: "Ohjaus", en: "Controls" },
  kuormat: { fi: "Kuormat ja laitteet", en: "Loads and equipment" },
  "suojaus-erotus": { fi: "Suojaus ja erotus", en: "Protection and isolation" },
  liitynnat: { fi: "Liitännät", en: "Terminals and outlets" },
  asennuskytkimet: { fi: "Asennuskytkimet", en: "Installation switches" },
  tehonmuunto: { fi: "Tehonmuunto", en: "Power conversion" },
  maadoitus: { fi: "Maadoitus", en: "Earthing" },
  passiiviset: { fi: "Passiiviset komponentit", en: "Passive components" },
};
export const representationLabels: Labels = {
  piirikaavio: { fi: "Piirikaavio", en: "Circuit diagram" },
  kylmakaavio: { fi: "Kylmäkaavio", en: "Refrigeration diagram" },
  asennuspiirustus: { fi: "Asennuspiirustus", en: "Installation drawing" },
  yksiviivainen: { fi: "Yksiviivainen", en: "Single-line diagram" },
  toimintolohko: { fi: "Toimintolohko", en: "Functional block" },
};
export const statusLabels: Labels = {
  lahdevertailtu: { fi: "Lähdevertailtu", en: "Compared with source" },
  sovellettu: { fi: "Sovellettu merkki", en: "Adapted symbol" },
  tarkistettava: {
    fi: "Tarkistettava esitystapa",
    en: "Representation needs checking",
  },
};
function normalise(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fi")
    .trim();
}
export function searchSymbols(
  query: string,
  domain: SymbolDomain,
  category?: string,
): SchematicSymbol[] {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  return symbols
    .filter((symbol) => {
      if ((symbol.category === "kylmakierto") !== (domain === "cold"))
        return false;
      if (category && symbol.category !== category) return false;
      const text = normalise(
        [
          symbol.name_fi,
          symbol.name_en,
          ...symbol.aliases_fi,
          symbol.purpose,
        ].join(" "),
      );
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => a.name_fi.localeCompare(b.name_fi, "fi"));
}
