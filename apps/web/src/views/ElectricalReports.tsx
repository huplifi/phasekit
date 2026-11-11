import { useState } from "react";
import { ArrowLeft, Plus, Printer } from "lucide-react";
import { useApp } from "../context";
import {
  createElectricalReport,
  electricalReportMissingFields,
  finalizeElectricalReport,
  reviseElectricalReport,
  updateElectricalReports,
  measurementTypes,
  measurementResultText,
  hasMeasurementResult,
  type ElectricalInspectionReport,
  type ElectricalMeasurement,
} from "../electrical";
import {
  electricalFieldLabels,
  electricalConclusionLabels,
  electricalAssessmentLabels,
  electricalTemplateNotice,
  printElectricalReport,
} from "../electrical-report-export";
import "./reports.css";
import "./field-reports.css";
import "./electrical-reports.css";

function decodePathPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function ElectricalReports({ path }: { path: string }) {
  const { data, go } = useApp();
  const [route, query = ""] = path.split("?");
  const id = decodePathPart(route.split("/")[2] ?? "");
  if (!id)
    return (
      <>
        <h1>
          {data.locale === "fi" ? (
            <>
              Käyttöönotto
              <wbr />
              tarkastus
              <wbr />
              pöytäkirjat
            </>
          ) : (
            "Electrical inspection reports"
          )}
        </h1>
        <button onClick={() => go("/reports")}>
          {data.locale === "fi" ? "Kaikki raportit" : "All reports"}
        </button>
        <button
          className="primary"
          onClick={() => go("/electrical-reports/new")}
        >
          {data.locale === "fi" ? "Uusi pöytäkirja" : "New inspection report"}
        </button>
      </>
    );
  if (id === "new")
    return (
      <ElectricalReportSelection
        key={path}
        query={new URLSearchParams(query)}
        routeSiteId={route.split("/")[3]}
      />
    );
  const report = data.electricalReports?.find((r) => r.id === id);
  if (!report)
    return (
      <>
        <button className="text-button back" onClick={() => go("/reports")}>
          <ArrowLeft size={18} />
          {data.locale === "fi" ? "Takaisin raportteihin" : "Back to Reports"}
        </button>
        <h1>
          {data.locale === "fi"
            ? "Raporttia ei löytynyt tästä selaimesta"
            : "Report not found in this browser"}
        </h1>
      </>
    );
  return <ElectricalReportEditor key={report.id} report={report} />;
}
function ElectricalReportSelection({
  query,
  routeSiteId,
}: {
  query: URLSearchParams;
  routeSiteId?: string;
}) {
  const { data, setData, go } = useApp();
  const fi = data.locale === "fi";
  const sessionId = query.get("session");
  const initialSiteId =
    query.get("site") ?? (routeSiteId ? decodePathPart(routeSiteId) : "");
  const [siteId, setSiteId] = useState(initialSiteId);
  const [selected, setSelected] = useState<string[]>([]);
  const selectedFirst = data.electricalMeasurements?.find((m) =>
    selected.includes(m.id),
  );
  const sameSelectedSite = (m: ElectricalMeasurement) =>
    !selectedFirst ||
    (m.siteId ?? m.siteName.trim()) ===
      (selectedFirst.siteId ?? selectedFirst.siteName.trim());
  const candidates = (data.electricalMeasurements ?? []).filter(
    (m) =>
      hasMeasurementResult(m.result) &&
      (!siteId || m.siteId === siteId) &&
      (!sessionId || m.sessionId === sessionId),
  );
  const create = () => {
    const measurements = (data.electricalMeasurements ?? []).filter((m) =>
      selected.includes(m.id),
    );
    const report = createElectricalReport(measurements);
    const site = data.sites?.find(
      (s) => s.id === siteId || s.id === report.siteId,
    );
    if (site) {
      report.siteId = site.id;
      report.siteName = site.name;
      report.siteAddress = site.address;
    }
    setData((d) => ({
      ...d,
      electricalReports: updateElectricalReports(
        d.electricalReports ?? [],
        report,
      ),
    }));
    go(`/electrical-reports/${report.id}`);
  };
  return (
    <section className="electrical-report-editor">
      <button className="text-button back" onClick={() => go("/reports")}>
        <ArrowLeft size={18} />
        {fi ? "Takaisin raportteihin" : "Back to Reports"}
      </button>
      <h1>
        {fi ? (
          <>
            Uusi käyttöönotto
            <wbr />
            tarkastus
            <wbr />
            pöytäkirja
          </>
        ) : (
          "New electrical inspection report"
        )}
      </h1>
      <p>
        {fi
          ? "Valitse kirjatut mittaukset. Pöytäkirjaan tallennetaan niiden erillinen kopio kohdistuksineen, mittauspäivineen ja tekijöineen. Alkuperäiset mittaukset säilyvät."
          : "Select recorded measurements. An independent copy preserves their site, equipment, measurement date and author. Original readings are retained."}
      </p>
      <label>
        {fi ? "Kohde" : "Site"}
        <select
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value);
            setSelected([]);
          }}
        >
          <option value="">
            {fi
              ? "Kaikki / kirjoita tiedot myöhemmin"
              : "All / enter details later"}
          </option>
          {data.sites?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      {sessionId && (
        <p className="supporting-copy">
          {fi
            ? "Näytetään valitun mittauskerran kirjaukset."
            : "Showing the selected measurement session."}
        </p>
      )}
      <div className="electrical-reading-selection">
        {candidates.length > 0 && (
          <button
            className="secondary-button"
            onClick={() =>
              setSelected(
                candidates
                  .filter(
                    (m) =>
                      (m.siteId ?? m.siteName.trim()) ===
                      (candidates[0]?.siteId ?? candidates[0]?.siteName.trim()),
                  )
                  .map((m) => m.id),
              )
            }
          >
            {fi
              ? "Valitse ensimmäisen kohteen mittaukset"
              : "Select readings from the first site"}
          </button>
        )}
        {!candidates.length && (
          <p className="empty">
            {fi
              ? "Ei kirjattuja mittauksia näillä valinnoilla. Voit aloittaa pöytäkirjan ja kuvata tarkastukset laajuuden mukaisesti."
              : "No recorded measurements match. You can start a report and describe inspections within its scope."}
          </p>
        )}
        {selected.length > 0 && (
          <p>
            {fi
              ? "Yhteen pöytäkirjaan voi valita yhden kohteen mittaukset."
              : "Each report contains readings from one site."}{" "}
            <button className="text-button" onClick={() => setSelected([])}>
              {fi ? "Tyhjennä valinta" : "Clear selection"}
            </button>
          </p>
        )}
        {candidates.map((m) => (
          <label key={m.id} className="electrical-reading-choice">
            <input
              type="checkbox"
              disabled={!sameSelectedSite(m)}
              checked={selected.includes(m.id)}
              onChange={(e) =>
                setSelected((ids) =>
                  e.target.checked
                    ? [...ids, m.id]
                    : ids.filter((id) => id !== m.id),
                )
              }
            />
            <span>
              <strong>
                {m.point || (fi ? "Piste nimeämättä" : "Unnamed point")} ·{" "}
                {measurementTypes[m.type].label[data.locale]}
              </strong>
              <span>
                {measurementResultText(m)} · {m.siteName} · {m.equipmentName}
              </span>
              <span className="supporting-copy">
                {m.measuredAt} · {m.technician} ·{" "}
                {electricalAssessmentLabels[m.assessment][data.locale]}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="reports-actions">
        <button className="primary" onClick={create}>
          <Plus size={18} />
          {fi
            ? `Luo luonnos (${selected.length} mittausta)`
            : `Create draft (${selected.length} readings)`}
        </button>
        <button
          className="secondary-button"
          onClick={() => go("/electrical-measurements")}
        >
          {fi ? "Kirjaa mittauksia" : "Record measurements"}
        </button>
      </div>
    </section>
  );
}
function ElectricalReportEditor({
  report,
}: {
  report: ElectricalInspectionReport;
}) {
  const { data, setData, go, persistenceStatus, notify } = useApp();
  const fi = data.locale === "fi";
  const final = report.status === "final";
  const [showMissing, setShowMissing] = useState(false);
  const patch = (changes: Partial<ElectricalInspectionReport>) => {
    if (final) return;
    setData((d) => {
      const current = d.electricalReports?.find((r) => r.id === report.id);
      if (!current || current.status === "final") return d;
      return {
        ...d,
        electricalReports: updateElectricalReports(d.electricalReports ?? [], {
          ...current,
          ...changes,
          updatedAt: new Date().toISOString(),
        }),
      };
    });
  };
  const assess = (id: string, changes: Partial<ElectricalMeasurement>) =>
    patch({
      measurements: report.measurements.map((m) =>
        m.id === id ? { ...m, ...changes } : m,
      ),
    });
  const finish = () => {
    setShowMissing(true);
    if (persistenceStatus !== "saved") return;
    if (electricalReportMissingFields(report).length) return;
    const complete = finalizeElectricalReport(report);
    setData((d) => ({
      ...d,
      electricalReports: updateElectricalReports(
        d.electricalReports ?? [],
        complete,
      ),
    }));
  };
  const revise = () => {
    const next = reviseElectricalReport(report);
    setData((d) => ({
      ...d,
      electricalReports: updateElectricalReports(
        d.electricalReports ?? [],
        next,
      ),
    }));
    go(`/electrical-reports/${next.id}`);
  };
  const missing = electricalReportMissingFields(report);
  const extraLabels: Record<string, string> = {
    applicabilityVerified: fi
      ? "Vahvista standardien ja pohjan tarkistus"
      : "Confirm standards and template verification",
    measurements: fi
      ? "Täydennä jokaisen liitetyn mittauksen piste, tulos, tekijä, mittarin merkki/malli/sarjanumero ja arvio. Perustele puute tai soveltumattomuus."
      : "Complete each attached reading's point, result, author, meter brand/model/serial and assessment. Explain failed or inapplicable results.",
    conflictingConclusion: fi
      ? "Hyväksytty johtopäätös on ristiriidassa hylätyn mittaustuloksen kanssa"
      : "An accepted conclusion conflicts with a failed reading",
    conclusion: fi ? "Johtopäätös" : "Conclusion",
  };
  const field = (key: keyof typeof electricalFieldLabels, long = false) => (
    <label key={key} className={long ? "electrical-report-wide" : undefined}>
      {electricalFieldLabels[key][data.locale]}
      {long ? (
        <textarea
          rows={3}
          maxLength={10000}
          value={report[key]}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      ) : (
        <input
          type={key === "inspectionDate" ? "date" : "text"}
          maxLength={300}
          value={report[key]}
          onChange={(e) => patch({ [key]: e.target.value })}
        />
      )}
    </label>
  );
  return (
    <section className="electrical-report-editor field-report-editor">
      <button className="text-button back" onClick={() => go("/reports")}>
        <ArrowLeft size={18} />
        {fi ? "Takaisin raportteihin" : "Back to Reports"}
      </button>
      <h1>
        {fi ? (
          <>
            Käyttöönotto
            <wbr />
            tarkastus
            <wbr />
            pöytäkirja
          </>
        ) : (
          "Electrical inspection report"
        )}
      </h1>
      <p className="electrical-report-state">
        <strong>
          {final
            ? fi
              ? "Viimeistelty — allekirjoitetaan tulosteeseen"
              : "Finalised — sign the printed document"
            : fi
              ? "Luonnos"
              : "Draft"}
        </strong>{" "}
        · {fi ? "Versio" : "Revision"} {report.revision}
      </p>
      <p role="status" aria-live="polite">
        {persistenceStatus === "saved"
          ? fi
            ? "Tallennettu tähän selaimeen"
            : "Saved in this browser"
          : persistenceStatus === "error"
            ? fi
              ? "Paikallinen tallennus epäonnistui. Säilytä tämä näkymä avoinna ja vie PDF / varmuuskopio asetuksista."
              : "Local save failed. Keep this view open and export a PDF / backup in Settings."
            : fi
              ? "Tallennetaan tähän selaimeen…"
              : "Saving in this browser…"}
      </p>
      {persistenceStatus === "error" && (
        <button
          className="secondary-button"
          onClick={() => setData((d) => ({ ...d }))}
        >
          {fi ? "Yritä paikallista tallennusta uudelleen" : "Retry local save"}
        </button>
      )}
      <p className="supporting-copy">
        {electricalTemplateNotice[data.locale]}{" "}
        <a
          href="https://tukes.fi/sahko/sahkoasennusten-kayttoonottovaiheen-tarkastukset"
          target="_blank"
          rel="noreferrer"
        >
          {fi ? "Tukesin sisältövaatimukset" : "Tukes content requirements"}
        </a>
      </p>
      {report.previousRevisionId && (
        <p>
          {fi ? "Edellinen versio" : "Previous revision"}:{" "}
          <button
            className="text-button"
            onClick={() =>
              go(
                `/electrical-reports/${encodeURIComponent(report.previousRevisionId!)}`,
              )
            }
          >
            {report.previousRevisionId}
          </button>
        </p>
      )}
      {final && (
        <p className="field-report-final-note">
          {fi
            ? "Tämä versio on lukittu. Korjaaminen luo uuden luonnosversion ja säilyttää alkuperäisen. Nimenselvennys ei ole sähköinen allekirjoitus; allekirjoita tuloste."
            : "This revision is locked. A correction creates a new draft and preserves the original. A typed name is not an electronic signature; sign the printout."}
        </p>
      )}
      <fieldset disabled={final} className="field-report-fields">
        <legend className="sr-only">
          {fi ? "Pöytäkirjan tiedot" : "Inspection report details"}
        </legend>
        <h2>{fi ? "Kohde ja työn laajuus" : "Site and work scope"}</h2>
        <div className="electrical-report-grid">
          {field("siteName")}
          {field("siteAddress")}
          {field("equipmentName")}
          {field("workDescription", true)}
          {field("scope", true)}
        </div>
        <h2>{fi ? "Vastuuhenkilöt" : "Responsible parties"}</h2>
        <div className="electrical-report-grid">
          {field("builder")}
          {field("builderContact")}
          {field("electricalSupervisor")}
          {field("supervisorContact")}
          {field("inspector")}
          {field("inspectorContact")}
        </div>
        <h2>
          {fi ? "Standardit ja tarkastukset" : "Standards and inspections"}
        </h2>
        <div className="electrical-report-grid">
          {field("standards", true)}
          {field("methods", true)}
          {field("visualInspection", true)}
        </div>
        <label className="electrical-reading-choice">
          <input
            type="checkbox"
            checked={report.applicabilityVerified}
            onChange={(e) => patch({ applicabilityVerified: e.target.checked })}
          />
          <span>
            {fi
              ? "Olen tarkistanut tarkastuspohjan sisällön, tarkastuskohtien soveltuvuuden ja käytetyt arviointiperusteet työn ja kohteen sovellettavista standardeista."
              : "I have verified this template's content, applicable inspection items and assessment criteria against the standards for this work and site."}
          </span>
        </label>
        <h2>
          {fi
            ? "Liitetyt mittaukset ja tulosten arviointi"
            : "Attached measurements and assessment"}
        </h2>
        <p className="supporting-copy">
          {fi
            ? "Kirjaus, arviointi ja pöytäkirjan viimeistely ovat eri vaiheita. Arvio koskee tätä pöytäkirjan kopiota; alkuperäinen mittaus ei muutu."
            : "Recording, assessment and finalisation are separate steps. Assessment applies to this report snapshot; the original reading does not change."}
        </p>
        {report.measurements.length === 0 && (
          <p>
            {fi
              ? "Ei liitettyjä mittauskirjauksia. Kuvaa tarpeelliset tarkastukset, mittaukset ja toimintatestit menetelmiin ja laajuuteen."
              : "No attached readings. Describe necessary inspections, measurements and functional tests in scope and methods."}
          </p>
        )}
        {report.measurements.map((m) => (
          <article key={m.id} className="electrical-report-reading">
            <h3>
              {m.point || "—"} · {measurementTypes[m.type].label[data.locale]}
            </h3>
            <p>
              <strong>{measurementResultText(m)}</strong> · {m.siteName} ·{" "}
              {m.equipmentName}
            </p>
            <p className="supporting-copy">
              {m.measuredAt} · {m.technician}
              <br />
              {m.meter.brand || "—"} / {m.meter.model || "—"} /{" "}
              {m.meter.serialNumber || "—"}
            </p>
            {m.note && <p className="report-notes">{m.note}</p>}
            {m.photo && (
              <img
                src={m.photo}
                alt={m.point}
                className="electrical-report-photo"
              />
            )}
            <details>
              <summary>
                {fi
                  ? "Täydennä / korjaa tämän version mittaustiedot"
                  : "Complete / correct this revision’s measurement details"}
              </summary>
              <p className="supporting-copy">
                {fi
                  ? "Muutokset koskevat vain pöytäkirjan kopiota. Mittaustiedon korjaus poistaa kopion aiemman arvion."
                  : "Changes affect this report copy only. Correcting measurement details clears its previous assessment."}
              </p>
              <div className="electrical-report-grid">
                {(["point", "result", "unit"] as const).map((key) => (
                  <label key={key}>
                    {
                      {
                        point: fi ? "Mittauspiste" : "Measurement point",
                        result: fi ? "Tulos" : "Result",
                        unit: fi ? "Yksikkö" : "Unit",
                        technician: fi ? "Tekijä" : "Technician",
                      }[key]
                    }
                    <input
                      maxLength={
                        key === "result" ? 1000 : key === "unit" ? 80 : 300
                      }
                      value={m[key]}
                      onChange={(e) =>
                        assess(m.id, {
                          [key]: e.target.value,
                          assessment: "unassessed",
                          assessmentNote: "",
                        })
                      }
                    />
                  </label>
                ))}
                {(["brand", "model", "serialNumber"] as const).map((key) => (
                  <label key={key}>
                    {
                      {
                        brand: fi ? "Mittarin merkki" : "Meter brand",
                        model: fi ? "Mittarin malli" : "Meter model",
                        serialNumber: fi
                          ? "Mittarin sarjanumero"
                          : "Meter serial number",
                      }[key]
                    }
                    <input
                      maxLength={300}
                      value={m.meter[key]}
                      onChange={(e) =>
                        assess(m.id, {
                          meter: { ...m.meter, [key]: e.target.value },
                          assessment: "unassessed",
                          assessmentNote: "",
                        })
                      }
                    />
                  </label>
                ))}
              </div>
            </details>
            <button
              className="text-button"
              type="button"
              onClick={() =>
                patch({
                  measurements: report.measurements.filter(
                    (item) => item.id !== m.id,
                  ),
                })
              }
            >
              {fi ? "Poista tästä pöytäkirjasta" : "Remove from this report"}
            </button>
            <label>
              {fi ? "Arviointi" : "Assessment"}
              <select
                aria-label={fi ? "Arviointi" : "Assessment"}
                value={m.assessment}
                onChange={(e) =>
                  assess(m.id, {
                    assessment: e.target
                      .value as ElectricalMeasurement["assessment"],
                  })
                }
              >
                {Object.entries(electricalAssessmentLabels).map(
                  ([key, label]) => (
                    <option key={key} value={key}>
                      {label[data.locale]}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {fi
                ? "Arviointiperuste / puute / soveltumattomuuden syy"
                : "Assessment basis / defect / reason for inapplicability"}
              <textarea
                maxLength={10000}
                value={m.assessmentNote}
                onChange={(e) =>
                  assess(m.id, { assessmentNote: e.target.value })
                }
              />
            </label>
          </article>
        ))}
        <h2>{fi ? "Arviointi ja johtopäätös" : "Assessment and conclusion"}</h2>
        <div className="electrical-report-grid">
          {field("findings", true)}
          {field("deviations", true)}
          {field("evaluation", true)}
          <label className="electrical-report-wide">
            {fi ? "Johtopäätös" : "Conclusion"}
            <select
              aria-label={fi ? "Johtopäätös" : "Conclusion"}
              value={report.conclusion}
              onChange={(e) =>
                patch({
                  conclusion: e.target
                    .value as ElectricalInspectionReport["conclusion"],
                })
              }
            >
              {Object.entries(electricalConclusionLabels).map(
                ([key, label]) => (
                  <option key={key} value={key}>
                    {label[data.locale]}
                  </option>
                ),
              )}
            </select>
          </label>
          {field("conclusionNote", true)}
          {field("signature")}
          {field("inspectionDate")}
        </div>
      </fieldset>
      {showMissing && missing.length > 0 && (
        <div role="alert">
          <h2>
            {fi ? "Täydennä ennen viimeistelyä" : "Complete before finalising"}
          </h2>
          <ul>
            {missing.map((key) => (
              <li key={key}>
                {key in electricalFieldLabels
                  ? electricalFieldLabels[
                      key as keyof typeof electricalFieldLabels
                    ][data.locale]
                  : (extraLabels[key] ?? key)}
              </li>
            ))}
          </ul>
          <p>
            {fi
              ? "Myös puutteita sisältävän pöytäkirjan voi viimeistellä. Valitse tällöin puutteita tai ei hyväksytty ja kirjaa käytön rajoitukset."
              : "A report with defects can also be finalised. Choose defects or not approved and document restrictions on use."}
          </p>
        </div>
      )}
      <div className="reports-actions electrical-report-actions">
        <button
          className="secondary-button"
          onClick={() => {
            if (!printElectricalReport(report, data.locale))
              notify(
                fi
                  ? "Salli ponnahdusikkuna avataksesi PDF-esikatselun."
                  : "Allow popups to open the PDF preview.",
              );
          }}
        >
          <Printer size={18} />
          {fi ? "PDF ja tulostus" : "PDF and print"}
        </button>
        {final ? (
          <button className="primary" onClick={revise}>
            {fi ? "Luo korjattu versio" : "Create corrected revision"}
          </button>
        ) : (
          <button
            className="primary"
            disabled={persistenceStatus !== "saved"}
            onClick={finish}
          >
            {fi
              ? "Viimeistele ja lukitse versio"
              : "Finalise and lock revision"}
          </button>
        )}
      </div>
    </section>
  );
}
