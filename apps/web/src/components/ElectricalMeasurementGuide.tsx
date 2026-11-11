import type { MeasurementType } from "../electrical";
import { electricalLearningGuides } from "../electrical-learning-guides";

/** Inline content: the measurement row owns disclosure and assessment. */
export function ElectricalMeasurementGuide({
  type,
  locale,
}: {
  type: MeasurementType;
  locale: "fi" | "en";
}) {
  const guide = electricalLearningGuides[type];
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  return (
    <div className="electrical-learning-guide">
      <p>
        <strong>{l("Mitä mitataan", "What to measure")}: </strong>
        {guide.purpose[locale]}
      </p>
      <p>
        <strong>{l("Ennen mittausta", "Before testing")}: </strong>
        {guide.preparation[locale]}
      </p>
      <p>
        <strong>{l("Tuloksen arviointi", "Interpreting the result")}: </strong>
        {guide.interpretation[locale]}
      </p>
      <p className="caption secondary">
        {l(
          "Opiskelun viite: SFS 6000-6:2022. Tarkista kohteen mittausmenetelmä ja hyväksymisrajat standardista. Numeerisia rajoja ei ole varmennettu tähän muistiapuun.",
          "Study reference: SFS 6000-6:2022. Check site-specific methods and acceptance limits in the standard. Numerical limits have not been verified for this study aid.",
        )}{" "}
        <a
          href="https://sesko.fi/standardointi/sahkoasennukset/sfs-6000-uudistus-2022/"
          target="_blank"
          rel="noreferrer"
        >
          {l("SFS 6000 -standardisarja (SESKO)", "SFS 6000 series (SESKO)")}
        </a>
      </p>
      <ul className="electrical-learning-sources caption">
        {guide.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label[locale]}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
