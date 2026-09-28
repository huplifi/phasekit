import Decimal from "decimal.js";
import { formatDecimal } from "../../../packages/i18n/src";

type Locale = "fi" | "en";
const DAY = 86400;
const YEAR = 365 * DAY;
const MONTH = YEAR / 12;
const D = Decimal.clone({ precision: 300 });

export const durationCalendarNote = (locale: Locale) =>
  locale === "fi"
    ? "Pitkien kestojen kk ja v ovat likimääräisiä: 1 v = 365 vrk ja 1 kk = 1/12 v."
    : "Months and years are approximate durations: 1 yr = 365 days and 1 mo = 1/12 yr.";

/** Display only. Stored values remain exact decimal minutes, without a start date. */
export function durationPresentation(
  minutes: string,
  locale: Locale,
): {
  text: string;
  calendar: boolean;
} | null {
  const raw = minutes.trim().replace(",", ".");
  if (!/^[+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw)) return null;
  const seconds = new D(raw).times(60);
  if (!seconds.isFinite()) return null;
  if (seconds.isZero()) return { text: "0 s", calendar: false };
  if (seconds.lt(1)) return { text: "< 1 s", calendar: false };
  if (seconds.gte(new D(YEAR).times("1e9"))) {
    return {
      text: `≈${formatDecimal(seconds.div(YEAR).toSignificantDigits(6).toExponential(), locale)} ${locale === "fi" ? "v" : "yr"}`,
      calendar: true,
    };
  }
  // Round only seconds before decomposition. A fixed month is not an integer
  // number of days; rounding total days first would erase exact month boundaries.
  const rounded = seconds.toDecimalPlaces(0, D.ROUND_HALF_UP);
  const calendar = rounded.gte(MONTH);
  const units: [number, string][] = [
    [YEAR, locale === "fi" ? "v" : "yr"],
    [MONTH, locale === "fi" ? "kk" : "mo"],
    [DAY, locale === "fi" ? "vrk" : "d"],
    [3600, "h"],
    [60, "min"],
    [1, "s"],
  ];
  // At most three adjacent scales: years/months/days, months/days/hours,
  // days/hours/minutes, or hours/minutes/seconds. Zero components are omitted.
  const first = units.findIndex(([size]) => rounded.gte(size));
  let remaining = rounded;
  const parts: string[] = [];
  for (const [size, label] of units.slice(first, first + 3)) {
    const count = remaining.div(size).floor();
    remaining = remaining.minus(count.times(size));
    if (!count.isZero())
      parts.push(`${formatDecimal(count.toFixed(0), locale)} ${label}`);
  }
  return {
    text: `${calendar || !rounded.eq(seconds) || !remaining.isZero() ? "≈" : ""}${parts.join(" ")}`,
    calendar,
  };
}

export function formatDurationMinutes(minutes: string, locale: Locale): string {
  return durationPresentation(minutes, locale)?.text ?? "—";
}
