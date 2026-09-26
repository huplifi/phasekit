import { printCheckResult } from "../report-export";
import { InfoHelp } from "../components/InfoHelp";
import { CheckSchedule } from "../components/CheckSchedule";
import { isCalendarDate } from "../../../../packages/core/src/schedule";
import { useEffect, useRef, useState } from "react";
import { Bookmark, ChevronRight, Printer } from "lucide-react";
import type {
  CheckInput,
  CheckResult,
  Refrigerant,
} from "../../../../packages/core/src/contracts";
import { evaluateCheck } from "../../../../packages/rulesets/eu-fi/src";
import { reasonMessages } from "../../../../packages/rulesets/eu-fi/src/reasons";
import type { MessageKey } from "../../../../packages/i18n/src";
import { formatDecimal } from "../../../../packages/i18n/src";
import { familyText } from "../../../../packages/i18n/src/refinements";
import { useApp } from "../context";
import { byId, dataset } from "../data";
import { Back, SourceNote } from "../components/Common";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import { snapshotDesignation } from "../storage";
import type { Snapshot } from "../storage";
const equipmentTypes: CheckInput["equipment"][] = [
  "stationary_refrigeration",
  "stationary_ac",
  "stationary_heat_pump",
  "truck_trailer",
  "other_mobile",
  "orc",
  "switchgear",
  "fire_protection",
  "other",
];

function refrigerantFamilySummary(
  refrigerant: Refrigerant | undefined,
  locale: "fi" | "en",
  savedDataIsOutdated = false,
) {
  if (!refrigerant) return null;
  if (refrigerant.kind === "pure")
    return familyText(locale, refrigerant.family);

  const blendLabel = familyText(locale, "blend");
  if (savedDataIsOutdated) {
    return locale === "fi"
      ? `${blendLabel} · tallennetun dataversion komponenttiryhmät eivät ole käytettävissä`
      : `${blendLabel} · component families are unavailable for the saved data version`;
  }

  const families = [
    ...new Set(
      refrigerant.components
        .map((component) => byId.get(component.refrigerantId)?.family)
        .filter((family): family is string => Boolean(family)),
    ),
  ];
  const familyNames = families
    .filter((family) => family !== "blend")
    .map((family) => familyText(locale, family));
  if (familyNames.length === 0) {
    return locale === "fi"
      ? `${blendLabel} · komponenttien aineryhmä ei ole tiedossa`
      : `${blendLabel} · component families unavailable`;
  }
  return locale === "fi"
    ? `${blendLabel} · komponenttiryhmät ${familyNames.join(" + ")}`
    : `${blendLabel} · component families ${familyNames.join(" + ")}`;
}

function decisiveBasisLabel(annexes: string[], locale: "fi" | "en") {
  const allAnnexI =
    annexes.length > 0 && annexes.every((annex) => annex === "I");
  const allAnnexII =
    annexes.length > 0 && annexes.every((annex) => annex === "II-1");
  const allOds =
    annexes.length > 0 && annexes.every((annex) => annex === "ODS-I");

  if (allAnnexI) {
    return locale === "fi"
      ? "Liitteen I kaasujen GWP-painotettu CO₂e-yhteismäärä"
      : "Combined GWP-weighted CO₂e for Annex I gases";
  }
  if (allAnnexII) {
    return locale === "fi"
      ? "F-kaasuasetuksen liitteen II ryhmän 1 komponenttien massa"
      : "Mass of components in Section 1 of the F-gas Regulation Annex II";
  }
  if (allOds) {
    return locale === "fi"
      ? "Otsoniasetuksen liitteen I aineiden yhteenlaskettu massa"
      : "Combined mass of substances in the ODS Regulation Annex I";
  }
  return locale === "fi"
    ? "Laskennan kynnysmäärä"
    : "Calculated threshold quantity";
}

function DecisiveBasis({
  result,
  snapshot,
  designation,
  locale,
}: {
  result: CheckResult;
  snapshot?: Snapshot;
  designation: (id: string) => string;
  locale: "fi" | "en";
}) {
  const obligation = result.obligations.find(
    (item) => item.ruleId === result.decisiveRule,
  );
  if (!obligation) return null;

  const refrigerant =
    snapshot?.refrigerant.id === result.input.refrigerantId
      ? snapshot.refrigerant
      : byId.get(result.input.refrigerantId);
  const family = refrigerantFamilySummary(
    refrigerant,
    locale,
    Boolean(snapshot) && result.dataVersion !== dataset.version,
  );
  const componentIds = obligation.component.split("+").filter(Boolean);
  const annexes = result.components
    .filter((component) => componentIds.includes(component.refrigerantId))
    .map((component) => component.annex);
  const unit = obligation.unit === "tCO2e" ? "t CO₂e" : obligation.unit;
  const countedComponents = componentIds.map(designation).join(" + ");

  return (
    <div className="check-decisive-basis">
      {family && <p className="check-decisive-family">{family}</p>}
      <p className="check-decisive-quantity mono">
        {formatDecimal(obligation.quantity, locale)} {unit}
      </p>
      <p className="caption">
        {decisiveBasisLabel(annexes, locale)}
        {countedComponents && (
          <>
            <br />
            {locale === "fi"
              ? "Mukaan lasketut komponentit"
              : "Components counted"}
            : {countedComponents}
          </>
        )}
      </p>
    </div>
  );
}

export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Helsinki" });
export function CheckResultView({
  result,
  snapshot,
  lastInspectionDate,
}: {
  result: CheckResult;
  snapshot?: Snapshot;
  lastInspectionDate?: string;
}) {
  const { t, data, notify } = useApp();
  const designation = (id: string) =>
    snapshot
      ? snapshotDesignation(snapshot, id)
      : (byId.get(id)?.designation ?? id);
  return (
    <section className="result-section">
      <div
        className={`result-card ${result.state === "required" ? "warning" : result.state === "insufficient_data" ? "error" : "info"}`}
      >
        <p className="result-label">{t(result.state)}</p>
        {result.months !== null && (
          <p className="result-number">
            {t("months", { count: result.months })}
          </p>
        )}
        <p>
          <strong>
            {t(result.decisiveRule ? "decisive" : "resultReason")}
          </strong>
          <br />
          {result.reasonCodes.map((code) => (
            <span className="reason" key={code}>
              {reasonMessages[code]?.[data.locale] ?? code}
            </span>
          ))}
        </p>
        {!!result.missingData?.length && (
          <ul className="missing-data">
            {result.missingData.map((item) => (
              <li key={`${item.refrigerantId}-${item.field}`}>
                <span className="mono">{designation(item.refrigerantId)}</span>:{" "}
                {
                  {
                    identity: {
                      fi: "aineen perustiedot puuttuvat",
                      en: "identity record missing",
                    },
                    composition: {
                      fi: "varmennettu massakoostumus puuttuu",
                      en: "verified mass composition missing",
                    },
                    euAnnex: {
                      fi: "varmennettu EU-liiteluokka puuttuu",
                      en: "verified EU annex classification missing",
                    },
                    legalGwp: {
                      fi: "sovellettava EU-GWP laskentaperusteineen puuttuu",
                      en: "applicable EU GWP and basis missing",
                    },
                  }[item.field][data.locale]
                }
              </li>
            ))}
          </ul>
        )}
        <DecisiveBasis
          result={result}
          snapshot={snapshot}
          designation={designation}
          locale={data.locale}
        />
        {result.decisiveComponent &&
          !result.obligations.some(
            (item) => item.ruleId === result.decisiveRule,
          ) && (
            <p className="mono">
              {result.decisiveComponent.split("+").map(designation).join(" + ")}
            </p>
          )}
        {result.detectionRequired && (
          <p>
            <strong>{t("detectionRequired")}</strong>
          </p>
        )}
      </div>
      <p className="caption">{t("noMaintenanceClaim")}</p>
      {!snapshot && (
        <div className="button-row">
          <button
            type="button"
            className="secondary"
            onClick={() => {
              const opened = printCheckResult({
                result,
                locale: data.locale,
                designation: designation(result.input.refrigerantId),
                sources: dataset.sources.filter((s) =>
                  result.sourceIds.includes(s.id),
                ),
                lastInspectionDate,
                componentDesignations: Object.fromEntries(
                  result.components.map((c) => [
                    c.refrigerantId,
                    designation(c.refrigerantId),
                  ]),
                ),
              });
              if (!opened)
                notify(
                  data.locale === "fi"
                    ? "Salli ponnahdusikkuna tulostamista varten."
                    : "Allow the pop-up to print this report.",
                );
            }}
          >
            <Printer aria-hidden="true" size={18} />
            {data.locale === "fi"
              ? "Tulosta / tallenna PDF"
              : "Print / save PDF"}
          </button>
        </div>
      )}
      <CheckSchedule
        result={result}
        completed={snapshot?.lastInspectionDate ?? lastInspectionDate}
        designation={designation(result.input.refrigerantId)}
        sources={
          snapshot?.sources ??
          dataset.sources.filter((s) => result.sourceIds.includes(s.id))
        }
      />
      <details className="calculation-details">
        <summary>{t("calculation")}</summary>
        {result.components.length > 0 && (
          <>
            <h3>{t("composition")}</h3>
            {result.components.map((c) => (
              <div className="component-calculation" key={c.refrigerantId}>
                <strong className="mono">{designation(c.refrigerantId)}</strong>
                <p className="mono">
                  {formatDecimal(c.massPercent, data.locale)} % ×{" "}
                  {result.input.charge} {result.input.unit} →{" "}
                  {formatDecimal(c.massKg, data.locale)} kg
                </p>
                <p className="caption">
                  {t("annex")}: {c.annex}
                  {c.gwp && (
                    <>
                      {" "}
                      · GWP {c.gwp} · {c.gwpBasis}
                    </>
                  )}
                </p>
                {c.tonnesCO2e && (
                  <p className="mono">
                    {formatDecimal(c.tonnesCO2e, data.locale)} t CO₂e
                  </p>
                )}
              </div>
            ))}
          </>
        )}
        <h3>{t("obligations")}</h3>
        {result.obligations.map((o) => (
          <p key={o.ruleId}>
            <strong>
              {o.component.split("+").map(designation).join(" + ")}
            </strong>
            <br />
            <span className="mono">
              {formatDecimal(o.quantity, data.locale)} {o.unit} ·{" "}
              {o.months === null
                ? t("notApplicable")
                : t("months", { count: o.months })}
            </span>
            <br />
            <small>{o.ruleId}</small>
          </p>
        ))}
        <dl className="facts">
          <div className="fact-row">
            <dt>{t("ruleVersion")}</dt>
            <dd className="mono">{result.rulesetVersion}</dd>
          </div>
          <div className="fact-row">
            <dt>{t("dataVersion")}</dt>
            <dd className="mono">{result.dataVersion}</dd>
          </div>
        </dl>
        <p className="caption">
          {t("requiredInputs")}:{" "}
          {result.requiredInputs
            .map((k) =>
              t(
                (
                  {
                    refrigerantId: "selectRefrigerant",
                    charge: "charge",
                    unit: "unit",
                    equipment: "equipment",
                    asOf: "asOf",
                    detection: "detection",
                    hermetic: "hermetic",
                    hermeticLabel: "hermeticLabel",
                    residential: "residential",
                  } as Record<string, MessageKey>
                )[k] ?? "notSet",
              ),
            )
            .join(" · ")}
        </p>
        {snapshot ? (
          snapshot.sources.map((s) => (
            <p className="caption" key={s.id}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.title}
              </a>{" "}
              · {s.checkedAt} · {s.version}
            </p>
          ))
        ) : (
          <SourceNote ids={result.sourceIds} />
        )}
      </details>
    </section>
  );
}
export function Check({ r: initial }: { r?: Refrigerant }) {
  const { t, data, persistSnapshot, setDraftDirty, notify } = useApp();
  const [input, setInput] = useState<CheckInput>({
    refrigerantId: initial?.id ?? "",
    charge: "",
    unit: "kg",
    equipment: "stationary_refrigeration",
    detection: false,
    hermetic: false,
    hermeticLabel: false,
    residential: false,
    asOf: today(),
  });
  const r = byId.get(input.refrigerantId);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastInspectionDate, setLastInspectionDate] = useState("");
  const [scheduleError, setScheduleError] = useState("");
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const resultRef = useRef<HTMLDivElement>(null);
  const draftRevision = useRef(0);
  useEffect(() => () => setDraftDirty(false), [setDraftDirty]);
  function change<K extends keyof CheckInput>(key: K, value: CheckInput[K]) {
    draftRevision.current += 1;
    setInput((v) => ({
      ...v,
      [key]: value,
      ...(key === "hermetic" && !value
        ? { hermeticLabel: false, residential: false }
        : {}),
    }));
    setResult(null);
    setSaved(false);
    setDraftDirty(true);
  }
  async function save() {
    if (!result || !r) return;
    setSaving(true);
    const savedRevision = draftRevision.current;
    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      refrigerant: structuredClone(r),
      result: structuredClone(result),
      ...(lastInspectionDate ? { lastInspectionDate } : {}),
      sources: structuredClone(
        dataset.sources.filter((s) => result.sourceIds.includes(s.id)),
      ),
      componentDesignations: Object.fromEntries(
        [...result.components, ...(result.missingData ?? [])].map(
          (component) => [
            component.refrigerantId,
            byId.get(component.refrigerantId)?.designation ??
              component.refrigerantId,
          ],
        ),
      ),
    };
    try {
      await persistSnapshot(snapshot);
      if (draftRevision.current === savedRevision) {
        setSaved(true);
        setDraftDirty(false);
      }
      notify(t("calculationSaved"));
    } catch {
      notify(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <Back to="/tools" />
      <h1 className="long-heading">{t("leakCheck")}</h1>
      <p className="secondary">{t("checkIntro")}</p>
      <p className="notice caption">{t("poc")}</p>
      <RefrigerantPicker
        value={input.refrigerantId}
        onChange={(id) => change("refrigerantId", id)}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!r) return;
          if (
            lastInspectionDate &&
            (!isCalendarDate(lastInspectionDate) ||
              lastInspectionDate > input.asOf)
          ) {
            setScheduleError(
              l(
                "Tarkastuspäivä ei voi olla arviointipäivän jälkeen.",
                "The inspection date cannot follow the assessment date.",
              ),
            );
            setResult(null);
            return;
          }
          setScheduleError("");
          draftRevision.current += 1;
          setResult(evaluateCheck(input, dataset));
          setSaved(false);
          setDraftDirty(true);
          requestAnimationFrame(() => resultRef.current?.focus());
        }}
      >
        <div className="charge-grid">
          <label>
            {t("charge")}
            <input
              className="number-input mono"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              aria-invalid={
                result?.reasonCodes.some((code) =>
                  [
                    "INVALID_CHARGE",
                    "CHARGE_MUST_BE_POSITIVE",
                    "CHARGE_PRECISION_EXCEEDED",
                  ].includes(code),
                ) || undefined
              }
              aria-describedby="charge-error"
              value={input.charge}
              onChange={(e) => change("charge", e.target.value)}
              required
            />
          </label>
          <label>
            {t("unit")}
            <select
              value={input.unit}
              onChange={(e) => change("unit", e.target.value as "kg" | "g")}
            >
              <option>kg</option>
              <option>g</option>
            </select>
          </label>
        </div>
        <div className="field-group">
          <div className="help-heading">
            <label htmlFor="check-equipment">{t("equipment")}</label>
            <InfoHelp label={t("equipment")}>
              {data.locale === "fi"
                ? "Tarkastusvelvoite riippuu myös laitetyypistä. Valitse laite, jonka kylmäainetäytöstä arvioit."
                : "Inspection requirements also depend on equipment type. Select the equipment whose refrigerant charge you are assessing."}
            </InfoHelp>
          </div>
          <select
            id="check-equipment"
            value={input.equipment}
            onChange={(e) =>
              change("equipment", e.target.value as CheckInput["equipment"])
            }
          >
            {equipmentTypes.map((key) => (
              <option value={key} key={key}>
                {t(key)}
              </option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <div className="help-heading">
            <label htmlFor="check-date">{t("asOf")}</label>
            <InfoHelp label={t("asOf")}>
              {data.locale === "fi"
                ? "Laskenta käyttää valittuna päivänä voimassa olevia sääntöjä. Oletuksena on tämä päivä. Voit tarkastella myös tulevaa tai aiempaa ajankohtaa aineiston kattamissa rajoissa."
                : "Uses the rules in force on the selected date. Defaults to today. You can assess future or past dates within the coverage of this dataset."}
            </InfoHelp>
          </div>
          <input
            id="check-date"
            type="date"
            value={input.asOf}
            onChange={(e) => change("asOf", e.target.value)}
            required
          />
        </div>
        <p id="charge-error" className="caption danger-text">
          {result?.reasonCodes
            .filter((code) =>
              [
                "INVALID_CHARGE",
                "CHARGE_MUST_BE_POSITIVE",
                "CHARGE_PRECISION_EXCEEDED",
              ].includes(code),
            )
            .map((code) => reasonMessages[code]?.[data.locale])
            .join(" ")}
        </p>
        <div className="check-options">
          <label className="switch-label">
            <input
              type="checkbox"
              role="switch"
              checked={input.detection}
              onChange={(e) => change("detection", e.target.checked)}
            />
            {t("detection")}
          </label>
          <label className="switch-label">
            <input
              type="checkbox"
              role="switch"
              checked={input.hermetic}
              onChange={(e) => change("hermetic", e.target.checked)}
            />
            {t("hermetic")}
          </label>
          {input.hermetic && (
            <div className="conditional-options">
              <label className="switch-label">
                <input
                  type="checkbox"
                  role="switch"
                  checked={input.hermeticLabel}
                  onChange={(e) => change("hermeticLabel", e.target.checked)}
                />
                {t("hermeticLabel")}
              </label>
              <label className="switch-label">
                <input
                  type="checkbox"
                  role="switch"
                  checked={input.residential}
                  onChange={(e) => change("residential", e.target.checked)}
                />
                {t("residential")}
              </label>
            </div>
          )}
        </div>
        <div className="field-group">
          <div className="help-heading">
            <label htmlFor="check-last-inspection">
              {l(
                "Viimeksi tehty tarkastus (valinnainen)",
                "Last completed inspection (optional)",
              )}
            </label>
            <InfoHelp label={l("Tarkastuspäivä", "Inspection date")}>
              {l(
                "Toteutuneen määräaikaistarkastuksen päivämäärä. Seuraava määräpäivä lasketaan tästä päivästä, ei arviointipäivästä. Vuodon korjauksen jälkitarkastus on erillinen asia.",
                "Date of a completed periodic check. The next due date is calculated from this date, not the assessment date. A post-repair check is a separate requirement.",
              )}
            </InfoHelp>
          </div>
          <input
            id="check-last-inspection"
            type="date"
            max={input.asOf}
            value={lastInspectionDate}
            onChange={(e) => {
              setLastInspectionDate(e.target.value);
              setScheduleError("");
              setResult(null);
              setSaved(false);
              setDraftDirty(true);
              draftRevision.current += 1;
            }}
          />
        </div>
        {scheduleError && (
          <p className="notice error" role="alert">
            {scheduleError}
          </p>
        )}
        <button className="primary" type="submit" disabled={!r}>
          {t("calculate")}
          <ChevronRight size={20} />
        </button>
      </form>
      <div
        ref={resultRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        tabIndex={-1}
      >
        {result && (
          <CheckResultView
            result={result}
            lastInspectionDate={lastInspectionDate}
          />
        )}
      </div>
      {result && (
        <button
          className="secondary-button"
          onClick={() => void save()}
          disabled={saved || saving}
        >
          <Bookmark size={20} />
          {t(
            saving
              ? "savingCalculation"
              : saved
                ? "calculationSaved"
                : "saveCalculation",
          )}
        </button>
      )}
    </>
  );
}
