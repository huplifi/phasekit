import { Download, ImageDown, Printer, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
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
  primaryReportOutputs,
  reportHasRoundedValues,
  reportSummary,
} from "../report-summary";
import { downloadToolRecordImage } from "../report-image";
import { renderCycleChartSvg } from "../ph-chart-snapshot";
import { selectedSavedReportId } from "../saved-report-route";
import type { ToolRecord } from "../storage";
import "./reports.css";

const l = (locale: "fi" | "en", fi: string, en: string) =>
  locale === "fi" ? fi : en;

export function Saved() {
  const { t, data, setData, go, notify } = useApp();
  const selectedId = selectedSavedReportId(window.location.hash);
  useEffect(() => {
    if (selectedId)
      requestAnimationFrame(() =>
        document
          .getElementById(`report-${selectedId}`)
          ?.scrollIntoView({ block: "start" }),
      );
  }, [selectedId]);
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
                  selected={record.id === selectedId}
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
  selected,
}: {
  record: ToolRecord;
  onDelete: () => void;
  onEquipment: () => void;
  selected: boolean;
}) {
  const { data, setData, notify } = useApp();
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState(record.notes);
  const lcl = (fi: string, en: string) => l(data.locale, fi, en);
  const sources = record.sources;
  const headline = primaryReportOutputs(record);
  const detailOutputs = record.outputs.filter((row) => !headline.includes(row));
  const linkedEquipment = data.equipment.find(
    (item) => item.id === record.equipmentId,
  );
  return (
    <details
      className="saved-entry report-entry"
      id={`report-${record.id}`}
      open={selected || undefined}
    >
      <summary>
        <span>
          <strong className="report-summary">
            {reportSummary(record, data.locale)}
          </strong>
          <span className="secondary">
            {formatDate(record.createdAt, data.locale)}
            {` · ${linkedEquipment ? `${lcl("Laite", "Equipment")}: ${linkedEquipment.name}` : lcl("Ei liitetty", "Unlinked")}`}
          </span>
        </span>
      </summary>
      <div className="report-detail">
        {headline.length > 0 && (
          <section
            className="result-card saved-result-card"
            aria-label={lcl("Päätulos", "Main result")}
          >
            {headline.map((row, index) => (
              <div key={index}>
                <p className="result-label">{row.label[data.locale]}</p>
                <p className="result-number">
                  {formatReportRow(row, data.locale)}
                </p>
              </div>
            ))}
          </section>
        )}
        <ReportRows title={lcl("Lähtötiedot", "Inputs")} rows={record.inputs} />
        {detailOutputs.length > 0 && (
          <details className="report-secondary-details">
            <summary>{lcl("Tuloksen erittely", "Result breakdown")}</summary>
            <ReportRows
              title={lcl("Lisätiedot", "Details")}
              rows={detailOutputs}
            />
          </details>
        )}
        {record.chartSnapshot && (
          <section className="report-chart">
            <h3>{lcl("Kylmäkierron kaavio", "Cycle diagram")}</h3>
            <img
              alt={lcl("Tallennettu log(p)–h-kaavio", "Saved log(p)–h diagram")}
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCycleChartSvg(record.chartSnapshot, data.locale))}`}
            />
            <p className="caption secondary">
              {lcl(
                "Rajattu CoolProp HEOS -malli. Suorat viivat kuvaavat kierron järjestystä, eivät prosessireittiä.",
                "Bounded CoolProp HEOS model. Straight lines show cycle order, not the process path.",
              )}
            </p>
          </section>
        )}
        {reportHasRoundedValues(record) && (
          <p className="caption secondary">
            {lcl(
              "≈ tarkoittaa näytöllä pyöristettyä arvoa. JSON-vienti säilyttää tarkat tallennetut luvut.",
              "≈ marks a rounded display value. JSON export keeps the exact recorded numbers.",
            )}
          </p>
        )}
        {(record.notes || editingNotes) && (
          <section>
            <h3>{lcl("Muistiinpanot", "Notes")}</h3>
            {editingNotes ? (
              <div className="report-note-editor">
                <textarea
                  aria-label={lcl("Muistiinpanot", "Notes")}
                  value={draftNotes}
                  maxLength={10000}
                  rows={4}
                  onChange={(event) => setDraftNotes(event.target.value)}
                />
                <div className="button-group">
                  <button
                    type="button"
                    className="secondary-button"
                    onClick={() => {
                      setData((current) => ({
                        ...current,
                        toolRecords: current.toolRecords.map((item) =>
                          item.id === record.id
                            ? { ...item, notes: draftNotes }
                            : item,
                        ),
                      }));
                      setEditingNotes(false);
                    }}
                  >
                    {lcl("Tallenna muistiinpanot", "Save notes")}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setDraftNotes(record.notes);
                      setEditingNotes(false);
                    }}
                  >
                    {lcl("Peruuta", "Cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="report-notes">{record.notes}</p>
            )}
          </section>
        )}
        <details className="report-secondary-details report-equipment-details">
          <summary>{lcl("Vaihda laitetta", "Change equipment")}</summary>
          {record.equipmentName &&
            record.equipmentName !== linkedEquipment?.name && (
              <p>
                <strong>
                  {lcl("Alkuperäinen laitenimi", "Equipment name when saved")}:
                </strong>{" "}
                {record.equipmentName}
              </p>
            )}
          {!record.equipmentName && record.lastLinkedEquipmentName && (
            <p>
              <strong>
                {lcl(
                  "Aiempi laitelinkki (nimi poistettaessa)",
                  "Former equipment link (name at removal)",
                )}
                :
              </strong>{" "}
              {record.lastLinkedEquipmentName}
            </p>
          )}
          <label className="report-linkage">
            {lcl("Laite", "Equipment")}
            <select
              value={
                data.equipment.some((item) => item.id === record.equipmentId)
                  ? record.equipmentId
                  : ""
              }
              onChange={(event) =>
                setData((current) => ({
                  ...current,
                  toolRecords: current.toolRecords.map((item) =>
                    item.id === record.id
                      ? {
                          ...item,
                          equipmentId: event.target.value || undefined,
                          lastLinkedEquipmentName: event.target.value
                            ? undefined
                            : !item.equipmentName && item.equipmentId
                              ? (current.equipment.find(
                                  (equipment) =>
                                    equipment.id === item.equipmentId,
                                )?.name ?? item.lastLinkedEquipmentName)
                              : item.lastLinkedEquipmentName,
                        }
                      : item,
                  ),
                }))
              }
            >
              <option value="">{lcl("Ei liitetty", "Unlinked")}</option>
              {data.equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <p className="caption secondary">
            {lcl(
              "Laitelinkin muuttaminen ei muuta alkuperäisiä laskentatietoja.",
              "Changing the link leaves the original calculation unchanged.",
            )}
          </p>
        </details>
        <details className="report-provenance report-secondary-details">
          <summary>
            {lcl("Lähteet ja versiotiedot", "Sources and version information")}
          </summary>
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
        </details>
      </div>
      <div className="button-group report-actions">
        {!editingNotes && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setDraftNotes(record.notes);
              setEditingNotes(true);
            }}
          >
            {lcl("Muokkaa muistiinpanoja", "Edit notes")}
          </button>
        )}
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
  if (!rows.length) return null;
  return (
    <section className="report-rows">
      <h3>{title}</h3>
      <dl>
        {rows.map((row, index) => (
          <div className="report-row" key={`${row.label.fi}-${index}`}>
            <dt>{row.label[data.locale]}</dt>
            <dd>{formatReportRow(row, data.locale)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
