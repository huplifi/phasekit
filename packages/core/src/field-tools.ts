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
export type ElectricalSolveFor = "power" | "current" | "voltage" | "resistance";
export interface ElectricalInput {
  mode: ElectricalMode;
  solveFor?: ElectricalSolveFor;
  voltageV?: string;
  currentA?: string;
  powerW?: string;
  resistanceOhm?: string;
  powerFactor?: string;
}
/** AC inputs are RMS; three-phase assumes a balanced sinusoidal load. */
export function calculateElectrical(input: ElectricalInput) {
  if (!["dc", "single_phase", "three_phase", "ohm"].includes(input.mode))
    throw new Error("invalid_mode");
  const target =
    input.solveFor === undefined
      ? input.mode === "ohm"
        ? "current"
        : "power"
      : input.solveFor;
  const allowed =
    input.mode === "ohm"
      ? ["current", "voltage", "resistance"]
      : ["power", "current", "voltage"];
  if (!allowed.includes(target)) throw new Error("invalid_electrical_target");
  const quantity = (value: string | undefined) => {
    const parsed = parseDecimal(value ?? "");
    if (parsed.lt(0)) throw new Error("negative_electrical_quantity");
    return parsed;
  };
  const positive = (value: ReturnType<typeof parseDecimal>, error: string) => {
    if (value.lte(0)) throw new Error(error);
    return value;
  };
  let voltage: ReturnType<typeof parseDecimal>;
  let current: ReturnType<typeof parseDecimal>;
  let power: ReturnType<typeof parseDecimal>;
  let apparent: ReturnType<typeof parseDecimal> | null = null;
  let resistance: ReturnType<typeof parseDecimal> | null = null;

  if (input.mode === "ohm") {
    if (target === "resistance") {
      voltage = positive(quantity(input.voltageV), "positive_voltage_required");
      current = positive(quantity(input.currentA), "positive_current_required");
      resistance = voltage.div(current);
    } else {
      resistance = positive(
        parseDecimal(input.resistanceOhm ?? ""),
        "positive_resistance_required",
      );
      if (target === "voltage") {
        current = quantity(input.currentA);
        voltage = current.mul(resistance);
      } else {
        voltage = quantity(input.voltageV);
        current = voltage.div(resistance);
      }
    }
    power = voltage.mul(current);
  } else {
    const ac = input.mode !== "dc";
    const pf = parseDecimal(ac ? (input.powerFactor ?? "") : "1");
    if (pf.lt(0) || pf.gt(1)) throw new Error("invalid_power_factor");
    const factor =
      input.mode === "three_phase"
        ? parseDecimal("3").sqrt()
        : parseDecimal("1");
    if (target === "power") {
      voltage = quantity(input.voltageV);
      current = quantity(input.currentA);
      const voltAmperes = voltage.mul(current).mul(factor);
      power = voltAmperes.mul(pf);
      apparent = ac ? voltAmperes : null;
    } else {
      power = quantity(input.powerW);
      positive(pf, "positive_power_factor_required");
      if (target === "current") {
        voltage = positive(
          quantity(input.voltageV),
          "positive_voltage_required",
        );
        current = power.div(factor.mul(voltage).mul(pf));
      } else {
        current = positive(
          quantity(input.currentA),
          "positive_current_required",
        );
        voltage = power.div(factor.mul(current).mul(pf));
      }
      apparent = ac ? power.div(pf) : null;
    }
  }
  if (
    [voltage, current, power, apparent, resistance].some(
      (value) => value !== null && !value.isFinite(),
    )
  )
    throw new Error("nonfinite_result");
  return {
    voltageV: voltage.toString(),
    currentA: current.toString(),
    powerW: power.toString(),
    apparentVA: apparent?.toString() ?? null,
    resistanceOhm: resistance?.toString() ?? null,
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
  type?:
    "date" | "decimal" | "select" | "refrigerant" | "declaration" | "textarea";
  options?: { value: string; label: Text }[];
  help?: Text;
  legacy?: boolean;
  group?:
    | "evacuation"
    | "installation"
    | "test-reports"
    | "tightness"
    | "test-run"
    | "refrigerant"
    | "leak-check";
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
    name: text("Tiiviyskoe", "Tightness test"),
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
    name: text(
      "Asennustodistus ja käyttöönotto",
      "Installation certificate and commissioning",
    ),
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
  evacuation: [
    "criterion",
    "instrument",
    "vacuum",
    "hold",
    "evacuationMinutes",
  ],
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
  {
    id: "holdAcceptanceCriterion",
    label: text(
      "Ohjeen pitokokeen hyväksymisraja",
      "Specified standing-test acceptance limit",
    ),
    help: text(
      "Kirjaa kohteen valmistajan ohjeen mukainen raja ja ohjeen tunniste. Yleistä rajaa ei oleteta.",
      "Record the equipment-specific limit and instruction reference. No universal limit is assumed.",
    ),
  },
  decimalField(
    "achievedPressure",
    "Saavutettu paine",
    "Achieved pressure",
    text(
      "Paine pumpun käydessä, ennen sen erottamista järjestelmästä.",
      "Pressure while the pump is running, before isolating it from the system.",
    ),
  ),
  {
    ...decimalField(
      "evacuationMinutes",
      "Tyhjiöinnin kesto tavoitepaineeseen · min",
      "Evacuation duration to target pressure · min",
    ),
    legacy: true,
  },
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
  {
    id: "instrumentName",
    label: text("Mittarin merkki ja malli", "Gauge make and model"),
  },
  {
    id: "measurementLocation",
    label: text("Mittarin liitäntäkohta", "Gauge connection point"),
  },
);
checklistDefinitions.commissioning.fields.unshift(
  {
    id: "commissioningPurpose",
    label: text("Asiakirjan tarkoitus", "Document purpose"),
    type: "select",
    options: [
      {
        value: "installation",
        label: text(
          "Asennustodistus ja käyttöönotto",
          "Installation certificate and commissioning",
        ),
      },
      {
        value: "technical",
        label: text("Tekninen käyttöönotto", "Technical commissioning"),
      },
    ],
  },
  {
    id: "refrigerantId",
    group: "refrigerant",
    label: text("Kylmäaine", "Refrigerant"),
    type: "refrigerant",
  },
  {
    ...decimalField("chargeKg", "Täyttömäärä · kg", "Charge · kg"),
    group: "refrigerant",
  },
  decimalField("outdoorC", "Ulkolämpötila · °C", "Outdoor temperature · °C"),
  decimalField("indoorC", "Sisälämpötila · °C", "Indoor temperature · °C"),
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
  decimalField(
    "liquidC",
    "Nesteen lämpötila · °C",
    "Liquid temperature · °C",
    text(
      "Jätä tyhjäksi, jos nesteputken lämpötilaa ei voida mitata. Raportin voi tehdä ilman tätä arvoa ja log(p)–h-kaaviota.",
      "Leave blank if the liquid-line temperature cannot be measured. The report can be completed without this reading or a log(p)–h chart.",
    ),
  ),
);
checklistDefinitions.commissioning.fields.push(
  {
    id: "installationLocation",
    group: "installation",
    label: text("Laitteen käyttöpaikka", "Equipment installation location"),
  },
  {
    id: "installerCompany",
    group: "installation",
    label: text("Asennusliike", "Installation company"),
  },
  {
    id: "installerCompanyQualificationNumber",
    legacy: true,
    group: "installation",
    label: text(
      "Aiemmin kirjattu yrityksen lupanumero",
      "Previously recorded company licence number",
    ),
    help: text(
      "Aiemmassa betaversiossa tallennettu lisätieto. Säilytetään osana raporttia; sitä ei siirretä automaattisesti toiseen kenttään.",
      "Additional information saved in an earlier beta version. Retained in the report without automatically moving it to another field.",
    ),
  },
  {
    id: "installerQualificationNumber",
    group: "installation",
    label: text("Asentajan lupanumero", "Installer certificate/licence number"),
    help: text(
      "Asentajan henkilökohtaisen pätevyystodistuksen numero. Nimi kirjataan Tekijä-kenttään. Asennustodistuksessa tieto vaaditaan (VNa 1063/2025, 9 §).",
      "The installer's personal certificate number. Enter the name in Technician. Required for an installation certificate (Government Decree 1063/2025, section 9).",
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
      "Toiminnanharjoittajan vastuuhenkilön lupanumero",
      "Business responsible person licence number",
    ),
    help: text(
      "Toiminnanharjoittajan vastuuhenkilön lupanumero. Vastuuhenkilön tiedot näkyvät myös Tukesin toiminnanharjoittajarekisterissä.",
      "The licence number of the business's responsible person. Their details also appear in the Tukes register of economic operators.",
    ),
  },
  {
    id: "leakCheckInterval",
    group: "leak-check",
    label: text(
      "Lakisääteinen vuototarkastusväli ja peruste",
      "Statutory leak-check interval and basis",
    ),
    help: text(
      "Laskettu soveltuvasta sääntöpaketista työn päivämäärälle. Arvion lähtötiedot, sääntöversio ja peruste säilyvät raportissa.",
      "Calculated from the applicable ruleset for the work date. Inputs, rule version and reasoning are retained with the report.",
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
    help: text(
      "Selvitä soveltuvuus laitteen ja asennuksen suunnittelu- tai vaatimustenmukaisuusasiakirjoista. Painekoe ja tiiviyskoe ovat eri tarkastuksia; pelkkä kylmäaine ja täytös eivät ratkaise koetarvetta.",
      "Check the equipment and installation design or conformity documents. A pressure test and a tightness test are distinct; refrigerant and charge alone do not determine the requirement.",
    ),
  },
  {
    id: "pressureAssessmentBasis",
    group: "test-reports",
    type: "select",
    label: text(
      "Painekoetarpeen arvioinnin lähde",
      "Source for pressure-test applicability assessment",
    ),
    options: [
      {
        value: "equipment_documents",
        label: text(
          "Laitteen tai asennuksen asiakirjat",
          "Equipment or installation documents",
        ),
      },
      {
        value: "expert_assessment",
        label: text(
          "Suunnittelijan tai tarkastuslaitoksen arvio",
          "Designer or inspection body assessment",
        ),
      },
      {
        value: "other_documented",
        label: text("Muu dokumentoitu peruste", "Other documented basis"),
      },
      {
        value: "unresolved",
        label: text("Arvio kesken", "Assessment unresolved"),
      },
    ],
  },
  {
    id: "pressureTestExemptionReason",
    group: "test-reports",
    label: text(
      "Arvioinnin asiakirja tai asiantuntijan perustelu",
      "Assessment document or expert rationale",
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
    group: "tightness",
    label: text(
      "Tiiviyskoepöytäkirjan viite / liite",
      "Tightness-test report reference / attachment",
    ),
  },
  {
    id: "evacuationReportReference",
    group: "evacuation",
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
    group: "test-run",
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
    group: "refrigerant",
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
for (const field of checklistDefinitions.commissioning.fields) {
  if (
    [
      "refrigerantSafetyClass",
      "refrigerantGwp",
      "refrigerantGwpBasis",
    ].includes(field.id)
  )
    field.group = "refrigerant";
}
checklistDefinitions.commissioning.fields.push(
  ...(
    [
      [
        "tightnessRecordMode",
        "tightness",
        "Tiiviyskokeen kirjaustapa",
        "Tightness-test record mode",
      ],
      [
        "evacuationRecordMode",
        "evacuation",
        "Tyhjiöinnin kirjaustapa",
        "Evacuation record mode",
      ],
      [
        "testRunRecordMode",
        "test-run",
        "Koekäytön kirjaustapa",
        "Test-run record mode",
      ],
    ] as const
  ).map(([id, group, fi, en]) => ({
    id,
    group,
    type: "select" as const,
    label: text(fi, en),
    options: [
      {
        value: "internal",
        label: text("Kirjaan tähän raporttiin", "Record in this report"),
      },
      {
        value: "external",
        label: text(
          "Erillinen pöytäkirja tai liite",
          "Separate report or attachment",
        ),
      },
    ],
  })),
  {
    id: "leakEquipment",
    group: "leak-check",
    label: text(
      "Laitetyyppi vuototarkastusta varten",
      "Equipment type for leak-check assessment",
    ),
    type: "select",
    options: [
      {
        value: "stationary_refrigeration",
        label: text("Kiinteä jäähdytys", "Stationary refrigeration"),
      },
      {
        value: "stationary_ac",
        label: text("Kiinteä ilmastointi", "Stationary air conditioning"),
      },
      {
        value: "stationary_heat_pump",
        label: text("Kiinteä lämpöpumppu", "Stationary heat pump"),
      },
      {
        value: "other",
        label: text("Muu / arvioitava erikseen", "Other / assess separately"),
      },
    ],
  },
  ...(
    [
      "leakDetection",
      "leakHermetic",
      "leakHermeticLabel",
      "leakResidential",
    ] as const
  ).map((id) => ({
    id,
    group: "leak-check" as const,
    type: "select" as const,
    label: {
      leakDetection: text(
        "Vuodonilmaisujärjestelmä asennettu",
        "Leak detection system installed",
      ),
      leakHermetic: text(
        "Laite ilmatiiviisti suljettu",
        "Equipment hermetically sealed",
      ),
      leakHermeticLabel: text(
        "Laite merkitty ilmatiiviisti suljetuksi",
        "Equipment labelled hermetically sealed",
      ),
      leakResidential: text(
        "Laite asuinrakennuksessa",
        "Equipment in a residential building",
      ),
    }[id],
    options: [
      { value: "yes", label: text("Kyllä", "Yes") },
      { value: "no", label: text("Ei", "No") },
    ],
  })),
  ...(
    [
      ["tightnessMedium", "Koekaasu / koeväliaine", "Test gas / medium"],
      [
        "tightnessCriterion",
        "Ohjeen koepaine, kesto ja hyväksymisrajat",
        "Specified test pressure, duration and limits",
      ],
      [
        "tightnessStart",
        "Alku: aika, paine ja lämpötila yksiköineen",
        "Start: time, pressure and temperature with units",
      ],
      [
        "tightnessEnd",
        "Loppu: aika, paine ja lämpötila yksiköineen",
        "End: time, pressure and temperature with units",
      ],
      [
        "tightnessFinding",
        "Tiiviyskokeen havainnot",
        "Tightness-test findings",
      ],
    ] as const
  ).map(([id, fi, en]) => ({
    id,
    group: "tightness" as const,
    label: text(fi, en),
  })),
  {
    id: "testRunFinding",
    group: "test-run",
    label: text(
      "Koekäytön toimintakokeet ja havainnot",
      "Test-run functional checks and findings",
    ),
  },
  {
    id: "testRunMeasurements",
    group: "test-run",
    label: text(
      "Koekäytön mittaukset olosuhteineen",
      "Test-run measurements with conditions",
    ),
    type: "textarea",
  },
);
for (const kind of Object.keys(checklistDefinitions) as ChecklistKind[]) {
  for (const field of checklistDefinitions[kind].fields) {
    if (
      [
        "finding",
        "evacuationFinding",
        "tightnessFinding",
        "testRunFinding",
        "workPerformed",
        "initialCondition",
        "measurements",
      ].includes(field.id)
    )
      field.type = "textarea";
  }
}
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
    legacy: true,
    label: text(
      "Valmistajan ohje / versio",
      "Manufacturer instructions / version",
    ),
  },
];
/** Names the document by its purpose without changing the stored report. */
export function checklistReportName(
  draft: Pick<ChecklistDraft, "kind" | "fields">,
  locale: "fi" | "en",
): string {
  if (
    draft.kind === "commissioning" &&
    draft.fields.commissioningPurpose === "technical"
  )
    return text("Tekninen käyttöönotto", "Technical commissioning")[locale];
  return checklistDefinitions[draft.kind].name[locale];
}
/** Includes untouched legacy data only when present; never parses free text into measurements. */
export function checklistReportFields(draft: ChecklistDraft): ChecklistField[] {
  return [
    ...commonChecklistFields,
    ...checklistDefinitions[draft.kind].fields,
  ].filter((field) => !field.legacy || Boolean(draft.fields[field.id]));
}
/** Form visibility may change; the export always uses checklistReportFields. */
export function checklistEditorFields(draft: ChecklistDraft): ChecklistField[] {
  const fields = checklistReportFields(draft);
  if (draft.kind !== "commissioning")
    return fields.filter((field) => field.id !== "finding");
  const technical = draft.fields.commissioningPurpose === "technical";
  const certificateOnly = new Set([
    "installationLocation",
    "installerCompany",
    "installerCompanyQualificationNumber",
    "installerQualificationNumber",
    "responsiblePerson",
    "responsibleQualificationNumber",
    "refrigerantSafetyClass",
    "refrigerantGwp",
    "refrigerantGwpBasis",
    "refrigerantSourceNote",
    "leakCheckInterval",
    "leakEquipment",
    "leakDetection",
    "leakHermetic",
    "leakHermeticLabel",
    "leakResidential",
    "pressureTestRequired",
    "pressureAssessmentBasis",
    "pressureTestExemptionReason",
    "pressureTestReportReference",
    "operatorDeclaration",
  ]);
  const protocolMode = (group: "tightness" | "evacuation" | "test-run") => {
    const config = {
      tightness: ["tightnessRecordMode", "tightnessTestReportReference"],
      evacuation: ["evacuationRecordMode", "evacuationReportReference"],
      "test-run": ["testRunRecordMode", "testRunReportReference"],
    }[group];
    return draft.fields[config[0]] === "external" ||
      (draft.fields[config[0]] !== "internal" &&
        Boolean(draft.fields[config[1]]?.trim()))
      ? "external"
      : "internal";
  };
  return fields.filter((field) => {
    if (field.id === "finding") return false;
    if (technical && certificateOnly.has(field.id)) return false;
    if (
      field.group === "tightness" ||
      field.group === "evacuation" ||
      field.group === "test-run"
    ) {
      if (field.id.endsWith("RecordMode")) return true;
      const isReference = field.id.endsWith("ReportReference");
      if (protocolMode(field.group) === "external") return isReference;
      if (isReference) return false;
    }
    if (field.id === "pressureTestExemptionReason")
      return draft.fields.pressureTestRequired === "no";
    if (field.id === "pressureTestReportReference")
      return draft.fields.pressureTestRequired === "yes";
    if (field.id === "leakHermeticLabel")
      return draft.fields.leakHermetic === "yes";
    if (field.id === "leakResidential")
      return (
        draft.fields.leakHermetic === "yes" &&
        draft.fields.leakHermeticLabel === "yes"
      );
    return true;
  });
}
/** Legacy findings remain in place until the user edits the combined note. */
export function combinedReportNotes(draft: ChecklistDraft): string {
  const finding = draft.fields.finding ?? "";
  return finding && draft.notes
    ? `${finding}\n\n${draft.notes}`
    : finding || draft.notes;
}

export function updateCombinedReportNotes(
  draft: ChecklistDraft,
  value: string,
): ChecklistDraft {
  if (value === combinedReportNotes(draft)) return draft;
  if (value.length > 10000) throw new RangeError("notes_too_long");
  return { ...draft, fields: { ...draft.fields, finding: "" }, notes: value };
}

export type CommissioningProtocolStatus = {
  id: "tightness" | "evacuation" | "test-run";
  mode: "internal" | "external" | "missing";
  label: Text;
  missing: ChecklistField[];
};

/** A reference identifies an outside report; an internal report needs actual observations. */
export function commissioningProtocolStatus(
  fields: Record<string, string>,
): CommissioningProtocolStatus[] {
  const all = checklistDefinitions.commissioning.fields;
  const field = (id: string) => all.find((entry) => entry.id === id)!;
  const has = (id: string) => Boolean(fields[id]?.trim());
  const validPositive = (id: string) => {
    try {
      return parseDecimal(fields[id] ?? "").gt(0);
    } catch {
      return false;
    }
  };
  const definitions = [
    {
      id: "tightness" as const,
      label: text("Tiiviyskoepöytäkirja", "Tightness-test report"),
      reference: "tightnessTestReportReference",
      modeField: "tightnessRecordMode",
      required: [
        "tightnessMedium",
        "tightnessCriterion",
        "tightnessStart",
        "tightnessEnd",
        "tightnessFinding",
      ],
      numerical: [] as string[],
    },
    {
      id: "evacuation" as const,
      label: text("Tyhjiöintipöytäkirja", "Evacuation report"),
      reference: "evacuationReportReference",
      modeField: "evacuationRecordMode",
      required: [
        "vacuumUnit",
        "targetPressure",
        "holdAcceptanceCriterion",
        "instrumentName",
        "holdStartPressure",
        "holdEndPressure",
        "holdMinutes",
        "evacuationFinding",
      ],
      numerical: [
        "targetPressure",
        "holdStartPressure",
        "holdEndPressure",
        "holdMinutes",
      ],
    },
    {
      id: "test-run" as const,
      label: text("Koekäyttöpöytäkirja", "Test-run report"),
      reference: "testRunReportReference",
      modeField: "testRunRecordMode",
      required: ["conditions", "testRunMeasurements", "testRunFinding"],
      numerical: [] as string[],
    },
  ];
  return definitions.map((definition) => {
    const missing = definition.required.filter((id) => {
      if (id === "holdAcceptanceCriterion" && has("criterion")) return false;
      if (
        id === "testRunMeasurements" &&
        [
          "lp",
          "hp",
          "suctionC",
          "dischargeC",
          "liquidC",
          "pressures",
          "temperatures",
        ].some(has)
      )
        return false;
      if (id === "vacuumUnit")
        return !["mbar", "micron", "Pa"].includes(fields[id]);
      if (id === "pressureReference")
        return !["gauge", "absolute"].includes(fields[id]);
      if (id === "pressureUnit")
        return !["bar", "kPa", "MPa", "psi"].includes(fields[id]);
      return definition.numerical.includes(id) ? !validPositive(id) : !has(id);
    });
    const selectedMode =
      fields[definition.modeField] === "internal" ||
      fields[definition.modeField] === "external"
        ? fields[definition.modeField]
        : has(definition.reference)
          ? "external"
          : "internal";
    const mode =
      selectedMode === "external"
        ? has(definition.reference)
          ? "external"
          : "missing"
        : missing.length === 0
          ? "internal"
          : "missing";
    const attempted = definition.required.some(has);
    return {
      id: definition.id,
      mode,
      label: definition.label,
      missing:
        mode === "missing"
          ? (selectedMode === "external"
              ? [definition.reference]
              : attempted
                ? missing
                : [definition.required[0]]
            ).map(field)
          : [],
    };
  });
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
    updated.chargeKg !== previous.chargeKg ||
    updated.refrigerantGwp !== previous.refrigerantGwp ||
    updated.refrigerantGwpBasis !== previous.refrigerantGwpBasis ||
    [
      "leakEquipment",
      "leakDetection",
      "leakHermetic",
      "leakHermeticLabel",
      "leakResidential",
      "performedOn",
    ].some((id) => updated[id] !== previous[id])
  ) {
    updated.leakCheckInterval = "";
    updated.leakCheckEvidence = "";
  }
  if (updated.refrigerantId !== previous.refrigerantId)
    updated.pressureTestRequired = "not_assessed";
  return updated;
}
/** Checks presence and basic number validity, not legal applicability, test acceptance or signatures. */
export function commissioningMissingFields(
  fields: Record<string, string>,
): ChecklistField[] {
  if (fields.commissioningPurpose === "technical") return [];
  const required = [
    "equipment",
    "performedOn",
    "technician",
    "installationLocation",
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
  if (
    !["equipment_documents", "expert_assessment", "other_documented"].includes(
      fields.pressureAssessmentBasis,
    )
  )
    missing.push("pressureAssessmentBasis");
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
  for (const status of commissioningProtocolStatus(fields))
    if (status.mode === "missing")
      missing.push(...status.missing.map((item) => item.id));
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
    `PhaseKit — ${checklistReportName(draft, locale)}`,
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
