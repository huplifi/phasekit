import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ChevronRight,
  Check,
  Gauge,
  ChartNoAxesCombined,
  GitCompareArrows,
  Plus,
  Scale,
  Star,
  Wrench,
} from "lucide-react";
import "../ui-refinements.css";
import type {
  Fact,
  Refrigerant,
} from "../../../../packages/core/src/contracts";
import {
  familyText,
  refinementText,
} from "../../../../packages/i18n/src/refinements";
import {
  formatDate,
  formatNumber,
  formatDecimal,
} from "../../../../packages/i18n/src";
import type { MessageKey } from "../../../../packages/i18n/src";
import { dataset } from "../data";
import { useApp } from "../context";
import { InfoHelp } from "./InfoHelp";

const safetyGuideUrl =
  "https://www.ashrae.org/file%20library/technical%20resources/refrigeration/factsheet_ashrae_english_april2023.pdf";
const gwpFacts = [
  { key: "gwp_eu_2024_573_100yr", label: "gwpFgas" },
  { key: "gwp_eu_2024_590_100yr", label: "gwpOds" },
  { key: "gwp_ar4_100", label: "gwpIpccAr4" },
] as const;

export function SafetyGroupHelp() {
  const { t, data } = useApp();
  return (
    <InfoHelp label={t("safety")}>
      <div className="safety-help-copy">
        <p>
          {refinementText(data.locale, "safetyHelpA")}{" "}
          {refinementText(data.locale, "safetyHelpB")}
        </p>
        <ul>
          <li>{refinementText(data.locale, "safetyHelpFlammability1")}</li>
          <li>{refinementText(data.locale, "safetyHelpFlammability2L")}</li>
          <li>{refinementText(data.locale, "safetyHelpFlammability2")}</li>
          <li>{refinementText(data.locale, "safetyHelpFlammability3")}</li>
        </ul>
        <p>{refinementText(data.locale, "safetyHelpSeparate")}</p>
        <a href={safetyGuideUrl} target="_blank" rel="noreferrer">
          {refinementText(data.locale, "safetyHelpSource")}
        </a>
      </div>
    </InfoHelp>
  );
}

export function OilGuidanceHelp() {
  const { t, data } = useApp();
  return (
    <InfoHelp label={t("oils")}>
      <p>{refinementText(data.locale, "oilGuidanceHelp")}</p>
    </InfoHelp>
  );
}

function preferredGwp(r: Refrigerant) {
  const values = gwpFacts.map(({ key, label }) => ({
    fact: r.facts[key],
    label,
  }));
  return (
    values.find(
      ({ fact }) => fact?.state === "verified" && fact.value !== null,
    ) ?? values.find(({ fact }) => fact?.state === "not_applicable")
  );
}

export function GwpSummary({ r }: { r: Refrigerant }) {
  const { data } = useApp();
  const selected = preferredGwp(r);
  if (!selected?.fact) {
    return (
      <span className="missing gwp-unavailable">
        {refinementText(data.locale, "gwpUnavailable")}
      </span>
    );
  }
  return (
    <span className="gwp-summary">
      <FactValue fact={selected.fact} />
      <span className="caption">
        {refinementText(data.locale, selected.label)}
      </span>
    </span>
  );
}

export function GwpFacts({ r }: { r: Refrigerant }) {
  const { data } = useApp();
  if (!gwpFacts.some(({ key }) => r.facts[key]?.state === "verified")) {
    return (
      <p className="caption secondary">
        {refinementText(data.locale, "gwpUnavailable")}
      </p>
    );
  }
  return (
    <>
      {gwpFacts
        .filter(({ key }) => r.facts[key]?.state === "verified")
        .map(({ key, label }) => (
          <FactRow
            key={key}
            label={refinementText(data.locale, label)}
            fact={r.facts[key]}
          />
        ))}
    </>
  );
}
export function Back({ to = "/" }: { to?: string }) {
  const { go, t } = useApp();
  return (
    <button className="text-button back" onClick={() => go(to)}>
      <ArrowLeft size={20} />
      {t("back")}
    </button>
  );
}
export function StarButton({ r }: { r: Refrigerant }) {
  const { data, t, toggleFavourite } = useApp();
  const active = data.favourites.includes(r.id);
  return (
    <button
      className={`icon-button star ${active ? "is-favourite" : ""}`}
      aria-label={t(active ? "removeFavourite" : "addFavourite", {
        name: r.designation,
      })}
      aria-pressed={active}
      onClick={() => toggleFavourite(r.id)}
    >
      <Star size={22} fill={active ? "currentColor" : "none"} />
    </button>
  );
}

export function ChemicalFormula({ formula }: { formula: string }) {
  const pieces: ReactNode[] = [];
  const counts = /_\{(\d+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = counts.exec(formula)) !== null) {
    if (match.index > lastIndex) {
      pieces.push(formula.slice(lastIndex, match.index));
    }
    pieces.push(
      <sub aria-hidden="true" key={`sub-${match.index}`}>
        {match[1]}
      </sub>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < formula.length) pieces.push(formula.slice(lastIndex));

  const accessibleFormula = formula.replace(/_\{(\d+)\}/g, " $1 ");
  return (
    <span
      className="chemical-formula mono"
      role="img"
      aria-label={accessibleFormula}
    >
      {pieces}
    </span>
  );
}

const toolItems = [
  { key: "check", label: "leakCheck", icon: Wrench },
  { key: "pt", label: "pt", icon: Gauge },
  { key: "ph", label: "shsc", icon: ChartNoAxesCombined },
  { key: "co2e", label: "kgCO2", icon: Scale },
  { key: "compare", label: "compare", icon: GitCompareArrows },
] as const;

export function ToolMenu({ refrigerant }: { refrigerant?: Refrigerant }) {
  const { t, go } = useApp();
  return (
    <div className="tool-list">
      {toolItems.map(({ key, label, icon: Icon }) => (
        <button
          className="tool-row"
          key={key}
          onClick={() =>
            go(`/${key}${refrigerant ? `/${refrigerant.id}` : ""}`)
          }
        >
          <Icon size={22} aria-hidden="true" />
          <span>
            {key === "co2e" ? (
              <>
                kg <ArrowLeftRight size={16} aria-hidden="true" /> CO₂e
              </>
            ) : (
              t(label)
            )}
          </span>
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
export function CompareButton({ r }: { r: Refrigerant }) {
  const { t, compareIds, toggleCompare } = useApp();
  const active = compareIds.includes(r.id);
  return (
    <button
      className="text-button"
      aria-pressed={active}
      onClick={() => toggleCompare(r.id)}
    >
      {active ? <Check size={18} /> : <Plus size={18} />}{" "}
      {t(active ? "removeCompare" : "addCompare")}
    </button>
  );
}
export function RefrigerantRow({
  r,
  children,
}: {
  r: Refrigerant;
  children?: ReactNode;
}) {
  const { data, go } = useApp();
  return (
    <div className="refrigerant-row">
      <button
        className="refrigerant-link"
        onClick={() => go(`/refrigerants/${r.id}`)}
      >
        <span>
          <strong className="mono">{r.designation}</strong>
          <span className="secondary">{familyText(data.locale, r.family)}</span>
        </span>
        <ChevronRight size={20} />
      </button>
      {children ?? <StarButton r={r} />}
    </div>
  );
}
export function FactValue({ fact }: { fact?: Fact }) {
  const { t, data } = useApp();
  if (
    !fact ||
    fact.state === "unknown" ||
    (fact.value === null && fact.state !== "not_applicable")
  )
    return <span className="missing">{t("unknown")}</span>;
  if (fact.state === "not_applicable")
    return <span className="missing">{t("notApplicable")}</span>;
  return (
    <span className="mono">
      {typeof fact.value === "number"
        ? formatNumber(fact.value, data.locale)
        : typeof fact.value === "string" &&
            /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(fact.value)
          ? formatDecimal(fact.value, data.locale)
          : fact.value}
      {fact.unit && <span> {fact.unit}</span>}
    </span>
  );
}
export function FactRow({
  label,
  fact,
  children,
}: {
  label: string;
  fact?: Fact;
  children?: ReactNode;
}) {
  return (
    <div className="fact-row">
      <dt>{label}</dt>
      <dd>{children ?? <FactValue fact={fact} />}</dd>
    </div>
  );
}
export function SourceNote({ ids }: { ids: string[] }) {
  const { t, data } = useApp();
  const sourceIds = new Set(ids);
  const sources = dataset.sources.filter((s) => sourceIds.has(s.id));
  if (!sources.length) return <p className="caption">{t("sourceMissing")}</p>;
  return (
    <details className="source-disclosure">
      <summary>
        <ChevronRight size={16} aria-hidden="true" />
        {refinementText(data.locale, "dataProvenance")} ({sources.length})
      </summary>
      <div className="source-disclosure-content">
        {sources.map((s) => (
          <p className="caption" key={s.id}>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
            </a>
            <br />
            {t("checked", { date: formatDate(s.checkedAt, data.locale) })}
            {s.version ? ` · ${t("version")}: ${s.version}` : ""}
          </p>
        ))}
      </div>
    </details>
  );
}
export function Group({
  title,
  children,
  ids = [],
}: {
  title: MessageKey;
  children: ReactNode;
  ids?: string[];
}) {
  const { t } = useApp();
  return (
    <section className="section">
      <h2>{t(title)}</h2>
      {children}
      <SourceNote ids={ids} />
    </section>
  );
}
