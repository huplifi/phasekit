import { co2eBreakdown } from "../../../../packages/core/src/co2e-breakdown";
import type { Refrigerant } from "../../../../packages/core/src/contracts";
import { dataset } from "../data";
import { useApp } from "../context";
import { SourceNote } from "./Common";
import "./co2e-breakdown.css";
export function CO2eBreakdown({
  refrigerant,
  kg,
  gwpKey,
}: {
  refrigerant: Refrigerant;
  kg: string;
  gwpKey: string;
}) {
  const { data } = useApp();
  const fi = data.locale === "fi";
  const l = (a: string, b: string) => (fi ? a : b);
  const result = co2eBreakdown({
    refrigerant,
    refrigerants: dataset.refrigerants,
    kg,
    gwpKey,
  });
  const format = (n: string) =>
    new Intl.NumberFormat(fi ? "fi-FI" : "en-GB", {
      maximumSignificantDigits: 10,
    }).format(Number(n));
  return (
    <section className="co2e-breakdown">
      <h2>{l("Komponenttierittely", "Component breakdown")}</h2>
      <p className="caption">
        {l("Laskettu massa", "Calculated mass")}: {format(kg)} kg
      </p>
      {result.reason === "composition" ? (
        <p className="notice">
          {l(
            "Erittely ei ole saatavilla: seoksen varmennettu, lähteistetty koostumus puuttuu tai ei kata täyttä 100 %:a.",
            "Breakdown unavailable: the verified, sourced mixture recipe is missing or does not total 100%.",
          )}
        </p>
      ) : (
        <>
          <ul>
            {result.rows.map((row) => (
              <li key={row.refrigerantId}>
                <h3>{row.designation}</h3>
                <dl>
                  <div>
                    <dt>{l("Massaosuus", "Mass fraction")}</dt>
                    <dd>{format(row.massPercent)} %</dd>
                  </div>
                  <div>
                    <dt>{l("Massa", "Mass")}</dt>
                    <dd>{format(row.massKg)} kg</dd>
                  </div>
                  <div>
                    <dt>GWP</dt>
                    <dd>
                      {row.gwp === null
                        ? l(
                            "Ei varmennettua arvoa valitulla perusteella",
                            "No verified value for the selected basis",
                          )
                        : format(row.gwp)}
                    </dd>
                  </div>
                  <div>
                    <dt>CO₂e</dt>
                    <dd>
                      {row.tonnesCO2e === null
                        ? "—"
                        : `${format(row.tonnesCO2e)} t`}
                    </dd>
                  </div>
                </dl>
                {row.basis && <p className="caption secondary">{row.basis}</p>}
                <SourceNote ids={row.sourceIds} />
              </li>
            ))}
          </ul>
          {result.status === "complete" ? (
            <div
              className={result.reconciled ? "notice info" : "notice warning"}
            >
              <p>
                {l("Komponenttien summa", "Component total")}:{" "}
                <strong>{format(result.componentTonnesCO2e!)} t CO₂e</strong>
              </p>
              <p>
                {l("Painotettu GWP", "Weighted GWP")}:{" "}
                {format(result.weightedGwp!)}
              </p>
              {result.reconciled ? (
                <p>
                  {l(
                    "Vastaa muuntimessa valittua GWP-arvoa.",
                    "Matches the GWP selected in the converter.",
                  )}
                </p>
              ) : (
                <p>
                  {l(
                    "Summa poikkeaa valitun GWP-arvon mukaisesta tuloksesta",
                    "The sum differs from the result using the selected GWP",
                  )}
                  : {format(result.selectedTonnesCO2e)} t CO₂e.{" "}
                  {l("Erotus", "Difference")}:{" "}
                  {format(result.differenceTonnesCO2e!)} t CO₂e.{" "}
                  {l(
                    "Syynä voi olla lähteiden ero tai pyöristys. Muuntimen kokonaistulosta ei muuteta.",
                    "Sources or rounding may differ. The converter total remains unchanged.",
                  )}
                </p>
              )}
            </div>
          ) : (
            <p className="notice warning">
              {l(
                "Kokonaissummaa ei lasketa: vähintään yhden komponentin GWP puuttuu valitulla laskentaperusteella. Puuttuva arvo ei tarkoita nollaa.",
                "No component total is calculated: at least one component lacks a verified GWP for the selected basis. Missing values do not mean zero.",
              )}
            </p>
          )}
        </>
      )}
      {result.statutoryMixture && (
        <p className="caption secondary">
          {l(
            "EU 2024/573, liite VI: käytetään asetuksen määräämiä komponenttiarvoja. Liitteiden arvot voivat perustua eri IPCC-arviointiraportteihin; tämä ei ole yhden IPCC-raportin mukainen erittely.",
            "EU 2024/573, Annex VI: uses the component values prescribed by the regulation. Annex values may come from different IPCC assessments; this is not a breakdown based on a single IPCC report.",
          )}
        </p>
      )}
      <p className="caption secondary">
        {l(
          "Erittely kuvaa koko täytöksen CO₂-ekvivalenttia. Se ei ratkaise vuototarkastusvelvoitetta.",
          "This breakdown represents the entire charge’s CO₂ equivalent. It does not determine leak-check obligations.",
        )}
      </p>
    </section>
  );
}
