import { createHash } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Decimal from "decimal.js";
import ptCurves from "../../core/generated/pt-curves.json";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import type {
  Dataset,
  Fact,
  Refrigerant,
  Source,
} from "../../core/src/contracts";
import {
  aliasRowSchema,
  componentRowSchema,
  datasetSchema,
  refrigerantRowSchema,
  sourceRowSchema,
  factSchema,
  type AliasRow,
  type ComponentRow,
  type RefrigerantRow,
  type SourceRow,
} from "./schema";

const here = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(here, "../../..");
export const dataDir = path.join(projectRoot, "data");
export const generatedDir = path.join(here, "../generated");

export interface CanonicalRows {
  refrigerants: RefrigerantRow[];
  components: ComponentRow[];
  aliases: AliasRow[];
  sources: SourceRow[];
}

function parseCsv<T>(file: string): T[] {
  const text = requireText(file);
  return parse(text, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
}

function requireText(file: string): string {
  // readFileSync keeps parsing and validation synchronous for CLI and tests.
  return readFileSync(file, "utf8");
}

import { readFileSync } from "node:fs";

export function readCanonicalRows(): CanonicalRows {
  return {
    refrigerants: parseCsv<RefrigerantRow>(
      path.join(dataDir, "refrigerants.csv"),
    ),
    components: parseCsv<ComponentRow>(path.join(dataDir, "components.csv")),
    aliases: parseCsv<AliasRow>(path.join(dataDir, "aliases.csv")),
    sources: parseCsv<SourceRow>(path.join(dataDir, "sources.csv")),
  };
}

export function normalized(value: string): string {
  return value.toLocaleLowerCase("und").replace(/[^a-z0-9]/g, "");
}

function sourceList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[;|]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ].sort();
}

const factSourceKeys = new Set([
  "chemical_name",
  "ashrae_safety_group",
  "ped_fluid_group",
  "euAnnex",
  "odp",
  "gwp_eu_2024_573_100yr",
  "gwp_ar4_100",
  "gwp_eu_2024_590_100yr",
  "normal_boiling_c",
  "critical_temp_c",
  "critical_pressure_bar_abs",
  "triple_point_c",
  "nominal_glide_k",
  "normal_density_kg_m3",
  "molar_mass_g_mol",
  "lower_flammability_limit_vol_pct",
  "autoignition_c",
  "oil_notes",
  "oil_notes_en",
  "oil_typical",
  "oil_possible",
]);

function factSourceMap(row: RefrigerantRow): Record<string, string[]> {
  if (!row.fact_source_ids_json) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.fact_source_ids_json);
  } catch {
    throw new Error(`Invalid fact_source_ids_json: ${row.id}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(`Invalid fact_source_ids_json: ${row.id}`);
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (
      !factSourceKeys.has(key) ||
      !Array.isArray(value) ||
      !value.length ||
      !value.every((id) => typeof id === "string" && id.length > 0)
    )
      throw new Error(`Invalid fact source mapping ${key}: ${row.id}`);
    out[key] = [...new Set(value as string[])].sort();
  }
  return out;
}

function checkCas(cas: string): boolean {
  if (!/^\d{2,7}-\d{2}-\d$/.test(cas)) return false;
  const digits = cas.replaceAll("-", "");
  const check =
    [...digits.slice(0, -1)]
      .reverse()
      .reduce((sum, digit, i) => sum + Number(digit) * (i + 1), 0) % 10;
  return check === Number(digits.at(-1));
}

function rowErrors<T>(
  rows: unknown[],
  schema: {
    safeParse(value: unknown): {
      success: boolean;
      error?: { issues: { message: string; path: PropertyKey[] }[] };
    };
  },
  label: string,
): T[] {
  const out: T[] = [];
  rows.forEach((row, index) => {
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      const details = parsed.error?.issues
        .map((issue) => `${String(issue.path.join("."))}: ${issue.message}`)
        .join("; ");
      throw new Error(`${label} row ${index + 2}: ${details}`);
    }
    out.push(row as T);
  });
  return out;
}

export function validateCanonical(rows = readCanonicalRows()): CanonicalRows {
  rows.refrigerants = rowErrors(
    rows.refrigerants,
    refrigerantRowSchema,
    "refrigerants.csv",
  );
  rows.components = rowErrors(
    rows.components,
    componentRowSchema,
    "components.csv",
  );
  rows.aliases = rowErrors(rows.aliases, aliasRowSchema, "aliases.csv");
  rows.sources = rowErrors(rows.sources, sourceRowSchema, "sources.csv");

  const sources = new Map(rows.sources.map((row) => [row.source_id, row]));
  for (const row of rows.sources) {
    if (!/^https:\/\//.test(row.url) || !validDate(row.checked_at))
      throw new Error(`Invalid source URL or date ${row.source_id}`);
  }
  const refrigerants = new Map<string, RefrigerantRow>();
  const casOwners = new Map<string, string>();
  for (const row of rows.refrigerants) {
    if (refrigerants.has(row.id))
      throw new Error(`Duplicate refrigerant id: ${row.id}`);
    if (normalized(row.designation) !== normalized(row.id))
      throw new Error(
        `ID ${row.id} must normalize from designation ${row.designation}`,
      );
    if (row.cas_number && !checkCas(row.cas_number))
      throw new Error(
        `Invalid CAS checksum for ${row.designation}: ${row.cas_number}`,
      );
    for (const id of [
      row.identity_source_id,
      row.safety_source_id,
      row.environmental_source_id,
      row.thermo_source_id,
      row.regulatory_source_id,
    ].flatMap(sourceList)) {
      if (!sources.has(id))
        throw new Error(`${row.designation} references unknown source ${id}`);
    }
    const fieldSources = factSourceMap(row);
    for (const [key, ids] of Object.entries(fieldSources)) {
      for (const id of ids)
        if (!sources.has(id))
          throw new Error(
            `${row.designation} ${key} references unknown source ${id}`,
          );
      const column = key === "oil_notes" ? "oil_notes_fi" : key;
      if (column in row && !row[column as keyof RefrigerantRow])
        throw new Error(`${row.designation} ${key} has a source but no value`);
    }
    if (row.cas_number) {
      const previous = casOwners.get(row.cas_number);
      if (previous)
        throw new Error(
          `Duplicate CAS ${row.cas_number}: ${previous} / ${row.id}`,
        );
      casOwners.set(row.cas_number, row.id);
    }
    if (row.id !== normalized(row.designation))
      throw new Error(`Noncanonical ID ${row.id}`);
    if (
      row.ashrae_safety_group &&
      !/^(A|B)(1|2|2L|3)$/.test(row.ashrae_safety_group)
    )
      throw new Error(`Invalid safety class ${row.id}`);
    if (row.ped_fluid_group && !/^[12]$/.test(row.ped_fluid_group))
      throw new Error(`Invalid PED class ${row.id}`);
    for (const key of ["oil_typical", "oil_possible"] as const) {
      if (!row[key]) continue;
      const codes = row[key].split(";");
      if (
        codes.some(
          (code) => !["MO", "AB", "POE", "PVE", "PAO", "PAG"].includes(code),
        ) ||
        new Set(codes).size !== codes.length
      )
        throw new Error(`Invalid ${key} oil codes: ${row.id}`);
    }
    if (row.eu_annex && !["I", "II-1", "ODS-I", "none"].includes(row.eu_annex))
      throw new Error(`Invalid EU annex ${row.id}`);
    if (
      row.safety_status === "verified" &&
      (!row.ashrae_safety_group || !row.safety_source_id)
    )
      throw new Error(`Verified safety needs a sourced class: ${row.id}`);
    if (
      row.regulatory_eu_fi_status === "verified" &&
      row.kind === "pure" &&
      !row.eu_annex
    )
      throw new Error(`Verified legal status needs annex: ${row.id}`);
    if (row.reviewed_at && !validDate(row.reviewed_at))
      throw new Error(`Invalid review date ${row.id}`);
    for (const key of numericKeys) {
      const value = row[key];
      if (!value || value === "not_applicable") continue;
      if (
        !/^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
        !new Decimal(value).isFinite()
      )
        throw new Error(`Invalid numeric ${key}: ${row.id}`);
      if (!key.endsWith("_c") && new Decimal(value).lt(0))
        throw new Error(`Negative ${key}: ${row.id}`);
    }
    const conditions = parseConditions(row);
    for (const key of ["normal_density_kg_m3", "nominal_glide_k"] as const) {
      if (row[key] && row[key] !== "not_applicable") {
        const c = conditions[key];
        if (
          !c ||
          c.temperatureC === undefined ||
          c.pressureKPaAbsolute === undefined ||
          !c.phase ||
          !c.method
        )
          throw new Error(`Missing conditions for ${key}: ${row.id}`);
      }
    }
    for (const regulation of ["573", "590"] as const) {
      const value = row[`gwp_eu_2024_${regulation}_100yr`];
      const basis = row[`gwp_eu_2024_${regulation}_basis`];
      if (
        Boolean(value) !== Boolean(basis) ||
        (value && !row.regulatory_source_id)
      )
        throw new Error(`GWP needs legal source and basis: ${row.id}`);
    }
    if (row.gwp_eu_2024_573_100yr) {
      const expected =
        row.eu_annex === "I"
          ? row.legal_family === "HFC"
            ? "EU-2024/573-Annex-I-AR4"
            : row.legal_family === "PFC"
              ? "EU-2024/573-Annex-I-AR6"
              : null
          : row.eu_annex === "II-1"
            ? "EU-2024/573-Annex-II-AR6"
            : row.eu_annex === "none" &&
                row.legal_family === "non_fluorinated" &&
                row.gwp_eu_2024_573_100yr === "0"
              ? "EU-2024/573-Annex-VI"
              : null;
      if (row.kind !== "pure" || row.gwp_eu_2024_573_basis !== expected)
        throw new Error(`GWP basis does not match legal class: ${row.id}`);
    }
    if (
      row.gwp_eu_2024_590_100yr &&
      (row.eu_annex !== "ODS-I" ||
        row.gwp_eu_2024_590_basis !== "EU-2024/590-Annex-I-GWP100")
    )
      throw new Error(`ODS GWP basis mismatch: ${row.id}`);
    refrigerants.set(row.id, row);
  }
  if (
    new Set(rows.sources.map((row) => row.source_id)).size !==
    rows.sources.length
  )
    throw new Error("Duplicate source_id");

  const parts = new Map<string, ComponentRow[]>();
  for (const row of rows.components) {
    if (!refrigerants.has(row.refrigerant_id))
      throw new Error(`Unknown blend ${row.refrigerant_id}`);
    if (!refrigerants.has(row.component_refrigerant_id))
      throw new Error(
        `Unknown component ${row.component_refrigerant_id} in ${row.refrigerant_id}`,
      );
    const blend = refrigerants.get(row.refrigerant_id)!;
    const component = refrigerants.get(row.component_refrigerant_id)!;
    if (blend.kind !== "blend")
      throw new Error(
        `Pure substance ${blend.designation} cannot have components`,
      );
    if (component.kind !== "pure")
      throw new Error(
        `Component ${component.designation} must be a pure substance`,
      );
    const fraction = new Decimal(row.mass_fraction);
    if (fraction.lte(0) || fraction.gt(1))
      throw new Error(`Mass fraction outside (0,1] in ${blend.designation}`);
    if (!sources.has(row.source_id))
      throw new Error(
        `${blend.designation} component references unknown source ${row.source_id}`,
      );
    const current = parts.get(row.refrigerant_id) ?? [];
    if (
      current.some(
        (item) =>
          item.component_refrigerant_id === row.component_refrigerant_id,
      )
    )
      throw new Error(
        `Duplicate component ${row.component_refrigerant_id} in ${blend.designation}`,
      );
    current.push(row);
    parts.set(row.refrigerant_id, current);
  }
  for (const row of rows.refrigerants) {
    const components = parts.get(row.id) ?? [];
    if (
      row.kind === "blend" &&
      row.composition_status === "verified" &&
      components.length === 0
    )
      throw new Error(
        `Blend ${row.designation} needs component rows or an explicit pending composition row`,
      );
    if (row.kind === "pure" && row.composition_status !== "not_applicable")
      throw new Error(
        `Pure substance ${row.designation} must use composition_status=not_applicable`,
      );
    if (row.kind === "blend" && components.length > 0) {
      const total = components.reduce(
        (sum, item) => sum.plus(item.mass_fraction),
        new Decimal(0),
      );
      if (
        row.composition_status === "verified"
          ? !total.eq(1)
          : total.minus(1).abs().gt("0.0005")
      )
        throw new Error(
          `${row.designation} component mass fractions sum to ${total}, expected ${row.composition_status === "verified" ? "exactly 1" : "1 ± 0.0005"}`,
        );
      if (
        row.composition_status === "verified" &&
        components.some((item) => !item.source_id)
      )
        throw new Error(
          `Verified composition ${row.designation} needs a source per component`,
        );
    }
    if (row.identity_status === "verified" && !row.identity_source_id)
      throw new Error(
        `Verified identity ${row.designation} needs an identity source`,
      );
    if (row.eu_annex && !row.regulatory_source_id)
      throw new Error(
        `Legal class on ${row.designation} needs a regulatory source`,
      );
    if (row.gwp_ar4_100 && !row.environmental_source_id)
      throw new Error(
        `GWP on ${row.designation} needs an environmental source`,
      );
  }

  const aliasKeys = new Map<string, string>(
    rows.refrigerants.map((r) => [normalized(r.designation), r.id]),
  );
  const aliasRows = new Set<string>();
  for (const row of rows.aliases) {
    if (!refrigerants.has(row.refrigerant_id))
      throw new Error(`Unknown alias target ${row.refrigerant_id}`);
    if (!sources.has(row.source_id))
      throw new Error(
        `Alias ${row.alias} references unknown source ${row.source_id}`,
      );
    if (normalized(row.alias) !== row.normalized_alias)
      throw new Error(`Incorrect normalized alias: ${row.alias}`);
    if (row.kind === "trade_name" && !row.manufacturer)
      throw new Error(`Trade alias ${row.alias} requires a manufacturer`);
    const key = `${row.refrigerant_id}\0${row.normalized_alias}`;
    if (aliasRows.has(key))
      throw new Error(`Duplicate normalized alias ${row.alias}`);
    const owner = aliasKeys.get(row.normalized_alias);
    if (owner && owner !== row.refrigerant_id)
      throw new Error(
        `Ambiguous alias ${row.alias}: ${owner} / ${row.refrigerant_id}`,
      );
    aliasKeys.set(row.normalized_alias, row.refrigerant_id);
    aliasRows.add(key);
  }
  return rows;
}

export function buildDataset(rows = validateCanonical()): Dataset {
  const sources: Source[] = rows.sources
    .map((row) => ({
      id: row.source_id,
      title: row.title,
      url: row.url,
      version: row.version_or_date,
      checkedAt: row.checked_at,
      license: row.license_or_terms,
      ...(row.notes ? { note: row.notes } : {}),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const sourceIdsKnown = new Set(sources.map((source) => source.id));
  const aliases = new Map<string, string[]>();
  for (const row of rows.aliases)
    aliases.set(row.refrigerant_id, [
      ...(aliases.get(row.refrigerant_id) ?? []),
      row.alias,
    ]);
  const components = new Map<string, ComponentRow[]>();
  for (const row of rows.components)
    components.set(row.refrigerant_id, [
      ...(components.get(row.refrigerant_id) ?? []),
      row,
    ]);

  const refrigerantList: Refrigerant[] = rows.refrigerants
    .map((row): Refrigerant => {
      const fieldSources = factSourceMap(row);
      const envSources = sourceList(row.environmental_source_id);
      const regSources = sourceList(row.regulatory_source_id);
      const safeSources = sourceList(row.safety_source_id);
      const thermoSources = sourceList(row.thermo_source_id);
      const idSources = sourceList(row.identity_source_id);
      const fact = (
        key: string,
        value: string,
        ids: string[],
        unit?: string,
        basis?: string,
      ): Fact => {
        ids = fieldSources[key] ?? ids;
        const checkedAt =
          row.reviewed_at ||
          ids
            .map((id) => sources.find((s) => s.id === id)?.checkedAt ?? "")
            .sort()
            .at(-1);
        if (!value || value === "not_applicable")
          return {
            state: value ? "not_applicable" : "unknown",
            value: null,
            sourceIds: value ? ids : [],
            ...(checkedAt ? { checkedAt } : {}),
          };
        if (!ids.length)
          throw new Error(`Value ${value} on ${row.id} must have a source`);
        return {
          state: "verified",
          value,
          sourceIds: ids,
          ...(checkedAt ? { checkedAt } : {}),
          ...(unit ? { unit } : {}),
          ...(basis ? { basis } : {}),
        };
      };
      const facts: Record<string, Fact> = {
        ashrae_safety_group: fact(
          "ashrae_safety_group",
          row.ashrae_safety_group,
          safeSources,
        ),
        ped_fluid_group: fact(
          "ped_fluid_group",
          row.ped_fluid_group,
          safeSources,
        ),
        euAnnex: fact("euAnnex", row.eu_annex, regSources),
        odp: fact("odp", row.odp, envSources),
        gwp_eu_2024_573_100yr: fact(
          "gwp_eu_2024_573_100yr",
          row.gwp_eu_2024_573_100yr,
          regSources,
          undefined,
          row.gwp_eu_2024_573_basis,
        ),
        gwp_ar4_100: fact(
          "gwp_ar4_100",
          row.gwp_ar4_100,
          envSources,
          undefined,
          "IPCC-AR4-100yr",
        ),
        gwp_eu_2024_590_100yr: fact(
          "gwp_eu_2024_590_100yr",
          row.gwp_eu_2024_590_100yr,
          regSources,
          undefined,
          row.gwp_eu_2024_590_basis,
        ),
        normal_boiling_c: fact(
          "normal_boiling_c",
          row.normal_boiling_c,
          thermoSources,
          "°C",
        ),
        critical_temp_c: fact(
          "critical_temp_c",
          row.critical_temp_c,
          thermoSources,
          "°C",
        ),
        critical_pressure_bar_abs: fact(
          "critical_pressure_bar_abs",
          row.critical_pressure_bar_abs,
          thermoSources,
          "bar abs",
        ),
        triple_point_c: fact(
          "triple_point_c",
          row.triple_point_c,
          thermoSources,
          "°C",
        ),
        nominal_glide_k: fact(
          "nominal_glide_k",
          row.nominal_glide_k,
          thermoSources,
        ),
        normal_density_kg_m3: fact(
          "normal_density_kg_m3",
          row.normal_density_kg_m3,
          thermoSources,
          "kg/m³",
        ),
        molar_mass_g_mol: fact(
          "molar_mass_g_mol",
          row.molar_mass_g_mol,
          thermoSources,
          "g/mol",
        ),
        lower_flammability_limit_vol_pct: fact(
          "lower_flammability_limit_vol_pct",
          row.lower_flammability_limit_vol_pct,
          safeSources,
          "vol %",
        ),
        autoignition_c: fact(
          "autoignition_c",
          row.autoignition_c,
          safeSources,
          "°C",
        ),
        oil_notes: fact(
          "oil_notes",
          row.oil_notes_fi,
          row.oil_notes_fi ? safeSources : [],
        ),
        oil_notes_en: fact(
          "oil_notes_en",
          row.oil_notes_en,
          row.oil_notes_en ? safeSources : [],
        ),
        oil_typical: fact("oil_typical", row.oil_typical, safeSources),
        oil_possible: fact("oil_possible", row.oil_possible, safeSources),
      };
      for (const [key, conditions] of Object.entries(parseConditions(row))) {
        if (!facts[key])
          throw new Error(`Unknown condition property ${key}: ${row.id}`);
        facts[key] = { ...facts[key], conditions };
      }
      const rowParts = (components.get(row.id) ?? []).sort((a, b) =>
        a.component_refrigerant_id.localeCompare(b.component_refrigerant_id),
      );
      const componentList = rowParts.map((part) => ({
        refrigerantId: part.component_refrigerant_id,
        massPercent: new Decimal(part.mass_fraction).mul(100).toFixed(),
        sourceIds: [part.source_id],
      }));
      const allIds = [
        ...new Set([
          ...idSources,
          ...safeSources,
          ...envSources,
          ...thermoSources,
          ...regSources,
          ...Object.values(fieldSources).flat(),
          ...rowParts.map((part) => part.source_id),
        ]),
      ]
        .filter((id) => sourceIdsKnown.has(id))
        .sort();
      return {
        id: row.id,
        designation: row.designation,
        name: {
          fi: row.chemical_name || row.designation,
          en: row.chemical_name || row.designation,
        },
        kind: row.kind,
        family:
          row.legal_family || (row.kind === "blend" ? "blend" : "unclassified"),
        aliases: [...new Set(aliases.get(row.id) ?? [])].sort((a, b) =>
          a.localeCompare(b),
        ),
        cas: row.cas_number || null,
        formula: row.formula || null,
        components: componentList,
        facts,
        sourceIds: allIds,
        coverage: {
          identity: row.identity_status,
          composition: row.composition_status,
          safety:
            row.safety_status === "verified" && row.ashrae_safety_group
              ? "verified"
              : "partial",
          regulatory_eu_fi: row.regulatory_eu_fi_status,
          pt: row.pt_status,
        },
      };
    })
    .sort((a, b) =>
      a.designation.localeCompare(b.designation, "en", {
        sensitivity: "base",
        numeric: true,
      }),
    );
  // Annex VI weights legal component GWP by mass; never substitute an unsupported recipe.
  const byId = new Map(refrigerantList.map((r) => [r.id, r]));
  for (const r of refrigerantList) {
    if (
      r.kind !== "blend" ||
      r.coverage.composition !== "verified" ||
      !r.components.length
    )
      continue;
    const parts = r.components.map((c) => ({
      c,
      fluid: byId.get(c.refrigerantId)!,
    }));
    const total = parts.reduce(
      (sum, { c }) => sum.plus(c.massPercent),
      new Decimal(0),
    );
    const supported = parts.every(({ fluid }) => {
      const f = fluid.facts.gwp_eu_2024_573_100yr;
      return (
        f.state === "verified" &&
        f.value !== null &&
        [
          "EU-2024/573-Annex-I-AR4",
          "EU-2024/573-Annex-I-AR6",
          "EU-2024/573-Annex-II-AR6",
          "EU-2024/573-Annex-VI",
        ].includes(f.basis ?? "")
      );
    });
    if (!supported || !total.eq(100)) continue;
    const value = parts
      .reduce(
        (sum, { c, fluid }) =>
          sum.plus(
            new Decimal(c.massPercent)
              .div(100)
              .mul(String(fluid.facts.gwp_eu_2024_573_100yr.value)),
          ),
        new Decimal(0),
      )
      .toFixed();
    const ids = [
      ...new Set(
        parts.flatMap(({ c, fluid }) => [
          ...c.sourceIds,
          ...fluid.facts.gwp_eu_2024_573_100yr.sourceIds,
        ]),
      ),
    ].sort();
    r.facts.gwp_eu_2024_573_100yr = {
      state: "verified",
      value,
      basis: "EU-2024/573-Annex-VI-mass-weighted",
      sourceIds: ids,
      checkedAt: ids
        .map((id) => sources.find((s) => s.id === id)!.checkedAt)
        .sort()
        .at(-1),
    };
    r.sourceIds = [...new Set([...r.sourceIds, ...ids])].sort();
  }
  // Coverage reflects the curves actually bundled with the application.
  const supportedPT = new Set(Object.keys(ptCurves.curves));
  for (const refrigerant of refrigerantList) {
    refrigerant.coverage.pt = supportedPT.has(refrigerant.id)
      ? "estimated"
      : "unsupported";
  }
  const checkedAt =
    rows.sources
      .map((row) => row.checked_at)
      .sort()
      .at(-1) ?? "1970-01-01";
  const canonicalPayload = {
    checkedAt,
    refrigerants: refrigerantList,
    sources,
  };
  const sha256 = createHash("sha256")
    .update(JSON.stringify(canonicalPayload))
    .digest("hex");
  const version = `${checkedAt}.${sha256.slice(0, 12)}`;
  const dataset = {
    version,
    sha256,
    checkedAt,
    refrigerants: refrigerantList,
    sources,
  };
  datasetSchema.parse(dataset);
  return dataset;
}

export async function writeBuildArtifacts(dataset: Dataset): Promise<void> {
  await mkdir(generatedDir, { recursive: true });
  const json = `${JSON.stringify(dataset, null, 2)}\n`;
  await writeFile(path.join(generatedDir, "dataset.json"), json, "utf8");
  const index = dataset.refrigerants.map((r) => ({
    id: r.id,
    designation: r.designation,
    normalized: normalized(
      `${r.designation} ${r.name.en} ${r.name.fi} ${r.aliases.join(" ")}`,
    ),
    aliases: r.aliases,
    family: r.family,
  }));
  await writeFile(
    path.join(generatedDir, "search-index.json"),
    `${JSON.stringify(index, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(generatedDir, "refrigerants.compact.json"),
    JSON.stringify(dataset),
    "utf8",
  );
  await writeFile(
    path.join(generatedDir, "dataset.schema.json"),
    JSON.stringify(z.toJSONSchema(datasetSchema), null, 2),
    "utf8",
  );
  await writeFile(
    path.join(generatedDir, "manifest.json"),
    JSON.stringify(
      {
        version: dataset.version,
        payloadSha256: dataset.sha256,
        fileSha256: createHash("sha256").update(json).digest("hex"),
        records: dataset.refrigerants.length,
      },
      null,
      2,
    ),
    "utf8",
  );
  await writeCoverageReports(dataset);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function coverageText(dataset: Dataset): { markdown: string; html: string } {
  const total = dataset.refrigerants.length;
  const count = (key: keyof Refrigerant["coverage"], val: string) =>
    dataset.refrigerants.filter((r) => r.coverage[key] === val).length;
  const sourced = new Map(dataset.sources.map((source) => [source.id, source]));
  const sourceCounts = [
    [
      "coolprop-mit",
      "CoolProp pinned corpus",
      `${dataset.refrigerants.filter((r) => r.sourceIds.includes("coolprop-mit")).length} imported records with this source; exact source scope and exclusions are documented in DATA-ARCHITECTURE.md.`,
    ],
    [
      "epa-snap-compositions",
      "US EPA SNAP compositions",
      "44 R-designated blend rows on the source page.",
    ],
    [
      "epa-gwp-identities",
      "US EPA GWP table identities",
      "37 R-designated rows, 10 overlap the composition page.",
    ],
    [
      "unep-ozone-blends-live-v3",
      "UNEP Ozone Secretariat live blend list",
      "9 additional historical blend recipes; R507C is an R507A alias.",
    ],
    [
      "unep-teap-2025-v3",
      "UNEP TEAP 2025 table 6.1",
      "25 additional blend recipes and reported safety classes.",
    ],
    [
      "unep-teap-2026-v3",
      "UNEP TEAP 2026 table 6.1",
      "7 additional blend recipes and reported safety classes.",
    ],
  ] as const;
  const pending = dataset.refrigerants
    .filter((r) => r.kind === "blend" && r.coverage.composition !== "verified")
    .map(
      (r) =>
        `- ${r.designation}: recipe is partial or awaits a source with verified mass fractions.`,
    );
  const noLegalClass = dataset.refrigerants
    .filter((r) => r.kind === "pure" && r.facts.euAnnex.state !== "verified")
    .map((r) => r.designation);
  const sourceRows = sourceCounts
    .map(([id, label, denominator]) => {
      const s = sourced.get(id);
      return `| ${label} | ${s?.version ?? "not available"} | ${denominator} |`;
    })
    .join("\n");
  const markdown = `# Refrigerant inventory coverage\n\nGenerated: ${dataset.checkedAt}. Dataset version: \`${dataset.version}\`; SHA-256: \`${dataset.sha256}\`.\n\n## What the denominator means\n\nThe shipped dataset contains **${total} unique R- and RE-designated records** after deduplication across the pinned CoolProp, EPA, UNEP Secretariat and TEAP sources below. This is an explicit source-union denominator, not a claim that every refrigerant in ASHRAE Standard 34 or every historical/trade designation is known. The ASHRAE designation table was not bulk imported because its terms prohibit AI ingestion and derivative works without permission.\n\n| Source scope | Version checked | Source denominator |\n| --- | --- | ---: |\n${sourceRows}\n\nEPA staging reports a source-level union of 71 designations: 44 blend rows + 27 additional EPA GWP-table identities after 10 overlaps. The UNEP/TEAP v3 review adds 41 distinct blends and three pure ingredients. CoolProp contributes a pinned, open MIT corpus. The current record total is the exact deduplicated runtime denominator.\n\nIdentity coverage means the refrigerant designation and pure/blend record type have a source; it does not mean every identity field applies or is populated. A blend has no single molecular formula or CAS number. Blank applicable fields are unknown, not zero. P–T status distinguishes model-based curves from unsupported calculations.\n\n## Coverage by record\n\n| Coverage dimension | Verified / not applicable | Partial or unsupported |\n| --- | ---: | ---: |\n| Identity | ${count("identity", "verified")} verified | ${count("identity", "partial")} partial |\n| Composition | ${count("composition", "verified") + count("composition", "not_applicable")} verified or not applicable | ${count("composition", "partial")} partial |\n| Safety | ${count("safety", "verified")} verified | ${count("safety", "partial")} partial |\n| EU/FI regulatory class | ${count("regulatory_eu_fi", "verified")} verified | ${count("regulatory_eu_fi", "partial") + count("regulatory_eu_fi", "unsupported")} partial or unsupported |\n| P–T curves (CoolProp 7.2.0) | ${count("pt", "estimated")} model-based | ${count("pt", "unsupported")} unsupported |\n\n## Known gaps\n\nComposition rows derived by converting CoolProp mole recipes are retained for discoverability but marked **partial**; they must not be used for legal thresholds or leak-check calculations. Verified blend rows are limited to mass fractions explicitly published in EPA SNAP or another named primary source.\n\nBlends without verified mass fractions: ${pending.length ? "\n\n" + pending.join("\n") : " none in the current imported set."}\n\nEU legal classes and GWP values are populated only when mapped to a cited EU legal source. Pure substances without a verified legal class: ${noLegalClass.length ? noLegalClass.join(", ") : "none"}. A blend's regulatory coverage is derived from its verified component recipe and component legal facts; the blend itself is not assigned a single Annex class. R13I1 and R40 have separate 2024/590 Annex II evidence, but ODS-II needs a distinct legal rule and remains unsupported here. R485A's safety class is withheld because TEAP reports an application-dependent classification in one source. Blank property fields are unknown, not zero. Safety, PED, oil compatibility, and pressure–temperature envelope coverage remain incomplete.\n\nThe coverage report is reproducible via \`pnpm data:coverage\`. Sources, reuse notes, and import limits are documented in [DATA-ARCHITECTURE.md](DATA-ARCHITECTURE.md), [DATA-CONTRIBUTING.md](DATA-CONTRIBUTING.md), and [ASHRAE-IMPORT.md](ASHRAE-IMPORT.md).\n`;
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PhaseKit data coverage</title><style>body{font:16px/1.55 system-ui,sans-serif;max-width:900px;margin:3rem auto;padding:0 1rem;color:#183039}h1,h2{line-height:1.2}table{border-collapse:collapse;width:100%;margin:1rem 0}th,td{border-bottom:1px solid #cbd5d1;padding:.6rem;text-align:left}code{overflow-wrap:anywhere}.warning{padding:1rem;background:#fff3d9;border-left:4px solid #b37326}</style></head><body><h1>Refrigerant inventory coverage</h1><p>Generated ${escapeHtml(dataset.checkedAt)} · version <code>${escapeHtml(dataset.version)}</code></p><p class="warning">${total} unique R- and RE-designated records across the pinned CoolProp, EPA and UNEP source union. This is not an exhaustive ASHRAE Standard 34 inventory.</p><h2>Coverage</h2><table><thead><tr><th>Dimension</th><th>Verified / N/A</th><th>Incomplete</th></tr></thead><tbody><tr><td>Identity</td><td>${count("identity", "verified")}</td><td>${count("identity", "partial")}</td></tr><tr><td>Composition</td><td>${count("composition", "verified") + count("composition", "not_applicable")}</td><td>${count("composition", "partial")}</td></tr><tr><td>Safety</td><td>${count("safety", "verified")}</td><td>${count("safety", "partial")}</td></tr><tr><td>EU/FI legal class</td><td>${count("regulatory_eu_fi", "verified")}</td><td>${count("regulatory_eu_fi", "partial") + count("regulatory_eu_fi", "unsupported")}</td></tr><tr><td>P–T data</td><td>${count("pt", "estimated")} model-based</td><td>${count("pt", "unsupported")} unsupported</td></tr></tbody></table><h2>Gaps</h2><p>CoolProp mole recipes are display-only and marked partial. Legal classes and GWP are populated only where a cited EU legal source verifies them. Blank means unknown, not zero. The ASHRAE bulk table was not imported because its terms restrict AI ingestion.</p><p>Dataset SHA-256: <code>${dataset.sha256}</code></p></body></html>`;
  const detailed = dataset.refrigerants.map((r) => ({
    designation: r.designation,
    coverage: r.coverage,
    unknown: [
      ...Object.entries(r.facts)
        .filter(([, f]) => f.state === "unknown")
        .map(([k]) => k),
      ...(r.kind === "pure" && (!r.name.en || r.name.en === r.designation)
        ? ["chemical_name"]
        : []),
      ...(r.kind === "pure" && !r.formula ? ["formula"] : []),
      ...(r.kind === "pure" && !r.cas ? ["cas"] : []),
    ],
    notApplicable:
      r.kind === "blend"
        ? ["single_chemical_name", "molecular_formula", "cas"]
        : [],
  }));
  const detailsHtml = `<h2>Per-record coverage and unknown fields</h2>${detailed
    .map(
      (r) =>
        `<details><summary>${escapeHtml(r.designation)} — ${escapeHtml(
          Object.entries(r.coverage)
            .map(([k, v]) => `${k}: ${v}`)
            .join("; "),
        )}</summary><p>Unknown applicable fields: ${escapeHtml(r.unknown.join(", ") || "none")}</p><p>Not applicable: ${escapeHtml(r.notApplicable.join(", ") || "none")}</p></details>`,
    )
    .join("")}`;
  return {
    markdown:
      markdown +
      "\n## Per-record unknown fields\n\n" +
      detailed
        .map(
          (r) =>
            `- **${r.designation}**: unknown applicable fields: ${r.unknown.join(", ") || "none"}; not applicable: ${r.notApplicable.join(", ") || "none"}`,
        )
        .join("\n") +
      "\n",
    html: html.replace("</body>", detailsHtml + "</body>"),
  };
}

export async function writeCoverageReports(
  dataset = buildDataset(),
): Promise<void> {
  const { markdown, html } = coverageText(dataset);
  await writeFile(path.join(projectRoot, "docs/COVERAGE.md"), markdown, "utf8");
  await writeFile(path.join(projectRoot, "docs/COVERAGE.html"), html, "utf8");
  const publicDir = path.join(projectRoot, "apps/web/public");
  await mkdir(publicDir, { recursive: true });
  await writeFile(path.join(publicDir, "coverage.html"), html, "utf8");
}

export async function build(): Promise<Dataset> {
  const dataset = buildDataset(validateCanonical());
  await writeBuildArtifacts(dataset);
  return dataset;
}

const numericKeys = [
  "odp",
  "gwp_ar4_100",
  "gwp_eu_2024_573_100yr",
  "gwp_eu_2024_590_100yr",
  "normal_boiling_c",
  "critical_temp_c",
  "critical_pressure_bar_abs",
  "triple_point_c",
  "nominal_glide_k",
  "normal_density_kg_m3",
  "molar_mass_g_mol",
  "lower_flammability_limit_vol_pct",
  "autoignition_c",
] as const;
function validDate(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

function parseConditions(
  row: RefrigerantRow,
): Record<string, NonNullable<Fact["conditions"]>> {
  const raw = (row as RefrigerantRow & { thermo_conditions_json?: string })
    .thermo_conditions_json;
  if (!raw) return {};
  const conditions = z
    .record(z.string(), factSchema.shape.conditions.unwrap().strict())
    .parse(JSON.parse(raw));
  for (const c of Object.values(conditions)) {
    if (c.pressureKPaAbsolute !== undefined && c.pressureKPaAbsolute <= 0)
      throw new Error(`Absolute pressure must be positive: ${row.id}`);
    if (c.temperatureC !== undefined && c.temperatureC < -273.15)
      throw new Error(`Temperature below absolute zero: ${row.id}`);
  }
  return conditions;
}
