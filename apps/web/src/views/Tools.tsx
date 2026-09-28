import {
  ArrowRightLeft,
  ChevronRight,
  Thermometer,
  Waves,
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
          ? "Valitse laskuri. Työmaakirjaukset löydät Raportit-osiosta."
          : "Choose a calculator. Field records are in Reports."}
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
              icon: ArrowRightLeft,
            },
            {
              path: "heat-quantity",
              fi: "Lämpömäärä ja lämmitysaika",
              en: "Heat quantity and heating time",
              icon: Thermometer,
            },
            {
              path: "thermal-power",
              fi: "Lämpöteho",
              en: "Thermal power",
              icon: Waves,
            },
            {
              path: "electrical",
              fi: "Sähkölaskuri",
              en: "Electrical calculator",
              icon: Zap,
            },
            {
              path: "pipe",
              fi: "Putkilaskurit",
              en: "Pipe calculators",
              icon: Ruler,
            },
            {
              path: "reports",
              fi: "Työmaaraportit",
              en: "Field reports",
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
