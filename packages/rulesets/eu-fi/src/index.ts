import Decimal from "decimal.js";
import type {
  CheckInput,
  CheckResult,
  ComponentCalculation,
  Dataset,
  Obligation,
  Refrigerant,
  ResultState,
} from "../../../core/src/contracts";
import {
  ExactDecimal,
  parseDecimal,
  toKilograms,
} from "../../../core/src/units";
import {
  rulesetEffectiveFrom,
  rulesetVersion,
  thresholds,
  type Threshold,
} from "./rules";

export { rulesetEffectiveFrom, rulesetVersion, thresholds } from "./rules";
export { reasonMessages } from "./reasons";
export { restrictionsFor, restrictionRules } from "./restrictions";
export type { RestrictionNotice } from "./restrictions";

type Annex = Threshold["annex"] | "none";
const F_SOURCE = ["eu-2024-573", "fi-ymparisto"];
const ODS_SOURCE = ["eu-2024-590", "fi-ymparisto"];

function tierForAmount(
  annex: Threshold["annex"],
  amount: Decimal,
): Threshold | null {
  if (amount.lt(0)) throw new Error("negative_score");
  const matching = thresholds.filter(
    (rule) => rule.annex === annex && amount.gte(rule.min),
  );
  return matching.at(-1) ?? null;
}

export function evaluateTier(
  annex: Threshold["annex"],
  score: string,
  _detected: boolean,
): Threshold | null {
  return tierForAmount(annex, parseDecimal(score));
}

function interval(rule: Threshold, detected: boolean): number {
  return detected && rule.detectedMonths !== null
    ? rule.detectedMonths
    : rule.months;
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function result(
  input: CheckInput,
  dataset: Dataset,
  state: ResultState,
  reasonCodes: string[],
  extras: Partial<CheckResult> = {},
): CheckResult {
  return {
    state,
    months: null,
    decisiveRule: null,
    decisiveComponent: null,
    components: [],
    obligations: [],
    reasonCodes,
    requiredInputs: ["refrigerantId", "charge", "unit", "equipment", "asOf"],
    rulesetVersion,
    dataVersion: dataset.version,
    sourceIds: [],
    detectionRequired: false,
    input: { ...input },
    ...extras,
  };
}

function legalAnnex(refrigerant: Refrigerant): Annex | null {
  const fact = refrigerant.facts.euAnnex;
  if (
    !fact ||
    fact.state !== "verified" ||
    typeof fact.value !== "string" ||
    fact.sourceIds.length === 0
  )
    return null;
  if (
    fact.value === "I" ||
    fact.value === "II-1" ||
    fact.value === "ODS-I" ||
    fact.value === "none"
  )
    return fact.value;
  return null;
}

function legalGwp(refrigerant: Refrigerant): Decimal | null {
  const fact = refrigerant.facts.gwp_eu_2024_573_100yr;
  const basis =
    refrigerant.family === "PFC"
      ? "EU-2024/573-Annex-I-AR6"
      : refrigerant.family === "HFC"
        ? "EU-2024/573-Annex-I-AR4"
        : null;
  if (
    !basis ||
    !fact ||
    fact.state !== "verified" ||
    fact.basis !== basis ||
    fact.sourceIds.length === 0 ||
    fact.value === null
  )
    return null;
  try {
    const value = parseDecimal(String(fact.value));
    return value.gt(0) ? value : null;
  } catch {
    return null;
  }
}

/** Diagnostics are saved with results so later dataset updates cannot rewrite history. */
export function missingCheckData(
  refrigerant: Refrigerant,
  dataset: Dataset,
): NonNullable<CheckResult["missingData"]> {
  const missing: NonNullable<CheckResult["missingData"]> = [];
  if (
    refrigerant.kind === "blend" &&
    (refrigerant.coverage.composition !== "verified" ||
      !refrigerant.components.length)
  ) {
    return [{ refrigerantId: refrigerant.id, field: "composition" }];
  }
  if (refrigerant.kind === "blend") {
    try {
      const sum = refrigerant.components.reduce(
        (total, row) => total.plus(parseDecimal(row.massPercent)),
        new ExactDecimal(0),
      );
      if (
        !sum.eq(100) ||
        refrigerant.components.some(
          (row) =>
            !row.sourceIds.length || parseDecimal(row.massPercent).lte(0),
        )
      ) {
        return [{ refrigerantId: refrigerant.id, field: "composition" }];
      }
    } catch {
      return [{ refrigerantId: refrigerant.id, field: "composition" }];
    }
  }
  const ids =
    refrigerant.kind === "pure"
      ? [refrigerant.id]
      : refrigerant.components.map((row) => row.refrigerantId);
  for (const id of ids) {
    const component = dataset.refrigerants.find((item) => item.id === id);
    if (!component) {
      missing.push({ refrigerantId: id, field: "identity" });
      continue;
    }
    const annex = legalAnnex(component);
    if (!annex) missing.push({ refrigerantId: id, field: "euAnnex" });
    else if (annex === "I" && !legalGwp(component))
      missing.push({ refrigerantId: id, field: "legalGwp" });
  }
  return missing;
}

interface Breakdown {
  components: ComponentCalculation[];
  hfcTonnes: Decimal;
  hfoKg: Decimal;
  odsKg: Decimal;
  annexes: Set<Annex>;
  sourceIds: Set<string>;
  contributors: Record<"I" | "II-1" | "ODS-I", string[]>;
}

function breakdown(
  refrigerant: Refrigerant,
  dataset: Dataset,
  chargeKg: Decimal,
): Breakdown | null {
  const rows =
    refrigerant.kind === "pure"
      ? [
          {
            refrigerantId: refrigerant.id,
            massPercent: "100",
            sourceIds: refrigerant.sourceIds,
          },
        ]
      : refrigerant.components;
  if (
    rows.length === 0 ||
    rows.length > 100 ||
    (refrigerant.kind === "blend" &&
      refrigerant.coverage.composition !== "verified")
  )
    return null;
  const byId = new Map(dataset.refrigerants.map((item) => [item.id, item]));
  const totalPercent = rows.reduce((sum, row) => {
    try {
      return sum.plus(parseDecimal(row.massPercent));
    } catch {
      return sum.plus(-10000);
    }
  }, new ExactDecimal(0));
  if (!totalPercent.eq(100)) return null;
  const out: Breakdown = {
    components: [],
    hfcTonnes: new ExactDecimal(0),
    hfoKg: new ExactDecimal(0),
    odsKg: new ExactDecimal(0),
    annexes: new Set(),
    sourceIds: new Set(),
    contributors: { I: [], "II-1": [], "ODS-I": [] },
  };
  for (const row of rows) {
    const component = byId.get(row.refrigerantId);
    if (
      !component ||
      (refrigerant.kind === "blend" && row.sourceIds.length === 0)
    )
      return null;
    const annex = legalAnnex(component);
    if (!annex) return null;
    let fraction: Decimal;
    try {
      fraction = parseDecimal(row.massPercent).div(100);
    } catch {
      return null;
    }
    if (fraction.lte(0) || fraction.gt(1)) return null;
    const mass = chargeKg.mul(fraction);
    const calculation: ComponentCalculation = {
      refrigerantId: row.refrigerantId,
      massPercent: row.massPercent,
      massKg: mass.toString(),
      annex,
    };
    out.annexes.add(annex);
    for (const sourceId of [
      ...row.sourceIds,
      ...component.facts.euAnnex!.sourceIds,
    ])
      out.sourceIds.add(sourceId);
    if (annex === "I") {
      const gwp = legalGwp(component);
      if (!gwp) return null;
      const tonnes = mass.mul(gwp).div(1000);
      out.hfcTonnes = out.hfcTonnes.plus(tonnes);
      calculation.gwpBasis = component.facts.gwp_eu_2024_573_100yr!.basis;
      calculation.gwp = gwp.toString();
      calculation.tonnesCO2e = tonnes.toString();
      out.contributors.I.push(component.id);
      for (const sourceId of component.facts.gwp_eu_2024_573_100yr!.sourceIds)
        out.sourceIds.add(sourceId);
    } else if (annex === "II-1") {
      out.hfoKg = out.hfoKg.plus(mass);
      out.contributors["II-1"].push(component.id);
    } else if (annex === "ODS-I") {
      out.odsKg = out.odsKg.plus(mass);
      out.contributors["ODS-I"].push(component.id);
    }
    out.components.push(calculation);
  }
  return out;
}

function equipmentGate(
  input: CheckInput,
  dataset: Dataset,
  isOds: boolean,
  components: ComponentCalculation[],
  sourceIds: string[],
): CheckResult | null {
  const base = { components, sourceIds };
  if (input.equipment === "other")
    return result(
      input,
      dataset,
      "outside_rule_scope",
      ["EQUIPMENT_OUTSIDE_SCOPE"],
      base,
    );
  if (input.equipment === "switchgear")
    return result(
      input,
      dataset,
      "unsupported",
      ["SWITCHGEAR_INPUTS_UNAVAILABLE"],
      base,
    );
  if (input.equipment === "other_mobile") {
    if (isOds)
      return result(
        input,
        dataset,
        "unsupported",
        ["ODS_MOBILE_SCOPE_UNVERIFIED"],
        base,
      );
    return input.asOf < "2027-03-12"
      ? result(
          input,
          dataset,
          "outside_rule_scope",
          ["MOBILE_TRANSITION_UNTIL_2027_03_12"],
          base,
        )
      : result(
          input,
          dataset,
          "unsupported",
          ["MOBILE_SUBTYPE_REQUIRED"],
          base,
        );
  }
  if (
    isOds &&
    (input.equipment === "truck_trailer" || input.equipment === "orc")
  ) {
    return result(
      input,
      dataset,
      "outside_rule_scope",
      ["ODS_EQUIPMENT_OUTSIDE_ARTICLE_21_3"],
      base,
    );
  }
  return null;
}

export function evaluateCheck(
  input: CheckInput,
  dataset: Dataset,
): CheckResult {
  if (!validDate(input.asOf))
    return result(input, dataset, "insufficient_data", ["INVALID_DATE"], {
      requiredInputs: ["asOf"],
    });
  if (input.asOf < rulesetEffectiveFrom)
    return result(input, dataset, "unsupported", [
      "HISTORICAL_RULESET_NOT_AVAILABLE",
    ]);
  let chargeKg: Decimal;
  try {
    chargeKg = toKilograms({ value: input.charge, unit: input.unit });
  } catch {
    return result(input, dataset, "insufficient_data", ["INVALID_CHARGE"], {
      requiredInputs: ["charge", "unit"],
    });
  }
  if (chargeKg.lte(0))
    return result(
      input,
      dataset,
      "insufficient_data",
      ["CHARGE_MUST_BE_POSITIVE"],
      { requiredInputs: ["charge", "unit"] },
    );
  const refrigerant = dataset.refrigerants.find(
    (item) => item.id === input.refrigerantId,
  );
  if (!refrigerant)
    return result(input, dataset, "unsupported", ["REFRIGERANT_NOT_FOUND"]);
  const data = breakdown(refrigerant, dataset, chargeKg);
  if (!data)
    return result(
      input,
      dataset,
      "insufficient_data",
      ["VERIFIED_LEGAL_COMPOSITION_OR_GWP_REQUIRED"],
      { missingData: missingCheckData(refrigerant, dataset) },
    );
  const annexes = data.annexes;
  const isOds = annexes.has("ODS-I");
  const sourceIds = [
    ...new Set([...(isOds ? ODS_SOURCE : F_SOURCE), ...data.sourceIds]),
  ];
  const base = { components: data.components, sourceIds };
  if (annexes.size === 1 && annexes.has("none")) {
    return result(
      input,
      dataset,
      "outside_rule_scope",
      ["NATURAL_OUTSIDE_FGAS_ODS_PERIODIC_RULE"],
      base,
    );
  }
  if (isOds && annexes.size !== 1)
    return result(
      input,
      dataset,
      "unsupported",
      ["MIXED_ODS_FGAS_RULE_UNVERIFIED"],
      base,
    );
  // Article 5 measures the Annex II-1 component mass; verified non-F-gas
  // fractions do not contribute. Annex I mixtures remain gated pending a
  // complete Annex VI review of all non-fluorinated GWP contributions.
  if (annexes.has("none") && annexes.has("I"))
    return result(
      input,
      dataset,
      "unsupported",
      ["NON_FGAS_BLEND_INTERPRETATION_UNVERIFIED"],
      base,
    );
  const gate = equipmentGate(input, dataset, isOds, data.components, sourceIds);
  if (gate) return gate;

  if (isOds) {
    const tier = tierForAmount("ODS-I", data.odsKg);
    if (!tier)
      return result(
        input,
        dataset,
        "below_threshold",
        ["ODS_BELOW_3_KG"],
        base,
      );
    if (input.hermetic && input.hermeticLabel && data.odsKg.lt(6)) {
      return result(
        input,
        dataset,
        "exempt",
        ["ODS_LABELLED_HERMETIC_UNDER_6_KG"],
        {
          ...base,
          decisiveRule: "ods-hermetic-6",
          decisiveComponent: data.contributors["ODS-I"].join("+"),
          requiredInputs: [
            "refrigerantId",
            "charge",
            "unit",
            "equipment",
            "asOf",
            "hermetic",
            "hermeticLabel",
          ],
        },
      );
    }
    const obligation: Obligation = {
      ruleId: tier.id,
      component: data.contributors["ODS-I"].join("+"),
      quantity: data.odsKg.toString(),
      unit: "kg",
      months: tier.months,
      reasonCode: "ODS_PERIODIC_CHECK",
    };
    return result(
      input,
      dataset,
      "required",
      [
        "ODS_PERIODIC_CHECK",
        ...(input.detection ? ["ODS_DETECTOR_NO_INTERVAL_EXTENSION"] : []),
      ],
      {
        ...base,
        months: tier.months,
        decisiveRule: tier.id,
        decisiveComponent: obligation.component,
        obligations: [obligation],
        requiredInputs: [
          "refrigerantId",
          "charge",
          "unit",
          "equipment",
          "asOf",
          "hermetic",
          "hermeticLabel",
        ],
      },
    );
  }

  const iTier = tierForAmount("I", data.hfcTonnes);
  const iiTier = tierForAmount("II-1", data.hfoKg);
  if (!iTier && !iiTier)
    return result(
      input,
      dataset,
      "below_threshold",
      ["FGAS_BELOW_ALL_THRESHOLDS"],
      base,
    );
  const requiredInputs = [
    "refrigerantId",
    "charge",
    "unit",
    "equipment",
    "asOf",
    "detection",
    "hermetic",
    "hermeticLabel",
    "residential",
  ];
  if (input.hermetic && input.hermeticLabel) {
    if (input.residential && chargeKg.lt(3)) {
      return result(
        input,
        dataset,
        "exempt",
        ["FGAS_RESIDENTIAL_LABELLED_HERMETIC_UNDER_3_KG"],
        {
          ...base,
          decisiveRule: "fgas-hermetic-residential-3",
          requiredInputs,
        },
      );
    }
    const hfcPresent = data.hfcTonnes.gt(0);
    const hfoPresent = data.hfoKg.gt(0);
    const hfcExempt = hfcPresent && data.hfcTonnes.lt(10);
    const hfoExempt = hfoPresent && data.hfoKg.lt(2);
    if (hfcPresent && hfoPresent && hfcExempt !== hfoExempt) {
      return result(
        input,
        dataset,
        "unsupported",
        ["MIXED_HERMETIC_OR_INTERPRETATION_UNVERIFIED"],
        { ...base, requiredInputs },
      );
    }
    if (hfcExempt || hfoExempt) {
      return result(
        input,
        dataset,
        "exempt",
        ["FGAS_LABELLED_HERMETIC_EXEMPT"],
        {
          ...base,
          decisiveRule: hfcExempt ? "fgas-hermetic-I-10" : "fgas-hermetic-II-2",
          requiredInputs,
        },
      );
    }
  }
  const obligations: Obligation[] = [];
  if (iTier)
    obligations.push({
      ruleId: iTier.id,
      component: data.contributors.I.join("+"),
      quantity: data.hfcTonnes.toString(),
      unit: "tCO2e",
      months: interval(iTier, input.detection),
      reasonCode: "FGAS_ANNEX_I_PERIODIC_CHECK",
    });
  if (iiTier)
    obligations.push({
      ruleId: iiTier.id,
      component: data.contributors["II-1"].join("+"),
      quantity: data.hfoKg.toString(),
      unit: "kg",
      months: interval(iiTier, input.detection),
      reasonCode: "FGAS_ANNEX_II_1_PERIODIC_CHECK",
    });
  obligations.sort(
    (a, b) =>
      (a.months ?? Infinity) - (b.months ?? Infinity) ||
      a.ruleId.localeCompare(b.ruleId),
  );
  const decisive = obligations[0]!;
  const detectorEquipment = [
    "stationary_refrigeration",
    "stationary_ac",
    "stationary_heat_pump",
    "fire_protection",
  ].includes(input.equipment);
  const detectionRequired =
    detectorEquipment && (data.hfcTonnes.gte(500) || data.hfoKg.gte(100));
  if (input.equipment === "orc" && data.hfcTonnes.gte(500)) {
    return result(
      input,
      dataset,
      "unsupported",
      ["ORC_INSTALLATION_DATE_REQUIRED_FOR_DETECTOR"],
      { ...base, obligations, requiredInputs },
    );
  }
  return result(
    input,
    dataset,
    "required",
    [
      decisive.reasonCode,
      ...(detectionRequired && !input.detection
        ? ["LEAK_DETECTION_SYSTEM_REQUIRED"]
        : []),
      ...(input.equipment === "fire_protection"
        ? ["FIRE_PROTECTION_ALTERNATIVE_INSPECTION_REGIME"]
        : []),
    ],
    {
      ...base,
      months: decisive.months,
      decisiveRule: decisive.ruleId,
      decisiveComponent: decisive.component,
      obligations,
      requiredInputs,
      detectionRequired,
    },
  );
}
