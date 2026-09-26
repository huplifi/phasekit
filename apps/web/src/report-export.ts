import type { ToolRecord } from "./storage";
import {
  checklistDefinitions,
  commonChecklistFields,
  type ChecklistDraft,
} from "../../../packages/core/src/field-tools";
import {
  formatReportRow,
  reportHasRoundedValues,
  reportName,
} from "./report-summary";
import type { CheckResult, Source } from "../../../packages/core/src/contracts";
import { reasonMessages } from "../../../packages/rulesets/eu-fi/src/reasons";
import { nextInspectionDate } from "../../../packages/core/src/schedule";
import {
  formatDate,
  translate,
  type MessageKey,
} from "../../../packages/i18n/src";

type PrintableToolRecord = Pick<
  ToolRecord,
  "tool" | "title" | "inputs" | "outputs" | "sources"
> &
  Partial<
    Pick<ToolRecord, "createdAt" | "equipmentName" | "notes" | "dataVersion">
  >;

export function downloadToolRecord(record: ToolRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `phasekit-report-${safeFilename(record.id)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export function printToolRecord(
  record: PrintableToolRecord,
  locale: "fi" | "en",
) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const doc = win.document;
  // Finish the initial blank navigation before inserting user data as text.
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();
  const root = doc.createElement("html");
  root.lang = locale;
  const head = doc.createElement("head");
  const title = doc.createElement("title");
  const displayTitle = reportName(record, locale);
  title.textContent = displayTitle;
  const style = doc.createElement("style");
  style.textContent = `body{font:15px/1.5 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#182127}h1,h2{line-height:1.2}h1{font-size:26px}h2{font-size:18px;margin-top:28px}.meta,.muted{color:#53636d}dl{margin:0}dt{font-weight:650;margin-top:12px}dd{margin:2px 0 0 0;white-space:pre-wrap}li{margin:8px 0;overflow-wrap:anywhere}a{color:#174f72}.notice{border-top:1px solid #bbc6ca;margin-top:24px;padding-top:12px;color:#53636d}@media print{body{margin:0 auto;padding:0 12mm}a{color:inherit;text-decoration:none}}`;
  head.append(title, style);
  const body = doc.createElement("body");
  const h1 = doc.createElement("h1");
  h1.textContent = displayTitle;
  body.append(h1);
  const meta = doc.createElement("p");
  meta.className = "meta";
  if (record.createdAt) {
    meta.textContent = `${locale === "fi" ? "Tallennettu" : "Saved"}: ${record.createdAt}`;
    body.append(meta);
  }
  if (record.equipmentName)
    appendText(
      body,
      "p",
      `${locale === "fi" ? "Laite / kohde" : "Equipment / site"}: ${record.equipmentName}`,
    );
  appendRows(
    doc,
    body,
    locale === "fi" ? "Lähtötiedot" : "Inputs",
    record.inputs,
    locale,
  );
  if (reportHasRoundedValues(record))
    appendText(
      body,
      "p",
      locale === "fi"
        ? "≈ tarkoittaa näytössä pyöristettyä arvoa. JSON-vienti säilyttää tarkat tallennetut luvut."
        : "≈ marks a rounded display value. JSON export keeps the exact recorded numbers.",
    );
  appendRows(
    doc,
    body,
    locale === "fi" ? "Tulokset" : "Results",
    record.outputs,
    locale,
  );
  if (record.notes) {
    appendText(body, "h2", locale === "fi" ? "Muistiinpanot" : "Notes");
    appendText(body, "p", record.notes);
  }
  appendText(
    body,
    "h2",
    locale === "fi"
      ? "Lähteet ja versiotiedot"
      : "Sources and version information",
  );
  if (record.dataVersion)
    appendText(
      body,
      "p",
      `${locale === "fi" ? "Aineistoversio" : "Data version"}: ${record.dataVersion}`,
    );
  const sourceList = doc.createElement("ul");
  for (const source of record.sources) {
    const item = doc.createElement("li");
    const link = doc.createElement("a");
    link.textContent = source.title;
    if (safeHttpUrl(source.url)) link.href = source.url;
    link.rel = "noreferrer";
    item.append(link);
    const details = [
      source.version,
      source.checkedAt &&
        `${locale === "fi" ? "tarkistettu" : "checked"} ${source.checkedAt}`,
      source.license,
      source.note,
    ]
      .filter(Boolean)
      .join(" · ");
    item.append(doc.createTextNode(` · ${source.id}`));
    if (details) item.append(doc.createTextNode(` — ${details}`));
    sourceList.append(item);
  }
  if (record.sources.length) body.append(sourceList);
  const notice = doc.createElement("p");
  notice.className = "notice";
  notice.textContent =
    locale === "fi"
      ? "Laskelma on tallennettuihin lähtötietoihin ja lähteisiin perustuva arvio. Se ei ole vaatimustenmukaisuussertifikaatti tai laitehyväksyntä."
      : "This calculation is an estimate based on its recorded inputs and sources. It is not a compliance certificate or equipment approval.";
  body.append(notice);
  root.append(head, body);
  doc.replaceChild(root, doc.documentElement);
  win.focus();
  win.requestAnimationFrame(() => win.print());
  return true;
}

export function printChecklistDraft(
  draft: ChecklistDraft,
  locale: "fi" | "en",
) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const doc = win.document;
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();
  const definition = checklistDefinitions[draft.kind];
  const title = draft.title.trim() || definition.name[locale];
  doc.documentElement.lang = locale;
  doc.title = `${title} · PhaseKit`;
  const style = doc.createElement("style");
  style.textContent = `body{font:15px/1.5 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#182127}h1,h2{line-height:1.2}h1{font-size:26px}h2{font-size:18px;margin-top:28px}li{margin:8px 0;break-inside:avoid}dt{font-weight:650;margin-top:12px}dd{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.meta{color:#53636d}@media print{body{margin:0 auto;padding:0 12mm}}`;
  doc.head.append(style);
  appendText(doc.body, "h1", title);
  appendText(
    doc.body,
    "p",
    `${definition.name[locale]} · ${locale === "fi" ? "Päivitetty" : "Updated"}: ${draft.updatedAt}`,
  );
  const complete = draft.checkedIds.filter((id) =>
    definition.steps.some((step) => step.id === id),
  ).length;
  appendText(
    doc.body,
    "p",
    `${locale === "fi" ? "Tila" : "Status"}: ${complete} / ${definition.steps.length} ${locale === "fi" ? "tehtävää valmiina" : "steps complete"}`,
  );
  appendText(doc.body, "h2", locale === "fi" ? "Työvaiheet" : "Steps");
  const steps = doc.createElement("ul");
  for (const step of definition.steps) {
    const item = doc.createElement("li");
    item.textContent = `${draft.checkedIds.includes(step.id) ? "☑" : "☐"} ${step.label[locale]}`;
    steps.append(item);
  }
  doc.body.append(steps);
  appendText(doc.body, "h2", locale === "fi" ? "Havainnot" : "Observations");
  const fields = doc.createElement("dl");
  for (const field of [...commonChecklistFields, ...definition.fields]) {
    const dt = doc.createElement("dt");
    dt.textContent = field.label[locale];
    const dd = doc.createElement("dd");
    dd.textContent = draft.fields[field.id]?.trim() || "—";
    fields.append(dt, dd);
  }
  doc.body.append(fields);
  if (draft.notes.trim()) {
    appendText(doc.body, "h2", locale === "fi" ? "Muistiinpanot" : "Notes");
    appendText(doc.body, "p", draft.notes);
  }
  const notice = doc.createElement("p");
  notice.className = "meta";
  notice.textContent =
    locale === "fi"
      ? "Tämä on kirjattujen havaintojen työlista. Valmiiksi merkityt työvaiheet eivät yksin osoita, että koe tai käyttöönotto on hyväksytty."
      : "This is a record of entered observations. Checked steps alone do not certify that a test or commissioning passed.";
  doc.body.append(notice);
  win.focus();
  win.requestAnimationFrame(() => win.print());
  return true;
}

export function printCheckResult({
  result,
  locale,
  designation,
  sources,
  createdAt,
  lastInspectionDate,
  componentDesignations,
}: {
  result: CheckResult;
  locale: "fi" | "en";
  designation: string;
  sources: Source[];
  createdAt?: string;
  lastInspectionDate?: string;
  componentDesignations?: Record<string, string>;
}): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  const doc = win.document;
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();
  doc.documentElement.lang = locale;
  doc.title = `${designation} · ${locale === "fi" ? "Vuototarkastusarvio" : "Leak check assessment"}`;
  const style = doc.createElement("style");
  style.textContent = `body{font:15px/1.5 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#182127}h1,h2{line-height:1.2}h1{font-size:26px}h2{font-size:18px;margin-top:28px}dt{font-weight:650;margin-top:12px}dd{margin:2px 0 0;white-space:pre-wrap}li{margin:8px 0;overflow-wrap:anywhere}.notice{border-top:1px solid #bbc6ca;margin-top:24px;padding-top:12px;color:#53636d}@media print{body{margin:0 auto;padding:0 12mm}}`;
  doc.head.append(style);
  appendText(doc.body, "h1", doc.title);
  if (createdAt)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Tallennettu" : "Saved"}: ${createdAt}`,
    );
  appendText(
    doc.body,
    "h2",
    `${locale === "fi" ? "Tulos" : "Result"}: ${translate(locale, result.state)}`,
  );
  if (result.months !== null)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Tarkastusväli" : "Inspection interval"}: ${result.months} ${locale === "fi" ? "kuukautta" : "months"}`,
    );
  if (result.decisiveRule)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Ratkaiseva sääntö" : "Decisive rule"}: ${result.decisiveRule}`,
    );
  for (const code of result.reasonCodes)
    appendText(doc.body, "p", reasonMessages[code]?.[locale] ?? code);
  if (result.detectionRequired)
    appendText(
      doc.body,
      "p",
      locale === "fi"
        ? "Vuodonilmaisujärjestelmä vaaditaan."
        : "Leak detection system required.",
    );
  if (lastInspectionDate) {
    try {
      const due = nextInspectionDate(result, lastInspectionDate);
      if (due) {
        appendText(
          doc.body,
          "p",
          `${locale === "fi" ? "Seuraava määräpäivä" : "Next due date"}: ${formatDate(due, locale)}`,
        );
        if (due < result.input.asOf)
          appendText(
            doc.body,
            "p",
            locale === "fi"
              ? "Määräpäivä on ennen arviointipäivää."
              : "The due date precedes the assessment date.",
          );
      }
    } catch {
      appendText(
        doc.body,
        "p",
        locale === "fi"
          ? "Tarkastuspäivän on oltava kelvollinen eikä se voi olla arviointipäivän jälkeen."
          : "The inspection date must be valid and cannot follow the assessment date.",
      );
    }
  }
  if (result.missingData?.length) {
    appendText(
      doc.body,
      "h2",
      locale === "fi" ? "Puuttuvat tiedot" : "Missing data",
    );
    for (const item of result.missingData)
      appendText(
        doc.body,
        "p",
        `${componentDesignations?.[item.refrigerantId] ?? item.refrigerantId}: ${item.field}`,
      );
  }
  appendText(doc.body, "h2", locale === "fi" ? "Lähtötiedot" : "Inputs");
  const inputs = doc.createElement("dl");
  const input = result.input;
  const yesNo = (value: boolean) => translate(locale, value ? "yes" : "no");
  const inputRows: [string, string][] = [
    [locale === "fi" ? "Kylmäaine" : "Refrigerant", designation],
    [locale === "fi" ? "Täytös" : "Charge", `${input.charge} ${input.unit}`],
    [
      locale === "fi" ? "Laitetyyppi" : "Equipment type",
      translate(locale, input.equipment),
    ],
    [locale === "fi" ? "Arviointipäivä" : "Assessment date", input.asOf],
    [
      locale === "fi" ? "Vuodonilmaisu" : "Leak detection",
      yesNo(input.detection),
    ],
    [locale === "fi" ? "Hermeettinen" : "Hermetic", yesNo(input.hermetic)],
    [
      locale === "fi" ? "Hermeettisyysmerkintä" : "Hermetic label",
      yesNo(input.hermeticLabel),
    ],
    [
      locale === "fi" ? "Asuinrakennus" : "Residential",
      yesNo(input.residential),
    ],
  ];
  if (lastInspectionDate)
    inputRows.push([
      locale === "fi" ? "Edellinen tarkastus" : "Last inspection",
      lastInspectionDate,
    ]);
  for (const [label, value] of inputRows) {
    const dt = doc.createElement("dt");
    dt.textContent = label;
    const dd = doc.createElement("dd");
    dd.textContent = value;
    inputs.append(dt, dd);
  }
  doc.body.append(inputs);
  if (result.components.length) {
    appendText(
      doc.body,
      "h2",
      locale === "fi" ? "Aineosien laskenta" : "Component calculation",
    );
    for (const component of result.components) {
      const lines = [
        `${componentDesignations?.[component.refrigerantId] ?? component.refrigerantId}: ${component.massPercent} % · ${component.massKg} kg`,
        `${locale === "fi" ? "Liite" : "Annex"}: ${component.annex}`,
        component.gwp && `GWP ${component.gwp}`,
        component.gwpBasis &&
          `${locale === "fi" ? "GWP-peruste" : "GWP basis"}: ${component.gwpBasis}`,
        component.tonnesCO2e && `${component.tonnesCO2e} t CO₂e`,
      ];
      appendText(doc.body, "p", lines.filter(Boolean).join(" · "));
    }
  }
  if (result.obligations.length) {
    appendText(doc.body, "h2", locale === "fi" ? "Velvoitteet" : "Obligations");
    for (const item of result.obligations)
      appendText(
        doc.body,
        "p",
        `${item.component
          .split("+")
          .map((id) => componentDesignations?.[id] ?? id)
          .join(
            " + ",
          )} · ${item.quantity} ${item.unit} · ${item.months === null ? "—" : `${item.months} ${locale === "fi" ? "kuukautta" : "months"}`} · ${item.ruleId}`,
      );
  }
  if (result.requiredInputs.length) {
    const labels: Record<string, MessageKey> = {
      refrigerantId: "selectRefrigerant",
      charge: "charge",
      unit: "unit",
      equipment: "equipment",
      asOf: "asOf",
      detection: "detection",
      hermetic: "hermetic",
      hermeticLabel: "hermeticLabel",
      residential: "residential",
    };
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Vaaditut tiedot" : "Required information"}: ${result.requiredInputs.map((key) => (labels[key] ? translate(locale, labels[key]) : key)).join(" · ")}`,
    );
  }
  appendText(
    doc.body,
    "h2",
    locale === "fi"
      ? "Lähteet ja versiotiedot"
      : "Sources and version information",
  );
  appendText(
    doc.body,
    "p",
    `${locale === "fi" ? "Sääntöversio" : "Ruleset version"}: ${result.rulesetVersion}`,
  );
  appendText(
    doc.body,
    "p",
    `${locale === "fi" ? "Aineistoversio" : "Data version"}: ${result.dataVersion}`,
  );
  for (const source of sources)
    appendText(
      doc.body,
      "p",
      [source.title, source.id, source.version, source.checkedAt, source.url]
        .filter(Boolean)
        .join(" · "),
    );
  const notice = doc.createElement("p");
  notice.className = "notice";
  notice.textContent =
    locale === "fi"
      ? "Tämä on tallennettuihin lähtötietoihin ja lähteisiin perustuva arvio, ei todistus tehdystä tarkastuksesta."
      : "This is an assessment based on the recorded inputs and sources, not proof that an inspection was performed.";
  doc.body.append(notice);
  win.focus();
  win.requestAnimationFrame(() => win.print());
  return true;
}

function appendRows(
  doc: Document,
  body: HTMLElement,
  title: string,
  rows: ToolRecord["inputs"],
  locale: "fi" | "en",
) {
  if (!rows.length) return;
  appendText(body, "h2", title);
  const dl = doc.createElement("dl");
  for (const row of rows) {
    const dt = doc.createElement("dt");
    dt.textContent = locale === "fi" ? row.label.fi : row.label.en;
    const dd = doc.createElement("dd");
    dd.textContent = formatReportRow(row, locale);
    dl.append(dt, dd);
  }
  body.append(dl);
}

function appendText(
  parent: HTMLElement,
  tag: "h1" | "h2" | "p",
  value: string,
) {
  const el = parent.ownerDocument.createElement(tag);
  el.textContent = value;
  parent.append(el);
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").slice(0, 80) || "saved";
}

function safeHttpUrl(value: string): boolean {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
