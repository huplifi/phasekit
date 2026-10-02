import type { Locale } from "./index";

export type RefinementKey =
  | "changeSelection"
  | "clearSelection"
  | "chooseRefrigerant"
  | "toolSelectionIntro"
  | "selectedRefrigerant"
  | "editCompareSelection"
  | "dataProvenance"
  | "compareFromTools"
  | "compareNeedsTwo"
  | "restrictionFilterLabel"
  | "restrictionFilterAll"
  | "restrictionSearch"
  | "restrictionCount"
  | "showMoreResults"
  | "showFewerResults"
  | "showMoreRestrictions"
  | "showFewerRestrictions"
  | "noMatchingRestrictions"
  | "safetyHelpA"
  | "safetyHelpB"
  | "safetyHelpFlammability1"
  | "safetyHelpFlammability2L"
  | "safetyHelpFlammability2"
  | "safetyHelpFlammability3"
  | "safetyHelpSeparate"
  | "safetyHelpSource"
  | "gwpFgas"
  | "gwpOds"
  | "gwpIpccAr4"
  | "gwpUnavailable"
  | "chemicalNameUnavailable"
  | "chemicalNameBlend"
  | "oilTypical"
  | "oilPossible"
  | "oilGuidanceUnavailable"
  | "oilGuidanceHelp";

const copy: Record<Locale, Record<RefinementKey, string>> = {
  fi: {
    changeSelection: "Vaihda kylmäainetta",
    clearSelection: "Tyhjennä valinta",
    chooseRefrigerant: "Valitse kylmäaine työkalulle",
    toolSelectionIntro: "Valitse työkalu. Kylmäaine valitaan laskennassa.",
    selectedRefrigerant: "Valittu kylmäaine",
    editCompareSelection: "Muokkaa vertailuaineita",
    dataProvenance: "Tietojen tausta",
    compareFromTools: "Vertaa kylmäaineita",
    compareNeedsTwo: "Valitse vertailuun vähintään kaksi kylmäainetta.",
    restrictionFilterLabel: "Rajoitusten suodatus",
    restrictionFilterAll: "Kaikki",
    restrictionSearch: "Hae otsikosta, laiteryhmästä tai rajauksesta",
    restrictionCount: "Rajoituksia: {count}",
    showMoreResults: "Näytä {count} lisää kylmäainetta",
    showFewerResults: "Näytä vähemmän kylmäaineita",
    showMoreRestrictions: "Näytä {count} lisää rajoitusta",
    showFewerRestrictions: "Näytä vähemmän rajoituksia",
    noMatchingRestrictions: "Suodattimilla ei löytynyt rajoituksia.",
    safetyHelpA: "A = alempi toksisuusluokka.",
    safetyHelpB: "B = korkeampi toksisuusluokka.",
    safetyHelpFlammability1: "1 = liekin etenemistä ei esiinny.",
    safetyHelpFlammability2L: "2L = alempi syttyvyys ja pieni palamisnopeus.",
    safetyHelpFlammability2: "2 = alempi syttyvyys.",
    safetyHelpFlammability3: "3 = korkeampi syttyvyys.",
    safetyHelpSeparate:
      "Kirjain ja numero kuvaavat eri ominaisuuksia; ryhmä ei yksin kuvaa laitteen turvallisuutta.",
    safetyHelpSource: "UNEP / ASHRAE -tietolehti (2023)",
    gwpFgas: "EU:n F-kaasuasetus 2024/573 · GWP 100 v",
    gwpOds: "EU:n ODS-asetus 2024/590 · GWP 100 v",
    gwpIpccAr4: "IPCC AR4 · GWP 100 v",
    gwpUnavailable: "Tieto puuttuu",
    chemicalNameUnavailable: "Tieto puuttuu",
    chemicalNameBlend: "Kylmäaineseos",
    oilTypical: "Tyypillinen öljytyyppi",
    oilPossible: "Muut mahdolliset öljytyypit",
    oilGuidanceUnavailable: "Tieto puuttuu",
    oilGuidanceHelp:
      "Taulukon öljytyypit ovat yleisiä lähdetietoja. Tarkista kompressorimallin vaatima öljy ja viskositeetti laitteen valmistajalta ennen käyttöä.",
  },
  en: {
    changeSelection: "Change refrigerant",
    clearSelection: "Clear selection",
    chooseRefrigerant: "Choose a refrigerant for this tool",
    toolSelectionIntro:
      "Choose a tool. Select the refrigerant inside the calculation.",
    selectedRefrigerant: "Selected refrigerant",
    editCompareSelection: "Edit comparison",
    dataProvenance: "Data provenance",
    compareFromTools: "Compare refrigerants",
    compareNeedsTwo: "Choose at least two refrigerants below to compare.",
    restrictionFilterLabel: "Filter restrictions",
    restrictionFilterAll: "All",
    restrictionSearch: "Search title, equipment group or scope",
    restrictionCount: "Restrictions: {count}",
    showMoreResults: "Show {count} more refrigerants",
    showFewerResults: "Show fewer refrigerants",
    showMoreRestrictions: "Show {count} more restrictions",
    showFewerRestrictions: "Show fewer restrictions",
    noMatchingRestrictions: "No restrictions match these filters.",
    safetyHelpA: "A = lower toxicity class.",
    safetyHelpB: "B = higher toxicity class.",
    safetyHelpFlammability1: "1 = no flame propagation.",
    safetyHelpFlammability2L:
      "2L = lower flammability and low burning velocity.",
    safetyHelpFlammability2: "2 = lower flammability.",
    safetyHelpFlammability3: "3 = higher flammability.",
    safetyHelpSeparate:
      "The letter and number describe separate properties; the group alone does not establish equipment safety.",
    safetyHelpSource: "UNEP / ASHRAE factsheet (2023)",
    gwpFgas: "EU F-gas Regulation 2024/573 · GWP 100 yr",
    gwpOds: "EU ODS Regulation 2024/590 · GWP 100 yr",
    gwpIpccAr4: "IPCC AR4 · GWP 100 yr",
    gwpUnavailable: "Data unavailable",
    chemicalNameUnavailable: "Data unavailable",
    chemicalNameBlend: "Refrigerant blend",
    oilTypical: "Typical oil type",
    oilPossible: "Other possible oil types",
    oilGuidanceUnavailable:
      "Data unavailable",
    oilGuidanceHelp:
      "These oil types are general source data. Before use, confirm the lubricant and viscosity specified for the exact compressor model with its manufacturer.",
  },
};

export function refinementText(
  locale: Locale,
  key: RefinementKey,
  values: Record<string, string | number> = {},
): string {
  return copy[locale][key].replace(/\{(\w+)\}/g, (token, name: string) =>
    String(values[name] ?? token),
  );
}

const familyNames: Record<Locale, Record<string, string>> = {
  fi: {
    blend: "Seos",
    natural: "Luonnollinen kylmäaine",
    non_fluorinated: "Fluoriton kylmäaine",
    unclassified: "Luokittelematon",
  },
  en: {
    blend: "Blend",
    natural: "Natural refrigerant",
    non_fluorinated: "Non-fluorinated refrigerant",
    unclassified: "Unclassified",
  },
};

export function familyText(locale: Locale, family: string): string {
  return (
    familyNames[locale][family] ??
    (/^[A-Z0-9]+$/.test(family)
      ? family
      : family
          .replace(/[_-]+/g, " ")
          .replace(/^\p{L}/u, (first) => first.toLocaleUpperCase(locale)))
  );
}

export const safetyGroupOrder = [
  "A1",
  "B1",
  "A2L",
  "B2L",
  "A2",
  "B2",
  "A3",
  "B3",
] as const;

const oilNames: Record<Locale, Record<string, string>> = {
  fi: {
    MO: "Mineraaliöljy",
    AB: "Alkyylibentseeni",
    POE: "Polyoliesteri",
    PVE: "Polyvinyylieetteri",
    PAO: "Polyalfaolefiini",
    PAG: "Polyalkyleeniglykoli",
  },
  en: {
    MO: "Mineral oil",
    AB: "Alkylbenzene",
    POE: "Polyolester",
    PVE: "Polyvinyl ether",
    PAO: "Polyalphaolefin",
    PAG: "Polyalkylene glycol",
  },
};

export function oilTypeText(locale: Locale, code: string): string {
  return oilNames[locale][code] ?? code;
}
