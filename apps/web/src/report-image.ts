import type { ToolRecord } from "./storage";
import { cycleChartDimensions, renderCycleChartSvg } from "./ph-chart-snapshot";
import { formatDate } from "../../../packages/i18n/src";
import { isCalendarDate } from "../../../packages/core/src/schedule";
import {
  formatReportRow,
  primaryReportOutputs,
  reportHasRoundedValues,
  reportName,
} from "./report-summary";

type Locale = "fi" | "en";
type Line = {
  text: string;
  x: number;
  y: number;
  size: number;
  weight: 400 | 600 | 700;
  color: string;
};
type Measure = (text: string, size: number, weight: Line["weight"]) => number;

export const REPORT_IMAGE_WIDTH = 1200;
export const REPORT_IMAGE_MAX_HEIGHT = 6000;
const LEFT = 72;
const RIGHT = REPORT_IMAGE_WIDTH - 72;
const TEXT = "#17313a";
const MUTED = "#52666c";

/** Keeps every recorded field. Oversized records fail before a canvas is allocated. */
export function planReportImage(
  record: ToolRecord,
  locale: Locale,
  measure: Measure,
) {
  const lines: Line[] = [];
  let y = 74;
  const label = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const add = (
    value: string,
    size = 28,
    weight: Line["weight"] = 400,
    color = TEXT,
    gap = 0,
  ) => {
    y += gap;
    for (const paragraph of value.split(/\r\n|\r|\n/)) {
      for (const text of wrapCanvasText(paragraph, RIGHT - LEFT, (part) =>
        measure(part, size, weight),
      )) {
        y += Math.ceil(size * 1.42);
        lines.push({ text, x: LEFT, y, size, weight, color });
      }
    }
  };
  const heading = (value: string) => add(value, 34, 700, TEXT, 36);

  add("PHASEKIT", 25, 700, "#477d50");
  add(reportName(record, locale), 47, 700, TEXT, 24);
  add(
    `${label("Tallennettu", "Saved")}: ${isCalendarDate(record.createdAt.slice(0, 10)) ? formatDate(record.createdAt.slice(0, 10), locale) : record.createdAt}`,
    23,
    400,
    MUTED,
    9,
  );
  if (record.equipmentName)
    add(
      `${label("Alkuperäinen laitenimi", "Equipment name when saved")}: ${record.equipmentName}`,
      27,
      600,
      TEXT,
      22,
    );
  else if (record.lastLinkedEquipmentName)
    add(
      `${label("Aiempi laitelinkki (nimi poistettaessa)", "Former equipment link (name at removal)")}: ${record.lastLinkedEquipmentName}`,
      24,
      600,
      TEXT,
      20,
    );

  const rows = (
    title: string,
    values: ToolRecord["inputs"],
    primary = false,
  ) => {
    if (!values.length) return;
    heading(title);
    const primaryRows = primary ? primaryReportOutputs(record) : [];
    if (primary)
      for (const row of primaryRows) {
        add(row.label[locale], 23, 600, MUTED, 22);
        add(formatReportRow(row, locale), 43, 700, TEXT, 2);
      }
    for (const row of values) {
      if (primaryRows.includes(row)) continue;
      add(
        `${row.label[locale]}: ${formatReportRow(row, locale)}`,
        24,
        400,
        TEXT,
        11,
      );
    }
  };
  rows(label("Tulokset", "Results"), record.outputs, true);
  rows(label("Lähtötiedot", "Inputs"), record.inputs);
  let chartTop: number | undefined;
  let chartHeight: number | undefined;
  if (record.chartSnapshot) {
    heading(label("Kylmäkierron kaavio", "Cycle diagram"));
    chartTop = y + 20;
    const natural = cycleChartDimensions(record.chartSnapshot, locale);
    chartHeight = ((RIGHT - LEFT) / natural.width) * natural.height;
    y += chartHeight + 25;
    add(
      label(
        "Rajattu CoolProp HEOS -malli. Suorat viivat kuvaavat kierron järjestystä, eivät prosessireittiä.",
        "Bounded CoolProp HEOS model. Straight lines show cycle order, not the process path.",
      ),
      19,
      400,
      MUTED,
      8,
    );
  }
  if (reportHasRoundedValues(record))
    add(
      label(
        "≈ tarkoittaa näytössä pyöristettyä arvoa. JSON-vienti säilyttää tarkat tallennetut luvut.",
        "≈ marks a rounded display value. JSON export keeps the exact recorded numbers.",
      ),
      21,
      400,
      MUTED,
      26,
    );
  if (record.notes) {
    heading(label("Muistiinpanot", "Notes"));
    add(record.notes, 26);
  }
  heading(label("Lähteet ja versiotiedot", "Sources and version information"));
  if (record.dataVersion)
    add(
      `${label("Aineistoversio", "Data version")}: ${record.dataVersion}`,
      21,
    );
  if (!record.sources.length)
    add(
      label("Lähteitä ei kirjattu.", "No sources recorded."),
      21,
      400,
      MUTED,
      14,
    );
  for (const source of record.sources) {
    add(`${source.title} · ID: ${source.id}`, 21, 600, TEXT, 12);
    if (source.version)
      add(`${label("Versio", "Version")}: ${source.version}`, 20, 400, MUTED);
    if (source.checkedAt)
      add(
        `${label("Tarkistettu", "Checked")}: ${source.checkedAt}`,
        20,
        400,
        MUTED,
      );
    if (source.license)
      add(`${label("Lisenssi", "Licence")}: ${source.license}`, 20, 400, MUTED);
    if (source.note)
      add(`${label("Huomautus", "Note")}: ${source.note}`, 20, 400, MUTED);
    add(`${label("Lähdeosoite", "Source URL")}: ${source.url}`, 20, 400, MUTED);
  }
  add(
    label(
      "Arvio tallennettujen lähtötietojen ja lähteiden perusteella. Ei vaatimustenmukaisuussertifikaatti tai laitehyväksyntä.",
      "Estimate based on recorded inputs and sources. Not a compliance certificate or equipment approval.",
    ),
    21,
    400,
    MUTED,
    38,
  );
  const height = y + 80;
  return {
    lines,
    chartTop,
    chartHeight,
    height,
    tooLarge: height > REPORT_IMAGE_MAX_HEIGHT,
  };
}

/** Word wrapping also splits long unbroken values and URLs without clipping. */
export function wrapCanvasText(
  value: string,
  maxWidth: number,
  measure: (part: string) => number,
): string[] {
  if (!value) return [""];
  const output: string[] = [];
  let line = "";
  for (const word of value.split(/\s+/)) {
    if (!word) continue;
    const next = line ? `${line} ${word}` : word;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) output.push(line);
    const chars = Array.from(word);
    let chunk = "";
    for (const char of chars) {
      if (chunk && measure(chunk + char) > maxWidth) {
        output.push(chunk);
        chunk = char;
      } else chunk += char;
    }
    line = chunk;
  }
  if (line) output.push(line);
  return output.length ? output : [""];
}

export async function downloadToolRecordImage(
  record: ToolRecord,
  locale: Locale,
): Promise<"downloaded" | "too_large" | "failed"> {
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return "failed";
    const font = (size: number, weight: Line["weight"]) =>
      `${weight} ${size}px system-ui, sans-serif`;
    const plan = planReportImage(record, locale, (text, size, weight) => {
      context.font = font(size, weight);
      return context.measureText(text).width;
    });
    if (plan.tooLarge) return "too_large";
    canvas.width = REPORT_IMAGE_WIDTH;
    canvas.height = plan.height;
    context.fillStyle = "#f8fcfd";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#477d50";
    context.fillRect(72, 45, canvas.width - 144, 5);
    context.textBaseline = "alphabetic";
    for (const line of plan.lines) {
      context.font = font(line.size, line.weight);
      context.fillStyle = line.color;
      context.fillText(line.text, line.x, line.y);
    }
    if (
      record.chartSnapshot &&
      plan.chartTop !== undefined &&
      plan.chartHeight !== undefined
    ) {
      const chart = new Image();
      const loaded = new Promise<void>((resolve, reject) => {
        chart.onload = () => resolve();
        chart.onerror = () => reject(new Error("Chart image failed to load"));
      });
      chart.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCycleChartSvg(record.chartSnapshot, locale))}`;
      await loaded;
      context.drawImage(
        chart,
        LEFT,
        plan.chartTop,
        RIGHT - LEFT,
        plan.chartHeight,
      );
    }
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) return "failed";
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `phasekit-report-${record.id.replace(/[^a-z0-9-]/gi, "-").slice(0, 80)}.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    return "downloaded";
  } catch {
    return "failed";
  }
}
