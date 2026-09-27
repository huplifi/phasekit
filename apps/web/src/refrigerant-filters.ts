import type { Refrigerant } from "../../../packages/core/src/contracts";

export type AnnexGroup = "I" | "II-1" | "ODS-I" | "none" | "unknown";
export type RefrigerantFilters = {
  annex?: AnnexGroup | "";
  pt?: "available" | "unavailable" | "";
  ph?: "available" | "unavailable" | "";
  oil?: string;
};

const annexGroups = new Set<AnnexGroup>(["I", "II-1", "ODS-I", "none"]);

function verifiedAnnex(refrigerant: Refrigerant): AnnexGroup | undefined {
  const fact = refrigerant.facts.euAnnex;
  if (
    fact?.state !== "verified" ||
    typeof fact.value !== "string" ||
    fact.sourceIds.length === 0 ||
    !annexGroups.has(fact.value as AnnexGroup)
  )
    return undefined;
  return fact.value as AnnexGroup;
}

/** Return only classifications supported for the refrigerant as a whole. */
export function regulatoryGroups(
  refrigerant: Refrigerant,
  byId: ReadonlyMap<string, Refrigerant>,
): AnnexGroup[] {
  const direct = verifiedAnnex(refrigerant);
  if (direct) return [direct];
  if (
    refrigerant.kind !== "blend" ||
    refrigerant.coverage.composition !== "verified"
  )
    return ["unknown"];
  if (!refrigerant.components.length) return ["unknown"];

  const total = refrigerant.components.reduce(
    (sum, component) => sum + Number(component.massPercent),
    0,
  );
  if (
    !Number.isFinite(total) ||
    Math.abs(total - 100) > 0.000001 ||
    refrigerant.components.some((component) => {
      const fraction = Number(component.massPercent);
      return (
        !component.sourceIds.length ||
        !Number.isFinite(fraction) ||
        fraction <= 0 ||
        fraction > 100
      );
    })
  )
    return ["unknown"];

  const groups = new Set<AnnexGroup>();
  for (const component of refrigerant.components) {
    const record = byId.get(component.refrigerantId);
    const group = record && verifiedAnnex(record);
    if (!group) return ["unknown"];
    groups.add(group);
  }
  return [...groups].sort(
    (a, b) => annexOrder.indexOf(a) - annexOrder.indexOf(b),
  );
}

const annexOrder: AnnexGroup[] = ["I", "II-1", "ODS-I", "none", "unknown"];

export function knownOilCodes(refrigerant: Refrigerant): string[] {
  const codes = [
    refrigerant.facts.oil_typical,
    refrigerant.facts.oil_possible,
  ].flatMap((fact) => {
    if (
      fact?.state !== "verified" ||
      typeof fact.value !== "string" ||
      !fact.sourceIds.length
    )
      return [];
    return fact.value
      .split(";")
      .map((code) => code.trim())
      .filter(Boolean);
  });
  return [...new Set(codes)];
}

export function matchesRefrigerantFilters(
  refrigerant: Refrigerant,
  byId: ReadonlyMap<string, Refrigerant>,
  filters: RefrigerantFilters,
  availability: { pt: boolean; ph: boolean },
): boolean {
  if (
    filters.annex &&
    !regulatoryGroups(refrigerant, byId).includes(filters.annex)
  )
    return false;
  if (filters.pt && availability.pt !== (filters.pt === "available"))
    return false;
  if (filters.ph && availability.ph !== (filters.ph === "available"))
    return false;
  if (filters.oil && !knownOilCodes(refrigerant).includes(filters.oil))
    return false;
  return true;
}

export function filterOptions(
  refrigerants: Refrigerant[],
  byId: ReadonlyMap<string, Refrigerant>,
) {
  const groups = new Set<AnnexGroup>();
  const oils = new Set<string>();
  for (const refrigerant of refrigerants) {
    regulatoryGroups(refrigerant, byId).forEach((group) => groups.add(group));
    knownOilCodes(refrigerant).forEach((code) => oils.add(code));
  }
  return {
    annexes: annexOrder.filter((group) => groups.has(group)),
    oils: [...oils].sort(),
  };
}
