import type { Fact, Refrigerant } from "./contracts";
import { ExactDecimal, parseDecimal } from "./units";

export interface CO2eComponentRow {
  refrigerantId: string;
  designation: string;
  massPercent: string;
  massKg: string;
  gwp: string | null;
  basis: string | null;
  tonnesCO2e: string | null;
  sourceIds: string[];
}
export interface CO2eBreakdownResult {
  status: "complete" | "unavailable";
  reason?: "composition" | "component_gwp";
  rows: CO2eComponentRow[];
  selectedTonnesCO2e: string;
  componentTonnesCO2e: string | null;
  weightedGwp: string | null;
  differenceTonnesCO2e: string | null;
  reconciled: boolean;
  statutoryMixture: boolean;
}
const euComponentBases = new Set([
  "EU-2024/573-Annex-I-AR4",
  "EU-2024/573-Annex-I-AR6",
  "EU-2024/573-Annex-II-AR6",
  "EU-2024/573-Annex-VI",
]);
function validFact(fact?: Fact): fact is Fact {
  if (
    !fact ||
    fact.state !== "verified" ||
    fact.value === null ||
    !fact.basis ||
    !fact.sourceIds.length
  )
    return false;
  try {
    return parseDecimal(String(fact.value)).gte(0);
  } catch {
    return false;
  }
}
export function co2eBreakdown(input: {
  refrigerant: Refrigerant;
  refrigerants: readonly Refrigerant[];
  kg: string;
  gwpKey: string;
}): CO2eBreakdownResult {
  const { refrigerant: r, gwpKey } = input;
  const selected = r.facts[gwpKey];
  if (!validFact(selected)) throw new Error("verified_gwp_with_basis_required");
  // This is the converter's calculated mass, which may use scientific
  // notation or include more fractional places than a user-entered decimal.
  if (
    input.kg.length > 300 ||
    !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d{1,3})?$/i.test(input.kg)
  )
    throw new Error("invalid_calculated_mass");
  const kg = new ExactDecimal(input.kg);
  if (!kg.isFinite()) throw new Error("invalid_calculated_mass");
  if (kg.lt(0)) throw new Error("negative_quantity");
  const selectedGwp = parseDecimal(String(selected.value));
  const selectedTotal = kg.mul(selectedGwp).div(1000);
  const statutoryMixture =
    gwpKey === "gwp_eu_2024_573_100yr" &&
    selected.basis === "EU-2024/573-Annex-VI-mass-weighted";
  const base: CO2eBreakdownResult = {
    status: "unavailable",
    rows: [],
    selectedTonnesCO2e: selectedTotal.toString(),
    componentTonnesCO2e: null,
    weightedGwp: null,
    differenceTonnesCO2e: null,
    reconciled: false,
    statutoryMixture,
  };
  const recipe =
    r.kind === "pure"
      ? [{ refrigerantId: r.id, massPercent: "100", sourceIds: r.sourceIds }]
      : r.components;
  if (
    r.kind === "blend" &&
    (r.coverage.composition !== "verified" || !recipe.length)
  )
    return { ...base, reason: "composition" };
  let sum = new ExactDecimal(0);
  const ids = new Set<string>();
  for (const c of recipe) {
    try {
      const percent = parseDecimal(c.massPercent);
      if (
        percent.lte(0) ||
        percent.gt(100) ||
        !c.sourceIds.length ||
        ids.has(c.refrigerantId)
      )
        return { ...base, reason: "composition" };
      sum = sum.plus(percent);
      ids.add(c.refrigerantId);
    } catch {
      return { ...base, reason: "composition" };
    }
  }
  if (!sum.eq(100)) return { ...base, reason: "composition" };
  const lookup = new Map(input.refrigerants.map((c) => [c.id, c]));
  let weighted = new ExactDecimal(0);
  let complete = true;
  const rows = recipe.map((c) => {
    const component =
      c.refrigerantId === r.id ? r : lookup.get(c.refrigerantId);
    const candidate = component?.facts[gwpKey];
    // EU Annex VI deliberately uses the regulation's prescribed Annex I/II/VI
    // values. This is not an arbitrary fallback between IPCC assessment reports.
    const fact =
      validFact(candidate) &&
      component?.kind === "pure" &&
      (candidate.basis === selected.basis ||
        (statutoryMixture && euComponentBases.has(candidate.basis!)))
        ? candidate
        : undefined;
    const fraction = parseDecimal(c.massPercent).div(100);
    const mass = kg.mul(fraction);
    if (fact) weighted = weighted.plus(fraction.mul(String(fact.value)));
    else complete = false;
    return {
      refrigerantId: c.refrigerantId,
      designation: component?.designation ?? c.refrigerantId,
      massPercent: c.massPercent,
      massKg: mass.toString(),
      gwp: fact ? String(fact.value) : null,
      basis: fact?.basis ?? null,
      tonnesCO2e: fact
        ? mass.mul(String(fact.value)).div(1000).toString()
        : null,
      sourceIds: [...new Set([...c.sourceIds, ...(fact?.sourceIds ?? [])])],
    };
  });
  if (!complete) return { ...base, rows, reason: "component_gwp" };
  const total = kg.mul(weighted).div(1000);
  return {
    ...base,
    status: "complete",
    rows,
    componentTonnesCO2e: total.toString(),
    weightedGwp: weighted.toString(),
    differenceTonnesCO2e: total.minus(selectedTotal).toString(),
    reconciled: weighted.eq(selectedGwp),
  };
}
