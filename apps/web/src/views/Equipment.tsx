import { useDraftGuard } from "../useDraftGuard";
import { useState } from "react";
import type { FormEvent } from "react";
import {
  ChevronRight,
  MoreVertical,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { formatDate } from "../../../../packages/i18n/src";
import { reportSummary } from "../report-summary";
import { savedReportPath } from "../saved-report-route";
import { checklistDefinitions } from "../../../../packages/core/src/field-tools";
import { isCalendarDate } from "../../../../packages/core/src/schedule";
import { isValidEquipmentCharge } from "../storage";
import type { EquipmentRecord, SiteRecord } from "../storage";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import { byId } from "../data";
import { useApp } from "../context";
import "./reports.css";
import "./equipment-sites.css";

type EquipmentDraft = Required<
  Pick<
    EquipmentRecord,
    | "name"
    | "location"
    | "notes"
    | "siteId"
    | "refrigerantId"
    | "chargeKg"
    | "model"
    | "serialNumber"
  >
>;
type SiteDraft = Pick<SiteRecord, "name" | "address">;
const l = (locale: "fi" | "en", fi: string, en: string) =>
  locale === "fi" ? fi : en;
const emptyDraft: EquipmentDraft = {
  name: "",
  location: "",
  notes: "",
  siteId: "",
  refrigerantId: "",
  chargeKg: "",
  model: "",
  serialNumber: "",
};
const emptySiteDraft: SiteDraft = { name: "", address: "" };

export function Equipment() {
  const setDraftDirty = useDraftGuard();
  const { data, setData, go } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EquipmentDraft>(emptyDraft);
  const [error, setError] = useState("");
  const [chargeError, setChargeError] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
  const [siteDraft, setSiteDraft] = useState<SiteDraft>(emptySiteDraft);
  const [dirty, setDirty] = useState(false);
  const sites = data.sites ?? [];
  const t = (fi: string, en: string) => l(data.locale, fi, en);

  const markDirty = () => {
    setDirty(true);
    setDraftDirty(true);
  };
  const canSwitchEditor = () =>
    !dirty ||
    window.confirm(
      t("Hylätäänkö tallentamattomat muutokset?", "Discard unsaved changes?"),
    );
  const cancel = () => {
    setDraftDirty(false);
    setDirty(false);
    setEditingId(null);
    setEditingSiteId(null);
    setDraft(emptyDraft);
    setSiteDraft(emptySiteDraft);
    setError("");
    setChargeError(false);
    setDetailsExpanded(false);
  };
  const beginCreate = (siteId = "") => {
    if (!canSwitchEditor()) return;
    cancel();
    setEditingId("");
    setDraft({ ...emptyDraft, siteId });
  };
  const beginEdit = (item: EquipmentRecord) => {
    if (!canSwitchEditor()) return;
    cancel();
    setEditingId(item.id);
    setDraft({
      name: item.name,
      location: item.location,
      notes: item.notes,
      siteId: item.siteId ?? "",
      refrigerantId: item.refrigerantId ?? "",
      chargeKg: item.chargeKg ?? "",
      model: item.model ?? "",
      serialNumber: item.serialNumber ?? "",
    });
  };
  const beginSite = (site?: SiteRecord) => {
    if (!canSwitchEditor()) return;
    cancel();
    setEditingSiteId(site?.id ?? "");
    setSiteDraft(
      site ? { name: site.name, address: site.address } : emptySiteDraft,
    );
  };
  const saveSite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = siteDraft.name.trim();
    if (!name || name.length > 200 || siteDraft.address.length > 300) {
      setError(
        t(
          "Anna kohteelle nimi. Nimi enintään 200 ja osoite 300 merkkiä.",
          "Enter a site name. Name up to 200 and address up to 300 characters.",
        ),
      );
      return;
    }
    if (!editingSiteId && sites.length >= 1000) {
      setError(
        t("Kohteiden enimmäismäärä on 1 000.", "The site limit is 1,000."),
      );
      return;
    }
    const site: SiteRecord = {
      id: editingSiteId || crypto.randomUUID(),
      name,
      address: siteDraft.address.trim(),
      updatedAt: new Date().toISOString(),
    };
    setData((current) => ({
      ...current,
      sites: editingSiteId
        ? (current.sites ?? []).map((item) =>
            item.id === editingSiteId ? site : item,
          )
        : [site, ...(current.sites ?? [])],
    }));
    cancel();
  };
  const removeSite = (site: SiteRecord) => {
    if (
      !window.confirm(
        t(
          `Poistetaanko kohde “${site.name}”? Laitteet, raportit ja laskelmat säilyvät. Laitteiden kohdelinkki poistuu.`,
          `Delete site “${site.name}”? Equipment, reports and calculations remain. Equipment is unlinked from the site.`,
        ),
      )
    )
      return;
    setData((current) => ({
      ...current,
      sites: (current.sites ?? []).filter((item) => item.id !== site.id),
      equipment: current.equipment.map((item) =>
        item.siteId === site.id ? { ...item, siteId: undefined } : item,
      ),
    }));
    if (editingSiteId === site.id) cancel();
    if (draft.siteId === site.id)
      setDraft((current) => ({ ...current, siteId: "" }));
  };
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = draft.name.trim();
    setChargeError(false);
    if (draft.chargeKg.trim() && !isValidEquipmentCharge(draft.chargeKg)) {
      setChargeError(true);
      setDetailsExpanded(true);
      setError(
        t(
          "Anna täytös kilogrammoina: nolla tai positiivinen luku.",
          "Enter a charge in kilograms: zero or a positive number.",
        ),
      );
      return;
    }
    if (!name) {
      setError(t("Anna laitteelle nimi.", "Enter an equipment name."));
      return;
    }
    if (
      name.length > 200 ||
      draft.location.length > 300 ||
      draft.notes.length > 10000 ||
      draft.model.length > 200 ||
      draft.serialNumber.length > 200 ||
      draft.chargeKg.length > 100
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
    const optionalDetails = {
      siteId: draft.siteId || undefined,
      refrigerantId: draft.refrigerantId || undefined,
      chargeKg: draft.chargeKg.trim() || undefined,
      model: draft.model.trim() || undefined,
      serialNumber: draft.serialNumber.trim() || undefined,
    };
    if (editingId) {
      const updatedAt = new Date().toISOString();
      setData((current) => ({
        ...current,
        equipment: current.equipment.map((item) =>
          item.id === editingId
            ? { ...item, ...draft, ...optionalDetails, name, updatedAt }
            : item,
        ),
      }));
    } else {
      const item: EquipmentRecord = {
        id: crypto.randomUUID(),
        name,
        location: draft.location,
        notes: draft.notes,
        ...optionalDetails,
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
    if (editingId === item.id) cancel();
  };

  const renderEquipment = (item: EquipmentRecord) => {
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
            <h3 className="equipment-device-name">{item.name}</h3>
            {item.location && (
              <p className="supporting-copy">{item.location}</p>
            )}
          </div>
          <details className="equipment-actions">
            <summary
              aria-label={
                data.locale === "fi"
                  ? `Laitteen ${item.name} toiminnot`
                  : `Actions for ${item.name}`
              }
            >
              <MoreVertical size={20} aria-hidden="true" />
            </summary>
            <div className="equipment-actions-menu">
              <button
                type="button"
                onClick={(event) => {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                  beginEdit(item);
                }}
              >
                {t("Muokkaa", "Edit")}
              </button>
              <button
                className="danger-text"
                type="button"
                onClick={(event) => {
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                  remove(item);
                }}
              >
                <Trash2 size={17} aria-hidden="true" />
                {t("Poista", "Delete")}
              </button>
            </div>
          </details>
        </div>
        {(item.model ||
          item.serialNumber ||
          item.refrigerantId ||
          item.chargeKg) && (
          <dl className="equipment-device-details">
            {item.model && (
              <div>
                <dt>{t("Valmistaja ja malli", "Manufacturer and model")}</dt>
                <dd>{item.model}</dd>
              </div>
            )}
            {item.serialNumber && (
              <div>
                <dt>{t("Sarjanumero", "Serial number")}</dt>
                <dd>{item.serialNumber}</dd>
              </div>
            )}
            {item.refrigerantId && (
              <div>
                <dt>{t("Kylmäaine", "Refrigerant")}</dt>
                <dd>
                  {byId.get(item.refrigerantId)?.designation ??
                    `${item.refrigerantId} (${t("tuntematon", "unknown")})`}
                </dd>
              </div>
            )}
            {item.chargeKg && (
              <div>
                <dt>{t("Täytös", "Charge")}</dt>
                <dd>{item.chargeKg} kg</dd>
              </div>
            )}
          </dl>
        )}
        {item.notes && <p className="equipment-notes">{item.notes}</p>}
        <details className="equipment-history">
          <summary>
            <h3>
              {t("Raportit ja laskelmat", "Reports and calculations")}{" "}
              <span className="secondary">
                ({reports.length + fieldReports.length})
              </span>
            </h3>
            <ChevronRight size={18} aria-hidden="true" />
          </summary>
          {reports.length + fieldReports.length ? (
            <ul className="equipment-record-list">
              {fieldReports.map((record) => {
                const siteName = record.title.trim();
                const reportType =
                  checklistDefinitions[record.kind].name[data.locale];
                const equipmentName = record.fields.equipment?.trim();
                const primaryLabel = siteName || reportType;
                const secondaryLabel = siteName
                  ? [reportType, equipmentName].filter(Boolean).join(" · ")
                  : [t("Kohde nimeämättä", "Site not named"), equipmentName]
                      .filter(Boolean)
                      .join(" · ");
                const performedOn = record.fields.performedOn ?? "";
                const reportDate = isCalendarDate(performedOn)
                  ? performedOn
                  : record.updatedAt;
                return (
                  <li key={`field-${record.id}`}>
                    <button
                      className="equipment-record-link equipment-field-report-link"
                      type="button"
                      onClick={() =>
                        go(`/checklists/${encodeURIComponent(record.id)}`)
                      }
                    >
                      <span className="equipment-record-copy">
                        <strong>{primaryLabel}</strong>
                        <span className="equipment-record-secondary">
                          {secondaryLabel}
                        </span>
                        <span className="equipment-record-tertiary">
                          {formatDate(reportDate, data.locale)}
                          {record.status === "final" ? (
                            <span className="equipment-record-status">
                              {t("Valmis", "Final")}
                            </span>
                          ) : (
                            <span className="equipment-record-status status-badge status-badge--warning">
                              {t("Luonnos", "Draft")}
                            </span>
                          )}
                        </span>
                      </span>
                      <ChevronRight
                        className="equipment-record-chevron"
                        size={18}
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                );
              })}
              {reports.map((record) => (
                <li key={record.id}>
                  <button
                    className="equipment-record-link"
                    type="button"
                    onClick={() => go(savedReportPath(record.id))}
                  >
                    <span className="equipment-record-copy">
                      <strong>{reportSummary(record, data.locale)}</strong>
                      <span className="equipment-record-secondary">
                        {t("Laskelma", "Calculation")}
                      </span>
                      <span className="equipment-record-tertiary">
                        {formatDate(record.createdAt, data.locale)}
                      </span>
                    </span>
                    <ChevronRight
                      className="equipment-record-chevron"
                      size={18}
                      aria-hidden="true"
                    />
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
        </details>
        <p className="caption secondary">
          {t("Päivitetty", "Updated")}:{" "}
          {formatDate(item.updatedAt, data.locale)}
        </p>
      </article>
    );
  };

  return (
    <section className="equipment-view">
      <header className="equipment-heading">
        <div>
          <h1>{t("Laitteet ja kohteet", "Equipment and sites")}</h1>
          <p className="supporting-copy">
            {t(
              "Kokoa saman kohteen laitteet yhteen ja käytä laitetietoja raporteissa.",
              "Group equipment by site and reuse device details in reports.",
            )}
          </p>
        </div>
      </header>
      {editingId === null && editingSiteId === null && (
        <div className="equipment-create-actions">
          <button
            className="secondary-button equipment-add"
            type="button"
            onClick={() => beginSite()}
          >
            <Plus size={18} />
            {t("Lisää kohde", "Add site")}
          </button>
          <button
            className="secondary-button equipment-add"
            type="button"
            onClick={() => beginCreate()}
          >
            <Plus size={18} /> {t("Lisää laite", "Add equipment")}
          </button>
        </div>
      )}
      {editingSiteId !== null && (
        <form
          className="equipment-form equipment-site-form"
          onSubmit={saveSite}
          onChangeCapture={markDirty}
        >
          <h2>
            {editingSiteId
              ? t("Muokkaa kohdetta", "Edit site")
              : t("Uusi kohde", "New site")}
          </h2>
          <label htmlFor="site-name">
            {t("Kohteen nimi", "Site name")}
            <input
              id="site-name"
              required
              maxLength={200}
              value={siteDraft.name}
              onChange={(event) =>
                setSiteDraft({ ...siteDraft, name: event.target.value })
              }
            />
          </label>
          <label htmlFor="site-address">
            {t("Osoite", "Address")}
            <input
              id="site-address"
              maxLength={300}
              value={siteDraft.address}
              onChange={(event) =>
                setSiteDraft({ ...siteDraft, address: event.target.value })
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
        </form>
      )}
      {editingId !== null && (
        <form
          className="equipment-form"
          onSubmit={save}
          onChangeCapture={markDirty}
        >
          <h2>
            {editingId
              ? t("Muokkaa laitetta", "Edit equipment")
              : t("Uusi laite", "New equipment")}
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
          <label htmlFor="equipment-site">
            {t("Kohde", "Site")}
            <select
              id="equipment-site"
              value={draft.siteId}
              onChange={(event) =>
                setDraft({ ...draft, siteId: event.target.value })
              }
            >
              <option value="">{t("Ei kohdetta", "No site")}</option>
              {draft.siteId &&
                !sites.some((site) => site.id === draft.siteId) && (
                  <option value={draft.siteId}>
                    {t("Tuntematon kohde", "Unknown site")} ({draft.siteId})
                  </option>
                )}
              {sites.map((site) => (
                <option value={site.id} key={site.id}>
                  {site.name}
                  {site.address ? ` · ${site.address}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="equipment-location">
            {t("Sijainti", "Location")}
            <input
              id="equipment-location"
              maxLength={300}
              aria-describedby="equipment-location-help"
              value={draft.location}
              onChange={(event) =>
                setDraft({ ...draft, location: event.target.value })
              }
            />
          </label>
          <p id="equipment-location-help" className="caption secondary">
            {t(
              "Laitteen sijainti kohteessa, esimerkiksi konehuone tai huone 201.",
              "The device location within the site, for example the plant room or room 201.",
            )}
          </p>
          <details
            className="equipment-optional-details"
            open={detailsExpanded}
            onToggle={(event) => setDetailsExpanded(event.currentTarget.open)}
          >
            <summary>
              {t("Laitetiedot (valinnainen)", "Device details (optional)")}
            </summary>
            <div className="equipment-optional-fields">
              <label htmlFor="equipment-model">
                {t("Valmistaja ja malli", "Manufacturer and model")}
                <input
                  id="equipment-model"
                  maxLength={200}
                  value={draft.model}
                  onChange={(event) =>
                    setDraft({ ...draft, model: event.target.value })
                  }
                />
              </label>
              <label htmlFor="equipment-serial">
                {t("Sarjanumero", "Serial number")}
                <input
                  id="equipment-serial"
                  maxLength={200}
                  value={draft.serialNumber}
                  onChange={(event) =>
                    setDraft({ ...draft, serialNumber: event.target.value })
                  }
                />
              </label>
              <div className="equipment-refrigerant-field">
                <span>{t("Kylmäaine", "Refrigerant")}</span>
                <RefrigerantPicker
                  label={t("Kylmäaine", "Refrigerant")}
                  value={draft.refrigerantId}
                  onChange={(refrigerantId) => {
                    setDraft({ ...draft, refrigerantId });
                    markDirty();
                  }}
                  onClear={() => {
                    setDraft({ ...draft, refrigerantId: "" });
                    markDirty();
                  }}
                />
                {draft.refrigerantId && !byId.has(draft.refrigerantId) && (
                  <p className="caption secondary">
                    {t("Tuntematon kylmäaine", "Unknown refrigerant")}:{" "}
                    {draft.refrigerantId}
                  </p>
                )}
              </div>
              <label htmlFor="equipment-charge">
                {t("Täytös (kg)", "Charge (kg)")}
                <input
                  id="equipment-charge"
                  inputMode="decimal"
                  maxLength={100}
                  value={draft.chargeKg}
                  aria-invalid={chargeError || undefined}
                  aria-describedby={chargeError ? "equipment-error" : undefined}
                  onChange={(event) => {
                    setDraft({ ...draft, chargeKg: event.target.value });
                    setChargeError(false);
                  }}
                />
              </label>
            </div>
          </details>
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
            <p id="equipment-error" className="error-text" role="alert">
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
      {data.equipment.length === 0 &&
      sites.length === 0 &&
      editingId === null &&
      editingSiteId === null ? (
        <div className="equipment-empty">
          <h2>{t("Laitteita ei ole vielä lisätty", "No equipment yet")}</h2>
          <p>
            {t(
              "Lisää kohde ja sen laitteet tai aloita yksittäisestä laitteesta.",
              "Add a site and its equipment, or start with a single device.",
            )}
          </p>
        </div>
      ) : (
        <div className="equipment-list">
          {sites.map((site) => {
            const devices = data.equipment.filter(
              (item) => item.siteId === site.id,
            );
            return (
              <section
                className="equipment-site"
                key={site.id}
                aria-labelledby={`site-${site.id}`}
              >
                <header className="equipment-site-heading">
                  <div>
                    <h2 id={`site-${site.id}`}>{site.name}</h2>
                    {site.address && (
                      <p className="supporting-copy">{site.address}</p>
                    )}
                    <p className="caption secondary">
                      {devices.length}{" "}
                      {devices.length === 1
                        ? t("laite", "device")
                        : t("laitetta", "devices")}
                    </p>
                  </div>
                  <div className="equipment-site-actions">
                    <button
                      className="text-button"
                      type="button"
                      onClick={() => beginCreate(site.id)}
                    >
                      <Plus size={16} />
                      {t("Lisää laite", "Add equipment")}
                    </button>
                    <details className="equipment-actions">
                      <summary
                        aria-label={t(
                          `Kohteen ${site.name} toiminnot`,
                          `Actions for site ${site.name}`,
                        )}
                      >
                        <MoreVertical size={20} aria-hidden="true" />
                      </summary>
                      <div className="equipment-actions-menu">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            beginSite(site);
                          }}
                        >
                          {t("Muokkaa kohdetta", "Edit site")}
                        </button>
                        <button
                          className="danger-text"
                          type="button"
                          onClick={(event) => {
                            event.currentTarget
                              .closest("details")
                              ?.removeAttribute("open");
                            removeSite(site);
                          }}
                        >
                          <Trash2 size={17} aria-hidden="true" />
                          {t("Poista kohde", "Delete site")}
                        </button>
                      </div>
                    </details>
                  </div>
                </header>
                <div className="equipment-list">
                  {devices.map(renderEquipment)}
                </div>
                {!devices.length && (
                  <p className="caption secondary">
                    {t(
                      "Kohteeseen ei ole vielä lisätty laitteita.",
                      "No equipment has been added to this site yet.",
                    )}
                  </p>
                )}
              </section>
            );
          })}
          {data.equipment.some(
            (item) => !sites.some((site) => site.id === item.siteId),
          ) && (
            <section
              className="equipment-site equipment-site-unassigned"
              aria-labelledby="equipment-unassigned-heading"
            >
              <h2 id="equipment-unassigned-heading">
                {t("Laitteet ilman kohdetta", "Equipment without a site")}
              </h2>
              <div className="equipment-list">
                {data.equipment
                  .filter(
                    (item) => !sites.some((site) => site.id === item.siteId),
                  )
                  .map(renderEquipment)}
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
