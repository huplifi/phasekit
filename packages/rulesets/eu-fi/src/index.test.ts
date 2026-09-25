import { describe, expect, it } from "vitest";
import type {
  CheckInput,
  Dataset,
  Fact,
  Refrigerant,
} from "../../../core/src/contracts";
import { evaluateCheck, evaluateTier } from "./index";
import {
  tierVectors,
  odsVectors,
} from "../../../../tests/fixtures/rules-vectors";

const sourceIds = ["eu-2024-573"];
const fact = (value: string, basis?: string): Fact => ({
  state: "verified",
  value,
  basis,
  sourceIds,
});
const coverage: Refrigerant["coverage"] = {
  identity: "verified",
  composition: "not_applicable",
  safety: "partial",
  regulatory_eu_fi: "verified",
  pt: "unsupported",
};
function pure(id: string, annex: string, gwp?: string): Refrigerant {
  return {
    id,
    designation: id,
    name: { fi: id, en: id },
    kind: "pure",
    family: annex === "I" ? "HFC" : "",
    aliases: [],
    cas: null,
    formula: null,
    components: [],
    facts: {
      euAnnex: fact(annex),
      ...(gwp
        ? { gwp_eu_2024_573_100yr: fact(gwp, "EU-2024/573-Annex-I-AR4") }
        : {}),
    },
    sourceIds,
    coverage,
  };
}
function blend(id: string, components: Array<[string, string]>): Refrigerant {
  return {
    id,
    designation: id,
    name: { fi: id, en: id },
    kind: "blend",
    family: "",
    aliases: [],
    cas: null,
    formula: null,
    components: components.map(([refrigerantId, massPercent]) => ({
      refrigerantId,
      massPercent,
      sourceIds,
    })),
    facts: { euAnnex: fact("I") },
    sourceIds,
    coverage: { ...coverage, composition: "verified" },
  };
}
const dataset: Dataset = {
  version: "fixture-2026-09-25",
  sha256: "fixture",
  checkedAt: "2026-09-25",
  sources: [],
  refrigerants: [
    pure("R134a", "I", "1430"),
    pure("R125", "I", "3500"),
    pure("R143a", "I", "4470"),
    pure("R1234yf", "II-1"),
    pure("R744", "none"),
    pure("R717", "none"),
    pure("R290", "none"),
    pure("R600a", "none"),
    pure("R22", "ODS-I"),
    blend("R404A", [
      ["R125", "44"],
      ["R143a", "52"],
      ["R134a", "4"],
    ]),
    blend("R513A", [
      ["R1234yf", "56"],
      ["R134a", "44"],
    ]),
  ],
};
const input = (
  refrigerantId: string,
  charge: string,
  overrides: Partial<CheckInput> = {},
): CheckInput => ({
  refrigerantId,
  charge,
  unit: "kg",
  equipment: "stationary_refrigeration",
  detection: false,
  hermetic: false,
  hermeticLabel: false,
  residential: false,
  asOf: "2026-09-25",
  ...overrides,
});

describe("source-derived exact tier decisions", () => {
  it.each(tierVectors)(
    "$annex $score maps to $months months",
    ({ annex, score, months, detectedMonths }) => {
      const threshold = evaluateTier(annex, score, false);
      expect(threshold?.months ?? null).toBe(months);
      expect(threshold && (threshold.detectedMonths ?? threshold.months)).toBe(
        detectedMonths,
      );
    },
  );
  it.each(odsVectors)("ODS $kg kg maps to $months months", ({ kg, months }) => {
    expect(evaluateTier("ODS-I", kg, false)?.months ?? null).toBe(months);
  });
});

describe("EU/FI rule integration", () => {
  it("uses the PFC Annex I AR6 value and rejects an AR4 label for the same gas", () => {
    const pfc = pure("R218", "I", "9290");
    pfc.family = "PFC";
    pfc.facts.gwp_eu_2024_573_100yr!.basis = "EU-2024/573-Annex-I-AR6";
    const withPfc = {
      ...dataset,
      refrigerants: [...dataset.refrigerants, pfc],
    };
    const checked = evaluateCheck(input("R218", "1"), withPfc);
    expect(checked.state).toBe("required");
    expect(checked.months).toBe(12);
    expect(checked.components[0]).toMatchObject({
      gwp: "9290",
      gwpBasis: "EU-2024/573-Annex-I-AR6",
      tonnesCO2e: "9.29",
    });
    pfc.facts.gwp_eu_2024_573_100yr!.basis = "EU-2024/573-Annex-I-AR4";
    expect(evaluateCheck(input("R218", "1"), withPfc).state).toBe(
      "insufficient_data",
    );
  });
  it("separately adds R513A HFC CO2e and HFO mass at 50 kg", () => {
    const plain = evaluateCheck(input("R513A", "50"), dataset);
    expect(plain.state).toBe("required");
    expect(plain.months).toBe(6);
    expect(plain.decisiveComponent).toBe("R1234yf");
    expect(plain.components).toEqual([
      {
        refrigerantId: "R1234yf",
        massPercent: "56",
        massKg: "28",
        annex: "II-1",
      },
      {
        refrigerantId: "R134a",
        massPercent: "44",
        massKg: "22",
        annex: "I",
        gwpBasis: "EU-2024/573-Annex-I-AR4",
        gwp: "1430",
        tonnesCO2e: "31.46",
      },
    ]);
    expect(
      plain.obligations.map((value) => [value.ruleId, value.months]),
    ).toEqual([
      ["fgas-II-10", 6],
      ["fgas-I-5", 12],
    ]);
    const detected = evaluateCheck(
      input("R513A", "50", { detection: true }),
      dataset,
    );
    expect(detected.months).toBe(12);
    expect(detected.obligations.map((value) => value.months)).toEqual([12, 24]);
  });

  it("uses the same result for comma decimals and grams", () => {
    const dot = evaluateCheck(input("R513A", "50.0"), dataset);
    const comma = evaluateCheck(input("R513A", "50,0"), dataset);
    const grams = evaluateCheck(
      input("R513A", "50000", { unit: "g" }),
      dataset,
    );
    expect(comma.months).toBe(dot.months);
    expect(grams.components).toEqual(dot.components);
    expect(grams.obligations).toEqual(dot.obligations);
  });

  it("keeps a 36-digit charge just below the legal boundary below threshold", () => {
    const justBelow = evaluateCheck(
      input("R134a", "3.49650349650349650349650349650349650"),
      dataset,
    );
    expect(justBelow.state).toBe("below_threshold");
    expect(justBelow.months).toBeNull();
    const tooPrecise = evaluateCheck(
      input("R134a", "3." + "4".repeat(41)),
      dataset,
    );
    expect(tooPrecise.state).toBe("insufficient_data");
    expect(tooPrecise.reasonCodes).toContain("INVALID_CHARGE");
  });

  it.each([
    ["R134a", "3.4965034965034965034", "3.4965034965034965036", null, 12],
    ["R134a", "34.965034965034965034", "34.965034965034965036", 12, 6],
    ["R134a", "349.65034965034965034", "349.65034965034965036", 6, 3],
    ["R404A", "1.2749898000815993471", "1.2749898000815993473", null, 12],
    ["R404A", "12.749898000815993471", "12.749898000815993473", 12, 6],
    ["R404A", "127.49898000815993471", "127.49898000815993473", 6, 3],
  ])(
    "%s crosses a source-calculated Annex I boundary",
    (id, below, above, before, after) => {
      expect(evaluateCheck(input(id, below), dataset).months).toBe(before);
      expect(evaluateCheck(input(id, above), dataset).months).toBe(after);
    },
  );

  it.each([
    ["1.7857142857142857142", "1.7857142857142857143", null, 12],
    ["17.857142857142857142", "17.857142857142857143", 12, 6],
    ["178.57142857142857142", "178.57142857142857143", 6, 3],
  ])(
    "R513A crosses a source-calculated HFO mass boundary",
    (below, above, before, after) => {
      expect(evaluateCheck(input("R513A", below), dataset).months).toBe(before);
      expect(evaluateCheck(input("R513A", above), dataset).months).toBe(after);
    },
  );

  it.each([
    ["R134a", "3.4965034", "3.4965035", "4.999999862", "5.000000005"],
    ["R404A", "1.2748", "1.275", "4.99925568", "5.00004"],
  ])(
    "%s straddles the Annex I 5 t threshold from component masses",
    (id, below, above, belowScore, aboveScore) => {
      const low = evaluateCheck(input(id, below), dataset);
      const high = evaluateCheck(input(id, above), dataset);
      expect(low.state).toBe("below_threshold");
      expect(high.months).toBe(12);
      expect(
        low.components.reduce(
          (sum, row) => sum + Number(row.tonnesCO2e ?? 0),
          0,
        ),
      ).toBeCloseTo(Number(belowScore), 5);
      expect(
        high.components.reduce(
          (sum, row) => sum + Number(row.tonnesCO2e ?? 0),
          0,
        ),
      ).toBeCloseTo(Number(aboveScore), 3);
    },
  );

  it.each([
    ["0.999999", null, false],
    ["1", 12, false],
    ["1.000001", 12, false],
    ["9.999999", 12, false],
    ["10", 6, false],
    ["10.000001", 6, false],
    ["99.999999", 6, false],
    ["100", 3, true],
    ["100.000001", 3, true],
  ])("R1234yf %s kg returns %s months", (charge, months, detectionRequired) => {
    const actual = evaluateCheck(input("R1234yf", charge), dataset);
    expect(actual.months).toBe(months);
    expect(actual.detectionRequired).toBe(detectionRequired);
    if (months !== null)
      expect(
        evaluateCheck(input("R1234yf", charge, { detection: true }), dataset)
          .months,
      ).toBe(months * 2);
  });

  it.each(odsVectors)(
    "R22 has separate ODS intervals at $kg kg",
    ({ kg, months }) => {
      const plain = evaluateCheck(input("R22", kg), dataset);
      const detected = evaluateCheck(
        input("R22", kg, { detection: true }),
        dataset,
      );
      expect(plain.months).toBe(months);
      expect(detected.months).toBe(months);
      expect(plain.state).toBe(months ? "required" : "below_threshold");
    },
  );

  it.each(["R744", "R717", "R290", "R600a"])(
    "%s is outside these periodic regulations",
    (id) => {
      for (const charge of ["0.999999", "1", "1000"]) {
        const actual = evaluateCheck(input(id, charge), dataset);
        expect(actual.state).toBe("outside_rule_scope");
        expect(actual.months).toBeNull();
        expect(actual.reasonCodes).toContain(
          "NATURAL_OUTSIDE_FGAS_ODS_PERIODIC_RULE",
        );
      }
    },
  );

  it("handles labelled hermetic boundaries and residential exception", () => {
    const hermetic = { hermetic: true, hermeticLabel: true };
    expect(
      evaluateCheck(input("R1234yf", "1.999999", hermetic), dataset).state,
    ).toBe("exempt");
    expect(evaluateCheck(input("R1234yf", "2", hermetic), dataset).state).toBe(
      "required",
    );
    expect(
      evaluateCheck(input("R22", "5.999999", hermetic), dataset).state,
    ).toBe("exempt");
    expect(evaluateCheck(input("R22", "6", hermetic), dataset).state).toBe(
      "required",
    );
    expect(
      evaluateCheck(
        input("R1234yf", "2.999999", { ...hermetic, residential: true }),
        dataset,
      ).state,
    ).toBe("exempt");
    expect(
      evaluateCheck(
        input("R1234yf", "3", { ...hermetic, residential: true }),
        dataset,
      ).state,
    ).toBe("required");
    expect(
      evaluateCheck(
        input("R1234yf", "1.5", { hermetic: true, hermeticLabel: false }),
        dataset,
      ).state,
    ).toBe("required");
  });

  it("requires a detector at the HFC upper tier without changing the calculated interval", () => {
    const actual = evaluateCheck(input("R134a", "350"), dataset);
    expect(actual.state).toBe("required");
    expect(actual.months).toBe(3);
    expect(actual.detectionRequired).toBe(true);
    expect(actual.reasonCodes).toContain("LEAK_DETECTION_SYSTEM_REQUIRED");
  });

  it("keeps a saved result and version independent of later data mutation", () => {
    const saved = structuredClone(evaluateCheck(input("R513A", "50"), dataset));
    const next = structuredClone(dataset);
    next.version = "next";
    next.refrigerants.find(
      (item) => item.id === "R134a",
    )!.facts.gwp_eu_2024_573_100yr!.value = "1500";
    expect(saved.dataVersion).toBe("fixture-2026-09-25");
    expect(saved.components[1]?.tonnesCO2e).toBe("31.46");
    expect(
      evaluateCheck(input("R513A", "50"), next).components[1]?.tonnesCO2e,
    ).toBe("33");
  });

  it("fails closed for missing legal provenance and mixed hermetic ambiguity", () => {
    const incomplete = structuredClone(dataset);
    incomplete.refrigerants.find(
      (item) => item.id === "R134a",
    )!.facts.gwp_eu_2024_573_100yr!.basis = "AR5";
    expect(evaluateCheck(input("R134a", "50"), incomplete).state).toBe(
      "insufficient_data",
    );
    expect(
      evaluateCheck(
        input("R513A", "10", { hermetic: true, hermeticLabel: true }),
        dataset,
      ).state,
    ).toBe("unsupported");
  });

  it("separates mobile transition and historical version", () => {
    expect(
      evaluateCheck(
        input("R134a", "10", { equipment: "other_mobile", asOf: "2027-03-11" }),
        dataset,
      ).state,
    ).toBe("outside_rule_scope");
    expect(
      evaluateCheck(
        input("R134a", "10", { equipment: "other_mobile", asOf: "2027-03-12" }),
        dataset,
      ).state,
    ).toBe("unsupported");
    expect(
      evaluateCheck(input("R134a", "10", { asOf: "2024-03-10" }), dataset)
        .state,
    ).toBe("unsupported");
  });
});

describe("HFO mixtures with verified non-fluorinated fractions", () => {
  const fluids: Dataset = {
    ...dataset,
    refrigerants: [
      pure("r1336mzzz", "II-1"),
      pure("r1130e", "none"),
      blend("r514a", [
        ["r1336mzzz", "74.7"],
        ["r1130e", "25.3"],
      ]),
    ],
  };
  it("uses 19.422 kg HFO from the reported R514A 26 kg charge", () => {
    const result = evaluateCheck(input("r514a", "26"), fluids);
    expect(result.state).toBe("required");
    expect(result.months).toBe(6);
    expect(result.obligations[0].quantity).toBe("19.422");
    expect(result.components[1].massKg).toBe("6.578");
    expect(
      evaluateCheck(input("r514a", "26", { detection: true }), fluids).months,
    ).toBe(12);
  });
  it("does not treat non-fluorinated mass as HFO at the 1 kg threshold", () => {
    expect(evaluateCheck(input("r514a", "1"), fluids).state).toBe(
      "below_threshold",
    );
    expect(evaluateCheck(input("r514a", "1.34"), fluids).months).toBe(12);
  });
  it("reports the exact missing component classification", () => {
    const broken = structuredClone(fluids);
    delete broken.refrigerants[1].facts.euAnnex;
    const result = evaluateCheck(input("r514a", "26"), broken);
    expect(result.state).toBe("insufficient_data");
    expect(result.missingData).toEqual([
      { refrigerantId: "r1130e", field: "euAnnex" },
    ]);
  });
  it("keeps Annex I plus non-fluorinated mixtures gated", () => {
    const mixed = {
      ...dataset,
      refrigerants: [
        ...dataset.refrigerants,
        blend("hfc-natural", [
          ["R134a", "50"],
          ["R290", "50"],
        ]),
      ],
    };
    expect(
      evaluateCheck(input("hfc-natural", "26"), mixed).reasonCodes,
    ).toContain("NON_FGAS_BLEND_INTERPRETATION_UNVERIFIED");
  });
});
