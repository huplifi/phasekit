import { X } from "lucide-react";
import { useApp } from "../context";
import { byId, factKeys, getFact } from "../data";
import { Back, FactValue, GwpSummary, SourceNote } from "../components/Common";
import { RefrigerantPicker } from "../components/RefrigerantPicker";
import {
  familyText,
  refinementText,
} from "../../../../packages/i18n/src/refinements";
export function Compare() {
  const { t, data, compareIds, toggleCompare } = useApp();
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
        <div
          className="table-scroll"
          tabIndex={0}
          role="region"
          aria-label={t("compare")}
        >
          <table className="compare-table">
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
                        <FactValue fact={getFact(r, ...factKeys[k])} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
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
              <tr>
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
    </>
  );
}
