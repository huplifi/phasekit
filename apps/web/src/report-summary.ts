import type { ReportRow, ToolRecord } from "./storage";
import Decimal from "decimal.js";
import { durationPresentation, durationCalendarNote } from "./duration";
import { formatDecimal } from "../../../packages/i18n/src";

type Locale = "fi" | "en";
type Report = Pick<ToolRecord, "tool" | "title" | "inputs" | "outputs">;

const names: Record<ToolRecord["tool"], [string, string]> = {
  cycle: ["Kylmäkierto", "Refrigeration cycle"],
  pt: ["Paine–lämpötila", "Pressure–temperature"],
  co2e: ["CO₂e", "CO₂e"],
  convert: ["Yksikkömuunnos", "Unit conversion"],
  "thermal-power": ["Lämpöteho", "Thermal power"],
  "heat-quantity": ["Lämpömäärä", "Heat quantity"],
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
  if (
    report.tool === "electrical" &&
    findRow(report.inputs, "Ratkaistava suure", "Electrical solve for")
  ) {
    const primary = primaryReportOutputs(report)[0];
    return [name, primary?.label[locale], formatReportRow(primary, locale)]
      .filter(Boolean)
      .join(" · ");
  }
  if (report.tool === "heat-quantity") {
    const material = findRow(report.inputs, "Aine", "Material");
    const primary = primaryReportOutputs(report)[0];
    return [name, material?.value, formatReportRow(primary, locale)]
      .filter(Boolean)
      .join(" · ");
  }
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
  if (row.unit === "min" && row.label.en === "Duration") {
    const duration = durationPresentation(row.value, locale);
    if (duration) return duration.text;
  }
  const enums: Record<string, Record<string, [string, string]>> = {
    "Breakdown status": {
      reconciled: [
        "Komponenttien summa vastaa kokonaistulosta",
        "Component sum matches the total",
      ],
      mismatch: [
        "Komponenttien summa poikkeaa kokonaistuloksesta",
        "Component sum differs from the total",
      ],
    },
    Calculation: {
      dc: ["Tasavirta", "DC"],
      single_phase: ["1-vaihe", "Single phase"],
      three_phase: ["3-vaihe", "Three phase"],
      ohm: ["Ohmin laki · tasavirta", "Ohm’s law · DC"],
    },
    Assumption: {
      "Sinusoidal load; RMS quantities": [
        "Sinimuotoinen kuorma; RMS-arvot",
        "Sinusoidal load; RMS quantities",
      ],
      "Balanced sinusoidal three-phase load; RMS line quantities": [
        "Tasapainoinen sinimuotoinen 3-vaihekuorma; pääjännite ja johdinvirta RMS-arvoina",
        "Balanced sinusoidal three-phase load; RMS line quantities",
      ],
    },
    "Electrical solve for": {
      power: ["Pätöteho", "Real power"],
      current: ["Virta", "Current"],
      voltage: ["Jännite", "Voltage"],
      resistance: ["Resistanssi", "Resistance"],
    },
    "Solve for": {
      energy: ["Lämpömäärä", "Heat quantity"],
      time: ["Aika", "Time"],
      power: ["Lämpöteho", "Thermal power"],
      mass: ["Massa", "Mass"],
      temperature: ["Loppulämpötila", "Final temperature"],
      "specific-heat": ["Ominaislämpökapasiteetti", "Specific heat capacity"],
    },
    "Entered quantity": {
      pressure: ["Paine", "Pressure"],
      temperature: ["Lämpötila", "Temperature"],
    },
    "Phase boundary": {
      dew: ["Kastepiste", "Dew point"],
      bubble: ["Kuplapiste", "Bubble point"],
    },
    "Flow regime": {
      laminar: ["Laminaarinen", "Laminar"],
      turbulent: ["Turbulenttinen", "Turbulent"],
    },
  };
  const translated =
    enums[row.label.en]?.[row.value]?.[locale === "fi" ? 0 : 1];
  const unavailable =
    row.value === "unavailable" ||
    (row.label.en === "Breakdown status" &&
      row.value.startsWith("unavailable:"));
  const value =
    translated ??
    (unavailable
      ? locale === "fi"
        ? "Erittelyyn tarvittavia tietoja puuttuu"
        : "Data needed for the breakdown is missing"
      : formatReportValue(row.value, locale));
  return `${value}${row.unit ? ` ${row.unit}` : ""}`;
}

/** Readable presentation only; the stored record and JSON retain exact strings. */
export function formatReportValue(value: string, locale: Locale): string {
  const raw = value.trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(raw))
    return value;
  const numeric = new Decimal(raw);
  if (!numeric.isFinite()) return value;
  const rounded = numeric.toSignificantDigits(6);
  const exponent = rounded.isZero() ? 0 : rounded.e;
  const readable =
    exponent >= 9 || exponent <= -5
      ? rounded.toExponential()
      : rounded.toFixed();
  return `${rounded.eq(numeric) ? "" : "≈"}${formatDecimal(readable, locale)}`;
}

export function isCyclePrimaryOutput(row: ReportRow): boolean {
  return (
    row.label.fi === "Tulistus" ||
    row.label.fi === "Alijäähdytys" ||
    row.label.en === "Superheat" ||
    row.label.en === "Subcooling"
  );
}

export function reportHasRoundedValues(
  report: Pick<ToolRecord, "inputs" | "outputs">,
): boolean {
  return [...report.inputs, ...report.outputs].some((row) =>
    formatReportRow(row, "en").startsWith("≈"),
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

/** Select headline results without changing the stored values or their order. */
export function primaryReportOutputs(
  report: Pick<ToolRecord, "tool" | "inputs" | "outputs">,
): ReportRow[] {
  if (report.tool === "electrical") {
    const target = findRow(
      report.inputs,
      "Ratkaistava suure",
      "Electrical solve for",
    )?.value;
    const label = (
      {
        power: "Real power",
        current: "Current",
        voltage: "Voltage",
        resistance: "Resistance",
      } as Record<string, string>
    )[target ?? ""];
    if (label) return report.outputs.filter((row) => row.label.en === label);
  }
  if (report.tool === "heat-quantity") {
    const mode = findRow(
      report.inputs,
      "Ratkaistava suure",
      "Solve for",
    )?.value;
    const labels: Record<string, string> = {
      energy: "Energy",
      time: "Duration",
      power: "Thermal power",
      mass: "Mass",
      temperature: "Final temperature",
      "specific-heat": "Specific heat capacity",
    };
    return report.outputs.filter(
      (row) => row.label.en === (labels[mode ?? ""] ?? "Energy"),
    );
  }
  if (report.tool === "cycle")
    return report.outputs.filter(isCyclePrimaryOutput);
  if (report.tool === "pt") {
    const entered = findRow(
      report.inputs,
      "Syötetty suure",
      "Entered quantity",
    )?.value;
    const label = entered === "temperature" ? "Pressure" : "Temperature";
    return report.outputs.filter((row) => row.label.en === label);
  }
  const preferred: Record<string, string[]> = {
    co2e: ["Result"],
    convert: ["Result"],
    "thermal-power": ["Thermal power"],
    electrical:
      findRow(report.inputs, "Laskenta", "Calculation")?.value === "ohm"
        ? ["Real power", "Current"]
        : ["Real power"],
    pipe: [
      "Pressure loss",
      "Length change",
      "Internal volume",
      "Mean flow velocity",
    ],
  };
  const rows = report.outputs.filter((row) =>
    preferred[report.tool]?.includes(row.label.en),
  );
  return rows.length
    ? rows
    : report.outputs.filter((row) => row.unit).slice(0, 1);
}

export function reportDurationNote(
  report: Pick<ToolRecord, "inputs" | "outputs">,
  locale: Locale,
): string | null {
  return [...report.inputs, ...report.outputs].some(
    (row) =>
      row.unit === "min" &&
      row.label.en === "Duration" &&
      durationPresentation(row.value, locale)?.calendar,
  )
    ? durationCalendarNote(locale)
    : null;
}
