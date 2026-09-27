import { restrictionsFor } from "../../../../packages/rulesets/eu-fi/src/restrictions";
import { today } from "./Check";
import { useEffect, useId, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import type { MessageKey } from "../../../../packages/i18n/src";
import {
  familyText,
  oilTypeText,
  refinementText,
} from "../../../../packages/i18n/src/refinements";
import { formatDate } from "../../../../packages/i18n/src";
import { useApp } from "../context";
import { byId, dataset, getFact, factKeys } from "../data";
import type { Fact } from "../../../../packages/core/src/contracts";
import {
  Back,
  ChemicalFormula,
  CompareButton,
  FactRow,
  GwpFacts,
  GwpSummary,
  Group,
  OilGuidanceHelp,
  SourceNote,
  StarButton,
  ToolMenu,
} from "../components/Common";
const groups: { title: MessageKey; fields: (keyof typeof factKeys)[] }[] = [
  {
    title: "thermo",
    fields: [
      "boiling",
      "criticalTemp",
      "criticalPressure",
      "triplePoint",
      "glide",
      "density",
      "molarMass",
    ],
  },
  { title: "safety", fields: ["safety", "ped", "lfl", "autoignition"] },
  { title: "environment", fields: ["odp", "regulation"] },
  { title: "use", fields: ["oils"] },
];

function oilCodes(fact?: Fact): string[] {
  if (!fact || fact.state !== "verified" || typeof fact.value !== "string")
    return [];
  return [...new Set(fact.value.split(";").map((code) => code.trim()))].filter(
    Boolean,
  );
}

function OilCodeList({ codes }: { codes: string[] }) {
  const { data } = useApp();
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

function OilGuidance({ r }: { r: Refrigerant }) {
  const { data, t } = useApp();
  const typical = r.facts.oil_typical;
  const possible = r.facts.oil_possible;
  const typicalCodes = oilCodes(typical);
  const possibleCodes = oilCodes(possible);
  const knownTypical =
    typical?.state === "not_applicable" || typicalCodes.length;
  const knownPossible =
    possible?.state === "not_applicable" || possibleCodes.length;
  const hasStructured = Boolean(knownTypical || knownPossible);
  const note = factForLocale(r, "oils", data.locale);

  if (hasStructured) {
    return (
      <dl className="facts oil-facts">
        {knownTypical && (
          <FactRow label={refinementText(data.locale, "oilTypical")}>
            {typical?.state === "not_applicable" ? (
              <span className="missing">{t("notApplicable")}</span>
            ) : (
              <OilCodeList codes={typicalCodes} />
            )}
          </FactRow>
        )}
        {knownPossible && (
          <FactRow label={refinementText(data.locale, "oilPossible")}>
            {possible?.state === "not_applicable" ? (
              <span className="missing">{t("notApplicable")}</span>
            ) : (
              <OilCodeList codes={possibleCodes} />
            )}
          </FactRow>
        )}
      </dl>
    );
  }

  if (note?.state === "verified" && typeof note.value === "string") {
    return <p className="oil-notes">{note.value}</p>;
  }
  return (
    <p className="missing">
      {refinementText(data.locale, "oilGuidanceUnavailable")}
    </p>
  );
}

function factForLocale(
  r: Refrigerant,
  key: keyof typeof factKeys,
  locale: "fi" | "en",
) {
  return key === "oils" && locale === "en"
    ? getFact(r, "oil_notes_en", ...factKeys.oils)
    : getFact(r, ...factKeys[key]);
}
export function ToolsList({ r }: { r: Refrigerant }) {
  return <ToolMenu refrigerant={r} />;
}

type RestrictionFilter = "all" | "active" | "upcoming";

function RestrictionList({
  notices,
}: {
  notices: ReturnType<typeof restrictionsFor>;
}) {
  const { t, data } = useApp();
  const searchId = useId();
  const [filter, setFilter] = useState<RestrictionFilter>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  const foldedQuery = query.trim().toLocaleLowerCase();
  const filtered = notices.filter((notice) => {
    if (filter !== "all" && notice.status !== filter) return false;
    if (!foldedQuery) return true;
    return [
      notice.title[data.locale],
      notice.summary[data.locale],
      notice.scope[data.locale],
      notice.caveats[data.locale],
      notice.effectiveFrom,
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(foldedQuery);
  });
  const visible = filtered.slice(0, visibleCount);
  const filters: { value: RestrictionFilter; label: string }[] = [
    {
      value: "all",
      label: refinementText(data.locale, "restrictionFilterAll"),
    },
    { value: "active", label: t("active") },
    { value: "upcoming", label: t("upcoming") },
  ];

  useEffect(() => {
    setVisibleCount(6);
  }, [filter, foldedQuery]);

  return (
    <section className="section restriction-panel">
      <p className="caption restriction-coverage-note">
        {t("restrictionMissing")}
      </p>
      <div
        className="restriction-filters"
        role="group"
        aria-label={refinementText(data.locale, "restrictionFilterLabel")}
      >
        {filters.map((item) => (
          <button
            className="restriction-filter"
            type="button"
            key={item.value}
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="restriction-search-label" htmlFor={searchId}>
        {refinementText(data.locale, "restrictionSearch")}
      </label>
      <span className="search-field">
        <Search size={20} aria-hidden="true" />
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={refinementText(data.locale, "restrictionSearch")}
        />
        {query && (
          <button
            className="icon-button picker-clear-search"
            type="button"
            aria-label={t("clearSearch")}
            onClick={() => setQuery("")}
          >
            <X size={18} />
          </button>
        )}
      </span>
      <p className="caption restriction-count" aria-live="polite">
        {refinementText(data.locale, "restrictionCount", {
          count: filtered.length,
        })}
      </p>
      {filtered.length === 0 ? (
        <p className="empty">
          {refinementText(data.locale, "noMatchingRestrictions")}
        </p>
      ) : (
        <>
          <div className="restriction-list">
            {visible.map((notice) => (
              <details className="restriction" key={notice.id}>
                <summary>
                  <span className="restriction-summary-text">
                    <span className="restriction-meta">
                      {t(notice.status)} <span aria-hidden="true">·</span>{" "}
                      <time
                        className="mono restriction-date"
                        dateTime={notice.effectiveFrom}
                      >
                        {formatDate(notice.effectiveFrom, data.locale)}
                      </time>
                    </span>
                    <span className="restriction-title">
                      {notice.title[data.locale]}
                    </span>
                  </span>
                  <ChevronRight
                    className="restriction-chevron"
                    size={20}
                    aria-hidden="true"
                  />
                </summary>
                <div className="restriction-content">
                  <p>{notice.summary[data.locale]}</p>
                  <p className="caption">{notice.scope[data.locale]}</p>
                  <p className="caption">{notice.caveats[data.locale]}</p>
                  <a href={notice.sourceUrl} target="_blank" rel="noreferrer">
                    {t("source")}
                  </a>
                  <SourceNote ids={notice.sourceIds} />
                </div>
              </details>
            ))}
          </div>
          {filtered.length > 6 && (
            <button
              className="text-button restriction-more"
              type="button"
              onClick={() =>
                setVisibleCount((count) =>
                  count >= filtered.length
                    ? 6
                    : Math.min(count + 6, filtered.length),
                )
              }
            >
              {visibleCount >= filtered.length
                ? refinementText(data.locale, "showFewerRestrictions")
                : refinementText(data.locale, "showMoreRestrictions", {
                    count: Math.min(6, filtered.length - visibleCount),
                  })}
            </button>
          )}
        </>
      )}
    </section>
  );
}

const detailTabs = [
  "overview",
  "properties",
  "restrictions",
  "sources",
] as const;
type DetailTab = (typeof detailTabs)[number];

export function RefrigerantDetail({ r }: { r: Refrigerant }) {
  const { t, data } = useApp();
  const [tab, setTab] = useState<DetailTab>("overview");
  const notices = restrictionsFor(r, dataset, today());
  const chemicalName =
    r.name[data.locale] === r.designation ? null : r.name[data.locale];
  const headerContext =
    chemicalName ??
    (r.family === "unclassified" ? null : familyText(data.locale, r.family));
  const sourceIds = [
    ...new Set([
      ...r.sourceIds,
      ...Object.values(r.facts).flatMap((f) => f.sourceIds),
      ...r.components.flatMap((c) => c.sourceIds),
    ]),
  ];
  return (
    <>
      <Back />
      <div className="detail-heading">
        <h1 className="mono">{r.designation}</h1>
        <StarButton r={r} />
      </div>
      {headerContext && <p className="chemical-name">{headerContext}</p>}
      <div className="tabs" role="tablist" aria-label={r.designation}>
        {detailTabs.map((key, index) => (
          <button
            key={key}
            id={`tab-${key}`}
            role="tab"
            aria-selected={tab === key}
            aria-controls="detail-panel"
            tabIndex={tab === key ? 0 : -1}
            onClick={() => setTab(key)}
            onKeyDown={(e) => {
              if (
                e.key === "ArrowRight" ||
                e.key === "ArrowLeft" ||
                e.key === "Home" ||
                e.key === "End"
              ) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? detailTabs.length - 1
                      : (index +
                          (e.key === "ArrowRight"
                            ? 1
                            : detailTabs.length - 1)) %
                        detailTabs.length;
                setTab(detailTabs[next]);
                document.getElementById(`tab-${detailTabs[next]}`)?.focus();
              }
            }}
          >
            {t(key as MessageKey)}
          </button>
        ))}
      </div>
      <div
        id="detail-panel"
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab === "overview" && (
          <>
            <dl className="facts overview">
              <FactRow label={t("family")}>
                {familyText(data.locale, r.family)}
              </FactRow>
              <FactRow
                label={t("safety")}
                fact={getFact(r, ...factKeys.safety)}
              />
              <FactRow label={t("gwp")}>
                <GwpSummary r={r} />
              </FactRow>
            </dl>
            <SourceNote
              ids={[
                ...r.sourceIds,
                ...Object.entries(r.facts)
                  .filter(([key]) => key.startsWith("gwp_"))
                  .flatMap(([, fact]) => fact.sourceIds),
                ...(getFact(r, ...factKeys.safety)?.sourceIds ?? []),
              ]}
            />
            <section className="section">
              <h2>{t("tools")}</h2>
              <ToolsList r={r} />
              <CompareButton r={r} />
            </section>
            <p className="caption">{t("safetyNote")}</p>
          </>
        )}
        {tab === "properties" && (
          <>
            <Group title="identity" ids={r.sourceIds}>
              <dl className="facts">
                <FactRow label={t("chemicalName")}>
                  {r.kind === "blend"
                    ? refinementText(data.locale, "chemicalNameBlend")
                    : (chemicalName ?? (
                        <span className="missing">
                          {refinementText(
                            data.locale,
                            "chemicalNameUnavailable",
                          )}
                        </span>
                      ))}
                </FactRow>
                <FactRow label={t("formula")}>
                  {r.formula ? (
                    <ChemicalFormula formula={r.formula} />
                  ) : (
                    t(r.kind === "blend" ? "notApplicable" : "unknown")
                  )}
                </FactRow>
                <FactRow label="CAS">
                  {r.cas ?? t(r.kind === "blend" ? "notApplicable" : "unknown")}
                </FactRow>
              </dl>
              <h3>{t("coverage")}</h3>
              <p className="caption">{t("supportNote")}</p>
              <dl className="facts">
                {Object.entries(r.coverage).map(([key, value]) => (
                  <FactRow
                    key={key}
                    label={t(
                      (
                        {
                          identity: "identity",
                          composition: "composition",
                          safety: "safety",
                          regulatory_eu_fi: "checkSupport",
                          pt: "ptSupport",
                        } as const
                      )[key as keyof typeof r.coverage],
                    )}
                  >
                    {t(value === "not_applicable" ? "notApplicable" : value)}
                  </FactRow>
                ))}
              </dl>
              <a
                className="text-button"
                href="/coverage.html"
                target="_blank"
                rel="noreferrer"
              >
                {t("coverageReport")}
              </a>
            </Group>
            <Group
              title="composition"
              ids={
                r.kind === "pure"
                  ? r.sourceIds
                  : r.components.flatMap((c) => c.sourceIds)
              }
            >
              {r.kind === "pure" ? (
                <p>{t("pure")}</p>
              ) : r.components.length ? (
                <dl className="facts">
                  {r.components.map((c) => (
                    <FactRow
                      key={c.refrigerantId}
                      label={
                        byId.get(c.refrigerantId)?.designation ??
                        c.refrigerantId
                      }
                    >
                      <a
                        href={`#/refrigerants/${c.refrigerantId}`}
                        className="mono"
                      >
                        {c.massPercent} %
                      </a>
                    </FactRow>
                  ))}
                </dl>
              ) : (
                <p>{t("unknown")}</p>
              )}
            </Group>
            {groups.map((group) => (
              <Group
                key={group.title}
                title={group.title}
                ids={group.fields
                  .flatMap(
                    (k) => factForLocale(r, k, data.locale)?.sourceIds ?? [],
                  )
                  .concat(
                    group.title === "environment"
                      ? Object.entries(r.facts)
                          .filter(([key]) => key.startsWith("gwp_"))
                          .flatMap(([, fact]) => fact.sourceIds)
                      : [],
                    group.title === "use"
                      ? [r.facts.oil_typical, r.facts.oil_possible].flatMap(
                          (fact) => fact?.sourceIds ?? [],
                        )
                      : [],
                  )}
              >
                {group.title === "use" ? (
                  <>
                    <div className="oil-heading">
                      <h3>{t("oils")}</h3>
                      <OilGuidanceHelp />
                    </div>
                    <OilGuidance r={r} />
                  </>
                ) : (
                  <dl className="facts">
                    {group.fields.map((key) => {
                      const fact = factForLocale(r, key, data.locale);
                      return (
                        <div key={key}>
                          <FactRow label={t(key)} fact={fact} />
                          {fact?.conditions && (
                            <p className="caption">
                              {t("condition")}:{" "}
                              {[
                                fact.conditions.temperatureC !== undefined
                                  ? `${fact.conditions.temperatureC} °C`
                                  : null,
                                fact.conditions.pressureKPaAbsolute !==
                                undefined
                                  ? `${fact.conditions.pressureKPaAbsolute} kPa(a)`
                                  : null,
                                fact.conditions.phase,
                                fact.conditions.method,
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          )}
                          {fact?.basis && (
                            <p className="caption">{fact.basis}</p>
                          )}
                        </div>
                      );
                    })}
                    {group.title === "environment" && <GwpFacts r={r} />}
                  </dl>
                )}
              </Group>
            ))}
          </>
        )}
        {tab === "restrictions" && <RestrictionList notices={notices} />}
        {tab === "sources" && (
          <>
            {dataset.sources
              .filter((s) => sourceIds.includes(s.id))
              .map((s) => (
                <article className="source-entry" key={s.id}>
                  <h2>
                    <a href={s.url} target="_blank" rel="noreferrer">
                      {s.title}
                    </a>
                  </h2>
                  <p className="caption">
                    {t("version")}: {s.version}
                    <br />
                    {t("checked", {
                      date: formatDate(s.checkedAt, data.locale),
                    })}
                    <br />
                    {t("license")}: {s.license}
                  </p>
                  {s.note && <p className="caption">{s.note}</p>}
                </article>
              ))}
          </>
        )}
      </div>
    </>
  );
}
