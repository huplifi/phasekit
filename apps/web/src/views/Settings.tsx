import releases from "../../../../data/releases.json";
import { appVersion, buildRevision, isBeta } from "../release";
import { InfoHelp } from "../components/InfoHelp";
import { useState } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { dataset } from "../data";
import { downloadJSON, emptyData, mergeBackup, parseBackup } from "../storage";
import { formatDate } from "../../../../packages/i18n/src";
import type { Locale } from "../../../../packages/i18n/src";
export function Settings() {
  const { t, data, setData, notify } = useApp();
  const currentRelease = releases.find(
    (release) => release.version === appVersion,
  );
  const [confirm, setConfirm] = useState(false);
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  return (
    <>
      <h1>{t("settings")}</h1>
      <section className="section settings-fields">
        <label>
          {t("language")}
          <select
            value={data.locale}
            onChange={(e) =>
              setData((d) => ({ ...d, locale: e.target.value as Locale }))
            }
          >
            <option value="fi">Suomi</option>
            <option value="en">English</option>
          </select>
        </label>
        <label>
          {t("theme")}
          <select
            value={data.theme}
            onChange={(e) =>
              setData((d) => ({
                ...d,
                theme: e.target.value as typeof data.theme,
              }))
            }
          >
            {(["system", "light", "dark"] as const).map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
          </select>
        </label>
        <div className="help-heading caption">
          <span>{t("rulesScope")}</span>
          <InfoHelp
            label={data.locale === "fi" ? "Sääntöalue" : "Rules region"}
          >
            {data.locale === "fi"
              ? "Tällä hetkellä tuettu sääntöalue on EU / Suomi. Kielen vaihtaminen ei muuta sovellettavia sääntöjä. Muiden maiden sääntöalueita ei vielä voi valita."
              : "The currently supported rules region is EU / Finland. Changing the language does not change the applicable rules. Other regions are not yet available."}
          </InfoHelp>
        </div>
      </section>
      <section className="section">
        <h2>{t("localData")}</h2>
        <p className="secondary">{t("privacy")}</p>
        <div className="settings-actions">
          <div className="settings-backup-actions">
            <button
              className="secondary-button"
              onClick={() =>
                downloadJSON(
                  data,
                  `phasekit-backup-${new Date().toISOString().slice(0, 10)}.json`,
                )
              }
            >
              <Download size={20} />
              {t("export")}
            </button>
            <label className="secondary-button upload">
              <Upload size={20} />
              {t("import")}
              <input
                aria-label={t("import")}
                type="file"
                accept="application/json,.json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    if (file.size > 10_000_000) throw new Error("Too large");
                    const incoming = parseBackup(await file.text());
                    setData((d) => mergeBackup(d, incoming));
                    notify(t("importSuccess"));
                  } catch {
                    notify(t("importError"));
                  }
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <button
            className="text-button danger-text settings-delete-action"
            onClick={() => setConfirm(true)}
          >
            <Trash2 size={18} />
            {t("deleteAll")}
          </button>
        </div>
        {confirm && (
          <div className="notice warning" role="alert">
            <p>{t("confirmDelete")}</p>
            <div className="button-group">
              <button
                className="secondary-button"
                onClick={() => {
                  setData({
                    ...emptyData(),
                    locale: data.locale,
                    theme: data.theme,
                  });
                  setConfirm(false);
                }}
              >
                {t("delete")}
              </button>
              <button className="text-button" onClick={() => setConfirm(false)}>
                {t("cancel")}
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="section">
        <h2>{t("readiness")}</h2>
        <p className="caption">
          {t("checked", { date: formatDate(dataset.checkedAt, data.locale) })}
        </p>
        <p className="mono wrap">{dataset.version}</p>
        <details>
          <summary>{t("dataHash")}</summary>
          <p className="mono wrap caption">{dataset.sha256}</p>
        </details>
        <a className="secondary-button coverage-report-link" href="#/coverage">
          {l("Avaa kattavuusraportti", "Open coverage report")}{" "}
          <span aria-hidden="true">→</span>
        </a>
        <h3>{t("install")}</h3>
        <p className="secondary">{t("installHelp")}</p>
      </section>
      <section
        className="section about-section"
        aria-labelledby="about-heading"
      >
        <h2 id="about-heading">{l("Tietoa PhaseKitistä", "About PhaseKit")}</h2>
        <p className="secondary">
          {l(
            "PhaseKit kokoaa kylmäaineiden lähteistetyt tiedot ja kylmäalan laskurit samaan paikkaan. Se auttaa vertailemaan aineita, laskemaan kylmäkierron arvoja ja arvioimaan vuototarkastusvälejä EU:n ja Suomen sääntöjen perusteella.",
            "PhaseKit brings source-attributed refrigerant information and refrigeration calculators together. It helps you compare refrigerants, calculate refrigeration-cycle values and assess leak-check intervals under EU and Finnish rules.",
          )}
        </p>
        <dl className="about-details">
          <div>
            <dt>{l("Tekijä", "Created by")}</dt>
            <dd>Samu Hupli</dd>
          </div>
          <div>
            <dt>{l("Sovellusversio", "App version")}</dt>
            <dd>
              <a className="release-history-link" href="#/releases">
                <span className="mono">{appVersion}</span>
                <span aria-hidden="true"> · </span>
                {l(
                  "Versiohistoria ja uutta",
                  "Release history and what’s new",
                )}{" "}
                <span aria-hidden="true">→</span>
              </a>
            </dd>
          </div>
          <div>
            <dt>{l("Version päivämäärä", "Version date")}</dt>
            <dd>
              {currentRelease && (
                <time dateTime={currentRelease.date}>
                  {formatDate(currentRelease.date, data.locale)}
                </time>
              )}
            </dd>
          </div>
          <div>
            <dt>{l("Julkaisukanava", "Release channel")}</dt>
            <dd>{isBeta ? "Beta" : l("Vakaa", "Stable")}</dd>
          </div>
          <div>
            <dt>{l("Build-tunniste", "Build revision")}</dt>
            <dd className="mono">{buildRevision}</dd>
          </div>
          <div>
            <dt>{l("Verkkosivusto", "Website")}</dt>
            <dd>
              <a href="https://phasekit.app" target="_blank" rel="noreferrer">
                phasekit.app
              </a>
            </dd>
          </div>
          <div>
            <dt>{l("Lähdekoodi", "Source code")}</dt>
            <dd>
              <a
                href="https://github.com/huplifi/phasekit"
                target="_blank"
                rel="noreferrer"
              >
                GitHub · huplifi/phasekit
              </a>
            </dd>
          </div>
          <div>
            <dt>{l("Lisenssi", "Licence")}</dt>
            <dd>
              <a
                href="https://github.com/huplifi/phasekit/blob/main/LICENSE"
                target="_blank"
                rel="noreferrer"
              >
                MIT
              </a>
            </dd>
          </div>
        </dl>
        <p className="caption secondary">
          {l(
            "MIT-lisenssi koskee PhaseKitin omaa koodia ja dokumentaatiota. Lähdeaineistoilla, fonteilla ja muilla ulkopuolisilla osilla on omat käyttöehtonsa.",
            "The MIT licence covers PhaseKit’s original code and documentation. Source material, fonts and other third-party components retain their own terms.",
          )}{" "}
          <a
            href="https://github.com/huplifi/phasekit/blob/main/THIRD_PARTY_NOTICES.md"
            target="_blank"
            rel="noreferrer"
          >
            {l(
              "Muiden osien lisenssit ja lähdetiedot",
              "Third-party licences and attribution",
            )}
          </a>
        </p>
        <a
          className="text-button"
          href="https://github.com/huplifi/phasekit/issues"
          target="_blank"
          rel="noreferrer"
        >
          {l(
            "Anna palautetta tai ilmoita virheestä (GitHub Issues)",
            "Share feedback or report an issue (GitHub Issues)",
          )}
        </a>
      </section>
    </>
  );
}
