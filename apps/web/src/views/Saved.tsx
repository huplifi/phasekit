import { Download, ImageDown, Printer, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { formatDate } from "../../../../packages/i18n/src";
import { CheckResultView } from "./Check";
import { downloadJSON } from "../storage";
import {
  downloadToolRecord,
  printToolRecord,
  printCheckResult,
} from "../report-export";
import {
  formatReportRow,
  reportHasRoundedValues,
  reportSummary,
} from "../report-summary";
import { downloadToolRecordImage } from "../report-image";
import type { ToolRecord } from "../storage";
import "./reports.css";

const l = (locale: "fi" | "en", fi: string, en: string) =>
  locale === "fi" ? fi : en;

export function Saved() {
  const { t, data, setData, go, notify } = useApp();
  const removeSnapshot = (id: string) => {
    if (
      !window.confirm(
        l(
          data.locale,
          "Poistetaanko tallennettu tarkastus?",
          "Delete this saved inspection?",
        ),
      )
    )
      return;
    setData((d) => ({
      ...d,
      snapshots: d.snapshots.filter((item) => item.id !== id),
    }));
  };
  const removeReport = (id: string) => {
    if (
      !window.confirm(
        l(
          data.locale,
          "Poistetaanko tallennettu laskelma?",
          "Delete this saved calculation?",
        ),
      )
    )
      return;
    setData((d) => ({
      ...d,
      toolRecords: d.toolRecords.filter((item) => item.id !== id),
    }));
  };
  return (
    <>
      <div className="saved-heading-actions">
        <h1>{t("saved")}</h1>
        <button
          className="secondary-button"
          type="button"
          onClick={() => go("/equipment")}
        >
          {l(data.locale, "Hallitse laitteita", "Manage equipment")}
        </button>
      </div>
      {data.snapshots.length === 0 && data.toolRecords.length === 0 ? (
        <p className="empty">{t("emptySaved")}</p>
      ) : (
        <>
          {data.toolRecords.length > 0 && (
            <section
              className="report-list"
              aria-label={l(
                data.locale,
                "Tallennetut laskelmat",
                "Saved calculations",
              )}
            >
              <h2>
                {l(data.locale, "Tallennetut laskelmat", "Saved calculations")}
              </h2>
              {data.toolRecords.map((record) => (
                <ToolReport
                  key={record.id}
                  record={record}
                  onDelete={() => removeReport(record.id)}
                  onEquipment={() => go("/equipment")}
                />
              ))}
            </section>
          )}
          {data.snapshots.map((s) => (
            <details className="saved-entry" key={s.id}>
              <summary>
                <span>
                  <strong className="mono">{s.refrigerant.designation}</strong>
                  <span className="secondary">
                    {formatDate(s.createdAt, data.locale)} ·{" "}
                    {s.result.input.charge} {s.result.input.unit}
                  </span>
                </span>
              </summary>
              <p className="notice caption">{t("savedSnapshot")}</p>
              <p>
                {t("equipment")}: {t(s.result.input.equipment)}
                <br />
                {t("asOf")}: {s.result.input.asOf}
              </p>
              <CheckResultView result={s.result} snapshot={s} />
              <div className="button-group">
                <button
                  className="text-button"
                  type="button"
                  onClick={() => {
                    if (
                      !printCheckResult({
                        result: s.result,
                        locale: data.locale,
                        designation: s.refrigerant.designation,
                        sources: s.sources,
                        createdAt: s.createdAt,
                        lastInspectionDate: s.lastInspectionDate,
                        componentDesignations: s.componentDesignations,
                      })
                    )
                      notify(
                        l(
                          data.locale,
                          "Tulostusikkuna estettiin. Salli ponnahdusikkuna ja yritä uudelleen.",
                          "The print window was blocked. Allow pop-ups and try again.",
                        ),
                      );
                  }}
                >
                  <Printer size={18} />
                  {l(
                    data.locale,
                    "Tulosta / tallenna PDF",
                    "Print / save as PDF",
                  )}
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    downloadJSON(s, `phasekit-${s.refrigerant.id}-${s.id}.json`)
                  }
                >
                  <Download size={18} />
                  {t("exportSnapshot")}
                </button>
                <button
                  className="text-button danger-text"
                  onClick={() => removeSnapshot(s.id)}
                >
                  <Trash2 size={18} />
                  {t("delete")}
                </button>
              </div>
            </details>
          ))}
        </>
      )}
    </>
  );
}

function ToolReport({
  record,
  onDelete,
  onEquipment,
}: {
  record: ToolRecord;
  onDelete: () => void;
  onEquipment: () => void;
}) {
  const { data, notify } = useApp();
  const lcl = (fi: string, en: string) => l(data.locale, fi, en);
  const sources = record.sources;
  return (
    <details className="saved-entry report-entry">
      <summary>
        <span>
          <strong className="report-summary">
            {reportSummary(record, data.locale)}
          </strong>
          <span className="secondary">
            {formatDate(record.createdAt, data.locale)}
            {record.equipmentName && ` · ${record.equipmentName}`}
          </span>
        </span>
      </summary>
      <div className="report-detail">
        {record.equipmentName && (
          <p>
            <strong>{lcl("Laite / kohde", "Equipment / site")}:</strong>{" "}
            {record.equipmentName}
          </p>
        )}
        <ReportRows title={lcl("Lähtötiedot", "Inputs")} rows={record.inputs} />
        <ReportRows title={lcl("Tulokset", "Results")} rows={record.outputs} />
        {reportHasRoundedValues(record) && (
          <p className="caption secondary">
            {lcl(
              "≈ tarkoittaa näytöllä pyöristettyä arvoa. JSON-vienti säilyttää tarkat tallennetut luvut.",
              "≈ marks a rounded display value. JSON export keeps the exact recorded numbers.",
            )}
          </p>
        )}
        {record.notes && (
          <section>
            <h3>{lcl("Muistiinpanot", "Notes")}</h3>
            <p className="report-notes">{record.notes}</p>
          </section>
        )}
        <section className="report-provenance">
          <h3>
            {lcl("Lähteet ja versiotiedot", "Sources and version information")}
          </h3>
          {record.dataVersion && (
            <p>
              <strong>{lcl("Aineistoversio", "Data version")}:</strong>{" "}
              {record.dataVersion}
            </p>
          )}
          {sources.length > 0 ? (
            <ul>
              {sources.map((source, index) => (
                <li key={`${source.id}-${index}`}>
                  {/^https?:\/\//i.test(source.url) ? (
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.title}
                    </a>
                  ) : (
                    source.title
                  )}
                  {` · ${source.id}`}
                  {source.version && ` · ${source.version}`}
                  {source.checkedAt &&
                    ` · ${lcl("tarkistettu", "checked")} ${source.checkedAt}`}
                  {source.license && ` · ${source.license}`}
                  {source.note && <span> — {source.note}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>
              {lcl(
                "Tallennetuissa laskelmissa ei ole lähteitä.",
                "No sources were recorded for this calculation.",
              )}
            </p>
          )}
          <p className="caption">
            {lcl(
              "Laskelma on lähteisiin ja tallennettuihin lähtötietoihin perustuva arvio. Se ei ole vaatimustenmukaisuussertifikaatti tai laitehyväksyntä.",
              "This calculation is an estimate based on its recorded inputs and sources. It is not a compliance certificate or equipment approval.",
            )}
          </p>
        </section>
      </div>
      <div className="button-group report-actions">
        <button
          className="text-button"
          type="button"
          onClick={() => {
            void downloadToolRecordImage(record, data.locale).then((status) => {
              if (status === "too_large")
                notify(
                  lcl(
                    "Raportti on liian pitkä kuvaksi. Tulosta tai tallenna se PDF:nä.",
                    "This report is too long for an image. Print or save it as PDF.",
                  ),
                );
              else if (status === "failed")
                notify(
                  lcl(
                    "Kuvan tallennus epäonnistui. Kokeile PDF-tulostusta.",
                    "Could not save the image. Try printing to PDF.",
                  ),
                );
            });
          }}
        >
          <ImageDown size={18} />
          {lcl("Tallenna kuvana", "Save as image")}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => downloadToolRecord(record)}
        >
          <Download size={18} />
          {lcl("Vie JSON", "Export JSON")}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            if (!printToolRecord(record, data.locale))
              notify(
                lcl(
                  "Tulostusikkuna estettiin. Salli ponnahdusikkuna ja yritä uudelleen.",
                  "The print window was blocked. Allow pop-ups and try again.",
                ),
              );
          }}
        >
          <Printer size={18} />
          {lcl("Tulosta / tallenna PDF", "Print / save as PDF")}
        </button>
        {record.equipmentId &&
          data.equipment.some((item) => item.id === record.equipmentId) && (
            <button className="text-button" type="button" onClick={onEquipment}>
              {lcl("Avaa laitteet", "Open equipment")}
            </button>
          )}
        <button
          className="text-button danger-text"
          type="button"
          onClick={onDelete}
        >
          <Trash2 size={18} />
          {lcl("Poista", "Delete")}
        </button>
      </div>
    </details>
  );
}

function ReportRows({
  title,
  rows,
}: {
  title: string;
  rows: ToolRecord["inputs"];
}) {
  const { data } = useApp();
  const label = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  if (!rows.length) return null;
  return (
    <section className="report-rows">
      <h3>{title}</h3>
      <dl>
        {rows.map((row, index) => (
          <div className="report-row" key={`${row.label.fi}-${index}`}>
            <dt>{label(row.label.fi, row.label.en)}</dt>
            <dd>{formatReportRow(row, data.locale)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
