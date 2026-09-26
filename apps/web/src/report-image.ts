import type { ToolRecord } from "./storage";
import {
  formatReportRow,
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
    `${label("Tallennettu", "Saved")}: ${record.createdAt}`,
    23,
    400,
    MUTED,
    9,
  );
  if (record.equipmentName)
    add(
      `${label("Laite / kohde", "Equipment / site")}: ${record.equipmentName}`,
      27,
      600,
      TEXT,
      22,
    );

  const rows = (title: string, values: ToolRecord["inputs"]) => {
    if (!values.length) return;
    heading(title);
    for (const row of values) {
      add(row.label[locale], 22, 600, MUTED, 17);
      add(formatReportRow(row, locale), 29, 400);
    }
  };
  rows(label("Lähtötiedot", "Inputs"), record.inputs);
  rows(label("Tulokset", "Results"), record.outputs);
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
      24,
    );
  if (!record.sources.length)
    add(
      label("Lähteitä ei kirjattu.", "No sources recorded."),
      24,
      400,
      MUTED,
      14,
    );
  for (const source of record.sources) {
    add(source.title, 25, 600, TEXT, 19);
    add(`ID: ${source.id}`, 22, 400, MUTED);
    if (source.version)
      add(`${label("Versio", "Version")}: ${source.version}`, 22, 400, MUTED);
    if (source.checkedAt)
      add(
        `${label("Tarkistettu", "Checked")}: ${source.checkedAt}`,
        22,
        400,
        MUTED,
      );
    if (source.license)
      add(`${label("Lisenssi", "Licence")}: ${source.license}`, 22, 400, MUTED);
    if (source.note)
      add(`${label("Huomautus", "Note")}: ${source.note}`, 22, 400, MUTED);
    add(`${label("Lähdeosoite", "Source URL")}: ${source.url}`, 22, 400, MUTED);
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
  return { lines, height, tooLarge: height > REPORT_IMAGE_MAX_HEIGHT };
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
