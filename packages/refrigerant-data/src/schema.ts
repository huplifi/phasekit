import { z } from "zod";

const cell = z.string();
const status = z.enum(["verified", "partial", "unsupported", "estimated"]);
const compositionStatus = z.enum(["verified", "partial", "not_applicable"]);

export const refrigerantRowSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  designation: z.string().min(1),
  kind: z.enum(["pure", "blend"]),
  chemical_name: cell,
  formula: cell,
  cas_number: cell,
  ashrae_safety_group: cell,
  ped_fluid_group: cell,
  odp: cell,
  gwp_ar4_100: cell,
  gwp_eu_2024_573_100yr: cell,
  gwp_eu_2024_573_basis: cell,
  gwp_eu_2024_590_100yr: cell,
  gwp_eu_2024_590_basis: cell,
  normal_boiling_c: cell,
  critical_temp_c: cell,
  critical_pressure_bar_abs: cell,
  triple_point_c: cell,
  nominal_glide_k: cell,
  normal_density_kg_m3: cell,
  molar_mass_g_mol: cell,
  thermo_conditions_json: cell,
  lower_flammability_limit_vol_pct: cell,
  autoignition_c: cell,
  oil_notes_fi: cell,
  oil_notes_en: cell,
  oil_typical: cell,
  oil_possible: cell,
  legal_family: cell,
  eu_annex: cell,
  identity_status: z.enum(["verified", "partial"]),
  composition_status: compositionStatus,
  safety_status: status,
  thermo_status: status,
  regulatory_eu_fi_status: z.enum(["verified", "partial", "unsupported"]),
  pt_status: z.enum(["verified", "estimated", "unsupported"]),
  identity_source_id: cell,
  safety_source_id: cell,
  environmental_source_id: cell,
  thermo_source_id: cell,
  regulatory_source_id: cell,
  reviewed_at: cell,
  fact_source_ids_json: cell,
});

export const componentRowSchema = z.strictObject({
  refrigerant_id: z.string().min(1),
  component_refrigerant_id: z.string().min(1),
  mass_fraction: z.string().regex(/^(?:0|1|0?\.\d+|1\.0+)$/),
  legal_family: cell,
  source_id: cell,
  reviewed_at: cell,
});

export const aliasRowSchema = z.strictObject({
  refrigerant_id: z.string().min(1),
  alias: z.string().min(1),
  normalized_alias: z.string().min(1),
  kind: z.enum(["spelling", "trade_name", "historical", "chemical_name"]),
  manufacturer: cell,
  source_id: cell,
  locale: cell,
});

export const sourceRowSchema = z.strictObject({
  source_id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.string().url(),
  version_or_date: z.string().min(1),
  license_or_terms: z.string().min(1),
  scope: z.string().min(1),
  checked_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checked_by: z.string().min(1),
  notes: cell,
});

export const factSchema = z.strictObject({
  state: z.enum(["verified", "unknown", "not_applicable"]),
  value: z.union([z.string(), z.number(), z.null()]),
  unit: z.string().optional(),
  basis: z.string().optional(),
  sourceIds: z.array(z.string()),
  checkedAt: z.string().optional(),
  conditions: z.object({
    temperatureC: z.number().optional(),
    pressureKPaAbsolute: z.number().optional(),
    phase: z.string().optional(),
    method: z.string().optional(),
  }).optional(),
});

export const sourceSchema = z.strictObject({
  id: z.string(), title: z.string(), url: z.string().url(), version: z.string(),
  checkedAt: z.string(), license: z.string(), note: z.string().optional(),
});

export const refrigerantSchema = z.strictObject({
  id: z.string(), designation: z.string(), name: z.strictObject({ fi: z.string(), en: z.string() }),
  kind: z.enum(["pure", "blend"]), family: z.string(), aliases: z.array(z.string()),
  cas: z.string().nullable(), formula: z.string().nullable(),
  components: z.array(z.strictObject({ refrigerantId: z.string(), massPercent: z.string(), sourceIds: z.array(z.string()) })),
  facts: z.record(z.string(), factSchema), sourceIds: z.array(z.string()),
  coverage: z.strictObject({
    identity: z.enum(["verified", "partial"]), composition: compositionStatus,
    safety: z.enum(["verified", "partial"]), regulatory_eu_fi: z.enum(["verified", "partial", "unsupported"]),
    pt: z.enum(["verified", "estimated", "unsupported"]),
  }),
});

export const datasetSchema = z.strictObject({
  version: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), checkedAt: z.string(),
  refrigerants: z.array(refrigerantSchema), sources: z.array(sourceSchema),
});

export type RefrigerantRow = z.infer<typeof refrigerantRowSchema>;
export type ComponentRow = z.infer<typeof componentRowSchema>;
export type AliasRow = z.infer<typeof aliasRowSchema>;
export type SourceRow = z.infer<typeof sourceRowSchema>;
