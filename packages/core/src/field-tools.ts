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

export type ChecklistKind =
  "tightness" | "evacuation" | "commissioning" | "service" | "refrigerant";
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
export interface ChecklistField {
  id: string;
  label: Text;
  type?: "date" | "decimal" | "select" | "refrigerant" | "declaration";
  options?: { value: string; label: Text }[];
  help?: Text;
  legacy?: boolean;
  group?: "evacuation" | "installation" | "test-reports";
}
const text = (fi: string, en: string): Text => ({ fi, en });
export const checklistDefinitions: Record<
  ChecklistKind,
  {
    name: Text;
    steps: { id: string; label: Text }[];
    fields: ChecklistField[];
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

  service: {
    name: text("Huoltokirjaus", "Service record"),
    steps: [
      {
        id: "assessment",
        label: text(
          "Lähtötilanne ja huollon tarve kirjattu",
          "Initial condition and service need recorded",
        ),
      },
      {
        id: "work",
        label: text(
          "Tehdyt työt ja vaihdetut osat kirjattu",
          "Work and replaced parts recorded",
        ),
      },
      {
        id: "verification",
        label: text(
          "Toiminta ja jatkotoimet kirjattu",
          "Operation and follow-up recorded",
        ),
      },
    ],
    fields: [
      {
        id: "initialCondition",
        label: text("Lähtötilanne ja oireet", "Initial condition and symptoms"),
      },
      {
        id: "workPerformed",
        label: text(
          "Tehdyt työt ja vaihdetut osat",
          "Work performed and replaced parts",
        ),
      },
      {
        id: "measurements",
        label: text(
          "Mittaukset ennen ja jälkeen (yksiköineen)",
          "Before and after measurements (with units)",
        ),
      },
      {
        id: "finding",
        label: text("Havainnot ja jatkotoimet", "Findings and follow-up"),
      },
    ],
  },
  refrigerant: {
    name: text("Kylmäainekirjaus", "Refrigerant record"),
    steps: [
      {
        id: "identification",
        label: text(
          "Kylmäaine ja laite tunnistettu",
          "Refrigerant and equipment identified",
        ),
      },
      {
        id: "weighing",
        label: text(
          "Punnitukset ja käsitellyt määrät kirjattu",
          "Weights and handled quantities recorded",
        ),
      },
      {
        id: "completion",
        label: text(
          "Työn syy ja jatkokäsittely kirjattu",
          "Reason for work and further handling recorded",
        ),
      },
    ],
    fields: [
      {
        id: "refrigerantId",
        label: text("Kylmäaine", "Refrigerant"),
        type: "refrigerant",
      },
      { id: "reason", label: text("Työn syy", "Reason for work") },
      {
        id: "addedKg",
        label: text("Lisätty kylmäaine · kg", "Refrigerant added · kg"),
        type: "decimal",
      },
      {
        id: "recoveredKg",
        label: text(
          "Talteenotettu kylmäaine · kg",
          "Refrigerant recovered · kg",
        ),
        type: "decimal",
      },
      {
        id: "cylinderId",
        label: text("Pullon tunniste", "Cylinder identifier"),
      },
      {
        id: "cylinderBeforeKg",
        label: text("Pullon paino ennen · kg", "Cylinder weight before · kg"),
        type: "decimal",
      },
      {
        id: "cylinderAfterKg",
        label: text("Pullon paino jälkeen · kg", "Cylinder weight after · kg"),
        type: "decimal",
      },
      {
        id: "finding",
        label: text(
          "Havainnot ja jatkokäsittely",
          "Findings and further handling",
        ),
      },
    ],
  },
};
const decimalField = (
  id: string,
  fi: string,
  en: string,
  help?: Text,
): ChecklistField => ({
  id,
  label: text(fi, en),
  type: "decimal",
  ...(help ? { help } : {}),
});
const legacyIds: Partial<Record<ChecklistKind, string[]>> = {
  evacuation: ["instrument", "vacuum", "hold"],
  commissioning: ["charge", "pressures", "temperatures"],
};
for (const kind of ["evacuation", "commissioning"] as const) {
  for (const field of checklistDefinitions[kind].fields) {
    if (legacyIds[kind]?.includes(field.id)) field.legacy = true;
  }
}
checklistDefinitions.evacuation.fields.unshift(
  {
    id: "vacuumUnit",
    label: text(
      "Tyhjiöpaineen yksikkö (absoluuttinen)",
      "Vacuum pressure unit (absolute)",
    ),
    type: "select",
    options: ["mbar", "micron", "Pa"].map((value) => ({
      value,
      label: text(value, value),
    })),
  },
  decimalField("targetPressure", "Tavoitepaine", "Target pressure"),
  decimalField(
    "achievedPressure",
    "Saavutettu paine",
    "Achieved pressure",
    text(
      "Paine pumpun käydessä, ennen sen erottamista järjestelmästä.",
      "Pressure while the pump is running, before isolating it from the system.",
    ),
  ),
  decimalField(
    "evacuationMinutes",
    "Tyhjiöinnin kesto tavoitepaineeseen · min",
    "Evacuation duration to target pressure · min",
  ),
  decimalField(
    "holdStartPressure",
    "Pitokokeen alkupaine",
    "Standing-test start pressure",
    text(
      "Paine pumpusta erotetussa järjestelmässä kokeen alkaessa.",
      "System pressure after isolating the pump, at the start of the test.",
    ),
  ),
  decimalField(
    "holdEndPressure",
    "Pitokokeen loppupaine",
    "Standing-test end pressure",
  ),
  decimalField(
    "holdMinutes",
    "Pitokokeen kesto · min",
    "Standing-test duration · min",
  ),
  { id: "instrumentName", label: text("Mittari", "Instrument") },
  {
    id: "measurementLocation",
    label: text("Mittauspaikka", "Measurement location"),
  },
);
checklistDefinitions.commissioning.fields.unshift(
  {
    id: "refrigerantId",
    label: text("Kylmäaine", "Refrigerant"),
    type: "refrigerant",
  },
  decimalField("chargeKg", "Täyttömäärä · kg", "Charge · kg"),
  {
    id: "pressureUnit",
    label: text("Paineyksikkö", "Pressure unit"),
    type: "select",
    options: ["bar", "kPa", "MPa", "psi"].map((value) => ({
      value,
      label: text(value, value),
    })),
  },
  {
    id: "pressureReference",
    label: text("Paineviite", "Pressure reference"),
    type: "select",
    options: [
      { value: "gauge", label: text("Ylipaine (g)", "Gauge (g)") },
      { value: "absolute", label: text("Absoluuttinen (a)", "Absolute (a)") },
    ],
  },
  decimalField(
    "atmosphericReference",
    "Ilmanpaine · bar(a)",
    "Atmospheric pressure · bar(a)",
  ),
  decimalField("lp", "LP · imupaine", "LP · suction pressure"),
  decimalField("hp", "HP · korkeapaine", "HP · high pressure"),
  decimalField(
    "suctionC",
    "Imukaasun lämpötila · °C",
    "Suction temperature · °C",
  ),
  decimalField(
    "dischargeC",
    "Kuumakaasun lämpötila · °C",
    "Discharge temperature · °C",
  ),
  decimalField("liquidC", "Nesteen lämpötila · °C", "Liquid temperature · °C"),
);
checklistDefinitions.commissioning.fields.push(
  {
    id: "installerCompany",
    group: "installation",
    label: text("Asennusliike", "Installation company"),
  },
  {
    id: "installerQualificationNumber",
    group: "installation",
    label: text("Asentajan lupanumero", "Installer certificate/licence number"),
    help: text(
      "Asentajan nimi kirjataan Tekijä-kenttään.",
      "Enter the installer name in Technician.",
    ),
  },
  {
    id: "responsiblePerson",
    group: "installation",
    label: text("Vastuuhenkilön nimi", "Responsible person name"),
  },
  {
    id: "responsibleQualificationNumber",
    group: "installation",
    label: text(
      "Vastuuhenkilön lupanumero",
      "Responsible person certificate/licence number",
    ),
  },
  {
    id: "leakCheckInterval",
    group: "test-reports",
    label: text(
      "Lakisääteinen vuototarkastusväli ja peruste",
      "Statutory leak-check interval and basis",
    ),
    help: text(
      "Kirjaa kohteelle arvioitu tarkastusväli tai perusteltu tieto siitä, ettei velvoitetta sovelleta.",
      "Record the assessed interval or the reason why the obligation does not apply.",
    ),
  },
  {
    id: "pressureTestRequired",
    group: "test-reports",
    type: "select",
    label: text(
      "Edellyttääkö painelaitesääntely painekoetta?",
      "Does pressure-equipment legislation require a pressure test?",
    ),
    options: [
      { value: "yes", label: text("Kyllä", "Yes") },
      { value: "no", label: text("Ei", "No") },
      {
        value: "not_assessed",
        label: text("Ei vielä arvioitu", "Not yet assessed"),
      },
    ],
  },
  {
    id: "pressureTestExemptionReason",
    group: "test-reports",
    label: text(
      "Peruste sille, ettei painekoetta edellytetä",
      "Reason why a pressure test is not required",
    ),
  },
  {
    id: "pressureTestReportReference",
    group: "test-reports",
    label: text(
      "Painekoepöytäkirjan viite / liite",
      "Pressure-test report reference / attachment",
    ),
  },
  {
    id: "tightnessTestReportReference",
    group: "test-reports",
    label: text(
      "Tiiviyskoepöytäkirjan viite / liite",
      "Tightness-test report reference / attachment",
    ),
  },
  {
    id: "evacuationReportReference",
    group: "test-reports",
    label: text(
      "Tyhjiöintipöytäkirjan viite / liite",
      "Evacuation report reference / attachment",
    ),
    help: text(
      "Viittaa liitteeseen tai tämän raportin tyhjiöinti- ja pitokoekirjauksiin.",
      "Reference an attachment or the evacuation and standing-test readings in this report.",
    ),
  },
  {
    id: "testRunReportReference",
    group: "test-reports",
    label: text(
      "Koekäyttöpöytäkirjan viite / liite",
      "Test-run report reference / attachment",
    ),
    help: text(
      "Viittaa liitteeseen tai tämän raportin käyntiarvoihin ja toimintakokeisiin.",
      "Reference an attachment or the operating readings and functional tests in this report.",
    ),
  },
  {
    id: "operatorDeclaration",
    group: "test-reports",
    type: "declaration",
    options: [
      {
        value: "confirmed",
        label: text(
          "Vakuutan toiminnanharjoittajan edustajana, että laite täyttää F-kaasuasetuksen (EU) 2024/573 vaatimukset.",
          "As the installation business’s representative, I declare that the equipment meets the requirements of F-gas Regulation (EU) 2024/573.",
        ),
      },
    ],
    label: text(
      "Toiminnanharjoittajan vakuutus",
      "Installation business declaration",
    ),
  },
);
const chargeFieldIndex = checklistDefinitions.commissioning.fields.findIndex(
  (field) => field.id === "chargeKg",
);
checklistDefinitions.commissioning.fields.splice(
  chargeFieldIndex + 1,
  0,
  {
    id: "refrigerantSafetyClass",
    label: text("Kylmäaineen turvallisuusluokka", "Refrigerant safety class"),
  },
  decimalField(
    "refrigerantGwp",
    "Kylmäaineen GWP-arvo",
    "Refrigerant GWP value",
  ),
);
checklistDefinitions.commissioning.fields.splice(
  chargeFieldIndex + 4,
  0,
  { id: "refrigerantGwpBasis", label: text("GWP-peruste", "GWP basis") },
  {
    id: "refrigerantSourceNote",
    label: text("GWP-lähdeviite", "GWP source reference"),
  },
);
// The same recorded measurements can accompany commissioning without a second report.
checklistDefinitions.commissioning.fields.push(
  ...checklistDefinitions.evacuation.fields.map((field) => ({
    ...field,
    ...(field.id === "finding"
      ? {
          id: "evacuationFinding",
          label: text(
            "Tyhjiöinnin ja pitokokeen havainnot ja arvio",
            "Evacuation and standing-test findings and assessment",
          ),
        }
      : {}),
    group: "evacuation" as const,
  })),
);
export const commonChecklistFields: ChecklistField[] = [
  {
    id: "equipment",
    label: text("Laite / tunniste", "Equipment / identifier"),
    help: text(
      "Laitteen sarjanumero tai muu yksilöinti.",
      "Equipment serial number or another unique identifier.",
    ),
  },
  {
    id: "performedOn",
    label: text("Suorituspäivä", "Work date"),
    type: "date",
  },
  { id: "technician", label: text("Tekijä", "Technician") },
  {
    id: "signatureName",
    legacy: true,
    label: text("Allekirjoituksen nimenselvennys", "Signature name"),
    help: text(
      "Allekirjoitus lisätään tulostettuun raporttiin. Nimi ei ole sähköinen allekirjoitus.",
      "Sign the printed report. A typed name is not an electronic signature.",
    ),
  },
  {
    id: "date",
    label: text("Päivä ja tekijä", "Date and technician"),
    legacy: true,
  },
  {
    id: "instructions",
    label: text(
      "Valmistajan ohje / versio",
      "Manufacturer instructions / version",
    ),
  },
];
/** Includes untouched legacy data only when present; never parses free text into measurements. */
export function checklistReportFields(draft: ChecklistDraft): ChecklistField[] {
  return [
    ...commonChecklistFields,
    ...checklistDefinitions[draft.kind].fields,
  ].filter((field) => !field.legacy || Boolean(draft.fields[field.id]));
}
/** Carry only still-applicable confirmations when a commissioning field changes. */
export function updateCommissioningFields(
  previous: Record<string, string>,
  next: Record<string, string>,
): Record<string, string> {
  const updated = { ...previous, ...next };
  if (
    Object.keys(updated).some(
      (id) => id !== "operatorDeclaration" && updated[id] !== previous[id],
    )
  )
    updated.operatorDeclaration = "";
  if (
    updated.refrigerantId !== previous.refrigerantId ||
    updated.chargeKg !== previous.chargeKg
  )
    updated.leakCheckInterval = "";
  if (updated.refrigerantId !== previous.refrigerantId)
    updated.pressureTestRequired = "not_assessed";
  return updated;
}
/** Checks presence and basic number validity, not legal applicability, test acceptance or signatures. */
export function commissioningMissingFields(
  fields: Record<string, string>,
): ChecklistField[] {
  const required = [
    "equipment",
    "technician",
    "installerCompany",
    "installerQualificationNumber",
    "responsiblePerson",
    "responsibleQualificationNumber",
    "refrigerantId",
    "refrigerantSafetyClass",
    "refrigerantGwp",
    "refrigerantGwpBasis",
    "refrigerantSourceNote",
    "chargeKg",
    "leakCheckInterval",
    "tightnessTestReportReference",
    "testRunReportReference",
    "operatorDeclaration",
  ];
  const missing = required.filter((id) => !fields[id]?.trim());
  if (
    fields.operatorDeclaration !== "confirmed" &&
    !missing.includes("operatorDeclaration")
  )
    missing.push("operatorDeclaration");
  const positive = (id: string, zero = false) => {
    try {
      const value = parseDecimal(fields[id] ?? "");
      return zero ? value.gte(0) : value.gt(0);
    } catch {
      return false;
    }
  };
  for (const id of ["chargeKg", "refrigerantGwp"])
    if (!positive(id, id === "refrigerantGwp") && !missing.includes(id))
      missing.push(id);
  if (!["yes", "no"].includes(fields.pressureTestRequired))
    missing.push("pressureTestRequired");
  else if (
    fields.pressureTestRequired === "yes" &&
    !fields.pressureTestReportReference?.trim()
  )
    missing.push("pressureTestReportReference");
  else if (
    fields.pressureTestRequired === "no" &&
    !fields.pressureTestExemptionReason?.trim()
  )
    missing.push("pressureTestExemptionReason");
  const inlineEvacuationComplete =
    [
      "criterion",
      "instrumentName",
      "measurementLocation",
      "evacuationFinding",
    ].every((id) => fields[id]?.trim()) &&
    ["mbar", "micron", "Pa"].includes(fields.vacuumUnit) &&
    [
      "achievedPressure",
      "holdStartPressure",
      "holdEndPressure",
      "holdMinutes",
    ].every((id) => positive(id));
  if (!fields.evacuationReportReference?.trim() && !inlineEvacuationComplete)
    missing.push("evacuationReportReference");
  const all = [
    ...commonChecklistFields,
    ...checklistDefinitions.commissioning.fields,
  ];
  return missing
    .map((id) => all.find((field) => field.id === id)!)
    .filter(Boolean);
}
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
    ...checklistReportFields(draft).map(
      (f) =>
        `${f.label[locale]}: ${f.options?.find((option) => option.value === draft.fields[f.id])?.label[locale] ?? (draft.fields[f.id] || "—")}`,
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

/** Mean linear expansion coefficients for the stated, source-backed range. */
export const pipeExpansionMaterials = {
  copper_c12200: {
    fi: "Kupari C12200",
    en: "Copper C12200",
    // CDA gives 9.4 × 10⁻⁶ /°F over 68–212 °F; 9.4 × 1.8 = 16.92 /K.
    coefficientPerK: "0.00001692",
    minC: 20,
    maxC: 100,
    sourceTitle: "Copper Development Association — C12200 alloy properties",
    sourceUrl: "https://alloys.copper.org/alloy/C12200",
  },
  stainless_304: {
    fi: "Ruostumaton teräs 304 / 1.4301",
    en: "Stainless steel 304 / 1.4301",
    coefficientPerK: "0.0000160",
    minC: 20,
    maxC: 100,
    sourceTitle: "Outokumpu — Core range datasheet, Core 304/4301",
    sourceUrl:
      "https://www.outokumpu.com/-/media/files/products/core/outokumpu-core-range-datasheet.pdf",
  },
} as const;
export type PipeExpansionMaterial = keyof typeof pipeExpansionMaterials;

/** Free, uniform axial expansion: ΔL = α L₀ (T₁ − T₀). */
export function calculatePipeExpansion(input: {
  material: PipeExpansionMaterial;
  referenceLengthM: string;
  initialC: string;
  finalC: string;
}) {
  const material = pipeExpansionMaterials[input.material];
  if (!material) throw new Error("invalid_expansion_material");
  const length = parseDecimal(input.referenceLengthM);
  const initial = parseDecimal(input.initialC);
  const final = parseDecimal(input.finalC);
  if (length.lte(0)) throw new Error("positive_expansion_length_required");
  if (
    initial.lt(material.minC) ||
    initial.gt(material.maxC) ||
    final.lt(material.minC) ||
    final.gt(material.maxC)
  )
    throw new Error("expansion_temperature_out_of_range");
  const difference = final.minus(initial);
  const changeMm = length
    .mul(1000)
    .mul(material.coefficientPerK)
    .mul(difference);
  return {
    differenceK: difference.toString(),
    changeMm: changeMm.toString(),
    finalLengthM: length.plus(changeMm.div(1000)).toString(),
    coefficientPerK: material.coefficientPerK,
  };
}
