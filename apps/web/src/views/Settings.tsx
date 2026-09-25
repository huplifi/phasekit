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
  const [confirm, setConfirm] = useState(false);
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
          <button
            className="text-button danger-text"
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
        <a
          className="text-button"
          href="/coverage.html"
          target="_blank"
          rel="noreferrer"
        >
          {t("coverageReport")}
        </a>
        <h3>{t("install")}</h3>
        <p className="secondary">{t("installHelp")}</p>
      </section>
    </>
  );
}
