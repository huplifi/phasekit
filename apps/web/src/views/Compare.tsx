import { Printer, X } from "lucide-react";
import { useRef, useState } from "react";
import type { Fact } from "../../../../packages/core/src/contracts";
import { printComparison } from "../comparison-export";
import { useApp } from "../context";
import { byId, factKeys, getFact } from "../data";
import { Back, FactValue, GwpSummary, SourceNote } from "../components/Common";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import {
  familyText,
  oilTypeText,
  refinementText,
} from "../../../../packages/i18n/src/refinements";
function OilValue({ fact }: { fact?: Fact }) {
  const { data } = useApp();
  if (fact?.state !== "verified" || typeof fact.value !== "string")
    return <FactValue fact={fact} />;
  const codes = [
    ...new Set(
      fact.value
        .split(";")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  return (
    <span className="oil-code-list">
      {codes.map((code) => (
        <span className="oil-code" key={code}>
          <span className="mono">{code}</span>
          <span>{oilTypeText(data.locale, code)}</span>
        </span>
      ))}
    </span>
  );
}
function FactContext({ fact }: { fact?: Fact }) {
  const { data } = useApp();
  if (!fact) return null;
  const conditions = fact.conditions;
  const parts = [
    fact.basis,
    conditions?.temperatureC !== undefined
      ? `${conditions.temperatureC} °C`
      : "",
    conditions?.pressureKPaAbsolute !== undefined
      ? `${conditions.pressureKPaAbsolute} kPa(a)`
      : "",
    conditions?.phase
      ? `${data.locale === "fi" ? "Faasi" : "Phase"}: ${conditions.phase}`
      : "",
    conditions?.method,
  ].filter(Boolean);
  return parts.length ? (
    <p className="caption secondary">{parts.join(" · ")}</p>
  ) : null;
}
export function Compare() {
  const { t, data, compareIds, toggleCompare } = useApp();
  const tableRef = useRef<HTMLTableElement>(null);
  const [printError, setPrintError] = useState(false);
  const selected = compareIds
    .map((id) => byId.get(id))
    .filter((r) => r !== undefined);
  return (
    <>
      <Back to="/tools" />
      <h1>{t("compare")}</h1>
      <p className="secondary">{t("compareHint")}</p>
      <section className="section">
        <RefrigerantPicker
          mode="multi"
          selectedIds={compareIds}
          onToggle={toggleCompare}
          maxSelected={3}
          label={t("selectRefrigerant")}
        />
      </section>
      {selected.length < 2 && (
        <p className="notice">
          {refinementText(data.locale, "compareNeedsTwo")}
        </p>
      )}
      {selected.length >= 2 && (
        <div className="field-actions">
          <button
            className="secondary-button"
            onClick={() => {
              if (tableRef.current)
                setPrintError(
                  !printComparison(tableRef.current, selected, data.locale),
                );
            }}
          >
            <Printer size={18} />
            {data.locale === "fi"
              ? "Tulosta vertailu / PDF"
              : "Print comparison / PDF"}
          </button>
          {printError && (
            <p role="alert">
              {data.locale === "fi"
                ? "Tulostusikkuna estettiin. Salli ponnahdusikkunat ja yritä uudelleen."
                : "The print window was blocked. Allow pop-ups and try again."}
            </p>
          )}
        </div>
      )}
      {selected.length >= 2 && (
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t("compare")}
        >
          <table className="compare-table" ref={tableRef}>
            <thead>
              <tr>
                <th scope="col">{t("properties")}</th>
                {selected.map((r) => (
                  <th scope="col" key={r.id}>
                    <a href={`#/refrigerants/${r.id}`} className="mono">
                      {r.designation}
                    </a>
                    <button
                      className="icon-button"
                      aria-label={`${t("removeCompare")} ${r.designation}`}
                      onClick={() => toggleCompare(r.id)}
                    >
                      <X size={18} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">{t("family")}</th>
                {selected.map((r) => (
                  <td key={r.id}>{familyText(data.locale, r.family)}</td>
                ))}
              </tr>
              {(
                [
                  "safety",
                  "gwp",
                  "odp",
                  "glide",
                  "boiling",
                  "criticalTemp",
                  "criticalPressure",
                ] as const
              ).map((k) => (
                <tr key={k}>
                  <th scope="row">{t(k)}</th>
                  {selected.map((r) => (
                    <td key={r.id}>
                      {k === "gwp" ? (
                        <GwpSummary r={r} />
                      ) : (
                        <>
                          <FactValue fact={getFact(r, ...factKeys[k])} />
                          <FactContext fact={getFact(r, ...factKeys[k])} />
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              {(
                [
                  ["oil_typical", "oilTypical"],
                  ["oil_possible", "oilPossible"],
                ] as const
              ).map(([key, label]) => (
                <tr key={key}>
                  <th scope="row">{refinementText(data.locale, label)}</th>
                  {selected.map((r) => (
                    <td key={r.id}>
                      <OilValue fact={r.facts[key]} />
                      <FactContext fact={r.facts[key]} />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th scope="row">
                  {data.locale === "fi"
                    ? "Öljyohje ja rajaukset"
                    : "Oil guidance and limits"}
                </th>
                {selected.map((r) => {
                  const note =
                    data.locale === "en"
                      ? getFact(r, "oil_notes_en", ...factKeys.oils)
                      : getFact(r, ...factKeys.oils);
                  return (
                    <td key={r.id}>
                      {note?.state === "verified" ? (
                        <FactValue fact={note} />
                      ) : (
                        <span className="missing">
                          {refinementText(
                            data.locale,
                            "oilGuidanceUnavailable",
                          )}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope="row">{t("composition")}</th>
                {selected.map((r) => (
                  <td key={r.id}>
                    {r.kind === "pure"
                      ? t("pure")
                      : r.components.length
                        ? r.components.map((c) => (
                            <p key={c.refrigerantId} className="mono">
                              {byId.get(c.refrigerantId)?.designation ??
                                c.refrigerantId}{" "}
                              {c.massPercent}%
                            </p>
                          ))
                        : t("unknown")}
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t("ptSupport")}</th>
                {selected.map((r) => (
                  <td key={r.id}>{t(r.coverage.pt)}</td>
                ))}
              </tr>
              <tr>
                <th scope="row">{t("checkSupport")}</th>
                {selected.map((r) => (
                  <td key={r.id}>{t(r.coverage.regulatory_eu_fi)}</td>
                ))}
              </tr>
              <tr data-comparison-sources>
                <th scope="row">{t("sources")}</th>
                {selected.map((r) => (
                  <td key={r.id}>
                    <SourceNote
                      ids={[
                        ...r.sourceIds,
                        ...Object.values(r.facts).flatMap((f) => f.sourceIds),
                      ]}
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {selected.length >= 2 && (
        <p className="supporting-copy">
          {refinementText(data.locale, "oilGuidanceHelp")}
        </p>
      )}
    </>
  );
}
