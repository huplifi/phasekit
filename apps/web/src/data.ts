import raw from "../../../packages/refrigerant-data/generated/dataset.json";
import type {
  Dataset,
  Fact,
  Refrigerant,
} from "../../../packages/core/src/contracts";
export const dataset = raw as Dataset;
export const byId = new Map(dataset.refrigerants.map((r) => [r.id, r]));
export const getFact = (r: Refrigerant, ...keys: string[]): Fact | undefined =>
  keys.map((k) => r.facts[k]).find(Boolean);
export const factKeys = {
  safety: ["safetyGroup", "ashrae_safety_group"],
  gwp: ["gwp_eu_2024_573_100yr"],
  odp: ["odp"],
  boiling: ["normal_boiling_c", "normalBoilingC"],
  criticalTemp: ["critical_temp_c", "criticalTemperatureC"],
  criticalPressure: ["critical_pressure_bar_abs", "criticalPressureBarAbs"],
  triplePoint: ["triple_point_c"],
  glide: ["nominal_glide_k"],
  density: ["normal_density_kg_m3"],
  molarMass: ["molar_mass_g_mol"],
  ped: ["ped_fluid_group"],
  lfl: ["lower_flammability_limit_vol_pct"],
  autoignition: ["autoignition_c"],
  oils: ["oil_notes"],
  regulation: ["euAnnex"],
} as const;
