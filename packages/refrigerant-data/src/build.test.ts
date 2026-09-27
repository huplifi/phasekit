import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import { readCanonicalRows, validateCanonical, buildDataset } from "./build";
const rows = () => structuredClone(readCanonicalRows());
describe("canonical bank validation and reproducibility", () => {
  it("rebuilds a stable payload from reversed CSV order", () => {
    const a = rows();
    const b = rows();
    for (const list of Object.values(b)) list.reverse();
    expect(buildDataset(validateCanonical(a))).toEqual(
      buildDataset(validateCanonical(b)),
    );
  });
  it("rejects wrong CAS checksums", () => {
    const r = rows();
    r.refrigerants.find((r) => r.id === "r134a")!.cas_number = "811-97-3";
    expect(() => validateCanonical(r)).toThrow(/CAS checksum/);
  });
  it("rejects stale composition references", () => {
    const r = rows();
    r.components[0].component_refrigerant_id = "doesnotexist";
    expect(() => validateCanonical(r)).toThrow(/Unknown component/);
  });
  it("rejects total mass outside tolerance", () => {
    const r = rows();
    r.components.find((c) => c.refrigerant_id === "r513a")!.mass_fraction =
      "0.9";
    expect(() => validateCanonical(r)).toThrow(/sum to/);
  });
  it("requires exact unity for a verified nominal recipe", () => {
    const r = rows();
    r.components.find(
      (c) =>
        c.refrigerant_id === "r422d" && c.component_refrigerant_id === "r125",
    )!.mass_fraction = "0.6509999999999999";
    expect(() => validateCanonical(r)).toThrow(/expected exactly 1/);
  });
  it("rejects dangerous source links", () => {
    const r = rows();
    r.sources[0].url = "javascript:alert(1)";
    expect(() => validateCanonical(r)).toThrow(/source URL/);
  });
  it("rejects numeric garbage and missing legal basis", () => {
    const r = rows();
    r.refrigerants.find((r) => r.id === "r134a")!.gwp_eu_2024_573_100yr =
      "unknown";
    expect(() => validateCanonical(r)).toThrow(/Invalid numeric/);
    const b = rows();
    b.refrigerants.find((r) => r.id === "r134a")!.gwp_eu_2024_573_basis = "";
    expect(() => validateCanonical(b)).toThrow(/basis/);
  });
  it("rejects alias collisions across refrigerants", () => {
    const r = rows();
    r.aliases.push({
      refrigerant_id: "r22",
      alias: "R134a",
      normalized_alias: "r134a",
      kind: "spelling",
      manufacturer: "",
      source_id: r.sources[0].source_id,
      locale: "und",
    });
    expect(() => validateCanonical(r)).toThrow(/Ambiguous alias/);
  });
  it("retains an unknown blend without inventing a composition", () => {
    const r = rows();
    const blend = r.refrigerants.find((r) => r.id === "r513a")!;
    blend.composition_status = "partial";
    r.components = r.components.filter((c) => c.refrigerant_id !== blend.id);
    const data = buildDataset(validateCanonical(r));
    expect(
      data.refrigerants.find((r) => r.id === blend.id)?.coverage.composition,
    ).toBe("partial");
  });
});

it("rejects swapping a PFC assessment basis onto an HFC", () => {
  const r = rows();
  r.refrigerants.find((r) => r.id === "r134a")!.gwp_eu_2024_573_basis =
    "EU-2024/573-Annex-I-AR6";
  expect(() => validateCanonical(r)).toThrow(/basis does not match/);
});
it("requires complete conditions for a density value", () => {
  const r = rows();
  const fluid = r.refrigerants.find((r) => r.id === "r134a")!;
  fluid.normal_density_kg_m3 = "1200";
  expect(() => validateCanonical(r)).toThrow(/Missing conditions/);
  fluid.thermo_conditions_json = JSON.stringify({
    normal_density_kg_m3: {
      temperatureC: 20,
      pressureKPaAbsolute: 101.325,
      phase: "liquid",
      method: "test-only fixture",
    },
  });
  expect(() => validateCanonical(r)).not.toThrow();
});

it("retains the distinct legal and product evidence for R514A", () => {
  const data = buildDataset(validateCanonical(rows()));
  const blend = data.refrigerants.find((r) => r.id === "r514a")!;
  expect(blend.coverage.composition).toBe("verified");
  expect(blend.components.map((c) => [c.refrigerantId, c.massPercent])).toEqual(
    [
      ["r1130e", "25.3"],
      ["r1336mzzz", "74.7"],
    ],
  );
  expect(blend.facts.odp.value).toBe("0.00006");
  expect(blend.facts.odp.sourceIds).toEqual(["epa-chiller-snap-r514a"]);
  expect(blend.facts.normal_boiling_c.sourceIds).toEqual([
    "chemours-xp30-tech",
  ]);
  expect(blend.facts.gwp_eu_2024_573_100yr).toMatchObject({
    state: "verified",
    value: "1.55376",
    basis: "EU-2024/573-Annex-VI-mass-weighted",
  });
  expect(
    data.refrigerants.find((r) => r.id === "r1130e")!.facts
      .gwp_eu_2024_573_100yr,
  ).toMatchObject({ value: "0", basis: "EU-2024/573-Annex-VI" });
});

it("keeps conditional physical and nonflammability facts explicit", () => {
  const data = buildDataset(validateCanonical(rows()));
  const r407c = data.refrigerants.find((r) => r.id === "r407c")!;
  expect(r407c.facts.nominal_glide_k).toMatchObject({
    state: "verified",
    value: "7.1",
    sourceIds: ["bitzer-refreport-table"],
    conditions: {
      pressureKPaAbsolute: 101.325,
      phase: "two_phase",
    },
  });
  expect(
    data.refrigerants.find((r) => r.id === "r744")!.facts.normal_boiling_c
      .state,
  ).toBe("unknown");
  expect(
    data.refrigerants.find((r) => r.id === "r515b")!.facts
      .lower_flammability_limit_vol_pct,
  ).toMatchObject({
    state: "not_applicable",
    sourceIds: ["honeywell-r515b-tds"],
  });
});

it("keeps common-fluid ignition limits tied to their measured or published conditions", () => {
  const data = buildDataset(validateCanonical(rows()));
  const get = (id: string) => data.refrigerants.find((r) => r.id === id)!.facts;
  expect(get("r32").lower_flammability_limit_vol_pct).toMatchObject({
    state: "verified",
    value: "13.8",
    sourceIds: ["daikin-r32-sds-2023"],
    conditions: { phase: "gas_in_air" },
  });
  expect(get("r32").autoignition_c.state).toBe("unknown");
  expect(get("r1234yf").lower_flammability_limit_vol_pct).toMatchObject({
    state: "verified",
    value: "6.2",
    sourceIds: ["chemours-yf-bulletin"],
    conditions: { temperatureC: 21, method: "ASTM E681-04" },
  });
  expect(get("r1234yf").autoignition_c).toMatchObject({
    state: "verified",
    value: "405",
    sourceIds: ["chemours-yf-bulletin"],
  });
  expect(get("r152a").lower_flammability_limit_vol_pct).toMatchObject({
    state: "verified",
    value: "3.9",
    sourceIds: ["chemours-a2l-charge-guidance"],
  });
  expect(get("r717").lower_flammability_limit_vol_pct).toMatchObject({
    state: "verified",
    value: "15.4",
    sourceIds: ["linde-r717-sds-2020"],
  });
  expect(get("r717").autoignition_c).toMatchObject({
    state: "verified",
    value: "651",
    sourceIds: ["linde-r717-sds-2020"],
  });
  expect(get("r1234zee").lower_flammability_limit_vol_pct.state).toBe(
    "unknown",
  );
});

it("rejects a per-fact source mapping to an unknown source", () => {
  const r = rows();
  r.refrigerants.find((x) => x.id === "r514a")!.fact_source_ids_json =
    JSON.stringify({ odp: ["no-such-source"] });
  expect(() => validateCanonical(r)).toThrow(/references unknown source/);
});

it("maps the five Annex I HFCs omitted from the legal supplement", () => {
  const data = buildDataset(validateCanonical(rows()));
  const expected = new Map([
    ["r236ea", "1370"],
    ["r236fa", "9810"],
    ["r245ca", "693"],
    ["r245fa", "1030"],
    ["r365mfc", "794"],
  ]);
  for (const [id, gwp] of expected) {
    const fluid = data.refrigerants.find((r) => r.id === id)!;
    expect(fluid.facts.euAnnex).toMatchObject({
      state: "verified",
      value: "I",
      sourceIds: ["eu-2024-573"],
    });
    expect(fluid.facts.gwp_eu_2024_573_100yr).toMatchObject({
      state: "verified",
      value: gwp,
      basis: "EU-2024/573-Annex-I-AR4",
      sourceIds: ["eu-2024-573"],
    });
  }
});

it("preserves reviewed mass composition coverage", () => {
  const r = rows();
  expect(
    r.refrigerants.filter(
      (x) => x.kind === "blend" && x.composition_status === "verified",
    ),
  ).toHaveLength(183);
  expect(r.refrigerants.filter((x) => x.ashrae_safety_group)).toHaveLength(228);
  const built = buildDataset(validateCanonical(r));
  for (const blend of built.refrigerants.filter(
    (x) => x.kind === "blend" && x.coverage.composition === "verified",
  )) {
    const total = blend.components.reduce(
      (sum, component) => sum.plus(component.massPercent),
      new Decimal(0),
    );
    expect(total.eq(100), blend.designation).toBe(true);
  }
});

it("keeps source-specific names and structured oil facts", () => {
  const r = rows();
  const pure = r.refrigerants.filter((x) => x.kind === "pure");
  expect(pure).toHaveLength(66);
  expect(pure.every((x) => x.chemical_name !== x.designation)).toBe(true);
  expect(
    pure.every((x) =>
      Array.isArray(JSON.parse(x.fact_source_ids_json).chemical_name),
    ),
  ).toBe(true);
  expect(r.refrigerants.filter((x) => x.oil_typical)).toHaveLength(121);
  const data = buildDataset(validateCanonical(r));
  const r142b = data.refrigerants.find((x) => x.id === "r142b")!;
  expect(r142b.name.en).toBe("Monochlorodifluoroethane");
  expect(r142b.sourceIds).toContain("epa-ods-names");
  const re143a = data.refrigerants.find((x) => x.id === "re143a")!;
  expect(re143a.name.en).toBe("Methyl trifluoromethyl ether");
  expect(re143a.sourceIds).toContain("nist-refprop-identities");
  const r513a = data.refrigerants.find((x) => x.id === "r513a")!;
  expect(r513a.facts.oil_typical).toMatchObject({
    state: "verified",
    value: "POE",
    sourceIds: ["chemours-replacement-guide"],
  });
  expect(r513a.facts.oil_possible).toMatchObject({
    state: "verified",
    value: "PVE",
    sourceIds: ["bitzer-refreport-table"],
  });
  expect(
    data.refrigerants.find((x) => x.id === "r485a")!.facts.ashrae_safety_group
      .state,
  ).toBe("unknown");
});

it("rejects unsupported oil codes and name source references", () => {
  const oil = rows();
  oil.refrigerants.find((x) => x.id === "r513a")!.oil_typical = "P0E";
  expect(() => validateCanonical(oil)).toThrow(/Invalid oil_typical/);
  const name = rows();
  name.refrigerants.find((x) => x.id === "r142b")!.fact_source_ids_json =
    JSON.stringify({ chemical_name: ["missing-name-source"] });
  expect(() => validateCanonical(name)).toThrow(/references unknown source/);
});

it("maps new R31 and RC318 component facts to the correct EU annex and assessment basis", () => {
  const data = buildDataset(validateCanonical(rows()));
  const get = (id: string) => data.refrigerants.find((x) => x.id === id)!;
  expect(get("r31").facts.euAnnex).toMatchObject({
    value: "ODS-I",
    sourceIds: ["eu-2024-590"],
  });
  expect(get("r31").facts.odp).toMatchObject({
    value: "0.020",
    sourceIds: ["eu-2024-590"],
  });
  expect(get("r31").facts.gwp_eu_2024_590_100yr).toMatchObject({
    value: "79.4",
    basis: "EU-2024/590-Annex-I-GWP100",
  });
  expect(get("rc318").facts.euAnnex).toMatchObject({
    value: "I",
    sourceIds: ["eu-2024-573"],
  });
  expect(get("rc318").facts.gwp_eu_2024_573_100yr).toMatchObject({
    value: "10200",
    basis: "EU-2024/573-Annex-I-AR6",
  });
  for (const id of ["r405a", "r505", "r506"])
    expect(get(id).coverage.regulatory_eu_fi).toBe("verified");
  expect(get("r13i1").coverage.regulatory_eu_fi).toBe("unsupported");
});
