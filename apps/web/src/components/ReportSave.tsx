import { useState, useRef, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { useApp } from "../context";
import type { ToolRecord } from "../storage";
export type ReportContent = Pick<
  ToolRecord,
  "tool" | "title" | "inputs" | "outputs" | "dataVersion" | "sources"
>;

/** Parent should key this by its result so edited/recalculated values need a fresh save. */
export function ReportSave({ content }: { content: ReportContent }) {
  const { data, persistToolRecord, notify, setDraftDirty } = useApp();
  const [equipmentId, setEquipmentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const l = (fi: string, en: string) => (data.locale === "fi" ? fi : en);
  async function save() {
    setSaving(true);
    try {
      const equipment = data.equipment.find((item) => item.id === equipmentId);
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
      setSaved(true);
      setDraftDirty(false);
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
      <summary>{l("Tallenna laskelma", "Save calculation")}</summary>
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
      <p className="caption secondary">
        {l(
          "Tallennettu laskelma säilyttää arvot ja lähteet. Löydät sen Tallennetut-välilehdeltä ja voit tulostaa raportin PDF:ksi.",
          "Saved calculations retain their values and sources. Find them under Saved and print a report to PDF.",
        )}
      </p>
    </details>
  );
}
