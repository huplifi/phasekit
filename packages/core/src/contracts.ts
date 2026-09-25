export type ValueState = "verified" | "unknown" | "not_applicable";
export interface Fact {
  state: ValueState;
  value: string | number | null;
  unit?: string;
  basis?: string;
  sourceIds: string[];
  checkedAt?: string;
  conditions?: {
    temperatureC?: number;
    pressureKPaAbsolute?: number;
    phase?: string;
    method?: string;
  };
}
export interface Source {
  id: string;
  title: string;
  url: string;
  version: string;
  checkedAt: string;
  license: string;
  note?: string;
}
export interface Component {
  refrigerantId: string;
  massPercent: string;
  sourceIds: string[];
}
export interface Refrigerant {
  id: string;
  designation: string;
  name: { fi: string; en: string };
  kind: "pure" | "blend";
  family: string;
  aliases: string[];
  cas: string | null;
  formula: string | null;
  components: Component[];
  facts: Record<string, Fact>;
  sourceIds: string[];
  coverage: {
    identity: "verified" | "partial";
    composition: "verified" | "partial" | "not_applicable";
    safety: "verified" | "partial";
    regulatory_eu_fi: "verified" | "partial" | "unsupported";
    pt: "verified" | "estimated" | "unsupported";
  };
}
export interface Dataset {
  version: string;
  sha256: string;
  checkedAt: string;
  refrigerants: Refrigerant[];
  sources: Source[];
}
export type ResultState =
  | "required"
  | "below_threshold"
  | "exempt"
  | "outside_rule_scope"
  | "unsupported"
  | "insufficient_data";
export interface CheckInput {
  refrigerantId: string;
  charge: string;
  unit: "kg" | "g";
  equipment:
    | "stationary_refrigeration"
    | "stationary_ac"
    | "stationary_heat_pump"
    | "truck_trailer"
    | "other_mobile"
    | "orc"
    | "switchgear"
    | "fire_protection"
    | "other";
  detection: boolean;
  hermetic: boolean;
  hermeticLabel: boolean;
  residential: boolean;
  asOf: string;
}
export interface ComponentCalculation {
  refrigerantId: string;
  massPercent: string;
  massKg: string;
  annex: string;
  gwpBasis?: string;
  gwp?: string;
  tonnesCO2e?: string;
}
export interface Obligation {
  ruleId: string;
  component: string;
  quantity: string;
  unit: string;
  months: number | null;
  reasonCode: string;
}
export interface CheckResult {
  state: ResultState;
  months: number | null;
  decisiveRule: string | null;
  decisiveComponent: string | null;
  components: ComponentCalculation[];
  obligations: Obligation[];
  reasonCodes: string[];
  requiredInputs: string[];
  missingData?: {
    refrigerantId: string;
    field: "identity" | "composition" | "euAnnex" | "legalGwp";
  }[];
  rulesetVersion: string;
  dataVersion: string;
  sourceIds: string[];
  detectionRequired: boolean;
  input: CheckInput;
}
