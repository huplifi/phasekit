import releases from "../../../../data/releases.json";
import { formatDate } from "../../../../packages/i18n/src";
import { Back } from "../components/Common";
import { useApp } from "../context";
import { appVersion, buildRevision, isBeta } from "../release";

export function ReleaseHistory() {
  const { data } = useApp();
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  return (
    <>
      <Back to="/settings" />
      <h1>{l("Versiohistoria", "Release history")}</h1>
      <p className="secondary">
        {l(
          "Mitä PhaseKitissä on muuttunut ja milloin.",
          "What changed in PhaseKit, and when.",
        )}
      </p>
      <p className="caption release-installed">
        {l("Käytössä", "Installed")}:{" "}
        <strong className="mono">{appVersion}</strong>
        {" · "}
        {isBeta ? "Beta" : l("Vakaa", "Stable")}
        {" · "}
        {l("Build-tunniste", "Build revision")}{" "}
        <span className="mono">{buildRevision}</span>
      </p>
      <p className="caption secondary">
        {l(
          "Päivämäärä koskee kyseistä versiota. Yksittäisen buildin tunniste näkyy yllä; aineiston tarkistuspäivä ja kattavuus löytyvät Asetuksista. Beta-julkaisut eivät päivitä vakaata sivustoa.",
          "Dates refer to each version. The build revision is shown above; data review dates and coverage are in Settings. Beta releases do not update the stable site.",
        )}
      </p>
      <div className="release-history">
        {releases.map((release) => (
          <article
            className="release-entry"
            key={release.version}
            aria-labelledby={`release-${release.version}`}
          >
            <header>
              <h2 className="mono" id={`release-${release.version}`}>
                {release.version}
              </h2>
              {release.version === appVersion && (
                <span className="release-current caption">
                  {l("Käytössäsi", "Installed version")}
                </span>
              )}
            </header>
            <p className="caption secondary">
              <time dateTime={release.date}>
                {formatDate(release.date, data.locale)}
              </time>
              {" · "}
              {release.channel === "beta" ? "Beta" : l("Vakaa", "Stable")}
            </p>
            <h3>{release.title[data.locale]}</h3>
            <ul>
              {release.changes[data.locale].map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </>
  );
}
