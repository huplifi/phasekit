import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import type {
  CheckResult,
  Source,
} from "../../../../packages/core/src/contracts";
import { nextInspectionDate } from "../../../../packages/core/src/schedule";
import { formatDate } from "../../../../packages/i18n/src";
import { useApp } from "../context";
import { checkSummary } from "../check-summary";

export function CheckSchedule({
  result,
  completed,
  designation,
  sources,
}: {
  result: CheckResult;
  completed?: string;
  designation: string;
  sources: Source[];
}) {
  const { data } = useApp();
  const [notice, setNotice] = useState("");
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  let due: string | null = null;
  let invalid = false;
  if (completed) {
    try {
      due = nextInspectionDate(result, completed);
    } catch {
      invalid = true;
    }
  }
  const text = checkSummary(
    result,
    designation,
    completed,
    sources,
    data.locale,
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(l("Selite kopioitu.", "Explanation copied."));
    } catch {
      setNotice(
        l(
          "Kopiointi ei onnistunut. Avaa selite ja kopioi teksti käsin.",
          "Could not copy. Open the explanation and copy the text manually.",
        ),
      );
    }
  }
  async function share() {
    try {
      await navigator.share({ title: `PhaseKit · ${designation}`, text });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setNotice(
          l(
            "Jakaminen ei onnistunut. Voit kopioida selitteen.",
            "Could not share. You can copy the explanation.",
          ),
        );
    }
  }
  return (
    <div className="check-schedule">
      {invalid && (
        <p className="notice error">
          {l(
            "Tarkastuspäivän on oltava kelvollinen eikä se voi olla arviointipäivän jälkeen.",
            "The inspection date must be valid and cannot follow the assessment date.",
          )}
        </p>
      )}
      {due && (
        <div className="notice">
          <strong>
            {l("Seuraava määräpäivä", "Next due date")}:{" "}
            {formatDate(due, data.locale)}
          </strong>
          <p className="caption">
            {l("Viimeksi tehty tarkastus", "Last completed inspection")}:{" "}
            {formatDate(completed!, data.locale)}.{" "}
            {l(
              "Sama laite, täytös ja vuodonilmaisin. Arvioi väli uudelleen, jos lähtötiedot tai säännöt muuttuvat.",
              "Same equipment, charge and detection system. Reassess if conditions or rules change.",
            )}
          </p>
          {due < result.input.asOf && (
            <p>
              {l(
                "Määräpäivä on ennen arviointipäivää.",
                "The due date precedes the assessment date.",
              )}
            </p>
          )}
        </div>
      )}
      {result.state === "required" && !completed && (
        <p className="caption secondary">
          {l(
            "Syötä viimeksi tehdyn tarkastuksen päivä, jos haluat myös seuraavan määräpäivän.",
            "Enter the last completed inspection date to see the next due date.",
          )}
        </p>
      )}
      <div className="button-group">
        <button
          type="button"
          className="secondary-button"
          onClick={() => void copy()}
        >
          <Copy size={18} />
          {l("Kopioi selite", "Copy explanation")}
        </button>
        {typeof navigator.share === "function" && (
          <button
            type="button"
            className="secondary-button"
            onClick={() => void share()}
          >
            <Share2 size={18} />
            {l("Jaa selite", "Share explanation")}
          </button>
        )}
      </div>
      <details className="share-explanation">
        <summary>
          {l("Näytä jaettava selite", "Show shareable explanation")}
        </summary>
        <p className="caption secondary">
          {l("Seliteteksti", "Explanation text")}
        </p>
        <pre
          className="share-text"
          tabIndex={0}
          aria-label={l("Seliteteksti", "Explanation text")}
        >
          {text}
        </pre>
      </details>
      <p role="status" className="caption">
        {notice}
      </p>
    </div>
  );
}
