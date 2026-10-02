import type { Refrigerant } from "../../../../packages/core/src/contracts";
import { getPHAvailability } from "../../../../packages/core/src/ph";
import { formatDate } from "../../../../packages/i18n/src";
import { Back, FactRow } from "../components/Common";
import { useApp } from "../context";
import { dataset } from "../data";

export function Coverage({ r }: { r?: Refrigerant }) {
  const { data, t } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const dimensions = [
    { key: "identity", label: t("identity") },
    { key: "composition", label: t("composition") },
    { key: "safety", label: t("safety") },
    { key: "regulatory_eu_fi", label: t("checkSupport") },
    { key: "pt", label: t("ptSupport") },
  ] as const;
  const status = (
    value: Refrigerant["coverage"][keyof Refrigerant["coverage"]],
  ) => t(value === "not_applicable" ? "notApplicable" : value);
  const total = dataset.refrigerants.length;
  const phCount = dataset.refrigerants.filter(
    (item) => getPHAvailability(item.id).supported,
  ).length;
  return (
    <div className="coverage-view">
      <Back to={r ? `/refrigerants/${r.id}/properties` : "/settings"} />
      <h1>{l("Aineiston kattavuus", "Data coverage")}</h1>
      <p className="secondary">
        {l(
          "Kattavuus kertoo, mitä tietoja ja laskentatukea PhaseKitin aineistossa on. Lähteistetty perustieto ei tarkoita, että kaikki aineominaisuudet tunnetaan.",
          "Coverage shows which facts and calculation models are available in PhaseKit. Sourced identity data does not mean that every property is known.",
        )}
      </p>
      {r && (
        <section className="section">
          <h2>{r.designation}</h2>
          <dl className="facts">
            {dimensions.map(({ key, label }) => (
              <FactRow key={key} label={label}>
                {status(r.coverage[key])}
              </FactRow>
            ))}
            <FactRow label={l("Log(p)–h-tuki", "Log(p)–h support")}>
              {getPHAvailability(r.id).supported
                ? l("Mallipohjainen", "Model-based")
                : t("unsupported")}
            </FactRow>
          </dl>
        </section>
      )}
      <section className="section">
        <h2>{l("Koko aineisto", "Whole dataset")}</h2>
        <p>
          {l(
            `${total} kylmäainetta. Kokoelma perustuu tarkistettuihin CoolProp-, EPA- ja UNEP-lähteisiin; se ei ole kaikkien kylmäaineiden luettelo.`,
            `${total} refrigerants. The collection is based on reviewed CoolProp, EPA and UNEP sources; it is not an exhaustive refrigerant inventory.`,
          )}
        </p>
        <dl className="facts">
          {dimensions.map(({ key, label }) => {
            const count = dataset.refrigerants.filter((item) =>
              ["verified", "not_applicable", "estimated"].includes(
                item.coverage[key],
              ),
            ).length;
            return (
              <FactRow key={key} label={label}>
                <span className="mono">
                  {count} / {total}
                </span>
                <span className="caption secondary">
                  {key === "pt"
                    ? l("Mallipohjainen tuki", "Model-based support")
                    : key === "composition"
                      ? l(
                          "Lähteistetty tai ei sovellu",
                          "Sourced or not applicable",
                        )
                      : l("Lähteistetty", "Sourced")}
                </span>
              </FactRow>
            );
          })}
          <FactRow label={l("Log(p)–h-tuki", "Log(p)–h support")}>
            <span className="mono">
              {phCount} / {total}
            </span>
            <span className="caption secondary">
              {l("Mallipohjainen tuki", "Model-based support")}
            </span>
          </FactRow>
        </dl>
        <p className="caption secondary">
          {l(
            "Puuttuva tieto ei tarkoita nollaa. Mallien käyttöalueet tarkistetaan laskureissa ainekohtaisesti.",
            "Missing data does not mean zero. Calculators check each refrigerant’s model limits.",
          )}
        </p>
      </section>
      <details className="section">
        <summary>
          {l("Versio ja tekninen raportti", "Version and technical report")}
        </summary>
        <p className="caption">
          {t("checked", { date: formatDate(dataset.checkedAt, data.locale) })}
        </p>
        <p className="mono wrap caption">{dataset.version}</p>
        <a
          className="secondary-button"
          href="/coverage.html"
          target="_blank"
          rel="noreferrer"
        >
          {l(
            "Tekninen raportti (englanniksi, uusi välilehti)",
            "Technical report (English, new tab)",
          )}{" "}
          <span aria-hidden="true">↗</span>
        </a>
      </details>
    </div>
  );
}
