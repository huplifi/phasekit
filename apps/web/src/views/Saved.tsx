import { Download, Trash2 } from "lucide-react";
import { useApp } from "../context";
import { formatDate } from "../../../../packages/i18n/src";
import { CheckResultView } from "./Check";
import { downloadJSON } from "../storage";
export function Saved() {
  const { t, data, setData } = useApp();
  return (
    <>
      <h1>{t("saved")}</h1>
      {data.snapshots.length === 0 ? (
        <p className="empty">{t("emptySaved")}</p>
      ) : (
        data.snapshots.map((s) => (
          <details className="saved-entry" key={s.id}>
            <summary>
              <span>
                <strong className="mono">{s.refrigerant.designation}</strong>
                <span className="secondary">
                  {formatDate(s.createdAt, data.locale)} ·{" "}
                  {s.result.input.charge} {s.result.input.unit}
                </span>
              </span>
            </summary>
            <p className="notice caption">{t("savedSnapshot")}</p>
            <p>
              {t("equipment")}: {t(s.result.input.equipment)}
              <br />
              {t("asOf")}: {s.result.input.asOf}
            </p>
            <CheckResultView result={s.result} snapshot={s} />
            <div className="button-group">
              <button
                className="text-button"
                onClick={() =>
                  downloadJSON(s, `phasekit-${s.refrigerant.id}-${s.id}.json`)
                }
              >
                <Download size={18} />
                {t("exportSnapshot")}
              </button>
              <button
                className="text-button danger-text"
                onClick={() =>
                  setData((d) => ({
                    ...d,
                    snapshots: d.snapshots.filter((item) => item.id !== s.id),
                  }))
                }
              >
                <Trash2 size={18} />
                {t("delete")}
              </button>
            </div>
          </details>
        ))
      )}
    </>
  );
}
