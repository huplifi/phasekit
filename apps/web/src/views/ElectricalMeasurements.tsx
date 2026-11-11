import { useEffect, useState } from "react";
import { CopyPlus, FileText, QrCode } from "lucide-react";
import { Back } from "../components/Common";
import { ElectricalMeterHelp } from "../components/ElectricalMeterHelp";
import { ElectricalMeasurementGuide } from "../components/ElectricalMeasurementGuide";
import { useApp } from "../context";
import type {
  ElectricalMeasurement,
  ElectricalSession,
  MeasurementType,
} from "../electrical";
import {
  createMeasurement,
  copyMeasurementPoint,
  measurementTypes,
  hasMeasurementResult,
  measurementResultText,
} from "../electrical";
import { supportedFlukeModels } from "../electrical-meter-guides";
import { prepareMeasurementPhoto } from "../measurement-photo";
import "./field-tools.css";
import "./electrical-measurements.css";

const definitions = Object.entries(measurementTypes).map(
  ([type, definition]) => ({
    type: type as MeasurementType,
    ...definition.label,
    unit: definition.unit,
  }),
);
const newSession = (): ElectricalSession => ({
  id: crypto.randomUUID(),
  siteName: "",
  equipmentName: "",
  technician: "",
  meter: { brand: "", model: "", serialNumber: "" },
});

const shortLabels: Record<MeasurementType, { fi: string; en: string }> = {
  continuity: { fi: "Jatkuvuus", en: "Continuity" },
  insulation: { fi: "Eristysresistanssi", en: "Insulation resistance" },
  "loop-impedance": { fi: "Silmukkaimpedanssi", en: "Loop impedance" },
  "short-circuit-current": {
    fi: "Oikosulkuvirta",
    en: "Short-circuit current",
  },
  "rcd-time": { fi: "RCD:n toiminta-aika", en: "RCD tripping time" },
  "rcd-current": { fi: "RCD:n toimintavirta", en: "RCD tripping current" },
  voltage: { fi: "Jännite", en: "Voltage" },
  "phase-sequence": { fi: "Vaihejärjestys", en: "Phase sequence" },
  other: { fi: "Muu testi", en: "Other test" },
};
const pointKey = (measurement: ElectricalMeasurement) =>
  measurement.pointId ?? measurement.id;
function measurementStatus(
  measurement: ElectricalMeasurement | undefined,
  locale: "fi" | "en",
) {
  if (!measurement || !hasMeasurementResult(measurement.result))
    return locale === "fi" ? "Ei kirjattu" : "Not recorded";
  const labels = {
    unassessed: { fi: "Kirjattu · arvioimatta", en: "Recorded · unassessed" },
    pass: { fi: "Arvioitu · hyväksytty", en: "Assessed · pass" },
    fail: { fi: "Arvioitu · puute", en: "Assessed · defect" },
    "not-applicable": {
      fi: "Arvioitu · ei sovellu",
      en: "Assessed · not applicable",
    },
  };
  return labels[measurement.assessment][locale];
}
type PatchRow = (
  type: MeasurementType,
  patch: Partial<ElectricalMeasurement>,
  recordId?: string,
) => string;

function MeasurementRow({
  type,
  measurement,
  session,
  locale,
  onPatch,
  onBusy,
}: {
  type: MeasurementType;
  measurement?: ElectricalMeasurement;
  session: ElectricalSession;
  locale: "fi" | "en";
  onPatch: PatchRow;
  onBusy: (busy: boolean) => void;
}) {
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const [textResult, setTextResult] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const definition = measurementTypes[type];
  const result = measurement?.result ?? "";
  const unit = measurement?.unit ?? definition.unit;
  const numericType = type !== "phase-sequence" && type !== "other";
  const resultParts = result.match(/^([<>]=?|[≤≥])\s*(.*)$/);
  const qualifier = resultParts?.[1] ?? "";
  const resultValue = resultParts?.[2] ?? result;
  const patch = (changes: Partial<ElectricalMeasurement>) =>
    onPatch(type, changes, measurement?.id);
  const resultPatch = (value: string) =>
    patch({ result: value, assessment: "unassessed", assessmentNote: "" });
  return (
    <div className="electrical-sheet-row" data-type={type}>
      <div className="electrical-sheet-row-main">
        <label
          className="electrical-sheet-label"
          htmlFor={`electrical-result-${type}-${measurement?.id ?? "new"}`}
        >
          {shortLabels[type][locale]
            .replace("Silmukkaimpedanssi", "Silmukka\u00adimpedanssi")
            .replace("Eristysresistanssi", "Eristys\u00adresistanssi")}
          <span className="electrical-row-status">
            {measurementStatus(measurement, locale)}
          </span>
        </label>
        <div className="electrical-sheet-inputs">
          <input
            id={`electrical-result-${type}-${measurement?.id ?? "new"}`}
            aria-label={`${definition.label[locale]} · ${l("Tulos", "Result")}`}
            className="mono"
            type="text"
            inputMode={numericType && !textResult ? "decimal" : "text"}
            value={result}
            maxLength={1000}
            onChange={(event) => resultPatch(event.target.value)}
          />
          <span className="electrical-sheet-unit mono">{unit || "—"}</span>
        </div>
      </div>
      <details className="electrical-row-details">
        <summary>
          {l("Ohje ja lisätiedot", "Guidance and details")}
          {measurement?.note || measurement?.photo
            ? ` · ${l("liite", "attachment")}`
            : ""}
        </summary>
        <p className="caption">{definition.label[locale]}</p>
        <ElectricalMeasurementGuide type={type} locale={locale} />
        <ElectricalMeterHelp
          meter={measurement?.meter ?? session.meter}
          type={type}
          locale={locale}
        />
        {numericType && (
          <label>
            {l("Vertailumerkki", "Qualifier")}
            <select
              aria-label={`${shortLabels[type][locale]} · ${l("Vertailumerkki", "Qualifier")}`}
              value={qualifier}
              onChange={(event) =>
                resultPatch(
                  `${event.target.value}${event.target.value && resultValue ? " " : ""}${resultValue}`,
                )
              }
            >
              <option value="">=</option>
              {[">", "<", "≥", "≤", ">=", "<="].map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          {l("Yksikkö", "Unit")}
          <input
            value={unit}
            maxLength={80}
            onChange={(event) =>
              patch({
                unit: event.target.value,
                assessment: "unassessed",
                assessmentNote: "",
              })
            }
          />
        </label>
        {numericType && (
          <label className="checkbox">
            <input
              type="checkbox"
              checked={textResult}
              onChange={(event) => setTextResult(event.target.checked)}
            />
            {l(
              "Tekstinäppäimistö / mittarin ilmoitus",
              "Text keyboard / meter indication",
            )}
          </label>
        )}
        <label>
          {l("Huomio (vapaaehtoinen)", "Note (optional)")}
          <textarea
            rows={2}
            value={measurement?.note ?? ""}
            maxLength={4000}
            onChange={(event) => patch({ note: event.target.value })}
          />
        </label>
        <label>
          {l("Lisää kuva (vapaaehtoinen)", "Add photo (optional)")}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={photoBusy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              setPhotoError("");
              setPhotoBusy(true);
              onBusy(true);
              const targetId = patch({});
              try {
                const photo = await prepareMeasurementPhoto(file);
                onPatch(type, { photo }, targetId);
              } catch {
                setPhotoError(
                  l(
                    "Kuvaa ei voitu lisätä. Valitse JPG-, PNG- tai WebP-kuva (enintään 12 Mt); aiempi kuva säilyy.",
                    "Could not add photo. Choose JPG, PNG or WebP (up to 12 MB); the previous photo is retained.",
                  ),
                );
              } finally {
                setPhotoBusy(false);
                onBusy(false);
              }
            }}
          />
        </label>
        {photoBusy && (
          <p role="status">{l("Käsitellään kuvaa…", "Preparing photo…")}</p>
        )}
        {photoError && (
          <p role="alert" className="danger-text">
            {photoError}
          </p>
        )}
        {measurement?.photo && (
          <div>
            <img
              className="electrical-photo"
              src={measurement.photo}
              alt={l("Mittauksen liitekuva", "Measurement attachment")}
            />
            <button
              className="text-button"
              onClick={() => patch({ photo: undefined })}
            >
              {l("Poista kuva", "Remove photo")}
            </button>
          </div>
        )}
        {measurement && (
          <p className="caption">
            {new Date(measurement.measuredAt).toLocaleString(
              locale === "fi" ? "fi-FI" : "en-GB",
            )}{" "}
            · {measurement.technician} ·{" "}
            {[
              measurement.meter.brand,
              measurement.meter.model,
              measurement.meter.serialNumber,
            ]
              .filter(Boolean)
              .join(" ")}
          </p>
        )}
        {measurement &&
          (measurement.technician !== session.technician ||
            JSON.stringify(measurement.meter) !==
              JSON.stringify(session.meter)) && (
            <button
              className="secondary-button"
              onClick={() =>
                patch({
                  technician: session.technician,
                  meter: { ...session.meter },
                  assessment: "unassessed",
                  assessmentNote: "",
                })
              }
            >
              {l(
                "Päivitä tämän mittauksen tekijä/mittari",
                "Update this measurement's technician/meter",
              )}
            </button>
          )}
      </details>
    </div>
  );
}

export function ElectricalMeasurements({ path }: { path: string }) {
  const { data, setData, persistenceStatus, go } = useApp();
  const locale = data.locale;
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const [fallback] = useState(newSession);
  const [settingsOpen, setSettingsOpen] = useState(
    !data.electricalSession?.technician,
  );
  const [busyPhotos, setBusyPhotos] = useState(0);
  const photoBusy = busyPhotos > 0;
  useEffect(() => {
    if (!photoBusy) return;
    const guard = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [photoBusy]);
  const session = data.electricalSession ?? fallback;
  const measurements = data.electricalMeasurements ?? [];
  const active = measurements.find(
    (measurement) => measurement.id === session.activeMeasurementId,
  );
  const activeKey = active ? pointKey(active) : `point-${session.id}`;
  const activeRows = active
    ? measurements.filter(
        (item) => pointKey(item) === activeKey && item.sessionId === session.id,
      )
    : [];
  const route = path.split("?")[0].split("/");
  const routeId = route[3];
  const unknownRoute =
    routeId &&
    (route[2] === "site"
      ? !data.sites?.some((site) => site.id === routeId)
      : route[2] === "equipment"
        ? !data.equipment.some((equipment) => equipment.id === routeId)
        : true);

  useEffect(() => {
    setData((previous) => {
      const current = previous.electricalSession ?? fallback;
      const [, , kind, id] = path.split("?")[0].split("/");
      if (id && kind === "site" && current.siteId !== id) {
        const site = previous.sites?.find((item) => item.id === id);
        if (!site) return previous;
        return {
          ...previous,
          electricalSession: {
            ...current,
            id: crypto.randomUUID(),
            siteId: site.id,
            siteName: site.name,
            equipmentId: undefined,
            equipmentName: "",
            activeMeasurementId: undefined,
          },
        };
      }
      if (id && kind === "equipment" && current.equipmentId !== id) {
        const equipment = previous.equipment.find((item) => item.id === id);
        if (!equipment) return previous;
        return {
          ...previous,
          electricalSession: {
            ...current,
            id: crypto.randomUUID(),
            equipmentId: equipment.id,
            equipmentName: equipment.name,
            siteId: equipment.siteId,
            siteName:
              previous.sites?.find((site) => site.id === equipment.siteId)
                ?.name ?? equipment.location,
            activeMeasurementId: undefined,
          },
        };
      }
      return previous.electricalSession
        ? previous
        : { ...previous, electricalSession: current };
    });
  }, [path, setData, fallback]);

  const updateSession = (
    patch: Partial<ElectricalSession>,
    newContext = false,
  ) => {
    setData((previous) => {
      const current = previous.electricalSession ?? fallback;
      const next = {
        ...current,
        ...patch,
        ...(newContext
          ? { id: crypto.randomUUID(), activeMeasurementId: undefined }
          : {}),
      };
      return { ...previous, electricalSession: next };
    });
  };
  const updateMeasurement: PatchRow = (type, patch, recordId) => {
    setSettingsOpen(false);
    const existing = recordId
      ? measurements.find((item) => item.id === recordId)
      : activeRows.find((item) => item.type === type);
    const targetId = existing?.id ?? recordId ?? crypto.randomUUID();
    const groupId = existing ? pointKey(existing) : (activeKey ?? targetId);
    const template = {
      ...createMeasurement(session, type),
      id: targetId,
      pointId: groupId,
      point: active?.point ?? "",
    };
    setData((previous) => {
      const list = previous.electricalMeasurements ?? [];
      const current = list.find((item) => item.id === targetId);
      const measurement = { ...(current ?? template), ...patch };
      const currentSession = previous.electricalSession ?? session;
      return {
        ...previous,
        electricalMeasurements: current
          ? list.map((item) => (item.id === targetId ? measurement : item))
          : [...list, measurement],
        electricalSession:
          !currentSession.activeMeasurementId &&
          currentSession.id === session.id
            ? { ...currentSession, activeMeasurementId: targetId }
            : currentSession,
      };
    });
    return targetId;
  };
  const updatePointName = (point: string) => {
    if (!active) {
      updateMeasurement("continuity", { point });
      return;
    }
    setData((previous) => ({
      ...previous,
      electricalMeasurements: (previous.electricalMeasurements ?? []).map(
        (item) =>
          pointKey(item) === activeKey && item.sessionId === session.id
            ? { ...item, point }
            : item,
      ),
    }));
  };
  const addPoint = () => {
    const groupId = crypto.randomUUID();
    const copied = (
      activeRows.length
        ? activeRows.map((source) => copyMeasurementPoint(source, session))
        : [createMeasurement(session)]
    ).map((measurement) => ({ ...measurement, pointId: groupId }));
    setData((previous) => ({
      ...previous,
      electricalMeasurements: [
        ...(previous.electricalMeasurements ?? []),
        ...copied,
      ],
      electricalSession: {
        ...(previous.electricalSession ?? session),
        activeMeasurementId: copied[0].id,
      },
    }));
  };
  const readings = measurements.filter(
    (measurement) => measurement.sessionId === session.id,
  );
  const pointGroups = Array.from(
    readings
      .reduce((groups, measurement) => {
        const key = pointKey(measurement);
        groups.set(key, [...(groups.get(key) ?? []), measurement]);
        return groups;
      }, new Map<string, ElectricalMeasurement[]>())
      .entries(),
  );
  const completed = readings.filter((measurement) =>
    hasMeasurementResult(measurement.result),
  );
  const hasContext = Boolean(
    session.siteName.trim() || session.equipmentName.trim(),
  );
  const ready = hasContext && Boolean(session.technician.trim());
  const availableEquipment = data.equipment.filter(
    (equipment) => !session.siteId || equipment.siteId === session.siteId,
  );

  if (unknownRoute)
    return (
      <div className="field-tools">
        <Back to="/equipment" />
        <h1>
          {l(
            "Kohdetta tai laitetta ei löytynyt",
            "Site or equipment not found",
          )}
        </h1>
        <p>
          {l(
            "Valitse kohde tai laite Laitekannasta.",
            "Choose a site or equipment from the equipment register.",
          )}
        </p>
      </div>
    );
  return (
    <div className="field-tools electrical-measurements">
      <Back to="/tools" />
      <h1>{l("Sähkömittaukset", "Electrical measurements")}</h1>
      <p className="secondary">
        {l(
          "Kirjaa tulos ja jatka seuraavaan pisteeseen. Raportin voi tehdä myöhemmin.",
          "Record a result and continue to the next point. Create a report later.",
        )}
      </p>
      <p
        className={`caption electrical-save-state ${persistenceStatus === "error" ? "danger-text" : ""}`}
        role="status"
        aria-live="polite"
      >
        {persistenceStatus === "saving"
          ? l("Tallennetaan tälle laitteelle…", "Saving on this device…")
          : persistenceStatus === "error"
            ? l(
                "Tallennus epäonnistui. Säilytä tämä näkymä auki ja vapauta laitteen tallennustilaa.",
                "Saving failed. Keep this view open and free up device storage.",
              )
            : l(
                "Tallennettu tälle laitteelle · ei palvelinsynkronointia",
                "Saved on this device · no server sync",
              )}
      </p>
      {persistenceStatus === "error" && (
        <button
          className="secondary-button"
          onClick={() => setData((previous) => ({ ...previous }))}
        >
          {l("Yritä tallentaa uudelleen", "Retry saving")}
        </button>
      )}
      <section
        className="electrical-context"
        aria-label={l("Mittauskerran kohde", "Measurement session context")}
      >
        <div className="electrical-context-heading">
          <h2>{l("Mittauskohde", "Measurement site")}</h2>
          <button className="secondary-button" onClick={() => go("/scan")}>
            <QrCode size={18} />
            {l("Skannaa QR", "Scan QR")}
          </button>
        </div>
        <label>
          {l("Kohde", "Site")}
          <select
            value={session.siteId ?? ""}
            onChange={(event) => {
              const site = data.sites?.find(
                (item) => item.id === event.target.value,
              );
              updateSession(
                {
                  siteId: site?.id,
                  siteName: site?.name ?? "",
                  equipmentId: undefined,
                  equipmentName: "",
                },
                true,
              );
            }}
          >
            <option value="">
              {l("Kirjoita kohteen nimi", "Enter a site name")}
            </option>
            {data.sites?.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>
        {!session.siteId && (
          <label>
            {l("Kohteen nimi", "Site name")}
            <input
              value={session.siteName}
              maxLength={200}
              onChange={(event) =>
                updateSession({ siteName: event.target.value }, Boolean(active))
              }
            />
          </label>
        )}
        {availableEquipment.length > 0 && (
          <label>
            {l("Laite (vapaaehtoinen)", "Equipment (optional)")}
            <select
              value={session.equipmentId ?? ""}
              onChange={(event) => {
                const equipment = data.equipment.find(
                  (item) => item.id === event.target.value,
                );
                updateSession(
                  {
                    equipmentId: equipment?.id,
                    equipmentName: equipment?.name ?? "",
                    ...(equipment?.siteId
                      ? {
                          siteId: equipment.siteId,
                          siteName:
                            data.sites?.find(
                              (site) => site.id === equipment.siteId,
                            )?.name ?? session.siteName,
                        }
                      : {}),
                  },
                  true,
                );
              }}
            >
              <option value="">
                {l("Ei laitekohtaista kohdistusta", "No equipment link")}
              </option>
              {availableEquipment.map((equipment) => (
                <option key={equipment.id} value={equipment.id}>
                  {equipment.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <details
          open={settingsOpen}
          onToggle={(event) => setSettingsOpen(event.currentTarget.open)}
        >
          <summary>
            {l("Mittari ja tekijä", "Meter and technician")}
            {session.meter.model
              ? ` · ${session.meter.brand} ${session.meter.model}`
              : ""}
          </summary>
          <div className="field-tool-grid">
            <label>
              {l("Tekijä", "Technician")}
              <input
                autoComplete="name"
                value={session.technician}
                maxLength={200}
                onChange={(event) =>
                  updateSession({ technician: event.target.value })
                }
              />
            </label>
            <label>
              {l("Mittarin merkki", "Meter brand")}
              <input
                list="electrical-meter-brands"
                value={session.meter.brand}
                maxLength={100}
                onChange={(event) =>
                  updateSession({
                    meter: {
                      ...session.meter,
                      brand: event.target.value,
                      model: "",
                    },
                  })
                }
              />
              <datalist id="electrical-meter-brands">
                <option value="Fluke" />
              </datalist>
            </label>
            <label>
              {l("Mittarimalli", "Meter model")}
              <input
                list={
                  session.meter.brand.trim().toLowerCase() === "fluke"
                    ? "electrical-meter-models"
                    : undefined
                }
                value={session.meter.model}
                maxLength={100}
                onChange={(event) =>
                  updateSession({
                    meter: { ...session.meter, model: event.target.value },
                  })
                }
              />
              <datalist id="electrical-meter-models">
                {supportedFlukeModels.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
            </label>
            <label>
              {l("Mittarin sarjanumero", "Meter serial number")}
              <input
                value={session.meter.serialNumber}
                maxLength={100}
                onChange={(event) =>
                  updateSession({
                    meter: {
                      ...session.meter,
                      serialNumber: event.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
          <p className="caption secondary">
            {l(
              "Tekijä ja mittari muistetaan seuraavia kirjauksia varten. Aiemman mittauksen tiedot säilyvät sen mittaushetken mukaisina.",
              "Technician and meter are remembered for new records. Earlier measurements retain their recorded details.",
            )}
          </p>
        </details>
      </section>
      {!ready && (
        <p className="caption">
          {l(
            "Täytä kohde ja tekijä ennen ensimmäistä mittausta.",
            "Enter a site and technician before the first measurement.",
          )}
        </p>
      )}
      <section
        className="electrical-editor"
        aria-label={l("Mittauspisteen kirjaukset", "Measurement point sheet")}
      >
        <div className="electrical-context-heading">
          <h2>{l("Mittauspiste", "Measurement point")}</h2>
          <span className="caption">
            {
              activeRows.filter((item) => hasMeasurementResult(item.result))
                .length
            }{" "}
            {l("kirjattua", "recorded")}
          </span>
        </div>
        <fieldset disabled={!ready}>
          <label>
            {l("Mittauspiste tai ryhmä", "Measurement point or circuit")}
            <input
              value={active?.point ?? ""}
              maxLength={200}
              onChange={(event) => updatePointName(event.target.value)}
            />
          </label>
          <p className="caption secondary">
            {l(
              "Luettelo on muistituki; tarvittavat mittaukset määräytyvät työstä. Tyhjä rivi ei tarkoita puuttuvaa pakollista mittausta eikä nollaa.",
              "Use this list as a reminder; the work determines which measurements are needed. A blank row means neither a missing required measurement nor zero.",
            )}
          </p>
          <div className="electrical-point-sheet">
            {definitions.flatMap((definition) => {
              const rows = activeRows.filter(
                (item) => item.type === definition.type,
              );
              return (rows.length ? rows : [undefined]).map(
                (measurement, index) => (
                  <MeasurementRow
                    key={`${activeKey}-${definition.type}-${index}`}
                    type={definition.type}
                    measurement={measurement}
                    session={session}
                    locale={locale}
                    onPatch={updateMeasurement}
                    onBusy={(busy) =>
                      setBusyPhotos((count) =>
                        Math.max(0, count + (busy ? 1 : -1)),
                      )
                    }
                  />
                ),
              );
            })}
          </div>
          <div className="field-actions">
            <button
              className="primary"
              onClick={addPoint}
              disabled={!active || photoBusy}
            >
              <CopyPlus size={18} />
              {l(
                "Seuraava piste edellisen pohjalta",
                "Next point from previous",
              )}
            </button>
          </div>
        </fieldset>
        <p className="caption secondary">
          {l(
            "Kirjattu tulos odottaa arviointia. Raporttiin valitaan vain tarvittavat kirjaukset.",
            "A recorded result awaits assessment. Select only the relevant records for the report.",
          )}
        </p>
      </section>
      <section
        className="electrical-readings"
        aria-label={l("Mittauskerran pisteet", "Session points")}
      >
        <div className="electrical-context-heading">
          <h2>
            {l("Mittauskerran pisteet", "Session points")} ·{" "}
            {pointGroups.length}
          </h2>
          <button
            className="secondary-button"
            disabled={!completed.length}
            onClick={() =>
              go(
                `/electrical-reports/new?session=${encodeURIComponent(session.id)}`,
              )
            }
          >
            <FileText size={18} />
            {l("Luo raportti", "Create report")}
          </button>
        </div>
        {!pointGroups.length ? (
          <p className="secondary">
            {l("Ei vielä kirjauksia.", "No records yet.")}
          </p>
        ) : (
          <ul>
            {pointGroups.map(([key, rows]) => {
              const filled = rows.filter((measurement) =>
                hasMeasurementResult(measurement.result),
              );
              const blank =
                definitions.length -
                new Set(filled.map((measurement) => measurement.type)).size;
              return (
                <li key={key}>
                  <button
                    className={`electrical-point-summary ${key === activeKey ? "active" : ""}`}
                    aria-pressed={key === activeKey}
                    onClick={() =>
                      updateSession({ activeMeasurementId: rows[0].id })
                    }
                  >
                    <strong>
                      {rows[0].point || l("Nimetön piste", "Unnamed point")}
                    </strong>
                    <span className="caption">
                      {filled.length} {l("kirjattua", "recorded")} · {blank}{" "}
                      {l("tyhjää", "blank")}
                    </span>
                    <span className="electrical-point-values">
                      {filled.length ? (
                        filled.map((measurement) => (
                          <span key={measurement.id}>
                            <span>
                              {shortLabels[measurement.type][locale]}
                              <small className="electrical-row-status">
                                {measurementStatus(measurement, locale)}
                              </small>
                            </span>
                            <strong className="mono">
                              {measurementResultText(measurement)}
                            </strong>
                          </span>
                        ))
                      ) : (
                        <span>
                          {l("Ei kirjattuja tuloksia", "No recorded results")}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
