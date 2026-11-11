import { useEffect, useState } from "react";
import { CopyPlus, FileText, Plus, QrCode } from "lucide-react";
import { Back } from "../components/Common";
import { ElectricalMeterHelp } from "../components/ElectricalMeterHelp";
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

export function ElectricalMeasurements({ path }: { path: string }) {
  const { data, setData, persistenceStatus, go } = useApp();
  const locale = data.locale;
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const [fallback] = useState(newSession);
  const [settingsOpen, setSettingsOpen] = useState(
    !data.electricalSession?.technician,
  );
  const [textResult, setTextResult] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
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
  const draft = active ?? {
    point: "",
    type: "continuity" as MeasurementType,
    result: "",
    unit: "Ω",
    note: "",
    assessment: "unassessed",
    assessmentNote: "",
    photo: undefined,
  };
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
  const updateMeasurement = (patch: Partial<ElectricalMeasurement>) => {
    setData((previous) => {
      const currentSession = previous.electricalSession ?? fallback;
      const currentList = previous.electricalMeasurements ?? [];
      const existing = currentList.find(
        (item) => item.id === currentSession.activeMeasurementId,
      );
      const measurement = {
        ...(existing ?? createMeasurement(currentSession)),
        ...patch,
      };
      return {
        ...previous,
        electricalMeasurements: existing
          ? currentList.map((item) =>
              item.id === existing.id ? measurement : item,
            )
          : [...currentList, measurement],
        electricalSession: {
          ...currentSession,
          activeMeasurementId: measurement.id,
        },
      };
    });
  };
  const addPoint = (copy: boolean) => {
    setData((previous) => {
      const currentSession = previous.electricalSession ?? fallback;
      const list = previous.electricalMeasurements ?? [];
      const existing = list.find(
        (item) => item.id === currentSession.activeMeasurementId,
      );
      const measurement =
        copy && existing
          ? copyMeasurementPoint(existing, currentSession)
          : createMeasurement(currentSession);
      return {
        ...previous,
        electricalMeasurements: [...list, measurement],
        electricalSession: {
          ...currentSession,
          activeMeasurementId: measurement.id,
        },
      };
    });
    setTextResult(false);
    setPhotoError("");
  };
  const readings = measurements.filter(
    (measurement) => measurement.sessionId === session.id,
  );
  const completed = readings.filter((measurement) =>
    hasMeasurementResult(measurement.result),
  );
  const hasContext = Boolean(
    session.siteName.trim() || session.equipmentName.trim(),
  );
  const ready = hasContext && Boolean(session.technician.trim());
  const numericType = draft.type !== "phase-sequence" && draft.type !== "other";
  const resultParts = draft.result.match(/^([<>]=?|[≤≥])\s*(.*)$/);
  const qualifier = resultParts?.[1] ?? "";
  const resultValue = resultParts?.[2] ?? draft.result;
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
        aria-label={l("Mittauksen kirjaus", "Measurement entry")}
      >
        <h2>{l("Mittaus", "Measurement")}</h2>
        <fieldset disabled={!ready}>
          <label>
            {l("Mittauspiste tai ryhmä", "Measurement point or circuit")}
            <input
              value={draft.point}
              maxLength={200}
              onChange={(event) =>
                updateMeasurement({ point: event.target.value })
              }
            />
          </label>
          <label>
            {l("Mittaustyyppi", "Measurement type")}
            <select
              value={draft.type}
              onChange={(event) => {
                const definition = definitions.find(
                  (item) => item.type === event.target.value,
                )!;
                updateMeasurement({
                  type: definition.type,
                  unit: definition.unit,
                  result: "",
                  assessment: "unassessed",
                  assessmentNote: "",
                });
                setTextResult(false);
              }}
            >
              {definitions.map((definition) => (
                <option key={definition.type} value={definition.type}>
                  {definition[locale]}
                </option>
              ))}
            </select>
          </label>
          <ElectricalMeterHelp
            meter={active?.meter ?? session.meter}
            type={draft.type}
            locale={locale}
          />
          <div className="electrical-result-row">
            {numericType && !textResult && (
              <label>
                {l("Merkki", "Qualifier")}
                <select
                  aria-label={l("Vertailumerkki", "Qualifier")}
                  value={qualifier}
                  onChange={(event) =>
                    updateMeasurement({
                      result: `${event.target.value}${event.target.value && resultValue ? " " : ""}${resultValue}`,
                      assessment: "unassessed",
                      assessmentNote: "",
                    })
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
            <label className="electrical-result-value">
              {l("Tulos", "Result")}
              <input
                className="mono"
                type="text"
                inputMode={numericType && !textResult ? "decimal" : "text"}
                value={numericType && !textResult ? resultValue : draft.result}
                maxLength={200}
                onChange={(event) =>
                  updateMeasurement({
                    result:
                      numericType && !textResult
                        ? `${qualifier}${qualifier && event.target.value ? " " : ""}${event.target.value}`
                        : event.target.value,
                    assessment: "unassessed",
                    assessmentNote: "",
                  })
                }
              />
            </label>
            <label>
              {l("Yksikkö", "Unit")}
              <input
                value={draft.unit}
                maxLength={30}
                onChange={(event) =>
                  updateMeasurement({
                    unit: event.target.value,
                    assessment: "unassessed",
                    assessmentNote: "",
                  })
                }
              />
            </label>
          </div>
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
              value={draft.note}
              maxLength={4000}
              onChange={(event) =>
                updateMeasurement({ note: event.target.value })
              }
            />
          </label>
          <details>
            <summary>
              {l("Kuva ja mittaustiedot", "Photo and measurement details")}
            </summary>
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
                  const target = active ?? createMeasurement(session);
                  if (!active)
                    setData((previous) => ({
                      ...previous,
                      electricalMeasurements: [
                        ...(previous.electricalMeasurements ?? []),
                        target,
                      ],
                      electricalSession: {
                        ...(previous.electricalSession ?? session),
                        activeMeasurementId: target.id,
                      },
                    }));
                  try {
                    const photo = await prepareMeasurementPhoto(file);
                    // Keep the upload attached to its original record even if another point is opened meanwhile.
                    setData((previous) => {
                      const list = previous.electricalMeasurements ?? [];
                      const existing = list.find(
                        (item) => item.id === target.id,
                      );
                      return {
                        ...previous,
                        electricalMeasurements: existing
                          ? list.map((item) =>
                              item.id === target.id ? { ...item, photo } : item,
                            )
                          : [...list, { ...target, photo }],
                      };
                    });
                  } catch {
                    setPhotoError(
                      l(
                        "Kuvaa ei voitu lisätä. Valitse JPG-, PNG- tai WebP-kuva (enintään 12 Mt); aiempi kuva säilyy.",
                        "Could not add photo. Choose JPG, PNG or WebP (up to 12 MB); the previous photo is retained.",
                      ),
                    );
                  } finally {
                    setPhotoBusy(false);
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
            {draft.photo && (
              <div>
                <img
                  className="electrical-photo"
                  src={draft.photo}
                  alt={l("Mittauksen liitekuva", "Measurement attachment")}
                />
                <button
                  className="text-button"
                  onClick={() => updateMeasurement({ photo: undefined })}
                >
                  {l("Poista kuva", "Remove photo")}
                </button>
              </div>
            )}
            {active && (
              <p className="caption">
                {new Date(active.measuredAt).toLocaleString(
                  locale === "fi" ? "fi-FI" : "en-GB",
                )}{" "}
                · {active.technician} ·{" "}
                {[
                  active.meter.brand,
                  active.meter.model,
                  active.meter.serialNumber,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </p>
            )}
            {active &&
              (active.technician !== session.technician ||
                JSON.stringify(active.meter) !==
                  JSON.stringify(session.meter)) && (
                <button
                  className="secondary-button"
                  onClick={() =>
                    updateMeasurement({
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
          <div className="field-actions">
            <button
              className="primary"
              onClick={() => addPoint(true)}
              disabled={!active || photoBusy}
            >
              <CopyPlus size={18} />
              {l(
                "Seuraava piste edellisen pohjalta",
                "Next point from previous",
              )}
            </button>
            <button
              className="secondary-button"
              onClick={() => addPoint(false)}
              disabled={photoBusy}
            >
              <Plus size={18} />
              {l("Uusi mittaus", "New measurement")}
            </button>
          </div>
        </fieldset>
        <p className="caption secondary">
          {l(
            "Kirjattu tulos odottaa arviointia. Tyhjä tulos säilyy luonnoksena eikä tarkoita nollaa.",
            "A recorded result awaits assessment. An empty result remains a draft and does not mean zero.",
          )}
        </p>
      </section>
      <section
        className="electrical-readings"
        aria-label={l("Mittauskerran kirjaukset", "Session records")}
      >
        <h2>
          {l("Mittauskerran kirjaukset", "Session records")} ·{" "}
          {completed.length}
        </h2>
        {readings.length === 0 ? (
          <p className="secondary">
            {l("Ei vielä mittauksia.", "No measurements yet.")}
          </p>
        ) : (
          <ul>
            {readings.map((measurement) => (
              <li key={measurement.id}>
                <button
                  className={`electrical-reading ${measurement.id === active?.id ? "active" : ""}`}
                  aria-pressed={measurement.id === active?.id}
                  onClick={() => {
                    updateSession({ activeMeasurementId: measurement.id });
                    setPhotoError("");
                  }}
                >
                  <span>
                    <strong>
                      {measurement.point || l("Nimetön piste", "Unnamed point")}
                    </strong>
                    <small>
                      {
                        definitions.find(
                          (item) => item.type === measurement.type,
                        )?.[locale]
                      }
                    </small>
                  </span>
                  <span>
                    <strong className="mono">
                      {hasMeasurementResult(measurement.result)
                        ? measurementResultText(measurement)
                        : l("Luonnos", "Draft")}
                    </strong>
                    <small>
                      {measurement.assessment === "unassessed"
                        ? l("Arvioimatta", "Unassessed")
                        : l("Arvioitu", "Assessed")}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
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
      </section>
    </div>
  );
}
