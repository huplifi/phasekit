import { describe, expect, it } from "vitest";
import type { Refrigerant } from "../packages/core/src/contracts";
import { dataset } from "../packages/refrigerant-data/src";
import {
  filterOptions,
  knownOilCodes,
  matchesRefrigerantFilters,
  regulatoryGroups,
} from "../apps/web/src/refrigerant-filters";

function record(
  id: string,
  options: {
    kind?: "pure" | "blend";
    annex?: string;
    annexState?: "verified" | "unknown";
    components?: Refrigerant["components"];
    composition?: "verified" | "partial" | "not_applicable";
    oilTypical?: string;
    oilPossible?: string;
  } = {},
): Refrigerant {
  const facts: Refrigerant["facts"] = {};
  if (options.annex !== undefined || options.annexState) facts.euAnnex = {
    state: options.annexState ?? "verified", value: options.annex ?? "I", sourceIds: ["law-source"],
  };
  if (options.oilTypical) facts.oil_typical = { state: "verified", value: options.oilTypical, sourceIds: ["maker"] };
  if (options.oilPossible) facts.oil_possible = { state: "verified", value: options.oilPossible, sourceIds: ["maker"] };
  return {
    id, designation: id, name: { fi: id, en: id }, kind: options.kind ?? "pure", family: "",
    aliases: [], cas: null, formula: null, components: options.components ?? [], facts, sourceIds: [],
    coverage: { identity: "verified", composition: options.composition ?? "not_applicable", safety: "partial", regulatory_eu_fi: "partial", pt: "unsupported" },
  };
}

const part = (refrigerantId: string, massPercent: string): Refrigerant["components"][number] => ({
  refrigerantId, massPercent, sourceIds: ["recipe-source"],
});

describe("catalogue filter facts", () => {
  it("keeps unverified classifications distinct from sourced annex groups", () => {
    const r1 = record("r1", { annex: "I" });
    const unknown = record("unknown", { annex: "I", annexState: "unknown" });
    const byId = new Map([[r1.id, r1], [unknown.id, unknown]]);
    expect(regulatoryGroups(r1, byId)).toEqual(["I"]);
    expect(regulatoryGroups(unknown, byId)).toEqual(["unknown"]);
  });

  it("lets a fully verified blend match each component group and withholds incomplete groups", () => {
    const annexI = record("i", { annex: "I" });
    const annexII = record("ii", { annex: "II-1" });
    const blend = record("blend", { kind: "blend", composition: "verified", components: [part("i", "50"), part("ii", "50")] });
    const unknownPart = record("not-classified", { annexState: "unknown" });
    const uncertainBlend = record("uncertain", { kind: "blend", composition: "verified", components: [part("i", "50"), part("not-classified", "50")] });
    const byId = new Map([annexI, annexII, blend, unknownPart, uncertainBlend].map((r) => [r.id, r]));
    expect(regulatoryGroups(blend, byId)).toEqual(["I", "II-1"]);
    expect(regulatoryGroups(uncertainBlend, byId)).toEqual(["unknown"]);
    expect(regulatoryGroups(record("partial", { kind: "blend", composition: "partial", components: [part("i", "100")] }), byId)).toEqual(["unknown"]);
    expect(regulatoryGroups(record("bad-sum", { kind: "blend", composition: "verified", components: [part("i", "60"), part("ii", "30")] }), byId)).toEqual(["unknown"]);
  });

  it("classifies current verified recipes using the canonical 0–100 mass-percent scale", () => {
    const byId = new Map(dataset.refrigerants.map((r) => [r.id, r]));
    const r513a = byId.get("r513a")!;
    const r404a = byId.get("r404a")!;
    expect(regulatoryGroups(r513a, byId)).toEqual(["I", "II-1"]);
    expect(regulatoryGroups(r404a, byId)).toEqual(["I"]);
  });

  it("uses availability profiles and verified oil codes for exact filter matches", () => {
    const r = record("r134a", { annex: "II-1", oilTypical: "POE", oilPossible: "PVE;PAG" });
    const byId = new Map([[r.id, r]]);
    expect(knownOilCodes(r)).toEqual(["POE", "PVE", "PAG"]);
    expect(matchesRefrigerantFilters(r, byId, { annex: "II-1", pt: "available", ph: "unavailable", oil: "POE" }, { pt: true, ph: false })).toBe(true);
    expect(matchesRefrigerantFilters(r, byId, { pt: "unavailable" }, { pt: true, ph: false })).toBe(false);
    expect(filterOptions([r], byId).annexes).toContain("II-1");
  });

  it("does not expose oil codes without verified, attributed data", () => {
    const r = record("unknown-oil");
    r.facts.oil_possible = { state: "verified", value: "POE", sourceIds: [] };
    expect(knownOilCodes(r)).toEqual([]);
  });
});
