import type { AssetSnapshot } from "../asset-snapshot";
import { printChecklistDraft, printToolRecord } from "../report-export";
import { printElectricalReport } from "../electrical-report-export";
import { measurementTypes, measurementResultText } from "../electrical";
import { checklistDefinitions } from "../../../../packages/core/src/field-tools";

export function AssetHistory({
  snapshot,
  fi,
  openElectricalReport,
}: {
  snapshot: AssetSnapshot;
  fi: boolean;
  openElectricalReport?: (id: string) => void;
}) {
  const data = snapshot.data;
  const locale = fi ? "fi" : "en";
  const date = (value: string) =>
    new Date(value).toLocaleString(fi ? "fi-FI" : "en-GB");
  const assessment = {
    unassessed: fi ? "Arvioimatta" : "Not assessed",
    pass: fi ? "Hyväksytty" : "Pass",
    fail: fi ? "Puute" : "Defect",
    "not-applicable": fi ? "Ei sovellu" : "Not applicable",
  };
  return (
    <div className="asset-history">
      <section className="section">
        <h2>
          {fi ? "Sähkömittaukset" : "Electrical measurements"} (
          {data.electricalMeasurements?.length ?? 0})
        </h2>
        {(data.electricalMeasurements ?? []).map((item) => (
          <details key={item.id} className="asset-record">
            <summary>
              <strong>
                {item.point ||
                  (fi ? "Mittauspiste nimeämättä" : "Unnamed point")}
              </strong>{" "}
              · {measurementResultText(item)}
            </summary>
            <p>{measurementTypes[item.type]?.label[locale] ?? item.type}</p>
            <p>
              {date(item.measuredAt)} · {item.technician}
            </p>
            <p>
              {fi ? "Arvio" : "Assessment"}: {assessment[item.assessment]}
            </p>
            {item.assessmentNote && <p>{item.assessmentNote}</p>}
            {item.note && <p>{item.note}</p>}
            {item.photo && (
              <img
                src={item.photo}
                alt={fi ? "Mittauksen kuva" : "Measurement image"}
              />
            )}
          </details>
        ))}
      </section>
      <section className="section">
        <h2>
          {fi
            ? "Käyttöönottotarkastuspöytäkirjat"
            : "Electrical inspection reports"}{" "}
          ({data.electricalReports?.length ?? 0})
        </h2>
        {(data.electricalReports ?? []).map((report) => (
          <details className="asset-record" key={report.id}>
            <summary>
              {report.siteName || (fi ? "Kohde nimeämättä" : "Unnamed site")} ·{" "}
              {report.status === "final"
                ? fi
                  ? "Viimeistelty"
                  : "Final"
                : fi
                  ? "Luonnos"
                  : "Draft"}{" "}
              · v{report.revision}
            </summary>
            <p>{report.workDescription}</p>
            <p>
              {report.inspectionDate} · {report.inspector}
            </p>
            <p>{report.findings}</p>
            <button
              className="secondary-button"
              onClick={() => printElectricalReport(report, locale)}
            >
              {fi ? "Tulosta / PDF" : "Print / PDF"}
            </button>
            {openElectricalReport && (
              <button
                className="secondary-button"
                onClick={() => openElectricalReport(report.id)}
              >
                {fi ? "Avaa raportti" : "Open report"}
              </button>
            )}
          </details>
        ))}
      </section>
      <section className="section">
        <h2>
          {fi ? "Kylmäraportit" : "Refrigeration reports"} (
          {data.checklistDrafts.length})
        </h2>
        {data.checklistDrafts.map((report) => (
          <details className="asset-record" key={report.id}>
            <summary>
              {report.title || (fi ? "Kohde nimeämättä" : "Unnamed site")} ·{" "}
              {report.status === "final"
                ? fi
                  ? "Valmis"
                  : "Final"
                : fi
                  ? "Luonnos"
                  : "Draft"}{" "}
              · v{report.revision ?? 1}
            </summary>
            <p>
              {checklistDefinitions[report.kind].name[locale]} ·{" "}
              {date(report.updatedAt)}
            </p>
            <dl>
              {Object.entries(report.fields)
                .filter(([, value]) => value)
                .flatMap(([key, value]) => {
                  const field = checklistDefinitions[report.kind].fields.find(
                    (field) => field.id === key,
                  );
                  return field
                    ? [
                        <div key={key}>
                          <dt>{field.label[locale]}</dt>
                          <dd>{value}</dd>
                        </div>,
                      ]
                    : [];
                })}
            </dl>
            {report.notes && <p>{report.notes}</p>}
            <button
              className="secondary-button"
              onClick={() => printChecklistDraft(report, locale)}
            >
              {fi ? "Tulosta / PDF" : "Print / PDF"}
            </button>
          </details>
        ))}
      </section>
      <section className="section">
        <h2>
          {fi ? "Laskelmat ja historia" : "Calculations and history"} (
          {data.toolRecords.length})
        </h2>
        {data.toolRecords.map((record) => (
          <details className="asset-record" key={record.id}>
            <summary>
              {record.title} · {date(record.createdAt)}
            </summary>
            <p>{record.notes}</p>
            <dl>
              {[...record.inputs, ...record.outputs].map((row, index) => (
                <div key={index}>
                  <dt>{row.label[locale]}</dt>
                  <dd>
                    {row.value} {row.unit}
                  </dd>
                </div>
              ))}
            </dl>
            <button
              className="secondary-button"
              onClick={() => printToolRecord(record, locale)}
            >
              {fi ? "Tulosta / PDF" : "Print / PDF"}
            </button>
          </details>
        ))}
      </section>
    </div>
  );
}
