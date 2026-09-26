import type { ToolRecord } from "./storage";
import { renderCycleChartSvg } from "./ph-chart-snapshot";
import {
  checklistDefinitions,
  commonChecklistFields,
  type ChecklistDraft,
} from "../../../packages/core/src/field-tools";
import {
  formatReportRow,
  isCyclePrimaryOutput,
  primaryReportOutputs,
  reportHasRoundedValues,
  reportName,
} from "./report-summary";
import type { CheckResult, Source } from "../../../packages/core/src/contracts";
import { reasonMessages } from "../../../packages/rulesets/eu-fi/src/reasons";
import {
  isCalendarDate,
  nextInspectionDate,
} from "../../../packages/core/src/schedule";
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
    Pick<
      ToolRecord,
      | "createdAt"
      | "equipmentName"
      | "lastLinkedEquipmentName"
      | "notes"
      | "dataVersion"
      | "chartSnapshot"
    >
  >;

type Locale = "fi" | "en";

// These rules belong to the new print document, not the application's theme.
// Every key fact remains legible when backgrounds and colour are disabled.
export const PRINT_DOCUMENT_CSS = `@page{size:A4;margin:14mm}*{box-sizing:border-box}html{color-scheme:light}body{font:12px/1.45 system-ui,sans-serif;max-width:850px;margin:26px auto;padding:0 22px;color:#182127}h1,h2{line-height:1.18}h1{font-size:25px;margin:5px 0 12px}h2{font-size:15px;margin:21px 0 8px;padding-bottom:5px;border-bottom:1px solid #929fa5}.brand{font-size:10px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;margin:0 0 9px}.meta,.muted{color:#405158}.meta{margin:3px 0 9px}.hero{border:2px solid #283b42;border-radius:6px;padding:12px 15px;margin:14px 0;break-inside:avoid;page-break-inside:avoid}.hero-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.hero-value{font-size:24px;font-weight:700;line-height:1.15;margin:4px 0}.hero-context{margin:7px 0 0;font-size:12px}.date-pair{display:grid;grid-template-columns:1.35fr 1fr;gap:10px;margin-top:12px}.date-card{border-top:1px solid #87969d;padding-top:8px}.date-card strong{display:block;font-size:18px;margin-top:2px}.date-card-secondary strong{font-size:13px}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0;break-inside:avoid}.result-card{border:1px solid #829098;border-radius:6px;padding:10px 12px;break-inside:avoid}.result-card dt{font-size:11px;color:#405158}.result-card dd{font-size:20px;font-weight:700;line-height:1.18;margin:3px 0 0}.rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}.row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:8px;padding:5px 0;border-bottom:1px solid #d7dfe2;break-inside:avoid}.row dt{color:#405158}.row dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.detail-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}.detail-list div{border-bottom:1px solid #d7dfe2;padding:5px 0;break-inside:avoid}.detail-list dt{font-weight:650}.detail-list dd{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.checklist-progress{font-size:17px;font-weight:700;margin:14px 0}.checklist-steps{list-style:none;padding:0}.checklist-steps li{display:flex;gap:9px;border-bottom:1px solid #d7dfe2;padding:7px 0;break-inside:avoid}.checkmark{font:19px/1 system-ui,sans-serif;min-width:22px}.sources{font-size:10px;line-height:1.4;columns:2;column-gap:18px}.sources li{margin:0 0 6px;break-inside:avoid;overflow-wrap:anywhere}a{color:inherit}.notice{border-top:1px solid #9aa8ae;margin-top:18px;padding-top:9px;color:#405158;font-size:10px}.chart{display:block;width:100%;max-height:340px;object-fit:contain;break-inside:avoid}p{overflow-wrap:anywhere;white-space:pre-wrap}@media print{body{margin:0 auto;padding:0}a{text-decoration:none}}`;

function createPrintDocument(win: Window, title: string, locale: Locale) {
  const doc = win.document;
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();
  doc.documentElement.lang = locale;
  doc.title = title;
  const style = doc.createElement("style");
  style.textContent = PRINT_DOCUMENT_CSS;
  doc.head.append(style);
  const brand = doc.createElement("p");
  brand.className = "brand";
  brand.textContent = "PHASEKIT / " + (locale === "fi" ? "Raportti" : "Report");
  doc.body.append(brand);
  return doc;
}

function addHero(
  doc: Document,
  label: string,
  value: string,
  context?: string,
) {
  const hero = doc.createElement("section");
  hero.className = "hero";
  const caption = doc.createElement("div");
  caption.className = "hero-label";
  caption.textContent = label;
  const main = doc.createElement("p");
  main.className = "hero-value";
  main.textContent = value;
  hero.append(caption, main);
  if (context) {
    const detail = doc.createElement("p");
    detail.className = "hero-context";
    detail.textContent = context;
    hero.append(detail);
  }
  doc.body.append(hero);
  return hero;
}

function appendDateCard(
  doc: Document,
  parent: HTMLElement,
  label: string,
  value: string,
  secondary = false,
) {
  const card = doc.createElement("div");
  card.className = secondary ? "date-card date-card-secondary" : "date-card";
  const caption = doc.createElement("span");
  caption.textContent = label;
  const date = doc.createElement("strong");
  date.textContent = value;
  card.append(caption, date);
  parent.append(card);
}

export function leakCheckPrintSchedule(
  result: Pick<CheckResult, "state" | "months" | "input">,
  lastInspectionDate?: string,
): {
  status: "dated" | "no_previous" | "no_schedule" | "invalid";
  previous?: string;
  due?: string;
} {
  if (!lastInspectionDate) return { status: "no_previous" };
  try {
    const due = nextInspectionDate(result, lastInspectionDate);
    return due
      ? { status: "dated", previous: lastInspectionDate, due }
      : { status: "no_schedule", previous: lastInspectionDate };
  } catch {
    return { status: "invalid" };
  }
}

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
  const displayTitle = reportName(record, locale);
  const doc = createPrintDocument(win, displayTitle, locale);
  const body = doc.body;
  const h1 = doc.createElement("h1");
  h1.textContent = displayTitle;
  body.append(h1);
  const meta = doc.createElement("p");
  meta.className = "meta";
  if (record.createdAt) {
    meta.textContent = `${locale === "fi" ? "Tallennettu" : "Saved"}: ${displayDate(record.createdAt, locale)}`;
    body.append(meta);
  }
  if (record.equipmentName)
    appendText(
      body,
      "p",
      `${record.createdAt ? (locale === "fi" ? "Alkuperäinen laitenimi" : "Equipment name when saved") : locale === "fi" ? "Laite / kohde" : "Equipment / site"}: ${record.equipmentName}`,
    );
  else if (record.lastLinkedEquipmentName)
    appendText(
      body,
      "p",
      `${locale === "fi" ? "Aiempi laitelinkki (nimi poistettaessa)" : "Former equipment link (name at removal)"}: ${record.lastLinkedEquipmentName}`,
    );
  appendRows(
    doc,
    body,
    locale === "fi" ? "Tulokset" : "Results",
    record.tool === "cycle" && record.chartSnapshot
      ? record.outputs.filter(isCyclePrimaryOutput)
      : record.outputs,
    locale,
    primaryReportOutputs(record),
  );
  appendRows(
    doc,
    body,
    locale === "fi" ? "Lähtötiedot" : "Inputs",
    record.inputs,
    locale,
  );
  if (reportHasRoundedValues(record)) {
    const roundingNote = doc.createElement("p");
    roundingNote.className = "muted";
    roundingNote.textContent =
      locale === "fi"
        ? "≈ tarkoittaa näytössä pyöristettyä arvoa. JSON-vienti säilyttää tarkat tallennetut luvut."
        : "≈ marks a rounded display value. JSON export keeps the exact recorded numbers.";
    body.append(roundingNote);
  }
  let chartImage: HTMLImageElement | undefined;
  if (record.chartSnapshot) {
    const figure = doc.createElement("section");
    figure.style.breakInside = "avoid";
    appendText(
      figure,
      "h2",
      locale === "fi" ? "Kylmäkierron kaavio" : "Cycle diagram",
    );
    chartImage = doc.createElement("img");
    chartImage.className = "chart";
    chartImage.alt =
      locale === "fi"
        ? "Tallennettu log(p)–h-kaavio"
        : "Saved log(p)–h diagram";
    chartImage.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCycleChartSvg(record.chartSnapshot, locale))}`;
    figure.append(chartImage);
    const caption = doc.createElement("p");
    caption.className = "muted";
    caption.textContent =
      locale === "fi"
        ? "Rajattu CoolProp HEOS -malli. Suorat viivat kuvaavat kierron järjestystä, eivät prosessireittiä."
        : "Bounded CoolProp HEOS model. Straight lines show cycle order, not the process path.";
    figure.append(caption);
    body.append(figure);
    if (record.tool === "cycle")
      appendRows(
        doc,
        body,
        locale === "fi"
          ? "Tilapisteet ja malliversiot"
          : "State points and model versions",
        record.outputs.filter((row) => !isCyclePrimaryOutput(row)),
        locale,
      );
  }
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
  sourceList.className = "sources";
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
  win.focus();
  if (chartImage) {
    const image = chartImage;
    const failed = () => {
      const warning = doc.createElement("p");
      warning.className = "notice";
      warning.setAttribute("role", "alert");
      warning.textContent =
        locale === "fi"
          ? "Tallennetun kaavion lataus epäonnistui. Tulostusta ei aloitettu. Yritä uudelleen tai vie laskelma JSON-muodossa."
          : "The saved chart could not load. Printing was cancelled. Try again or export the calculation as JSON.";
      image.replaceWith(warning);
      win.focus();
    };
    const print = () => {
      if (image.naturalWidth > 0) win.requestAnimationFrame(() => win.print());
      else failed();
    };
    if (image.complete) print();
    else {
      image.onload = print;
      image.onerror = failed;
    }
  } else win.requestAnimationFrame(() => win.print());
  return true;
}

export function printChecklistDraft(
  draft: ChecklistDraft,
  locale: "fi" | "en",
) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const definition = checklistDefinitions[draft.kind];
  const title = draft.title.trim() || definition.name[locale];
  const doc = createPrintDocument(win, `${title} · PhaseKit`, locale);
  appendText(doc.body, "h1", title);
  appendText(
    doc.body,
    "p",
    `${definition.name[locale]} · ${locale === "fi" ? "Päivitetty" : "Updated"}: ${displayDate(draft.updatedAt, locale)}`,
  );
  const equipment = draft.fields.equipment?.trim();
  if (equipment)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Laite / tunniste" : "Equipment / identifier"}: ${equipment}`,
    );
  const complete = draft.checkedIds.filter((id) =>
    definition.steps.some((step) => step.id === id),
  ).length;
  const progress = doc.createElement("p");
  progress.className = "checklist-progress";
  progress.textContent = `${locale === "fi" ? "Tila" : "Status"}: ${complete} / ${definition.steps.length} ${locale === "fi" ? "työvaihetta merkitty" : "steps marked"}`;
  doc.body.append(progress);
  appendText(doc.body, "h2", locale === "fi" ? "Työvaiheet" : "Steps");
  const steps = doc.createElement("ul");
  steps.className = "checklist-steps";
  for (const step of definition.steps) {
    const item = doc.createElement("li");
    const mark = doc.createElement("span");
    mark.className = "checkmark";
    mark.textContent = draft.checkedIds.includes(step.id) ? "☑" : "☐";
    const label = doc.createElement("span");
    label.textContent = step.label[locale];
    item.append(mark, label);
    steps.append(item);
  }
  doc.body.append(steps);
  appendText(doc.body, "h2", locale === "fi" ? "Havainnot" : "Observations");
  const fields = doc.createElement("dl");
  fields.className = "detail-list";
  for (const field of [...commonChecklistFields, ...definition.fields]) {
    const item = doc.createElement("div");
    const dt = doc.createElement("dt");
    dt.textContent = field.label[locale];
    const dd = doc.createElement("dd");
    dd.textContent = draft.fields[field.id]?.trim() || "—";
    item.append(dt, dd);
    fields.append(item);
  }
  doc.body.append(fields);
  if (draft.notes.trim()) {
    appendText(doc.body, "h2", locale === "fi" ? "Muistiinpanot" : "Notes");
    appendText(doc.body, "p", draft.notes);
  }
  const notice = doc.createElement("p");
  notice.className = "notice";
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
  equipmentName,
}: {
  result: CheckResult;
  locale: "fi" | "en";
  designation: string;
  sources: Source[];
  createdAt?: string;
  lastInspectionDate?: string;
  componentDesignations?: Record<string, string>;
  equipmentName?: string;
}): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  const doc = createPrintDocument(
    win,
    `${designation} · ${locale === "fi" ? "Vuototarkastusarvio" : "Leak check assessment"}`,
    locale,
  );
  appendText(doc.body, "h1", doc.title);
  if (createdAt)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Tallennettu" : "Saved"}: ${displayDate(createdAt, locale)}`,
    );
  if (equipmentName)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Laite / kohde" : "Equipment / site"}: ${equipmentName}`,
    );
  const outcome = translate(locale, result.state);
  const interval =
    result.months !== null
      ? `${locale === "fi" ? "Tarkastusväli" : "Inspection interval"}: ${result.months} ${locale === "fi" ? "kuukautta" : "months"}`
      : locale === "fi"
        ? "Ei laskettavaa tarkastusväliä"
        : "No calculable inspection interval";
  const hero = addHero(
    doc,
    locale === "fi" ? "Vuototarkastusvaatimus" : "Leak-check requirement",
    outcome,
    `${interval} · ${designation} · ${result.input.charge} ${result.input.unit}`,
  );
  const schedule = leakCheckPrintSchedule(result, lastInspectionDate);
  const dates = doc.createElement("div");
  dates.className = "date-pair";
  appendDateCard(
    doc,
    dates,
    locale === "fi"
      ? "Seuraava vuototarkastus viimeistään"
      : "Next leak check by",
    schedule.due
      ? displayDate(schedule.due, locale)
      : schedule.status === "no_previous"
        ? locale === "fi"
          ? "Edellistä tarkastuspäivää ei kirjattu"
          : "Previous inspection date not recorded"
        : schedule.status === "no_schedule"
          ? locale === "fi"
            ? "Ei laskettavaa määräpäivää"
            : "No calculable due date"
          : locale === "fi"
            ? "Tarkastuspäivä on virheellinen"
            : "Inspection date is invalid",
  );
  appendDateCard(
    doc,
    dates,
    locale === "fi" ? "Edellinen vuototarkastus" : "Previous leak check",
    schedule.previous ? displayDate(schedule.previous, locale) : "—",
    true,
  );
  hero.append(dates);
  if (schedule.due && schedule.due < result.input.asOf)
    appendText(
      doc.body,
      "p",
      locale === "fi"
        ? "Määräpäivä on ennen arviointipäivää."
        : "The due date precedes the assessment date.",
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
    [
      locale === "fi" ? "Arviointipäivä" : "Assessment date",
      displayDate(input.asOf, locale),
    ],
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
      displayDate(lastInspectionDate, locale),
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
  if (sources.length) {
    const list = doc.createElement("ul");
    list.className = "sources";
    for (const source of sources) {
      const item = doc.createElement("li");
      item.textContent = [
        source.title,
        source.id,
        source.version,
        source.checkedAt &&
          `${locale === "fi" ? "tarkistettu" : "checked"} ${source.checkedAt}`,
        source.license,
        source.note,
        source.url,
      ]
        .filter(Boolean)
        .join(" · ");
      list.append(item);
    }
    doc.body.append(list);
  }
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
  primaryOutputs: ToolRecord["outputs"] = [],
) {
  if (!rows.length) return;
  appendText(body, "h2", title);
  const primary = rows.filter((row) => primaryOutputs.includes(row));
  if (primary.length) {
    const hero = doc.createElement("dl");
    hero.className = "result-grid";
    for (const row of primary) {
      const card = doc.createElement("div");
      card.className = "result-card";
      const dt = doc.createElement("dt");
      dt.textContent = locale === "fi" ? row.label.fi : row.label.en;
      const dd = doc.createElement("dd");
      dd.textContent = formatReportRow(row, locale);
      card.append(dt, dd);
      hero.append(card);
    }
    body.append(hero);
  }
  const dl = doc.createElement("dl");
  dl.className = "rows";
  for (const row of rows) {
    if (primary.includes(row)) continue;
    const item = doc.createElement("div");
    item.className = "row";
    const dt = doc.createElement("dt");
    dt.textContent = locale === "fi" ? row.label.fi : row.label.en;
    const dd = doc.createElement("dd");
    dd.textContent = formatReportRow(row, locale);
    item.append(dt, dd);
    dl.append(item);
  }
  if (dl.childElementCount) body.append(dl);
}

function displayDate(value: string, locale: Locale): string {
  const date = value.slice(0, 10);
  return isCalendarDate(date) ? formatDate(date, locale) : value;
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
