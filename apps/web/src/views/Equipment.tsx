import { useDraftGuard } from "../useDraftGuard";
import { useState } from "react";
import type { FormEvent } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";
import { formatDate } from "../../../../packages/i18n/src";
import { reportSummary } from "../report-summary";
import { savedReportPath } from "../saved-report-route";
import { checklistDefinitions } from "../../../../packages/core/src/field-tools";
import { isCalendarDate } from "../../../../packages/core/src/schedule";
import type { EquipmentRecord } from "../storage";
import { useApp } from "../context";
import "./reports.css";

type EquipmentDraft = Pick<EquipmentRecord, "name" | "location" | "notes">;
const l = (locale: "fi" | "en", fi: string, en: string) =>
  locale === "fi" ? fi : en;
const emptyDraft: EquipmentDraft = { name: "", location: "", notes: "" };

export function Equipment() {
  const setDraftDirty = useDraftGuard();
  const { data, setData, go } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentDraft>(emptyDraft);
  const [error, setError] = useState("");
  const t = (fi: string, en: string) => l(data.locale, fi, en);

  const beginCreate = () => {
    setEditingId("");
    setDraft(emptyDraft);
    setError("");
  };
  const beginEdit = (item: EquipmentRecord) => {
    setEditingId(item.id);
    setDraft({ name: item.name, location: item.location, notes: item.notes });
    setError("");
  };
  const cancel = () => {
    setDraftDirty(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setError("");
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) {
      setError(t("Anna laitteelle nimi.", "Enter an equipment name."));
      return;
    }
    if (
      name.length > 200 ||
      draft.location.length > 300 ||
      draft.notes.length > 10000
    ) {
      setError(
        t(
          "Kentän enimmäispituus ylittyy.",
          "A field exceeds its maximum length.",
        ),
      );
      return;
    }
    if (!editingId && data.equipment.length >= 1000) {
      setError(
        t(
          "Laitteiden enimmäismäärä on 1 000. Vie varmuuskopio ja poista tarpeettomia laitteita.",
          "The equipment limit is 1,000. Export a backup and remove unused equipment.",
        ),
      );
      return;
    }
    if (editingId) {
      const updatedAt = new Date().toISOString();
      setData((current) => ({
        ...current,
        equipment: current.equipment.map((item) =>
          item.id === editingId ? { ...item, ...draft, name, updatedAt } : item,
        ),
      }));
    } else {
      const item: EquipmentRecord = {
        id: crypto.randomUUID(),
        name,
        location: draft.location,
        notes: draft.notes,
        updatedAt: new Date().toISOString(),
      };
      setData((current) => ({
        ...current,
        equipment: [item, ...current.equipment],
      }));
    }
    cancel();
  };
  const remove = (item: EquipmentRecord) => {
    if (
      !window.confirm(
        t(
          `Poistetaanko laite “${item.name}”? Raportit ja laskelmat säilyvät. Laskelmien laitelinkki poistuu. Raporttien alkuperäiset laite- ja kohdetiedot säilyvät muuttumattomina.`,
          `Delete “${item.name}”? Reports and calculations remain. Calculation links are removed. The original equipment and site details in reports remain unchanged.`,
        ),
      )
    )
      return;
    setData((current) => ({
      ...current,
      equipment: current.equipment.filter((row) => row.id !== item.id),
      toolRecords: current.toolRecords.map((record) =>
        record.equipmentId === item.id
          ? {
              ...record,
              equipmentId: undefined,
              ...(!record.equipmentName
                ? { lastLinkedEquipmentName: item.name }
                : {}),
            }
          : record,
      ),
    }));
  };

  return (
    <section className="equipment-view">
      <header className="equipment-heading">
        <div>
          <h1>{t("Laitteet ja kohteet", "Equipment and sites")}</h1>
          <p className="secondary">
            {t(
              "Pidä raportit ja laskelmat järjestyksessä liittämällä ne laitteisiin tai kohteisiin.",
              "Keep reports and calculations organised by linking them to equipment or sites.",
            )}
          </p>
        </div>
      </header>
      {editingId === null && (
        <button
          className="secondary-button equipment-add"
          type="button"
          onClick={beginCreate}
        >
          <Plus size={18} /> {t("Lisää laite", "Add equipment")}
        </button>
      )}
      {editingId !== null && (
        <form
          className="equipment-form"
          onSubmit={save}
          onChangeCapture={() => setDraftDirty(true)}
        >
          <h2>
            {editingId
              ? t("Muokkaa laitetta", "Edit equipment")
              : t("Uusi laite tai kohde", "New equipment or site")}
          </h2>
          <label htmlFor="equipment-name">
            {t("Nimi", "Name")}
            <input
              id="equipment-name"
              required
              maxLength={200}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
          </label>
          <label htmlFor="equipment-location">
            {t("Sijainti", "Location")}
            <input
              id="equipment-location"
              maxLength={300}
              value={draft.location}
              onChange={(event) =>
                setDraft({ ...draft, location: event.target.value })
              }
            />
          </label>
          <label htmlFor="equipment-notes">
            {t("Muistiinpanot", "Notes")}
            <textarea
              id="equipment-notes"
              maxLength={10000}
              rows={4}
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
            />
          </label>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="button-group">
            <button className="primary" type="submit">
              <Save size={18} />
              {t("Tallenna", "Save")}
            </button>
            <button className="text-button" type="button" onClick={cancel}>
              <X size={18} />
              {t("Peruuta", "Cancel")}
            </button>
          </div>
          <p className="caption secondary">
            {t(
              "Nimi enintään 200 merkkiä, sijainti 300 ja muistiinpanot 10 000.",
              "Name up to 200 characters, location 300 and notes 10,000.",
            )}
          </p>
        </form>
      )}
      {data.equipment.length === 0 && editingId === null ? (
        <div className="empty equipment-empty">
          <h2>{t("Laitteita ei ole vielä lisätty", "No equipment yet")}</h2>
          <p>
            {t(
              "Lisää ensimmäinen laite tai kohde, jotta voit liittää raportit ja laskelmat siihen.",
              "Add a device or site to organise reports and calculations around it.",
            )}
          </p>
        </div>
      ) : (
        <div className="equipment-list">
          {data.equipment.map((item) => {
            const reports = data.toolRecords.filter(
              (record) => record.equipmentId === item.id,
            );
            const fieldReports = data.checklistDrafts
              .filter((record) => record.equipmentId === item.id)
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            return (
              <article className="equipment-card" key={item.id}>
                <div className="equipment-card-heading">
                  <div>
                    <h2>{item.name}</h2>
                    {item.location && (
                      <p className="secondary">{item.location}</p>
                    )}
                  </div>
                  <div className="button-group">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => beginEdit(item)}
                    >
                      {t("Muokkaa", "Edit")}
                    </button>
                    <button
                      className="text-button danger-text"
                      type="button"
                      onClick={() => remove(item)}
                    >
                      <Trash2 size={18} />
                      {t("Poista", "Delete")}
                    </button>
                  </div>
                </div>
                {item.notes && <p className="equipment-notes">{item.notes}</p>}
                <section className="equipment-history">
                  <h3>
                    {t("Raportit ja laskelmat", "Reports and calculations")}{" "}
                    <span className="secondary">
                      ({reports.length + fieldReports.length})
                    </span>
                  </h3>
                  {reports.length + fieldReports.length ? (
                    <ul className="equipment-record-list">
                      {fieldReports.map((record) => (
                        <li key={`field-${record.id}`}>
                          <button
                            className="equipment-record-link equipment-field-report-link"
                            type="button"
                            onClick={() =>
                              go(`/checklists/${encodeURIComponent(record.id)}`)
                            }
                          >
                            <strong>
                              {
                                checklistDefinitions[record.kind].name[
                                  data.locale
                                ]
                              }{" "}
                              · {record.title || t("Nimetön", "Untitled")}
                            </strong>
                            <span className="secondary">
                              {formatDate(
                                isCalendarDate(record.fields.performedOn ?? "")
                                  ? record.fields.performedOn
                                  : record.updatedAt,
                                data.locale,
                              )}{" "}
                              ·{" "}
                              {record.status === "final"
                                ? t("Valmis", "Final")
                                : t("Luonnos", "Draft")}
                            </span>
                          </button>
                        </li>
                      ))}
                      {reports.map((record) => (
                        <li key={record.id}>
                          <button
                            className="equipment-record-link"
                            type="button"
                            onClick={() => go(savedReportPath(record.id))}
                          >
                            <strong>
                              {reportSummary(record, data.locale)}
                            </strong>
                            <span className="secondary">
                              {formatDate(record.createdAt, data.locale)}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="caption secondary">
                      {t(
                        "Tähän laitteeseen liitettyjä raportteja tai laskelmia ei ole.",
                        "No reports or calculations are linked to this equipment.",
                      )}
                    </p>
                  )}
                </section>
                <p className="caption secondary">
                  {t("Päivitetty", "Updated")}:{" "}
                  {formatDate(item.updatedAt, data.locale)}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
