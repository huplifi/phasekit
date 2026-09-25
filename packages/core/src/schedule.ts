import type { CheckResult } from "./contracts";

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Calendar months, clamping an absent day to the target month's last day. */
export function addCalendarMonths(date: string, months: number): string {
  if (
    !isCalendarDate(date) ||
    !Number.isInteger(months) ||
    months < 1 ||
    months > 120
  )
    throw new Error("invalid_schedule");
  const [year, month, day] = date.split("-").map(Number);
  const end = new Date(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-01T00:00:00Z`,
  );
  end.setUTCMonth(end.getUTCMonth() + months + 1, 0);
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  if (end.getUTCFullYear() > 9999) throw new Error("invalid_schedule");
  return end.toISOString().slice(0, 10);
}

export function nextInspectionDate(
  result: Pick<CheckResult, "state" | "months" | "input">,
  completed: string,
): string | null {
  if (
    !isCalendarDate(completed) ||
    !isCalendarDate(result.input.asOf) ||
    completed > result.input.asOf
  )
    throw new Error("inspection_after_assessment");
  if (result.state !== "required" || result.months === null) return null;
  return addCalendarMonths(completed, result.months);
}
