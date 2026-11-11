import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import {
  createMeasurement,
  copyMeasurementPoint,
  createElectricalReport,
  finalizeElectricalReport,
  reviseElectricalReport,
  updateElectricalReports,
  electricalReportMissingFields,
  hasMeasurementResult,
  measurementResultText,
  type ElectricalSession,
  type ElectricalInspectionReport,
} from "../apps/web/src/electrical";
import { electricalReportText } from "../apps/web/src/electrical-report-export";
import {
  emptyData,
  parseBackup,
  mergeBackup,
  saveData,
  loadData,
} from "../apps/web/src/storage";

const session: ElectricalSession = {
  id: "visit-1",
  siteId: "site-1",
  siteName: "Työsali",
  equipmentId: "equipment-1",
  equipmentName: "Keskus 1",
  technician: "S. Asentaja",
  meter: { brand: "Fluke", model: "1664 FC", serialNumber: "12345" },
};
function reading() {
  return {
    ...createMeasurement(session, "insulation"),
    point: "Ryhmä 12",
    result: "> 999 MΩ",
    note: "Mittarin ilmoitus",
    assessment: "fail" as const,
    assessmentNote: "Selvitettävä kohteen perusteella",
  };
}
function complete(): ElectricalInspectionReport {
  return {
    ...createElectricalReport([reading()]),
    siteAddress: "Koulutie 1",
    workDescription: "Ryhmämuutos",
    scope: "Ryhmä 12",
    builder: "Yritys Oy",
    builderContact: "Rakentajan puh 123",
    electricalSupervisor: "Johtaja",
    supervisorContact: "Johtajan puh 456",
    inspector: "Tarkastaja",
    inspectorContact: "Tarkastajan puh 789",
    standards: "Kohteessa sovelletut standardit ja yksilöidyt versiot",
    methods: "Mittaussuunnitelman mukainen tarkastus",
    visualInspection: "Ryhmä 12 tarkastettu, havainto kirjattu",
    findings: "Puutteet kuvattu mittauksen arviossa",
    deviations: "Ei muita poikkeamia",
    evaluation: "Puute estää käyttöönoton tarkastetussa laajuudessa",
    conclusion: "not-approved",
    conclusionNote:
      "Ei saa ottaa käyttöön ennen korjausta ja uusintatarkastusta",
    signature: "Tarkastaja",
    inspectionDate: "2026-11-11",
    applicabilityVerified: true,
  };
}
describe("electrical readings and immutable inspection report snapshots", () => {
  it("restores legacy schema-v1 data additively without treating absent readings as zeros", () => {
    const legacy = emptyData();
    delete legacy.electricalMeasurements;
    delete legacy.electricalReports;
    delete legacy.electricalSession;
    delete legacy.sharedLinks;
    const restored = parseBackup(JSON.stringify(legacy));
    expect(restored.electricalMeasurements).toEqual([]);
    expect(restored.electricalReports).toEqual([]);
    expect(restored.electricalSession).toBeUndefined();
    expect(restored.sharedLinks).toEqual([]);
    expect(createMeasurement(session).result).toBe("");
  });
  it.each(["0,25", "0.25", "> 999 MΩ", "L1–L2–L3", "Toimii", ""])(
    "round-trips original meter result %s without numeric coercion",
    async (result) => {
      const state = {
        ...emptyData(),
        electricalSession: session,
        electricalMeasurements: [{ ...reading(), result }],
      };
      await saveData(state);
      expect((await loadData()).electricalMeasurements?.[0]?.result).toBe(
        result,
      );
      expect((await loadData()).electricalSession).toEqual(session);
    },
  );
  it("copies point and context while clearing readings, approvals, notes and photos", () => {
    const source = { ...reading(), photo: "data:image/png;base64,YQ==" };
    const copy = copyMeasurementPoint(source);
    expect(copy.point).toBe(source.point);
    expect(copy.type).toBe(source.type);
    expect(copy.unit).toBe(source.unit);
    expect(copy.id).not.toBe(source.id);
    expect(copy.sessionId).toBe(session.id);
    expect(copy.result).toBe("");
    expect(copy.assessment).toBe("unassessed");
    expect(copy.assessmentNote).toBe("");
    expect(copy.note).toBe("");
    expect(copy.photo).toBeUndefined();
    copy.meter.model = "Changed";
    expect(source.meter.model).toBe("1664 FC");
    expect(
      copyMeasurementPoint(source, {
        ...session,
        id: "next-visit",
        siteName: "New context",
      }).sessionId,
    ).toBe("next-visit");
  });
  it("keeps captured source readings independent of report assessment and later meter edits", () => {
    const original = reading();
    const report = createElectricalReport([original]);
    original.result = "Different later reading";
    original.meter.serialNumber = "New meter";
    expect(report.measurements[0].result).toBe("> 999 MΩ");
    expect(report.measurements[0].meter.serialNumber).toBe("12345");
    report.measurements[0].assessmentNote = "Report assessment";
    expect(original.assessmentNote).toBe("Selvitettävä kohteen perusteella");
    expect(report.standards).toBe("");
    expect(report.conclusion).toBe("");
    expect(report.status).toBe("draft");
  });
  it("prevents a report from silently assigning another site's readings to its first site", () => {
    expect(() =>
      createElectricalReport([
        reading(),
        { ...reading(), siteId: "different-site" },
      ]),
    ).toThrow(/one site/);
    const differentEquipment = {
      ...reading(),
      equipmentId: "equipment-2",
      equipmentName: "Keskus 2",
    };
    const report = createElectricalReport([reading(), differentEquipment]);
    expect(report.equipmentId).toBeUndefined();
    expect(report.equipmentName).toBe("");
  });
  it("finalises a fully documented failure without portraying the installation as approved", () => {
    const draft = complete();
    expect(electricalReportMissingFields(draft)).toEqual([]);
    const final = finalizeElectricalReport(draft);
    expect(final.status).toBe("final");
    expect(final.conclusion).toBe("not-approved");
    expect(final.finalizedAt).toBeTruthy();
    expect(draft.status).toBe("draft");
    expect(electricalReportText(final, "fi").join("\n")).toContain(
      "Ei hyväksytty käyttöönottoon",
    );
    expect(electricalReportText(final, "en").join("\n")).toContain(
      "Not approved for commissioning",
    );
    expect(electricalReportText(final, "fi").join("\n")).toContain(
      "allekirjoitetaan tulosteeseen",
    );
  });
  it("requires assessment and verification; rejects empty and bare-comparator results and conflicting approval", () => {
    const draft = complete();
    draft.measurements[0].assessment = "unassessed";
    expect(() => finalizeElectricalReport(draft)).toThrow(/measurements/);
    draft.measurements[0].assessment = "fail";
    draft.applicabilityVerified = false;
    expect(() => finalizeElectricalReport(draft)).toThrow(
      /applicabilityVerified/,
    );
    draft.applicabilityVerified = true;
    draft.conclusion = "accepted";
    expect(() => finalizeElectricalReport(draft)).toThrow(
      /conflictingConclusion/,
    );
    draft.conclusion = "defects";
    draft.measurements[0].result = ">";
    expect(() => finalizeElectricalReport(draft)).toThrow(/measurements/);
    draft.measurements[0].result = "";
    expect(() => finalizeElectricalReport(draft)).toThrow(/measurements/);
  });
  it("preserves finalized originals and creates a draft revision requiring renewed verification and signature details", () => {
    const final = finalizeElectricalReport(complete());
    const before = structuredClone(final);
    expect(() =>
      updateElectricalReports([final], {
        ...final,
        evaluation: "Edited final",
      }),
    ).toThrow(/immutable/);
    const revision = reviseElectricalReport(final);
    expect(revision.previousRevisionId).toBe(final.id);
    expect(revision.revision).toBe(2);
    expect(revision.id).not.toBe(final.id);
    expect(revision.status).toBe("draft");
    expect(revision.signature).toBe("");
    expect(revision.inspectionDate).toBe("");
    expect(revision.applicabilityVerified).toBe(false);
    revision.measurements[0].meter.model = "Next version";
    expect(final).toEqual(before);
    expect(updateElectricalReports([final], revision)).toHaveLength(2);
  });
  it("round-trips final and corrected report versions with independent frozen attachments", async () => {
    const final = finalizeElectricalReport(complete());
    const next = reviseElectricalReport(final);
    next.measurements[0].result = "0,25";
    const state = { ...emptyData(), electricalReports: [final, next] };
    await saveData(state);
    const restored = await loadData();
    expect(restored.electricalReports).toEqual(
      JSON.parse(JSON.stringify([final, next])),
    );
    restored.electricalReports![1].measurements[0].result = "Not persisted";
    expect(
      (await loadData()).electricalReports![0].measurements[0].result,
    ).toBe("> 999 MΩ");
    expect(
      (await loadData()).electricalReports![1].measurements[0].result,
    ).toBe("0,25");
  });

  it("rejects duplicate measurement/report IDs, incomplete final reports, oversized fields and unsafe photo URLs", () => {
    const m = reading();
    const report = complete();
    const candidates = [
      { electricalMeasurements: [m, m] },
      { electricalReports: [report, report] },
      { electricalReports: [{ ...report, measurements: [m, m] }] },
      { electricalReports: [{ ...report, status: "final", signature: "" }] },
      { electricalMeasurements: [{ ...m, result: "x".repeat(1001) }] },
      { electricalMeasurements: [{ ...m, photo: "javascript:alert(1)" }] },
      {
        electricalMeasurements: [
          { ...m, photo: "data:image/svg+xml;base64,PHN2Zz4=" },
        ],
      },
    ];
    for (const addition of candidates)
      expect(() =>
        parseBackup(JSON.stringify({ ...emptyData(), ...addition })),
      ).toThrow();
  });
  it("merges missing IDs without replacing originals, reports or session context", () => {
    const m = reading();
    const report = finalizeElectricalReport(complete());
    const current = {
      ...emptyData(),
      electricalMeasurements: [m],
      electricalReports: [report],
      electricalSession: session,
    };
    const next = reviseElectricalReport(report);
    const incoming = {
      ...emptyData(),
      electricalMeasurements: [{ ...m, result: "overwrite attempt" }],
      electricalReports: [{ ...report, evaluation: "overwrite attempt" }, next],
      electricalSession: { ...session, id: "other-visit" },
    };
    const merged = mergeBackup(current, incoming);
    expect(merged.electricalMeasurements?.[0].result).toBe(m.result);
    expect(merged.electricalReports).toEqual([report, next]);
    expect(merged.electricalSession).toEqual(session);
  });
  it("preserves raw result while displaying an included unit once", () => {
    expect(measurementResultText({ result: "> 999 MΩ", unit: "MΩ" })).toBe(
      "> 999 MΩ",
    );
    expect(measurementResultText({ result: "0,25", unit: "Ω" })).toBe("0,25 Ω");
    expect(measurementResultText({ result: "", unit: "V" })).toBe("—");
    for (const result of ["", "  ", ">", "<=", "≥", "−"])
      expect(hasMeasurementResult(result)).toBe(false);
    for (const result of ["0", "0,25", "> 999 MΩ", "L1-L2-L3", "OK"])
      expect(hasMeasurementResult(result)).toBe(true);
  });
});
