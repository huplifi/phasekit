import type { Locale } from "../../../packages/i18n/src";
import {
  measurementTypes,
  measurementResultText,
  electricalReportMissingFields,
  type ElectricalInspectionReport,
  type ElectricalMeasurement,
} from "./electrical";
import {
  createPrintDocument,
  appendPrintFooter,
  printWhenReady,
} from "./report-export";

export const electricalFieldLabels = {
  siteName: { fi: "Kohteen nimi / tunnus", en: "Site name / identifier" },
  siteAddress: { fi: "Kohteen osoite", en: "Site address" },
  equipmentName: { fi: "Laite / laitteisto", en: "Equipment / installation" },
  workDescription: { fi: "Työn kuvaus", en: "Work description" },
  scope: {
    fi: "Tarkastuksen laajuus ja rajaukset",
    en: "Inspection scope and exclusions",
  },
  builder: { fi: "Rakentaja", en: "Builder" },
  builderContact: {
    fi: "Rakentajan yhteystiedot",
    en: "Builder contact details",
  },
  electricalSupervisor: {
    fi: "Sähkötöiden johtaja",
    en: "Electrical work supervisor",
  },
  supervisorContact: {
    fi: "Sähkötöiden johtajan yhteystiedot",
    en: "Supervisor contact details",
  },
  inspector: { fi: "Tarkastaja", en: "Inspector" },
  inspectorContact: {
    fi: "Tarkastajan yhteystiedot",
    en: "Inspector contact details",
  },
  standards: {
    fi: "Sovelletut standardit ja versiot",
    en: "Applied standards and versions",
  },
  methods: {
    fi: "Tarkastusmenetelmät ja toimintatestit",
    en: "Inspection methods and functional tests",
  },
  visualInspection: {
    fi: "Aistinvaraiset tarkastukset: laajuus ja havainnot",
    en: "Visual inspections: scope and observations",
  },
  findings: {
    fi: "Puutteet ja korjaustarpeet (kirjaa myös, jos ei todettu)",
    en: "Defects and corrective work (also record if none found)",
  },
  deviations: {
    fi: "Poikkeamat ja niiden selvitykset (kirjaa myös, jos ei ole)",
    en: "Deviations and explanations (also record if none)",
  },
  evaluation: {
    fi: "Tulosten arviointi ja vaatimustenmukaisuuden perustelut",
    en: "Assessment and explanation of conformity",
  },
  conclusionNote: {
    fi: "Johtopäätöksen perustelut ja käytön rajoitukset",
    en: "Conclusion, reasons and restrictions on use",
  },
  signature: { fi: "Allekirjoittajan nimenselvennys", en: "Signatory name" },
  inspectionDate: { fi: "Tarkastuksen päiväys", en: "Inspection date" },
} as const;
export const electricalConclusionLabels = {
  "": { fi: "Valitse johtopäätös", en: "Choose conclusion" },
  accepted: {
    fi: "Hyväksytty tarkastetussa laajuudessa",
    en: "Accepted within inspected scope",
  },
  defects: {
    fi: "Puutteita — katso käytön rajoitukset",
    en: "Defects — see restrictions on use",
  },
  "not-approved": {
    fi: "Ei hyväksytty käyttöönottoon",
    en: "Not approved for commissioning",
  },
} as const;
export const electricalAssessmentLabels: Record<
  ElectricalMeasurement["assessment"],
  { fi: string; en: string }
> = {
  unassessed: { fi: "Kirjattu — ei arvioitu", en: "Recorded — unassessed" },
  pass: { fi: "Arvioitu: hyväksytty", en: "Assessed: pass" },
  fail: { fi: "Arvioitu: puute", en: "Assessed: fail" },
  "not-applicable": {
    fi: "Ei sovellu — perustelu vaaditaan",
    en: "Not applicable — reason required",
  },
};
export const electricalTemplateNotice = {
  fi: "Tarkastuskohtien soveltuvuus, pohjan sisältö ja mahdolliset hyväksymisrajat on tarkistettava työn ja kohteen sovellettavista standardeista ennen tuotantokäyttöä. PhaseKit ei arvioi teknistä vaatimustenmukaisuutta automaattisesti.",
  en: "Verify applicable inspection items, template content and any acceptance limits against the standards for the work and site before production use. PhaseKit does not assess technical conformity automatically.",
};
function reportDateTime(value: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "fi" ? "fi-FI" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  }).format(new Date(value));
}
function missingFieldLabel(key: string, locale: Locale): string {
  if (key in electricalFieldLabels)
    return electricalFieldLabels[key as keyof typeof electricalFieldLabels][
      locale
    ];
  const extra: Record<string, { fi: string; en: string }> = {
    applicabilityVerified: {
      fi: "Standardien ja tarkastuspohjan soveltuvuuden vahvistus",
      en: "Confirmation of standards and template applicability",
    },
    measurements: {
      fi: "Mittauskirjausten ja niiden arviointien täydennys",
      en: "Complete measurement records and assessments",
    },
    conflictingConclusion: {
      fi: "Hyväksytyn johtopäätöksen ja hylätyn mittaustuloksen ristiriidan selvitys",
      en: "Resolve conflicting accepted conclusion and failed measurement",
    },
    conclusion: { fi: "Johtopäätös", en: "Conclusion" },
  };
  return (
    extra[key]?.[locale] ??
    (locale === "fi"
      ? "Tarkastustietojen täydennys"
      : "Complete inspection information")
  );
}
export function electricalReportText(
  report: ElectricalInspectionReport,
  locale: Locale,
): string[] {
  const fi = locale === "fi";
  return [
    fi
      ? "Käyttöönottotarkastuspöytäkirja"
      : "Electrical commissioning inspection report",
    `${report.status === "draft" ? (fi ? "LUONNOS" : "DRAFT") : fi ? "Viimeistelty — allekirjoitetaan tulosteeseen" : "Finalised — sign the printed document"} · ${fi ? "Versio" : "Revision"} ${report.revision}`,
    `${fi ? "Tunnus" : "ID"}: ${report.id}`,
    ...(report.previousRevisionId
      ? [
          `${fi ? "Edellinen versio" : "Previous revision"}: ${report.previousRevisionId}`,
        ]
      : []),
    `${fi ? "Luotu" : "Created"}: ${reportDateTime(report.createdAt, locale)} · ${fi ? "Päivitetty" : "Updated"}: ${reportDateTime(report.updatedAt, locale)}`,
    ...(report.finalizedAt
      ? [
          `${fi ? "Viimeistelty" : "Finalised"}: ${reportDateTime(report.finalizedAt, locale)}`,
        ]
      : []),
    ...Object.entries(electricalFieldLabels).map(
      ([key, label]) =>
        `${label[locale]}: ${report[key as keyof typeof electricalFieldLabels] || "—"}`,
    ),
    `${fi ? "Johtopäätös" : "Conclusion"}: ${electricalConclusionLabels[report.conclusion][locale]}`,
    `${fi ? "Standardien soveltuvuus ja pohja tarkistettu" : "Standards applicability and template verified"}: ${report.applicabilityVerified ? (fi ? "Kyllä" : "Yes") : fi ? "Ei" : "No"}`,
  ];
}
export function printElectricalReport(
  report: ElectricalInspectionReport,
  locale: Locale,
): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  const lines = electricalReportText(report, locale);
  const doc = createPrintDocument(
    win,
    `${report.siteName || "PhaseKit"} · ${lines[0]}`,
    locale,
  );
  doc.body.classList.add("field-report-document");
  const add = (tag: "h1" | "h2" | "p", text: string, className?: string) => {
    const el = doc.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    doc.body.append(el);
    return el;
  };
  add("h1", lines[0]);
  add("p", lines[1], "document-status");
  for (const line of lines.slice(2))
    add("p", line).style.whiteSpace = "pre-wrap";
  if (report.status === "draft") {
    const missing = electricalReportMissingFields(report).map((key) =>
      missingFieldLabel(key, locale),
    );
    if (missing.length)
      add(
        "p",
        `${locale === "fi" ? "Täydennettävää" : "Incomplete"}: ${missing.join(" · ")}`,
        "notice",
      );
  }
  add(
    "h2",
    locale === "fi"
      ? "Mittausten ja mittalaitteiden tallennetut tiedot"
      : "Frozen measurements and test instruments",
  );
  if (!report.measurements.length)
    add(
      "p",
      locale === "fi"
        ? "Ei liitettyjä mittauskirjauksia. Tarkastuksen laajuus ja menetelmät on kuvattu yllä."
        : "No attached measurement records. Inspection scope and methods are described above.",
    );
  for (const m of report.measurements) {
    add("h2", `${m.point || "—"} · ${measurementTypes[m.type].label[locale]}`);
    add(
      "p",
      `${m.siteName} · ${m.equipmentName || "—"} · ${locale === "fi" ? "Mittaus / mittauskerta" : "Measurement / session"}: ${m.id} / ${m.sessionId}`,
    );
    add(
      "p",
      `${locale === "fi" ? "Tulos" : "Result"}: ${measurementResultText(m)}`,
    );
    add(
      "p",
      `${reportDateTime(m.measuredAt, locale)} · ${m.technician || "—"}`,
    );
    add(
      "p",
      `${locale === "fi" ? "Mittari / malli / sarjanumero" : "Meter / model / serial number"}: ${m.meter.brand || "—"} / ${m.meter.model || "—"} / ${m.meter.serialNumber || "—"}`,
    );
    add("p", electricalAssessmentLabels[m.assessment][locale]);
    if (m.assessmentNote)
      add("p", m.assessmentNote).style.whiteSpace = "pre-wrap";
    if (m.note)
      add(
        "p",
        `${locale === "fi" ? "Huomio" : "Note"}: ${m.note}`,
      ).style.whiteSpace = "pre-wrap";
    if (m.photo) {
      const image = doc.createElement("img");
      image.src = m.photo;
      image.alt = m.point;
      image.style.maxWidth = "100%";
      image.style.maxHeight = "90mm";
      doc.body.append(image);
    }
  }
  add(
    "h2",
    locale === "fi" ? "Tarkastajan allekirjoitus" : "Inspector signature",
  );
  add("p", `${report.signature || "—"} · ${report.inspectionDate || "—"}`);
  const line = doc.createElement("div");
  line.className = "signature-line";
  doc.body.append(line);
  add(
    "p",
    locale === "fi"
      ? "Allekirjoitetaan tulosteeseen. Nimenselvennys ei ole sähköinen allekirjoitus."
      : "Sign the printed document. A typed name is not an electronic signature.",
    "signature-caption",
  );
  add("p", electricalTemplateNotice[locale], "notice");
  add(
    "p",
    locale === "fi"
      ? "Sisältövaatimusten lähtökohta: Tukes, Sähköasennusten käyttöönottovaiheen tarkastukset (tarkistettu 11.11.2026)."
      : "Content requirements reference: Tukes, commissioning inspections of electrical installations (checked 11 November 2026).",
  );
  add(
    "p",
    "https://tukes.fi/sahko/sahkoasennusten-kayttoonottovaiheen-tarkastukset",
  );
  appendPrintFooter(doc, locale, [report.id, `v${report.revision}`]);
  printWhenReady(win, doc, locale);
  return true;
}
