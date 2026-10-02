import type { FieldReport, ToolRecord } from "./storage";
import packageInfo from "../../../package.json" with { type: "json" };
import Decimal from "decimal.js";
import { renderCycleChartSvg } from "./ph-chart-snapshot";
import {
  checklistDefinitions,
  checklistReportFields,
  commissioningMissingFields,
  commissioningProtocolStatus,
  combinedReportNotes,
  type ChecklistDraft,
  type ChecklistField,
  type ChecklistKind,
} from "../../../packages/core/src/field-tools";
import {
  formatReportRow,
  formatReportValue,
  isCyclePrimaryOutput,
  primaryReportOutputs,
  reportHasRoundedValues,
  reportDurationNote,
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
  formatDecimal,
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

const APP_VERSION = packageInfo.version;

// These rules belong to the new print document, not the application's theme.
// Every key fact remains legible when backgrounds and colour are disabled.
export const PRINT_DOCUMENT_CSS = `@page{size:A4;margin:14mm}*{box-sizing:border-box}html{color-scheme:light}body{font:12px/1.45 system-ui,sans-serif;max-width:850px;margin:26px auto;padding:0 22px;color:#182127}h1,h2{line-height:1.18}h1{font-size:25px;margin:5px 0 12px}h2{font-size:15px;margin:21px 0 8px;padding-bottom:5px;border-bottom:1px solid #929fa5}.brand{font-size:10px;letter-spacing:.15em;text-transform:uppercase;font-weight:700;margin:0 0 9px}.meta,.muted{color:#405158}.meta{margin:3px 0 9px}.hero{border:2px solid #283b42;border-radius:6px;padding:12px 15px;margin:14px 0;break-inside:avoid;page-break-inside:avoid}.hero-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.hero-value{font-size:24px;font-weight:700;line-height:1.15;margin:4px 0}.hero-context{margin:7px 0 0;font-size:12px}.date-pair{display:grid;grid-template-columns:1.35fr 1fr;gap:10px;margin-top:12px}.date-card{border-top:1px solid #87969d;padding-top:8px}.date-card strong{display:block;font-size:18px;margin-top:2px}.date-card-secondary strong{font-size:13px}.result-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:12px 0;break-inside:avoid}.result-card{border:1px solid #829098;border-radius:6px;padding:10px 12px;break-inside:avoid}.result-card dt{font-size:11px;color:#405158}.result-card dd{font-size:20px;font-weight:700;line-height:1.18;margin:3px 0 0}.rows{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}.row{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:8px;padding:5px 0;border-bottom:1px solid #d7dfe2;break-inside:avoid}.row dt{color:#405158}.row dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.detail-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px}.detail-list div{border-bottom:1px solid #d7dfe2;padding:5px 0;break-inside:avoid}.detail-list dt{font-weight:650}.detail-list dd{margin:2px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}.checklist-progress{font-size:17px;font-weight:700;margin:14px 0}.checklist-steps{list-style:none;padding:0}.checklist-steps li{display:flex;gap:9px;border-bottom:1px solid #d7dfe2;padding:7px 0;break-inside:avoid}.checkmark{font:19px/1 system-ui,sans-serif;min-width:22px}.sources{font-size:10px;line-height:1.4;columns:2;column-gap:18px}.sources li{margin:0 0 6px;break-inside:avoid;overflow-wrap:anywhere}a{color:inherit}.notice{border-top:1px solid #9aa8ae;margin-top:18px;padding-top:9px;color:#405158;font-size:10px}.chart{display:block;width:100%;max-height:340px;object-fit:contain;break-inside:avoid}p{overflow-wrap:anywhere;white-space:pre-wrap}@media print{body{margin:0 auto;padding:0}a{text-decoration:none}}`;

export function createPrintDocument(
  win: Window,
  title: string,
  locale: Locale,
) {
  const doc = win.document;
  doc.open();
  doc.write("<!doctype html><html><head></head><body></body></html>");
  doc.close();
  doc.documentElement.lang = locale;
  doc.title = title;
  const viewport = doc.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover";
  doc.head.append(viewport);
  const style = doc.createElement("style");
  style.textContent = `${PRINT_DOCUMENT_CSS}.document-status{display:inline-block;border:1px solid #263b44;border-radius:4px;padding:4px 7px;font-weight:700;margin:3px 0 10px}.document-subhead{font-size:13px;margin:4px 0 13px}.document-footer{border-top:1px solid #9aa8ae;margin-top:19px;padding-top:8px;font-size:10px;color:#405158;break-inside:avoid}.signature-line{border-bottom:1px solid #283b42;min-height:22px;margin:14px 0 4px;max-width:290px}.field-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;break-inside:avoid}.field-summary-card{border:1px solid #829098;border-radius:6px;padding:9px 11px;break-inside:avoid}.field-summary-card dt{font-size:11px}.field-summary-card dd{font-size:19px;font-weight:700;margin:3px 0 0;overflow-wrap:anywhere}.field-summary-note{margin:6px 0;font-size:11px}`;
  style.textContent += `h2{break-after:avoid;page-break-after:avoid}.field-report-document h2{margin:14px 0 6px;padding-bottom:4px}.field-report-document p{margin-top:6px;margin-bottom:6px}.field-report-document .checklist-progress{margin:8px 0}.field-report-document .checklist-steps li{padding:4px 0}.field-report-document .document-subhead{margin:3px 0 8px}.field-report-document .document-status{margin:2px 0 7px}.field-report-document .notice{margin-top:8px;padding-top:6px}.field-report-document .document-footer{margin-top:7px;padding-top:6px}.report-closing{break-inside:avoid;page-break-inside:avoid}`;
  style.textContent += `.field-report-document .field-summary-compact{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.field-report-document .field-summary-compact .field-summary-card{padding:7px 9px}.field-report-document .field-summary-compact .field-summary-card dd{font-size:17px}.field-report-document .meta{margin-bottom:4px}.field-report-document .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:7px 0}.field-report-document .signature-line{max-width:none;margin:9px 0 4px}.signature-caption{font-size:11px;color:#405158}.legacy-signature-name{font-size:11px;color:#405158}.source-list{list-style:none;margin:5px 0;padding:0;font-size:11px;line-height:1.25;columns:2;column-gap:18px}.source-list li{margin:0 0 4px;break-inside:avoid;overflow-wrap:anywhere}.source-meta{color:#405158;font-size:10.5px}.leak-document h2{margin:12px 0 5px}.leak-document .detail-list{gap:3px 15px}.leak-document .detail-list div{padding:3px 0}.leak-document .hero{margin:10px 0 8px}.hero-alert{font-weight:700;color:#84213b;border-top:1px solid #84213b;margin:9px 0 0;padding-top:8px}.compact-table{width:100%;border-collapse:collapse;font-size:11px;margin:6px 0 10px}.compact-table th{text-align:left;color:#405158;font-weight:650}.compact-table th,.compact-table td{padding:5px 6px;border-bottom:1px solid #d7dfe2;vertical-align:top;overflow-wrap:anywhere}.compact-table tr{break-inside:avoid;page-break-inside:avoid}.compact-table td:last-child,.compact-table th:last-child{text-align:right}.compact-table .subline{display:block;font-size:10px;color:#405158}.leak-document .source-version-line{font-size:11px;color:#405158;margin:4px 0}.leak-document .notice{margin-top:8px;padding-top:6px}.leak-document .document-footer{margin-top:6px;padding-top:6px}`;
  style.textContent += `.commissioning-document h2{margin:9px 0 4px}.commissioning-document .field-summary-card{padding:5px 8px}.commissioning-document .field-summary-card dd{font-size:16px;margin-top:2px}.commissioning-document .checklist-steps{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:16px}.commissioning-document .checklist-steps li{min-width:0}.commissioning-document .field-inline-note{font-size:11px;margin:4px 0;padding:3px 0;border-bottom:1px solid #d7dfe2}.commissioning-document .cycle-input-line{font-size:11px;color:#405158;margin:4px 0 8px;line-height:1.35}.commissioning-document .cycle-details .row{padding:2px 0}`;
  style.textContent += `.print-toolbar{position:sticky;top:0;z-index:10;display:flex;gap:8px;align-items:stretch;background:#fff;border-bottom:1px solid #929fa5;padding:10px 0;margin:0 0 16px}.print-toolbar a,.print-toolbar button{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:0;flex:1;padding:8px 12px;border:1px solid #283b42;border-radius:5px;background:#fff;color:#182127;font:600 14px/1.2 system-ui,sans-serif;text-align:center;text-decoration:none;cursor:pointer}.print-toolbar .print-action{background:#283b42;color:#fff}.print-toolbar button:disabled{opacity:.5;cursor:wait}.print-toolbar :focus-visible{outline:3px solid #276e9f;outline-offset:2px}@media screen and (max-width:500px){body{margin:0 auto;padding:0 16px 24px}.rows,.detail-list{grid-template-columns:minmax(0,1fr)}.row dt{overflow-wrap:anywhere}.sources,.source-list{columns:1}.print-toolbar{margin:0 -16px 16px;padding:calc(8px + env(safe-area-inset-top)) 16px 10px}.print-toolbar a,.print-toolbar button{padding:8px 7px}}@media print{.print-toolbar{display:none!important}}`;
  style.textContent += `.field-report-document .detail-long{grid-column:1 / -1;break-inside:auto;page-break-inside:auto}.field-report-document .detail-long dd{orphans:3;widows:3}.protocol-manifest{font-size:11px;padding-left:18px}.protocol-manifest li{margin:4px 0;break-inside:avoid}.field-report-document p{orphans:3;widows:3}`;
  doc.head.append(style);
  const toolbar = doc.createElement("nav");
  toolbar.className = "print-toolbar";
  toolbar.setAttribute(
    "aria-label",
    locale === "fi" ? "Raportin toiminnot" : "Report actions",
  );
  const back = doc.createElement("a");
  const returnUrl = window.location.href;
  back.href = returnUrl;
  back.textContent = locale === "fi" ? "Takaisin raporttiin" : "Back to report";
  back.addEventListener("click", (event) => {
    event.preventDefault();
    try {
      window.focus();
      win.close();
      if (win.closed) return;
    } catch {
      /* Closing may be unavailable in an installed web app. */
    }
    // document.open() can inherit the original URL. A link to that exact URL
    // then leaves the temporary print DOM in place; reload fetches the app.
    const current = new URL(win.location.href, returnUrl);
    const target = new URL(returnUrl);
    const reloadRequired =
      current.origin === target.origin &&
      current.pathname === target.pathname &&
      current.search === target.search;
    win.location.replace(returnUrl);
    if (reloadRequired) win.location.reload();
  });
  const print = doc.createElement("button");
  print.type = "button";
  print.className = "print-action";
  print.textContent = locale === "fi" ? "Tulosta / PDF" : "Print / PDF";
  print.disabled = true;
  print.addEventListener("click", () => win.print());
  toolbar.append(back, print);
  doc.body.append(toolbar);
  const brand = doc.createElement("p");
  brand.className = "brand";
  brand.textContent = "PHASEKIT / " + (locale === "fi" ? "Raportti" : "Report");
  doc.body.append(brand);
  return doc;
}

export function appendPrintFooter(
  doc: Document,
  locale: Locale,
  details: string[] = [],
  parent: HTMLElement = doc.body,
) {
  const footer = doc.createElement("footer");
  footer.className = "document-footer";
  const printedAt = new Intl.DateTimeFormat(
    locale === "fi" ? "fi-FI" : "en-GB",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date());
  footer.textContent = [
    ...details,
    `${locale === "fi" ? "Tulostettu" : "Printed"}: ${printedAt}`,
    `${locale === "fi" ? "Tulostusohjelma" : "Printed with"}: PhaseKit ${APP_VERSION}`,
  ].join(" · ");
  parent.append(footer);
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

/** An overdue marker is relative to the saved assessment date, never print time. */
export function leakCheckPrintOverdue(
  schedule: ReturnType<typeof leakCheckPrintSchedule>,
  asOf: string,
): boolean {
  return Boolean(
    schedule.status === "dated" &&
    schedule.due &&
    isCalendarDate(asOf) &&
    schedule.due < asOf,
  );
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
  const durationNote = reportDurationNote(record, locale);
  if (durationNote) appendText(body, "p", durationNote);
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
  appendPrintFooter(doc, locale);
  win.focus();
  printWhenReady(win, doc, locale, chartImage);
  return true;
}

export function printChecklistDraft(
  draft: ChecklistDraft | FieldReport,
  locale: "fi" | "en",
) {
  const win = window.open("", "_blank");
  if (!win) return false;
  const report = draft as FieldReport;
  const definition = checklistDefinitions[draft.kind];
  const site = draft.title.trim();
  const installation =
    draft.kind === "commissioning" &&
    draft.fields.commissioningPurpose !== "technical";
  const title = installation
    ? locale === "fi"
      ? "Asennustodistus ja käyttöönottopöytäkirjat"
      : "Installation certificate and commissioning records"
    : fieldReportTitle(draft.kind, locale);
  const doc = createPrintDocument(
    win,
    `${title}${site ? ` · ${site}` : ""} · PhaseKit`,
    locale,
  );
  doc.body.classList.add("field-report-document");
  if (draft.kind === "commissioning")
    doc.body.classList.add("commissioning-document");
  appendText(doc.body, "h1", title);
  const state = doc.createElement("p");
  state.className = "document-status";
  state.textContent =
    report.status === "final"
      ? locale === "fi"
        ? "Viimeistelty raportti"
        : "Finalised record"
      : locale === "fi"
        ? "Luonnos / keskeneräinen"
        : "Draft / in progress";
  doc.body.append(state);
  if (installation) {
    const missing = commissioningMissingFields(draft.fields);
    const preparation = doc.createElement("p");
    preparation.className = "meta";
    preparation.textContent =
      locale === "fi"
        ? `Asennustodistus · VNa 1063/2025 § 9 · ${missing.length ? `${missing.length} täydennettävää` : "tietokentät täytetty"}. Vastuuhenkilön tarkastettava ja allekirjoitettava.`
        : `Installation certificate · Finnish Decree 1063/2025 § 9 · ${missing.length ? `${missing.length} items to complete` : "fields completed"}. Requires the responsible person’s review and signature.`;
    doc.body.append(preparation);
    if (missing.length)
      appendText(
        doc.body,
        "p",
        `${locale === "fi" ? "Täydennettävät tiedot" : "Items to complete"}: ${missing.map((field) => field.label[locale]).join("; ")}.`,
      );
  }
  const subhead = doc.createElement("p");
  subhead.className = "document-subhead";
  subhead.textContent =
    [
      site && `${locale === "fi" ? "Kohde" : "Site"}: ${site}`,
      draft.fields.equipment?.trim() &&
        `${locale === "fi" ? "Laite / tunniste" : "Equipment / identifier"}: ${draft.fields.equipment.trim()}`,
    ]
      .filter(Boolean)
      .join(" · ") || definition.name[locale];
  doc.body.append(subhead);
  const performedOn = draft.fields.performedOn?.trim();
  const technician = draft.fields.technician?.trim();
  const meta = doc.createElement("p");
  meta.className = "meta";
  meta.textContent = [
    `${locale === "fi" ? "Suorituspäivä" : "Work date"}: ${performedOn ? displayDate(performedOn, locale) : "—"}`,
    `${locale === "fi" ? "Tekijä" : "Technician"}: ${technician || "—"}`,
  ].join(" · ");
  doc.body.append(meta);
  if (draft.kind === "commissioning")
    appendProtocolManifest(doc, draft, locale);
  appendFieldSummary(doc, draft, locale);
  const complete = draft.checkedIds.filter((id) =>
    definition.steps.some((step) => step.id === id),
  ).length;
  if (draft.kind === "commissioning")
    appendText(
      doc.body,
      "h2",
      `${locale === "fi" ? "Työvaiheet" : "Steps"} · ${complete} / ${definition.steps.length} ${locale === "fi" ? "merkitty" : "marked"}`,
    );
  else {
    const progress = doc.createElement("p");
    progress.className = "checklist-progress";
    progress.textContent = `${locale === "fi" ? "Tila" : "Status"}: ${complete} / ${definition.steps.length} ${locale === "fi" ? "työvaihetta merkitty" : "steps marked"}`;
    doc.body.append(progress);
    appendText(doc.body, "h2", locale === "fi" ? "Työvaiheet" : "Steps");
  }
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
  appendObservationSections(doc, draft, locale);
  if (combinedReportNotes(draft).trim()) {
    appendText(
      doc.body,
      "h2",
      locale === "fi" ? "Havainnot ja muistiinpanot" : "Observations and notes",
    );
    appendText(doc.body, "p", combinedReportNotes(draft));
  }
  const cycleImage = report.cycleReport
    ? appendFrozenCycleReport(doc, report.cycleReport, locale)
    : undefined;
  const closing = doc.createElement("section");
  closing.className = "report-closing";
  appendText(
    closing,
    "h2",
    locale === "fi" ? "Allekirjoitus paperille" : "Signature on paper",
  );
  const signatureGrid = doc.createElement("div");
  signatureGrid.className = "signature-grid";
  const signatureLabels = installation
    ? locale === "fi"
      ? ["Vastuuhenkilön allekirjoitus", "Nimenselvennys"]
      : ["Responsible person's signature", "Printed name"]
    : locale === "fi"
      ? ["Allekirjoitus", "Nimenselvennys"]
      : ["Signature", "Printed name"];
  for (const label of signatureLabels) {
    const cell = doc.createElement("div");
    const line = doc.createElement("div");
    line.className = "signature-line";
    const caption = doc.createElement("div");
    caption.className = "signature-caption";
    caption.textContent = label;
    cell.append(line, caption);
    signatureGrid.append(cell);
  }
  closing.append(signatureGrid);
  if (installation) {
    appendText(
      closing,
      "p",
      locale === "fi"
        ? "Allekirjoituksellaan vastuuhenkilö vakuuttaa tehtyjen kokeiden riittävyyden ja oikeellisuuden."
        : "By signing, the responsible person attests to the sufficiency and correctness of the tests performed.",
    );
    appendText(
      closing,
      "p",
      locale === "fi"
        ? "Allekirjoituspäivä: ____________________"
        : "Date signed: ____________________",
    );
  }
  if (draft.fields.signatureName?.trim()) {
    const historicalName = doc.createElement("p");
    historicalName.className = "legacy-signature-name";
    historicalName.textContent = `${locale === "fi" ? "Aiemmin kirjattu nimi (ei allekirjoitus)" : "Previously recorded name (not a signature)"}: ${draft.fields.signatureName.trim()}`;
    closing.append(historicalName);
  }
  const notice = doc.createElement("p");
  notice.className = "notice";
  notice.textContent =
    locale === "fi"
      ? "Kirjatut arvot ja merkityt työvaiheet eivät yksin osoita kokeen hyväksyntää tai vaatimustenmukaisuutta. Nimenkirjoitus ei ole sähköinen allekirjoitus."
      : "Recorded values and checked steps alone do not certify test acceptance or regulatory compliance. A typed name is not an electronic signature.";
  closing.append(notice);
  doc.body.append(closing);
  appendPrintFooter(
    doc,
    locale,
    [
      `${locale === "fi" ? "Raportin tunnus" : "Report ID"}: ${draft.id}`,
      `${locale === "fi" ? "Versio" : "Revision"}: ${report.revision ?? 1}`,
      report.previousRevisionId &&
        `${locale === "fi" ? "Edellinen versio" : "Previous revision"}: ${report.previousRevisionId}`,
      report.appVersion &&
        `${locale === "fi" ? "Kirjattu sovelluksella" : "Recorded with"}: PhaseKit ${report.appVersion}`,
      `${locale === "fi" ? "Päivitetty" : "Updated"}: ${displayDate(draft.updatedAt, locale)}`,
      report.status === "final" &&
        report.finalizedAt &&
        `${locale === "fi" ? "Viimeistelty" : "Finalised"}: ${displayDate(report.finalizedAt, locale)}`,
    ].filter((detail): detail is string => Boolean(detail)),
    closing,
  );
  win.focus();
  printWhenReady(win, doc, locale, cycleImage);
  return true;
}

function fieldReportTitle(kind: ChecklistKind, locale: Locale): string {
  const titles: Record<ChecklistKind, { fi: string; en: string }> = {
    tightness: {
      fi: "Tiiviyskoeraportti",
      en: "Tightness test record",
    },
    evacuation: {
      fi: "Tyhjiöinti- ja pitokoeraportti",
      en: "Evacuation and standing-test record",
    },
    commissioning: { fi: "Käyttöönottoraportti", en: "Commissioning record" },
    service: { fi: "Huoltoraportti", en: "Service record" },
    refrigerant: { fi: "Kylmäainekirjaus", en: "Refrigerant handling record" },
  };
  return titles[kind][locale];
}

function appendProtocolManifest(
  doc: Document,
  draft: ChecklistDraft,
  locale: Locale,
) {
  appendText(
    doc.body,
    "h2",
    locale === "fi"
      ? "Asiakirjan sisältö ja erilliset liitteet"
      : "Document contents and separate attachments",
  );
  const list = doc.createElement("ul");
  list.className = "protocol-manifest";
  for (const protocol of commissioningProtocolStatus(draft.fields)) {
    const row = doc.createElement("li");
    const status =
      protocol.mode === "internal"
        ? locale === "fi"
          ? "sisältyy tähän asiakirjaan"
          : "included in this document"
        : protocol.mode === "external"
          ? locale === "fi"
            ? "erillinen pöytäkirja, toimitettava erikseen"
            : "separate record, supply separately"
          : locale === "fi"
            ? "kirjaus puuttuu tai on kesken"
            : "record missing or incomplete";
    row.textContent = `${protocol.label[locale]} — ${status}`;
    if (protocol.mode === "internal") {
      const link = doc.createElement("a");
      link.href = `#protocol-${protocol.id}`;
      link.textContent = locale === "fi" ? " · mittaukset" : " · readings";
      row.append(link);
    }
    list.append(row);
  }
  doc.body.append(list);
}

function fieldReportValue(
  draft: ChecklistDraft,
  field: ChecklistField,
  locale: Locale,
): string {
  const raw = draft.fields[field.id]?.trim();
  if (!raw) return "—";
  if (field.id === "operatorDeclaration" && raw !== "confirmed")
    return `${locale === "fi" ? "Ei vahvistettu (tallennettu arvo)" : "Not confirmed (recorded value)"}: ${raw}`;
  if (field.id === "refrigerantId")
    return frozenRefrigerantDesignation(draft) ?? raw;
  if (field.type === "date") return displayDate(raw, locale);
  return (
    field.options?.find((option) => option.value === raw)?.label[locale] ?? raw
  );
}

function frozenRefrigerantDesignation(
  draft: ChecklistDraft,
): string | undefined {
  const frozen = draft.fields.refrigerantDesignation?.trim();
  if (frozen) return frozen;
  const cycle = (draft as FieldReport).cycleReport;
  const cycleName = cycle?.inputs
    .find(
      (row) => row.label.fi === "Kylmäaine" || row.label.en === "Refrigerant",
    )
    ?.value.trim();
  return cycleName || draft.fields.refrigerantId?.trim();
}

/** Every entered field appears once in the printout, including legacy prose. */
export function fieldReportObservationFields(
  draft: ChecklistDraft,
  locale: Locale,
): ChecklistField[] {
  const represented = new Set([
    "equipment",
    "performedOn",
    "technician",
    "signatureName",
    "finding",
    "leakCheckEvidence",
    ...fieldReportSummary(draft, locale).map((metric) => metric.id),
    ...(draft.kind === "commissioning"
      ? evacuationMetrics(draft, locale).map((metric) => metric.id)
      : []),
  ]);
  if (
    [
      "targetPressure",
      "achievedPressure",
      "holdStartPressure",
      "holdEndPressure",
    ].some((id) => represented.has(id))
  )
    represented.add("vacuumUnit");
  if (["lp", "hp"].some((id) => represented.has(id))) {
    represented.add("pressureUnit");
    represented.add("pressureReference");
  }
  return checklistReportFields(draft).filter(
    (field) =>
      !represented.has(field.id) && Boolean(draft.fields[field.id]?.trim()),
  );
}

function selectedProtocolMode(
  draft: ChecklistDraft,
  group: string,
): "internal" | "external" {
  const keys = (
    {
      tightness: ["tightnessRecordMode", "tightnessTestReportReference"],
      evacuation: ["evacuationRecordMode", "evacuationReportReference"],
      "test-run": ["testRunRecordMode", "testRunReportReference"],
    } as Record<string, string[]>
  )[group];
  return keys &&
    (draft.fields[keys[0]] === "external" ||
      (draft.fields[keys[0]] !== "internal" && draft.fields[keys[1]]?.trim()))
    ? "external"
    : "internal";
}
function isRetainedProtocolField(
  draft: ChecklistDraft,
  field: ChecklistField,
): boolean {
  if (
    draft.kind !== "commissioning" ||
    !["tightness", "evacuation", "test-run"].includes(field.group ?? "") ||
    field.id.endsWith("RecordMode")
  )
    return false;
  return field.id.endsWith("ReportReference")
    ? selectedProtocolMode(draft, field.group!) === "internal"
    : selectedProtocolMode(draft, field.group!) === "external";
}

function appendObservationSections(
  doc: Document,
  draft: ChecklistDraft,
  locale: Locale,
) {
  const observations = fieldReportObservationFields(draft, locale);
  const vacuumMetrics =
    draft.kind === "commissioning" ? evacuationMetrics(draft, locale) : [];
  if (!observations.length && !vacuumMetrics.length) return;
  const groups =
    draft.kind === "commissioning"
      ? [
          {
            id: "installation",
            title:
              locale === "fi" ? "Asennus ja vastuut" : "Installation and roles",
          },
          {
            id: "test-reports",
            title:
              locale === "fi"
                ? "Koepöytäkirjat ja vakuutus"
                : "Test records and declaration",
          },
          {
            id: "evacuation",
            title:
              locale === "fi"
                ? "Tyhjiöinnin ja pitokokeen mittaukset"
                : "Evacuation and standing-test readings",
          },
          {
            id: "refrigerant",
            title:
              locale === "fi"
                ? "Kylmäaine ja täyttö"
                : "Refrigerant and charge",
          },
          {
            id: "leak-check",
            title:
              locale === "fi"
                ? "Vuototarkastusväli ja peruste"
                : "Leak-check interval and basis",
          },
          {
            id: "tightness",
            title:
              locale === "fi"
                ? "Tiiviyskoepöytäkirja"
                : "Tightness-test record",
          },
          {
            id: "test-run",
            title: locale === "fi" ? "Koekäyttöpöytäkirja" : "Test-run record",
          },
          {
            id: "other",
            title: locale === "fi" ? "Muut havainnot" : "Other observations",
          },
        ]
      : [{ id: "all", title: locale === "fi" ? "Havainnot" : "Observations" }];
  for (const group of groups) {
    const fields = observations.filter(
      (field) =>
        group.id === "all" ||
        (group.id === "other" ? !field.group : field.group === group.id),
    );
    if (!fields.length && !(group.id === "evacuation" && vacuumMetrics.length))
      continue;
    if (
      draft.kind === "commissioning" &&
      fields.length === 1 &&
      (group.id === "test-reports" || group.id === "other") &&
      fields[0].id !== "operatorDeclaration" &&
      !fields[0].id.endsWith("ReportReference")
    ) {
      const note = doc.createElement("p");
      note.className = "field-inline-note";
      note.textContent = `${fields[0].label[locale]}: ${fieldReportValue(draft, fields[0], locale)}`;
      doc.body.append(note);
      continue;
    }
    appendText(doc.body, "h2", group.title);
    if (["tightness", "evacuation", "test-run"].includes(group.id))
      doc.body.lastElementChild!.id = `protocol-${group.id}`;
    if (
      fields.some(
        (field) =>
          field.id.endsWith("ReportReference") &&
          !isRetainedProtocolField(draft, field),
      )
    )
      appendText(
        doc.body,
        "p",
        locale === "fi"
          ? "Viitteet yksilöivät erilliset pöytäkirjat. Tämä PDF ei sisällä niitä liitteinä."
          : "References identify separate test reports. They are not attached to this PDF.",
      );
    if (group.id === "evacuation" && vacuumMetrics.length) {
      if (selectedProtocolMode(draft, "evacuation") === "external")
        appendText(
          doc.body,
          "p",
          locale === "fi"
            ? "Säilytetyt aiemmat mittaukset. Valittu tyhjiöintipöytäkirja toimitetaan erikseen viitteen mukaisesti."
            : "Retained earlier readings. Supply the selected external evacuation record according to its reference.",
        );
      appendMetricGrid(doc, vacuumMetrics, true, locale);
      appendVacuumNote(doc, locale);
    }
    const list = doc.createElement("dl");
    list.className = "detail-list";
    for (const field of fields) {
      const item = doc.createElement("div");
      if (
        (draft.fields[field.id]?.length ?? 0) > 180 ||
        field.type === "textarea"
      )
        item.className = "detail-long";
      const dt = doc.createElement("dt");
      dt.textContent =
        field.label[locale] +
        (isRetainedProtocolField(draft, field)
          ? locale === "fi"
            ? " · aiempi tieto, ei valitun pöytäkirjan osa"
            : " · retained earlier value, not part of the selected record"
          : "");
      const dd = doc.createElement("dd");
      dd.textContent = fieldReportValue(draft, field, locale);
      item.append(dt, dd);
      list.append(item);
    }
    doc.body.append(list);
  }
}

type FieldSummaryMetric = {
  id: string;
  label: { fi: string; en: string };
  value: string;
};
const fieldLabel = (fi: string, en: string) => ({ fi, en });

function evacuationMetrics(draft: ChecklistDraft, locale: Locale) {
  return fieldReportSummary({ ...draft, kind: "evacuation" }, locale);
}

function structuredNumber(raw?: string): Decimal | undefined {
  const value = raw?.trim().replace(",", ".");
  if (!value || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return undefined;
  const parsed = new Decimal(value);
  return parsed.isFinite() ? parsed : undefined;
}

/** Builds a display summary only from structured fields. Legacy prose stays in observations. */
export function fieldReportSummary(
  draft: ChecklistDraft,
  locale: Locale,
): FieldSummaryMetric[] {
  const metrics: FieldSummaryMetric[] = [];
  const add = (
    id: string,
    fi: string,
    en: string,
    value: string | undefined,
  ) => {
    if (value) metrics.push({ id, label: fieldLabel(fi, en), value });
  };
  const numeric = (id: string, unit: string, allowNegative = false) => {
    const value = structuredNumber(draft.fields[id]);
    if (!value || (!allowNegative && value.isNegative())) return undefined;
    return `${formatReportValue(value.toString(), locale)} ${unit}`;
  };
  if (draft.kind === "evacuation") {
    const unit = ["mbar", "micron", "Pa"].includes(draft.fields.vacuumUnit)
      ? draft.fields.vacuumUnit
      : undefined;
    add(
      "holdStartPressure",
      "Pitokokeen alkupaine",
      "Standing-test start pressure",
      unit && numeric("holdStartPressure", `${unit}(a)`),
    );
    add(
      "holdEndPressure",
      "Pitokokeen loppupaine",
      "Standing-test end pressure",
      unit && numeric("holdEndPressure", `${unit}(a)`),
    );
    add(
      "holdMinutes",
      "Pitokokeen kesto",
      "Standing-test duration",
      numeric("holdMinutes", "min"),
    );
    const start = structuredNumber(draft.fields.holdStartPressure);
    const end = structuredNumber(draft.fields.holdEndPressure);
    if (unit && start && end && !start.isNegative() && !end.isNegative())
      add(
        "holdDelta",
        "Paineen muutos (loppu − alku)",
        "Pressure change (end − start)",
        `${formatReportValue(end.minus(start).toString(), locale)} ${unit}`,
      );
    add(
      "achievedPressure",
      "Saavutettu paine ennen pumpun erottamista",
      "Achieved pressure before pump isolation",
      unit && numeric("achievedPressure", `${unit}(a)`),
    );
    add(
      "targetPressure",
      "Tavoitepaine",
      "Target pressure",
      unit && numeric("targetPressure", `${unit}(a)`),
    );
    add(
      "evacuationMinutes",
      "Tyhjiöinnin kesto",
      "Evacuation duration",
      numeric("evacuationMinutes", "min"),
    );
  } else if (draft.kind === "commissioning") {
    add(
      "refrigerantId",
      "Kylmäaine",
      "Refrigerant",
      frozenRefrigerantDesignation(draft),
    );
    add("chargeKg", "Täyttömäärä", "Charge", numeric("chargeKg", "kg"));
    const unit = ["bar", "kPa", "MPa", "psi"].includes(
      draft.fields.pressureUnit,
    )
      ? draft.fields.pressureUnit
      : undefined;
    const reference =
      draft.fields.pressureReference === "gauge"
        ? "g"
        : draft.fields.pressureReference === "absolute"
          ? "a"
          : undefined;
    if (unit && reference) {
      add(
        "lp",
        "LP · imupaine",
        "LP · suction pressure",
        numeric("lp", `${unit}(${reference})`, reference === "g"),
      );
      add(
        "hp",
        "HP · korkeapaine",
        "HP · high pressure",
        numeric("hp", `${unit}(${reference})`, reference === "g"),
      );
    }
    add("suctionC", "Imukaasu", "Suction", numeric("suctionC", "°C", true));
    add(
      "dischargeC",
      "Kuumakaasu",
      "Discharge gas",
      numeric("dischargeC", "°C", true),
    );
    add("liquidC", "Neste", "Liquid", numeric("liquidC", "°C", true));
  } else if (draft.kind === "refrigerant") {
    add(
      "refrigerantId",
      "Kylmäaine",
      "Refrigerant",
      frozenRefrigerantDesignation(draft),
    );
    add("addedKg", "Lisätty", "Added", numeric("addedKg", "kg"));
    add(
      "recoveredKg",
      "Talteenotettu",
      "Recovered",
      numeric("recoveredKg", "kg"),
    );
  }
  return metrics;
}

function appendFieldSummary(
  doc: Document,
  draft: ChecklistDraft,
  locale: Locale,
) {
  const metrics = fieldReportSummary(draft, locale);
  if (metrics.length) {
    appendText(
      doc.body,
      "h2",
      locale === "fi" ? "Kirjatut pääarvot" : "Recorded key values",
    );
    appendMetricGrid(doc, metrics, draft.kind === "commissioning", locale);
  }
  if (draft.kind === "evacuation") appendVacuumNote(doc, locale);
}
function appendVacuumNote(doc: Document, locale: Locale) {
  const note = doc.createElement("p");
  note.className = "field-summary-note";
  note.textContent =
    locale === "fi"
      ? "Paineen muutos on kirjattujen absoluuttisten paineiden erotus. Vertaa arvoja kohteen omiin hyväksymisrajoihin."
      : "Pressure change is the difference between recorded absolute pressures. Compare the readings with the equipment's acceptance criteria.";
  doc.body.append(note);
}

function appendMetricGrid(
  doc: Document,
  metrics: FieldSummaryMetric[],
  compact: boolean,
  locale: Locale,
) {
  const grid = doc.createElement("dl");
  grid.className = `field-summary${compact ? " field-summary-compact" : ""}`;
  for (const metric of metrics) {
    const card = doc.createElement("div");
    card.className = "field-summary-card";
    const dt = doc.createElement("dt");
    dt.textContent = metric.label[locale];
    const dd = doc.createElement("dd");
    dd.textContent = metric.value;
    card.append(dt, dd);
    grid.append(card);
  }
  doc.body.append(grid);
}

function appendFrozenCycleReport(
  doc: Document,
  report: ToolRecord,
  locale: Locale,
): HTMLImageElement | undefined {
  appendText(
    doc.body,
    "h2",
    locale === "fi"
      ? "Liitetty kylmäkiertolaskelma"
      : "Attached refrigeration-cycle calculation",
  );
  appendText(doc.body, "p", reportName(report, locale));
  const details = doc.createElement("section");
  details.className = "cycle-details";
  appendRows(
    doc,
    details,
    locale === "fi" ? "Laskelman tulokset" : "Calculation results",
    report.outputs,
    locale,
    primaryReportOutputs(report),
  );
  if (report.inputs.length) {
    const inputs = doc.createElement("p");
    inputs.className = "cycle-input-line";
    inputs.textContent = `${locale === "fi" ? "Laskelman lähtötiedot" : "Calculation inputs"}: ${report.inputs.map((row) => `${row.label[locale]} ${formatReportRow(row, locale)}`).join(" · ")}`;
    details.append(inputs);
  }
  doc.body.append(details);
  let image: HTMLImageElement | undefined;
  if (report.chartSnapshot) {
    const figure = doc.createElement("section");
    figure.style.breakInside = "avoid";
    appendText(
      figure,
      "h2",
      locale === "fi"
        ? "Tallennettu log(p)–h-kaavio"
        : "Saved log(p)–h diagram",
    );
    image = doc.createElement("img");
    image.className = "chart";
    image.alt =
      locale === "fi"
        ? "Tallennettu log(p)–h-kaavio"
        : "Saved log(p)–h diagram";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderCycleChartSvg(report.chartSnapshot, locale))}`;
    figure.append(image);
    appendText(
      figure,
      "p",
      locale === "fi"
        ? "Rajattu CoolProp HEOS -malli. Suorat viivat kuvaavat kierron järjestystä, eivät prosessireittiä."
        : "Bounded CoolProp HEOS model. Straight lines show cycle order, not the process path.",
    );
    doc.body.append(figure);
  }
  if (report.notes) appendText(doc.body, "p", report.notes);
  if (report.dataVersion)
    appendText(
      doc.body,
      "p",
      `${locale === "fi" ? "Aineistoversio" : "Data version"}: ${report.dataVersion}`,
    );
  appendSourceList(doc, doc.body, report.sources, locale);
  return image;
}

function appendSourceList(
  doc: Document,
  parent: HTMLElement,
  sources: Source[],
  locale: Locale,
) {
  if (!sources.length) return;
  const list = doc.createElement("ul");
  list.className = "source-list";
  for (const source of sources) {
    const item = doc.createElement("li");
    const link = doc.createElement("a");
    link.textContent = source.title;
    if (safeHttpUrl(source.url)) link.href = source.url;
    link.rel = "noreferrer";
    const meta = doc.createElement("span");
    meta.className = "source-meta";
    meta.textContent = [
      source.id,
      source.version,
      source.checkedAt &&
        `${locale === "fi" ? "tark." : "checked"} ${source.checkedAt}`,
    ]
      .filter(Boolean)
      .join(" · ");
    item.append(link, doc.createTextNode(" · "), meta);
    list.append(item);
  }
  parent.append(list);
}

export function printWhenReady(
  win: Window,
  doc: Document,
  locale: Locale,
  image?: HTMLImageElement,
) {
  const action = doc.querySelector<HTMLButtonElement>(".print-action");
  if (!action) return;
  if (!image) {
    action.disabled = false;
    return;
  }
  const failed = () => {
    const warning = doc.createElement("p");
    warning.className = "notice";
    warning.setAttribute("role", "alert");
    warning.textContent =
      locale === "fi"
        ? "Tallennetun kaavion lataus epäonnistui. Tulostusta ei aloitettu."
        : "The saved chart could not load. Printing was cancelled.";
    image.replaceWith(warning);
    win.focus();
  };
  const ready = () =>
    image.naturalWidth > 0 ? (action.disabled = false) : failed();
  if (image.complete) ready();
  else {
    image.onload = ready;
    image.onerror = failed;
  }
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
  doc.body.classList.add("leak-document");
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
    `${interval} · ${designation} · ${formatDecimal(result.input.charge, locale)} ${result.input.unit}`,
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
  if (leakCheckPrintOverdue(schedule, result.input.asOf)) {
    const alert = doc.createElement("p");
    alert.className = "hero-alert";
    alert.textContent = `${locale === "fi" ? "Tarkastus myöhässä arviointipäivänä" : "Leak check overdue on assessment date"} ${displayDate(result.input.asOf, locale)}`;
    hero.append(alert);
  }
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
  inputs.className = "detail-list";
  const input = result.input;
  const yesNo = (value: boolean) => translate(locale, value ? "yes" : "no");
  const inputRows: [string, string][] = [
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
  for (const [label, value] of inputRows) {
    const row = doc.createElement("div");
    const dt = doc.createElement("dt");
    dt.textContent = label;
    const dd = doc.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    inputs.append(row);
  }
  doc.body.append(inputs);
  if (result.components.length) {
    appendText(
      doc.body,
      "h2",
      locale === "fi" ? "Aineosien laskenta" : "Component calculation",
    );
    const table = makeCompactTable(doc, [
      locale === "fi" ? "Aineosa" : "Component",
      locale === "fi" ? "Laskentaperuste" : "Calculation basis",
      "CO₂e",
    ]);
    for (const component of result.components)
      appendTableRow(doc, table, [
        [
          componentDesignations?.[component.refrigerantId] ??
            component.refrigerantId,
          `${formatDecimal(component.massPercent, locale)} % · ${formatDecimal(component.massKg, locale)} kg`,
        ],
        [
          `${locale === "fi" ? "Liite" : "Annex"} ${component.annex} · ${component.gwp ? `GWP ${formatDecimal(component.gwp, locale)}` : "GWP —"}`,
          component.gwpBasis ?? "",
        ],
        [
          component.tonnesCO2e
            ? `${formatDecimal(component.tonnesCO2e, locale)} t`
            : "—",
        ],
      ]);
    doc.body.append(table);
  }
  if (result.obligations.length) {
    appendText(doc.body, "h2", locale === "fi" ? "Velvoitteet" : "Obligations");
    const table = makeCompactTable(doc, [
      locale === "fi" ? "Soveltuva aine" : "Applicable gas",
      locale === "fi" ? "Kynnys ja sääntö" : "Threshold and rule",
      locale === "fi" ? "Väli" : "Interval",
    ]);
    for (const item of result.obligations)
      appendTableRow(doc, table, [
        [
          item.component
            .split("+")
            .map((id) => componentDesignations?.[id] ?? id)
            .join(" + "),
        ],
        [
          `${formatDecimal(item.quantity, locale)} ${item.unit === "tCO2e" ? "t CO₂e" : item.unit} · ${plainRuleLabel(item.ruleId, locale)}`,
          item.ruleId,
        ],
        [
          item.months === null
            ? "—"
            : `${item.months} ${locale === "fi" ? "kk" : "mo"}`,
        ],
      ]);
    doc.body.append(table);
  }
  if (result.state === "insufficient_data" && result.requiredInputs.length) {
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
  const versions = doc.createElement("p");
  versions.className = "source-version-line";
  versions.textContent = [
    `${locale === "fi" ? "Sääntöversio" : "Ruleset version"}: ${result.rulesetVersion}`,
    `${locale === "fi" ? "Aineistoversio" : "Data version"}: ${result.dataVersion}`,
  ].join(" · ");
  doc.body.append(versions);
  appendSourceList(doc, doc.body, sources, locale);
  const closing = doc.createElement("section");
  closing.className = "report-closing";
  const notice = doc.createElement("p");
  notice.className = "notice";
  notice.textContent =
    locale === "fi"
      ? "Tämä on tallennettuihin lähtötietoihin ja lähteisiin perustuva arvio, ei todistus tehdystä tarkastuksesta."
      : "This is an assessment based on the recorded inputs and sources, not proof that an inspection was performed.";
  closing.append(notice);
  appendPrintFooter(doc, locale, [], closing);
  doc.body.append(closing);
  win.focus();
  printWhenReady(win, doc, locale);
  return true;
}

function makeCompactTable(doc: Document, headings: string[]): HTMLTableElement {
  const table = doc.createElement("table");
  table.className = "compact-table";
  const head = doc.createElement("thead");
  const tr = doc.createElement("tr");
  for (const label of headings) {
    const th = doc.createElement("th");
    th.textContent = label;
    tr.append(th);
  }
  head.append(tr);
  table.append(head, doc.createElement("tbody"));
  return table;
}

function appendTableRow(
  doc: Document,
  table: HTMLTableElement,
  cells: [string, string?][],
) {
  const tr = doc.createElement("tr");
  for (const [main, secondary] of cells) {
    const td = doc.createElement("td");
    td.textContent = main;
    if (secondary) {
      const subline = doc.createElement("span");
      subline.className = "subline";
      subline.textContent = secondary;
      td.append(subline);
    }
    tr.append(td);
  }
  table.tBodies[0].append(tr);
}

function plainRuleLabel(ruleId: string, locale: Locale): string {
  const threshold = /^(fgas-I|fgas-II|ods)-(\d+)$/.exec(ruleId);
  if (!threshold) return locale === "fi" ? "Sääntö" : "Rule";
  const annex =
    threshold[1] === "fgas-I"
      ? locale === "fi"
        ? "F-kaasu, liite I"
        : "F-gas, Annex I"
      : threshold[1] === "fgas-II"
        ? locale === "fi"
          ? "F-kaasu, liite II"
          : "F-gas, Annex II"
        : locale === "fi"
          ? "Otsoniaine, liite I"
          : "ODS, Annex I";
  const unit = threshold[1] === "fgas-I" ? "t CO₂e" : "kg";
  return `${annex}, ${threshold[2]} ${unit}`;
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
