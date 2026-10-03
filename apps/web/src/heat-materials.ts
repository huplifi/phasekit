import type { Source } from "../../../packages/core/src/contracts";

export const heatFormulaSource: Source = {
  id: "openstax-sensible-heat-14-2",
  title:
    "OpenStax College Physics 2e — 14.2 Temperature Change and Heat Capacity",
  url: "https://openstax.org/books/college-physics-2e/pages/14-2-temperature-change-and-heat-capacity",
  version: "Table 14.1, footnotes and Example 14.1; checked 2026-09-28",
  checkedAt: "2026-09-28",
  license:
    "Selected factual values with attribution; original source terms apply",
  note: "Representative constant-property estimates, not temperature-dependent property models. Q = m c ΔT; no phase change.",
};

export const foodHeatSource: Source = {
  id: "ashrae-food-heat-mixture",
  title: "ASHRAE Handbook — Thermal Properties of Foods",
  url: "https://handbook.ashrae.org/Handbooks/R18/SI/r18_ch19/r18_ch19_si.aspx",
  version:
    "2018 Refrigeration, chapter 19, Table 1 and section 7; checked 2026-09-28",
  checkedAt: "2026-09-28",
  license:
    "Selected factual coefficients with attribution; original source terms apply",
  note: "Carbohydrate heat-capacity model and mass-weighted mixture method. The assumed kiisseli composition is a PhaseKit example, not a measured recipe from this source.",
};

export interface HeatMaterial {
  id: string;
  name: { fi: string; en: string };
  specificHeatKJkgK: string;
  densityKgM3: string;
  estimated?: boolean;
  reference: { fi: string; en: string };
  sources: Source[];
}

export const heatMaterials: HeatMaterial[] = [
  {
    id: "water",
    name: { fi: "Vesi", en: "Water" },
    specificHeatKJkgK: "4.186",
    densityKgM3: "1000",
    reference: {
      fi: "Nestemäinen vesi: c = 4,186 kJ/(kg·K), taulukon vertailulämpötila 15 °C. Tiheys 1 000 kg/m³ on oppikirjan likiarvo. Arvoja käsitellään vakioina; voit syöttää tehtävän tai käyttöolosuhteiden arvot.",
      en: "Liquid water: c = 4.186 kJ/(kg·K), table reference temperature 15 °C. Density 1,000 kg/m³ is the textbook approximation. Properties are held constant; you can enter exercise or operating-condition values.",
    },
    sources: [heatFormulaSource],
  },
  {
    id: "air",
    name: { fi: "Kuiva ilma", en: "Dry air" },
    specificHeatKJkgK: "1.015",
    densityKgM3: "",
    reference: {
      fi: "Kuiva ilma: cₚ = 1,015 kJ/(kg·K), 20 °C ja vakiopaine 1 atm. Ei suljetun jäykän säiliön cᵥ-arvo. Tilavuuslaskuun tarvitaan ilman tiheys omissa olosuhteissa.",
      en: "Dry air: cₚ = 1.015 kJ/(kg·K), 20 °C at constant pressure of 1 atm. This is not cᵥ for a closed rigid vessel. Volume calculations require density at the actual conditions.",
    },
    sources: [heatFormulaSource],
  },
  {
    id: "copper",
    name: { fi: "Kupari", en: "Copper" },
    specificHeatKJkgK: "0.387",
    densityKgM3: "",
    reference: {
      fi: "Kiinteä kupari: c = 0,387 kJ/(kg·K), taulukon vertailulämpötila 25 °C. Vakioarvio ilman sulamista; tilavuuslaskuun syötä tiheys.",
      en: "Solid copper: c = 0.387 kJ/(kg·K), table reference temperature 25 °C. Constant estimate without melting; enter density for a volume calculation.",
    },
    sources: [heatFormulaSource],
  },
  {
    id: "aluminium",
    name: { fi: "Alumiini", en: "Aluminium" },
    specificHeatKJkgK: "0.900",
    densityKgM3: "",
    reference: {
      fi: "Kiinteä alumiini: c = 0,900 kJ/(kg·K), taulukon vertailulämpötila 25 °C. Vakioarvio ilman sulamista; tilavuuslaskuun syötä tiheys.",
      en: "Solid aluminium: c = 0.900 kJ/(kg·K), table reference temperature 25 °C. Constant estimate without melting; enter density for a volume calculation.",
    },
    sources: [heatFormulaSource],
  },
  {
    id: "kiisseli",
    name: { fi: "Kiisseli", en: "Kiisseli (fruit pudding)" },
    specificHeatKJkgK: "3.9",
    densityKgM3: "",
    estimated: true,
    reference: {
      fi: "Arvio 3,9 kJ/(kg·K): oletuksena 90 mass-% vettä ja 10 mass-% hiilihydraatteja. Suuntaa-antava vakioarvo jäätymättömälle kiisselille, ei mitattu reseptiarvo. Voit muuttaa arvoa.",
      en: "Estimate 3.9 kJ/(kg·K): assumed 90% water and 10% carbohydrate by mass. An approximate constant for unfrozen kiisseli, not a measured recipe value. You can change it.",
    },
    sources: [heatFormulaSource, foodHeatSource],
  },
  {
    id: "custom",
    name: { fi: "Omat arvot", en: "Custom properties" },
    specificHeatKJkgK: "",
    densityKgM3: "",
    reference: {
      fi: "Syötä aineen ominaislämpökapasiteetti ja tarvittaessa tiheys. Käytä samaa olomuotoa ja laskennan lämpötilaväliä vastaavia arvoja.",
      en: "Enter the material's specific heat and density if needed. Use properties for the same phase and temperature interval as your calculation.",
    },
    sources: [],
  },
];
