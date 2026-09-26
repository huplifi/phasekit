import type { ReportRow, ToolRecord } from "./storage";
import Decimal from "decimal.js";
import { formatDecimal } from "../../../packages/i18n/src";

type Locale = "fi" | "en";
type Report = Pick<ToolRecord, "tool" | "title" | "inputs" | "outputs">;

const names: Record<ToolRecord["tool"], [string, string]> = {
  cycle: ["Kylmäkierto", "Refrigeration cycle"],
  pt: ["Paine–lämpötila", "Pressure–temperature"],
  co2e: ["CO₂e", "CO₂e"],
  convert: ["Yksikkömuunnos", "Unit conversion"],
  "thermal-power": ["Lämpöteho", "Thermal power"],
  electrical: ["Sähkölaskuri", "Electrical calculator"],
  pipe: ["Putken tilavuus ja virtaus", "Pipe volume and flow"],
};

export function reportName(report: Report, locale: Locale): string {
  if (
    report.tool === "pipe" &&
    findRow(report.outputs, "Painehäviö", "Pressure loss")
  )
    return locale === "fi"
      ? "Suoran putken painehäviö"
      : "Straight-pipe pressure loss";
  if (
    report.tool === "pipe" &&
    findRow(report.outputs, "Pituuden muutos", "Length change")
  )
    return locale === "fi"
      ? "Putken lämpölaajeneminen"
      : "Pipe thermal expansion";
  const name = names[report.tool]?.[locale === "fi" ? 0 : 1];
  if (report.tool === "cycle" || report.tool === "pt") {
    const refrigerant = findRow(report.inputs, "Kylmäaine", "Refrigerant");
    if (refrigerant) return `${refrigerant.value.split(" (")[0]} · ${name}`;
  }
  return name || report.title;
}

export function reportSummary(report: Report, locale: Locale): string {
  const name = reportName(report, locale);
  if (report.tool === "convert") {
    const quantity = findRow(report.inputs, "Suure", "Quantity")?.value;
    const localizedQuantity = quantity?.split(" / ")[locale === "fi" ? 0 : 1];
    const input = findRow(report.inputs, "Syötetty arvo", "Entered value");
    const output = findRow(report.outputs, "Tulos", "Result");
    return [localizedQuantity || name, transition(input, output, locale)]
      .filter(Boolean)
      .join(" · ");
  }
  if (report.tool === "pt") {
    const input = findRow(report.inputs, "Syötetty arvo", "Entered value");
    const output = report.outputs.find(
      (row) => row.unit && row.unit !== input?.unit,
    );
    return [name, transition(input, output, locale)]
      .filter(Boolean)
      .join(" · ");
  }
  if (report.tool === "co2e") {
    const input = findRow(report.inputs, "Syötetty määrä", "Entered quantity");
    const output = findRow(report.outputs, "Tulos", "Result");
    return [name, transition(input, output, locale)]
      .filter(Boolean)
      .join(" · ");
  }
  if (report.tool === "cycle") {
    const input = findRow(
      report.inputs,
      "LP · Imupaine",
      "LP · Suction pressure",
    );
    const output = report.outputs.find((row) =>
      ["Tulistus", "Alijäähdytys"].includes(row.label.fi),
    );
    return [name, transition(input, output, locale)]
      .filter(Boolean)
      .join(" · ");
  }
  const input = firstValue(report.inputs, [
    "Kylmäaine",
    "Refrigerant",
    "Luokka",
    "Family",
    "Oletus",
    "Assumption",
    "Merkkisääntö / oletus",
    "Sign convention / assumption",
    "Suure",
    "Quantity",
    "Laskenta",
    "Calculation",
    "Syötetty suure",
    "Entered quantity",
  ]);
  const output = firstValue(report.outputs, [
    "Pisteen 4 oletus",
    "Point 4 assumption",
    "Kaavion tila",
    "Diagram status",
    "P–T-aineistoversio",
    "P–T dataset version",
  ]);
  return [name, transition(input, output, locale)].filter(Boolean).join(" · ");
}

function transition(
  input: ReportRow | undefined,
  output: ReportRow | undefined,
  locale: Locale,
): string {
  const from = formatReportRow(input, locale);
  const to = formatReportRow(output, locale);
  return from && to ? `${from} → ${to}` : from || to;
}

export function formatReportRow(
  row: ReportRow | undefined,
  locale: Locale,
): string {
  if (!row?.value?.trim()) return "";
  return `${formatReportValue(row.value, locale)}${row.unit ? ` ${row.unit}` : ""}`;
}

/** Readable presentation only; the stored record and JSON retain exact strings. */
export function formatReportValue(value: string, locale: Locale): string {
  const raw = value.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))
    return value;
  const numeric = new Decimal(raw);
  if (!numeric.isFinite()) return value;
  const rounded = numeric.toSignificantDigits(8);
  const exponent = rounded.isZero() ? 0 : rounded.e;
  const readable =
    exponent >= 9 || exponent <= -5
      ? rounded.toExponential()
      : rounded.toFixed();
  return `${rounded.eq(numeric) ? "" : "≈"}${formatDecimal(readable, locale)}`;
}

export function reportHasRoundedValues(
  report: Pick<ToolRecord, "inputs" | "outputs">,
): boolean {
  return [...report.inputs, ...report.outputs].some((row) =>
    formatReportValue(row.value, "en").startsWith("≈"),
  );
}

function findRow(
  rows: ReportRow[],
  fi: string,
  en: string,
): ReportRow | undefined {
  return rows.find((row) => row.label.fi === fi || row.label.en === en);
}

function firstValue(
  rows: ReportRow[],
  excluded: string[],
): ReportRow | undefined {
  return rows.find(
    (row) =>
      row.value?.trim() &&
      !excluded.includes(row.label.fi) &&
      !excluded.includes(row.label.en) &&
      !/version|versio/i.test(`${row.label.fi} ${row.label.en}`),
  );
}
