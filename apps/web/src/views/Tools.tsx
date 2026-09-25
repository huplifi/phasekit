import {
  ArrowLeftRight,
  ChevronRight,
  Thermometer,
  Zap,
  Ruler,
  ListChecks,
} from "lucide-react";
import { useApp } from "../context";
import { ToolMenu } from "../components/Common";

export function Tools() {
  const { t, data, go } = useApp();
  return (
    <>
      <h1>{t("tools")}</h1>
      <p className="secondary">
        {data.locale === "fi"
          ? "Valitse laskuri tai työmaan tarkistuslista."
          : "Choose a calculator or a field-work checklist."}
      </p>
      <ToolMenu />
      <section className="section">
        <h2>
          {data.locale === "fi"
            ? "Mittaukset ja työmaat"
            : "Measurements and field work"}
        </h2>
        <div className="tool-list">
          {[
            {
              path: "convert",
              fi: "Yleinen yksikkömuunnin",
              en: "Unit converter",
              icon: ArrowLeftRight,
            },
            {
              path: "thermal-power",
              fi: "Lämpöteho",
              en: "Thermal power",
              icon: Thermometer,
            },
            {
              path: "electrical",
              fi: "Sähkölaskuri",
              en: "Electrical calculator",
              icon: Zap,
            },
            {
              path: "pipe",
              fi: "Putken tilavuus ja virtaus",
              en: "Pipe volume and flow",
              icon: Ruler,
            },
            {
              path: "checklists",
              fi: "Tarkistuslistat",
              en: "Work checklists",
              icon: ListChecks,
            },
          ].map(({ path, fi, en, icon: Icon }) => (
            <button
              className="tool-row"
              key={path}
              onClick={() => go(`/${path}`)}
            >
              <Icon size={22} aria-hidden="true" />
              <span>{data.locale === "fi" ? fi : en}</span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
