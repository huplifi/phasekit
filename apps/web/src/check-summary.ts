import type { CheckResult, Source } from "../../../packages/core/src/contracts";
import { nextInspectionDate } from "../../../packages/core/src/schedule";
import { translate, type Locale } from "../../../packages/i18n/src";
import { reasonMessages } from "../../../packages/rulesets/eu-fi/src/reasons";

export function checkSummary(
  result: CheckResult,
  designation: string,
  completed: string | undefined,
  sources: Source[],
  locale: Locale,
): string {
  const l = (fi: string, en: string) => (locale === "fi" ? fi : en);
  const yesNo = (value: boolean) => (value ? l("Kyllä", "Yes") : l("Ei", "No"));
  let due: string | null = null;
  if (completed) {
    try {
      due = nextInspectionDate(result, completed);
    } catch {
      /* Do not export an invalid deadline. */
    }
  }
  const input = result.input;
  return [
    `PhaseKit · ${l("Vuototarkastus", "Leak-check assessment")} · ${designation}`,
    `${translate(locale, "charge")}: ${input.charge} ${input.unit}`,
    `${translate(locale, "equipment")}: ${translate(locale, input.equipment)}`,
    `${translate(locale, "asOf")}: ${input.asOf}`,
    `${translate(locale, "detection")}: ${yesNo(input.detection)}`,
    `${translate(locale, "hermetic")}: ${yesNo(input.hermetic)}`,
    ...(input.hermetic
      ? [
          `${translate(locale, "hermeticLabel")}: ${yesNo(input.hermeticLabel)}`,
          `${translate(locale, "residential")}: ${yesNo(input.residential)}`,
        ]
      : []),
    `${l("Tulos", "Result")}: ${translate(locale, result.state)}`,
    ...(result.months !== null
      ? [translate(locale, "months", { count: result.months })]
      : []),
    ...result.reasonCodes.map((code) => reasonMessages[code]?.[locale] ?? code),
    ...result.obligations.map(
      (item) =>
        `${item.component}: ${item.quantity} ${item.unit}${item.months !== null ? ` · ${item.months} ${l("kk", "months")}` : ""}`,
    ),
    ...(completed
      ? [
          `${l("Viimeksi tehty tarkastus", "Last completed inspection")}: ${completed}`,
        ]
      : []),
    ...(due
      ? [
          `${l("Seuraava määräpäivä samoilla lähtötiedoilla", "Next due date under the same conditions")}: ${due}`,
        ]
      : []),
    `${l("Sääntöversio", "Ruleset")}: ${result.rulesetVersion}`,
    `${l("Dataversio", "Dataset")}: ${result.dataVersion}`,
    "",
    l(
      "Määräaikaisen tarkastuksen arvio EU / Suomi. Ei huolto- tai käyttöhyväksyntä. Vuodon korjauksen jälkitarkastuksella on erilliset vaatimukset. Olosuhteiden tai sääntöjen muuttuessa arvioi väli uudelleen.",
      "Periodic check assessment for EU / Finland. Not a servicing or equipment approval. Post-repair checks have separate requirements. Reassess the interval when conditions or rules change.",
    ),
    ...sources.map((source) => `${source.title}: ${source.url}`),
    "https://phasekit.app",
  ].join("\n");
}
