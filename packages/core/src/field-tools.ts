import { parseDecimal } from "./units";

export type FlowUnit = "l/s" | "l/min" | "m3/h";
/** Sensible heat transfer, positive when the fluid gains heat. No phase change. */
export function calculateThermalPower(input: {
  flow: string;
  flowUnit: FlowUnit;
  inletC: string;
  outletC: string;
  densityKgM3: string;
  specificHeatKJkgK: string;
}) {
  const flow = parseDecimal(input.flow);
  const density = parseDecimal(input.densityKgM3);
  const cp = parseDecimal(input.specificHeatKJkgK);
  const inlet = parseDecimal(input.inletC);
  const outlet = parseDecimal(input.outletC);
  if (flow.lt(0)) throw new Error("negative_flow");
  if (density.lte(0) || cp.lte(0))
    throw new Error("positive_properties_required");
  if (inlet.lt("-273.15") || outlet.lt("-273.15"))
    throw new Error("invalid_temperature");
  const divisors = { "l/s": 1000, "l/min": 60000, "m3/h": 3600 };
  const divisor = divisors[input.flowUnit];
  if (!divisor) throw new Error("invalid_unit");
  const massFlow = flow.div(divisor).mul(density);
  const delta = outlet.minus(inlet);
  return {
    massFlowKgS: massFlow.toString(),
    differenceK: delta.toString(),
    powerKW: massFlow.mul(cp).mul(delta).toString(),
  };
}
export type ElectricalMode = "dc" | "single_phase" | "three_phase" | "ohm";
/** AC inputs are RMS; three-phase assumes a balanced sinusoidal load. */
export function calculateElectrical(input: {
  mode: ElectricalMode;
  voltageV: string;
  currentA?: string;
  resistanceOhm?: string;
  powerFactor?: string;
}) {
  const voltage = parseDecimal(input.voltageV);
  if (voltage.lt(0)) throw new Error("negative_electrical_quantity");
  if (!["dc", "single_phase", "three_phase", "ohm"].includes(input.mode))
    throw new Error("invalid_mode");
  if (input.mode === "ohm") {
    const resistance = parseDecimal(input.resistanceOhm ?? "");
    if (resistance.lte(0)) throw new Error("positive_resistance_required");
    const current = voltage.div(resistance);
    return {
      currentA: current.toString(),
      powerW: voltage.mul(current).toString(),
      apparentVA: null,
    };
  }
  const current = parseDecimal(input.currentA ?? "");
  if (current.lt(0)) throw new Error("negative_electrical_quantity");
  const ac = input.mode !== "dc";
  const pf = parseDecimal(ac ? (input.powerFactor ?? "") : "1");
  if (pf.lt(0) || pf.gt(1)) throw new Error("invalid_power_factor");
  const apparent = voltage
    .mul(current)
    .mul(input.mode === "three_phase" ? parseDecimal("3").sqrt() : 1);
  return {
    currentA: current.toString(),
    powerW: apparent.mul(pf).toString(),
    apparentVA: ac ? apparent.toString() : null,
  };
}

export type ChecklistKind = "tightness" | "evacuation" | "commissioning";
export interface ChecklistDraft {
  id: string;
  kind: ChecklistKind;
  title: string;
  updatedAt: string;
  checkedIds: string[];
  fields: Record<string, string>;
  notes: string;
}
type Text = { fi: string; en: string };
const text = (fi: string, en: string): Text => ({ fi, en });
export const checklistDefinitions: Record<
  ChecklistKind,
  {
    name: Text;
    steps: { id: string; label: Text }[];
    fields: { id: string; label: Text }[];
  }
> = {
  tightness: {
    name: text("Paine- ja tiiviyskoe", "Pressure and tightness test"),
    steps: [
      {
        id: "instructions",
        label: text(
          "Kohteen ohje, rajat ja koemenettely tarkistettu",
          "Equipment instructions, limits and test procedure checked",
        ),
      },
      {
        id: "preparation",
        label: text(
          "Kohde ja mittalaitteet valmisteltu ohjeen mukaan",
          "Equipment and instruments prepared to the specified procedure",
        ),
      },
      {
        id: "measurements",
        label: text(
          "Paineet, lämpötilat ja koeajat kirjattu",
          "Pressures, temperatures and test times recorded",
        ),
      },
      {
        id: "leaks",
        label: text(
          "Liitosten tarkastus ja mahdolliset vuodot kirjattu",
          "Joint inspection and any leaks recorded",
        ),
      },
      {
        id: "review",
        label: text(
          "Havainnot verrattu kohteen hyväksymisrajoihin",
          "Observations compared with the equipment acceptance criteria",
        ),
      },
    ],
    fields: [
      {
        id: "medium",
        label: text("Koekaasu / koeväliaine", "Test gas / medium"),
      },
      {
        id: "criterion",
        label: text(
          "Ohjeen koepaine, kesto ja hyväksymisrajat",
          "Specified test pressure, duration and acceptance criteria",
        ),
      },
      {
        id: "start",
        label: text(
          "Alku: aika, paine ja lämpötila (yksiköineen)",
          "Start: time, pressure and temperature (with units)",
        ),
      },
      {
        id: "end",
        label: text(
          "Loppu: aika, paine ja lämpötila (yksiköineen)",
          "End: time, pressure and temperature (with units)",
        ),
      },
      {
        id: "finding",
        label: text(
          "Vuotohavainnot ja arvio",
          "Leak observations and assessment",
        ),
      },
    ],
  },
  evacuation: {
    name: text("Tyhjiöinti", "Evacuation"),
    steps: [
      {
        id: "instructions",
        label: text(
          "Kohteen ohje ja tavoitearvot tarkistettu",
          "Equipment procedure and target values checked",
        ),
      },
      {
        id: "preparation",
        label: text(
          "Tiiviys ja tyhjiöintilaitteiston valmius tarkistettu",
          "Tightness and evacuation equipment readiness checked",
        ),
      },
      {
        id: "measurement",
        label: text(
          "Saavutettu tyhjiö ja mittauspaikka kirjattu",
          "Achieved vacuum and measurement location recorded",
        ),
      },
      {
        id: "hold",
        label: text(
          "Ohjeen mukainen pitokoe ja paineennousu kirjattu",
          "Specified standing test and pressure rise recorded",
        ),
      },
      {
        id: "review",
        label: text(
          "Havainnot verrattu kohteen hyväksymisrajoihin",
          "Observations compared with the equipment acceptance criteria",
        ),
      },
    ],
    fields: [
      {
        id: "criterion",
        label: text(
          "Ohjeen tyhjiötavoite ja pitokokeen rajat",
          "Specified vacuum target and standing-test criteria",
        ),
      },
      {
        id: "instrument",
        label: text(
          "Mittari ja mittauspaikka",
          "Gauge and measurement location",
        ),
      },
      {
        id: "vacuum",
        label: text(
          "Saavutettu tyhjiö ja aika (yksiköineen)",
          "Achieved vacuum and time (with units)",
        ),
      },
      {
        id: "hold",
        label: text(
          "Pitokokeen alku-/loppupaine ja kesto",
          "Standing-test start/end pressure and duration",
        ),
      },
      {
        id: "finding",
        label: text("Havainnot ja arvio", "Observations and assessment"),
      },
    ],
  },
  commissioning: {
    name: text("Käyttöönotto", "Commissioning"),
    steps: [
      {
        id: "instructions",
        label: text(
          "Kohteen käyttöönotto-ohje ja perustiedot tarkistettu",
          "Equipment commissioning instructions and details checked",
        ),
      },
      {
        id: "preconditions",
        label: text(
          "Tiiviys-, tyhjiöinti- ja muut edellytetyt tarkastukset kirjattu",
          "Tightness, evacuation and other required checks recorded",
        ),
      },
      {
        id: "charge",
        label: text(
          "Kylmäaine ja täytös kirjattu",
          "Refrigerant and charge recorded",
        ),
      },
      {
        id: "measurements",
        label: text(
          "Käyntiarvot ja käyttöolosuhteet kirjattu",
          "Operating measurements and conditions recorded",
        ),
      },
      {
        id: "controls",
        label: text(
          "Ohjeen mukaiset säädöt ja toimintakokeet kirjattu",
          "Specified adjustments and functional tests recorded",
        ),
      },
      {
        id: "handover",
        label: text(
          "Poikkeamat, jatkotoimet ja luovutus kirjattu",
          "Exceptions, follow-up actions and handover recorded",
        ),
      },
    ],
    fields: [
      {
        id: "charge",
        label: text("Kylmäaine ja täytös (kg)", "Refrigerant and charge (kg)"),
      },
      {
        id: "conditions",
        label: text(
          "Käyttöolosuhteet ja kuormitus",
          "Operating conditions and load",
        ),
      },
      {
        id: "pressures",
        label: text(
          "LP / HP ja paineviite (a/g)",
          "LP / HP and pressure reference (a/g)",
        ),
      },
      {
        id: "temperatures",
        label: text(
          "Imu / kuumakaasu / neste (°C)",
          "Suction / discharge gas / liquid (°C)",
        ),
      },
      {
        id: "finding",
        label: text(
          "Toimintakokeet, poikkeamat ja jatkotoimet",
          "Functional tests, exceptions and follow-up actions",
        ),
      },
    ],
  },
};
export const commonChecklistFields = [
  {
    id: "equipment",
    label: text("Laite / tunniste", "Equipment / identifier"),
  },
  { id: "date", label: text("Päivä ja tekijä", "Date and technician") },
  {
    id: "instructions",
    label: text(
      "Valmistajan ohje / versio",
      "Manufacturer instructions / version",
    ),
  },
];
export function checklistText(
  draft: ChecklistDraft,
  locale: "fi" | "en",
): string {
  const definition = checklistDefinitions[draft.kind];
  return [
    `PhaseKit — ${definition.name[locale]}`,
    draft.title,
    `${locale === "fi" ? "Muokattu" : "Updated"}: ${draft.updatedAt}`,
    "",
    ...[...commonChecklistFields, ...definition.fields].map(
      (f) => `${f.label[locale]}: ${draft.fields[f.id] || "—"}`,
    ),
    "",
    ...definition.steps.map(
      (s) =>
        `[${draft.checkedIds.includes(s.id) ? "x" : " "}] ${s.label[locale]}`,
    ),
    "",
    draft.notes,
    "",
    locale === "fi"
      ? "Kirjauspohja. Merkinnät eivät todista kokeen hyväksyntää tai määräystenmukaisuutta."
      : "Recording template. Checkmarks do not certify test acceptance or regulatory compliance.",
  ].join("\n");
}
/** Internal cylindrical volume and mean velocity; no sizing or pressure-drop model. */
export function calculatePipe(input: {
  diameterMm: string;
  lengthM: string;
  flow: string;
  flowUnit: FlowUnit;
}) {
  const diameter = parseDecimal(input.diameterMm);
  const length = parseDecimal(input.lengthM);
  const flow = parseDecimal(input.flow);
  if (diameter.lte(0) || length.lt(0) || flow.lt(0))
    throw new Error("invalid_pipe_dimensions");
  const divisor = { "l/s": 1000, "l/min": 60000, "m3/h": 3600 }[input.flowUnit];
  if (!divisor) throw new Error("invalid_unit");
  const area = diameter
    .div(1000)
    .pow(2)
    .mul("3.141592653589793238462643383279502884197")
    .div(4);
  return {
    volumeLitres: area.mul(length).mul(1000).toString(),
    velocityMS: flow.div(divisor).div(area).toString(),
    areaM2: area.toString(),
  };
}
