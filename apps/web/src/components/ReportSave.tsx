import { useState, useRef, useEffect } from "react";
import { Bookmark, Printer } from "lucide-react";
import { useApp } from "../context";
import { printToolRecord } from "../report-export";
import type { ToolRecord } from "../storage";
export type ReportContent = Pick<
  ToolRecord,
  | "tool"
  | "title"
  | "inputs"
  | "outputs"
  | "dataVersion"
  | "sources"
  | "chartSnapshot"
>;

/** Parent should key this by its result so edited/recalculated values need a fresh save. */
export function ReportSave({ content }: { content: ReportContent }) {
  const { data, persistToolRecord, notify, setDraftDirty } = useApp();
  const [equipmentId, setEquipmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const chartKey = JSON.stringify(content.chartSnapshot);
  const currentChartKey = useRef(chartKey);
  currentChartKey.current = chartKey;
  useEffect(() => {
    // A changed chart needs a new saved snapshot; keep entered notes and device.
    setSaved(false);
  }, [chartKey]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  const equipment = data.equipment.find((item) => item.id === equipmentId);
  function print() {
    if (
      !printToolRecord(
        {
          ...structuredClone(content),
          notes,
          ...(equipment ? { equipmentName: equipment.name } : {}),
        },
        data.locale,
      )
    )
      notify(
        l(
          "Tulostusikkuna estettiin. Salli ponnahdusikkuna ja yritä uudelleen.",
          "The print window was blocked. Allow pop-ups and try again.",
        ),
      );
  }
  async function save() {
    const savingChartKey = chartKey;
    setSaving(true);
    try {
      await persistToolRecord({
        ...structuredClone(content),
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        notes,
        ...(equipment
          ? { equipmentId: equipment.id, equipmentName: equipment.name }
          : {}),
      });
      if (!mounted.current) return;
      if (currentChartKey.current === savingChartKey) {
        setSaved(true);
        setDraftDirty(false);
      }
      notify(l("Laskelma tallennettu.", "Calculation saved."));
    } catch {
      if (mounted.current)
        notify(
          l(
            "Tallennus epäonnistui. Yritä uudelleen.",
            "Save failed. Please try again.",
          ),
        );
    } finally {
      if (mounted.current) setSaving(false);
    }
  }
  return (
    <details className="report-save">
      <summary>{l("Tallenna tai tulosta", "Save or print")}</summary>
      {data.equipment.length > 0 && (
        <label>
          {l("Laite / kohde", "Equipment / site")}
          <select
            disabled={saving || saved}
            value={equipmentId}
            onChange={(e) => setEquipmentId(e.target.value)}
          >
            <option value="">
              {l("Ei liitettyä laitetta", "No linked equipment")}
            </option>
            {data.equipment.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label>
        {l("Muistiinpanot", "Notes")}
        <textarea
          disabled={saving || saved}
          value={notes}
          maxLength={10000}
          onChange={(e) => {
            setNotes(e.target.value);
            setDraftDirty(true);
          }}
          rows={3}
        />
      </label>
      <div className="report-save-actions">
        <button
          type="button"
          className="secondary-button"
          disabled={saving || saved}
          onClick={() => void save()}
        >
          <Bookmark size={18} />
          {saved
            ? l("Tallennettu", "Saved")
            : saving
              ? l("Tallennetaan…", "Saving…")
              : l("Tallenna", "Save")}
        </button>
        <button type="button" className="secondary-button" onClick={print}>
          <Printer size={18} />
          {l("Tulosta / tallenna PDF", "Print / save as PDF")}
        </button>
      </div>
      <p className="caption secondary">
        {l(
          "Raportti sisältää lähtötiedot, tulokset ja lähteet. Tallennettu laskelma löytyy Raportit-näkymästä.",
          "The report includes inputs, results and sources. Saved calculations appear under Reports.",
        )}
      </p>
    </details>
  );
}
