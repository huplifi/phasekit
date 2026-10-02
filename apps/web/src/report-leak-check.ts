import type {
  CheckInput,
  CheckResult,
} from "../../../packages/core/src/contracts";
import {
  evaluateCheck,
  reasonMessages,
} from "../../../packages/rulesets/eu-fi/src/index";
import { dataset } from "./data";

type Text = { fi: string; en: string };
export type CommissioningLeakAssessment = {
  state: "needs_input" | "resolved" | "needs_review";
  missing: string[];
  summary: Text;
  result?: CheckResult;
  fieldPatch?: { leakCheckInterval: string; leakCheckEvidence: string };
};

const yesNo = (value: string | undefined): value is "yes" | "no" =>
  value === "yes" || value === "no";
const equipment = [
  "stationary_refrigeration",
  "stationary_ac",
  "stationary_heat_pump",
] as const;

/** Reuse the legal engine; incomplete inputs never become an exemption. */
export function evaluateCommissioningLeakCheck(
  fields: Record<string, string>,
): CommissioningLeakAssessment {
  const missing = ["performedOn", "refrigerantId", "chargeKg"].filter(
    (id) => !fields[id]?.trim(),
  );
  if (!fields.leakEquipment?.trim()) missing.push("leakEquipment");
  if (!yesNo(fields.leakDetection)) missing.push("leakDetection");
  if (!yesNo(fields.leakHermetic)) missing.push("leakHermetic");
  if (fields.leakHermetic === "yes") {
    if (!yesNo(fields.leakHermeticLabel)) missing.push("leakHermeticLabel");
    if (fields.leakHermeticLabel === "yes" && !yesNo(fields.leakResidential))
      missing.push("leakResidential");
  }
  if (missing.length)
    return {
      state: "needs_input",
      missing,
      summary: {
        fi: "Täydennä vuototarkastuksen lähtötiedot.",
        en: "Complete the leak-check inputs.",
      },
    };
  if (!equipment.some((item) => item === fields.leakEquipment))
    return {
      state: "needs_review",
      missing: [],
      summary: {
        fi: "Laitetyyppi vaatii erillisen säädöstarkistuksen.",
        en: "This equipment type needs a separate rule assessment.",
      },
    };
  const input: CheckInput = {
    refrigerantId: fields.refrigerantId,
    charge: fields.chargeKg,
    unit: "kg",
    equipment: fields.leakEquipment as CheckInput["equipment"],
    detection: fields.leakDetection === "yes",
    hermetic: fields.leakHermetic === "yes",
    hermeticLabel:
      fields.leakHermetic === "yes" && fields.leakHermeticLabel === "yes",
    residential:
      fields.leakHermetic === "yes" &&
      fields.leakHermeticLabel === "yes" &&
      fields.leakResidential === "yes",
    asOf: fields.performedOn,
  };
  const result = evaluateCheck(input, dataset);
  const reason = result.reasonCodes
    .map((code) => reasonMessages[code])
    .find(Boolean);
  if (["unsupported", "insufficient_data"].includes(result.state))
    return {
      state: "needs_review",
      missing: result.requiredInputs,
      result,
      summary: reason ?? {
        fi: "Sääntöä ei voi ratkaista näillä tiedoilla.",
        en: "The rule cannot be resolved from these inputs.",
      },
    };
  const summary: Text =
    result.state === "required" && result.months !== null
      ? {
          fi: `Vuototarkastus vähintään ${result.months} kuukauden välein.`,
          en: `Leak check at least every ${result.months} months.`,
        }
      : result.state === "below_threshold"
        ? {
            fi: "Määräaikaisen vuototarkastuksen kynnys ei täyty.",
            en: "The periodic leak-check threshold is not met.",
          }
        : result.state === "exempt"
          ? {
              fi: "Määräaikaisesta vuototarkastuksesta on soveltuva poikkeus.",
              en: "An applicable periodic leak-check exemption applies.",
            }
          : {
              fi: "Valittu aine ja laite eivät kuulu tämän määräaikaisen vuototarkastussäännön soveltamisalaan.",
              en: "The selected refrigerant and equipment are outside this periodic leak-check rule.",
            };
  const evidence = JSON.stringify({
    rulesetVersion: result.rulesetVersion,
    dataVersion: result.dataVersion,
    asOf: input.asOf,
    input,
    state: result.state,
    months: result.months,
    decisiveRule: result.decisiveRule,
    reasonCodes: result.reasonCodes,
    sourceIds: result.sourceIds,
  });
  return {
    state: "resolved",
    missing: [],
    result,
    summary,
    fieldPatch: {
      leakCheckInterval:
        `${summary.fi} ${reason?.fi ?? ""} (${result.rulesetVersion}; ${input.asOf})`.trim(),
      leakCheckEvidence: evidence,
    },
  };
}
