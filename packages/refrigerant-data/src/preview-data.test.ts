import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { readCanonicalRows, validateCanonical } from "./build";

const rows = readCanonicalRows();
const byId = new Map(rows.refrigerants.map((row) => [row.id, row]));
const supplement = JSON.parse(
  readFileSync("data/staging/property-composition-supplement.json", "utf8"),
) as {
  properties: {
    id: string;
    facts: Record<string, { value: string; sourceId: string }>;
  }[];
};

describe("preview source-attributed enrichment", () => {
  it("keeps new facts reproducible in the bulk import overlay", () => {
    const preview = supplement.properties.filter((item) =>
      Object.values(item.facts).some((fact) =>
        fact.sourceId.endsWith("-preview"),
      ),
    );
    expect(preview.length).toBeGreaterThan(30);
    for (const item of preview) {
      const row = byId.get(item.id)!;
      const attribution = JSON.parse(row.fact_source_ids_json);
      for (const [field, fact] of Object.entries(item.facts)) {
        expect(row[field as keyof typeof row], `${item.id}.${field}`).toBe(
          fact.value,
        );
        expect(attribution[field]).toContain(fact.sourceId);
        expect(
          rows.sources.some((source) => source.source_id === fact.sourceId),
        ).toBe(true);
      }
    }
    expect(() => validateCanonical(rows)).not.toThrow();
  });

  it("preserves different source-listed flammability groups", () => {
    expect(byId.get("r419b")!.ashrae_safety_group).toBe("A2");
    expect(byId.get("r435a")!.ashrae_safety_group).toBe("A3");
    expect(byId.get("r451b")!.ashrae_safety_group).toBe("A2L");
    expect(byId.get("r480a")!.ashrae_safety_group).toBe("A1");
  });

  it("retains exact Handbook safety provenance without filling conflicts", () => {
    expect(byId.get("r440a")!.ashrae_safety_group).toBe("A2");
    expect(byId.get("r467a")!.ashrae_safety_group).toBe("A2L");
    expect(byId.get("r509a")!.ashrae_safety_group).toBe("A1");
    const imported = rows.refrigerants.filter((r) =>
      JSON.parse(r.fact_source_ids_json || "{}").ashrae_safety_group?.includes(
        "ashrae-handbook-f25-safety",
      ),
    );
    expect(imported).toHaveLength(29);
    expect(
      rows.sources.some((s) => s.source_id === "ashrae-handbook-f25-safety"),
    ).toBe(true);
  });

  it("leaves unclassified and unresolved refrigerants unknown", () => {
    for (const id of ["r41", "r141b", "r365mfc", "r485a", "r161", "r509"]) {
      expect(byId.get(id)!.ashrae_safety_group).toBe("");
      expect(byId.get(id)!.safety_status).not.toBe("verified");
    }
  });

  it("converts the R513A critical pressure to absolute bar without replacing boiling point", () => {
    const row = byId.get("r513a")!;
    expect(Number(row.critical_pressure_bar_abs) * 100).toBeCloseTo(3765.7, 8);
    expect(row.critical_temp_c).toBe("96.5");
    expect(row.normal_boiling_c).toBe("-29.6");
    expect(JSON.parse(row.fact_source_ids_json).normal_boiling_c).toEqual([
      "bitzer-refreport-table",
    ]);
    expect(row.gwp_eu_2024_573_100yr).toBe("");
  });
});
