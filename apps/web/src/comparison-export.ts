import type { Refrigerant } from "../../../packages/core/src/contracts";
import { dataset } from "./data";
import { translate } from "../../../packages/i18n/src";
import { refinementText } from "../../../packages/i18n/src/refinements";
import {
  createPrintDocument,
  appendPrintFooter,
  printWhenReady,
} from "./report-export";

/** Copy the rendered factual cells so screen and paper share formatting and unknown states. */
export function printComparison(
  table: HTMLTableElement,
  refrigerants: Refrigerant[],
  locale: "fi" | "en",
): boolean {
  if (refrigerants.length < 2 || refrigerants.length > 3) return false;
  const win = window.open("", "_blank");
  if (!win) return false;
  const title =
    locale === "fi" ? "Kylmäainevertailu" : "Refrigerant comparison";
  const doc = createPrintDocument(win, title, locale);
  doc.body.classList.add("comparison-document");
  const style = doc.createElement("style");
  style.textContent = `.comparison-document .compare-table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:10.5px;line-height:1.35}.compare-table th,.compare-table td{padding:6px 7px;border-bottom:1px solid #cbd5da;text-align:left;vertical-align:top;overflow-wrap:anywhere}.compare-table th:first-child{width:22%}.compare-table thead{display:table-header-group}.compare-table thead th{font-size:14px;border-bottom:2px solid #283b42}.compare-table tr{break-inside:avoid;page-break-inside:avoid}.compare-table p{margin:2px 0}.compare-table .caption{display:block;font-size:9px;color:#405158;margin-top:3px}.compare-table .mono{font-variant-numeric:tabular-nums}.compare-table .oil-code-list,.compare-table .oil-code{display:block}.compare-table .oil-code .mono{font-weight:650;margin-right:5px}.comparison-document .comparison-sources{font-size:9px;line-height:1.4;columns:2;column-gap:18px;padding-left:20px}.comparison-sources li{break-inside:avoid;margin-bottom:8px;overflow-wrap:anywhere}.comparison-sources p{margin:3px 0}.comparison-sources a{overflow-wrap:anywhere}.comparison-document .notice{margin:10px 0;padding-top:8px}.comparison-document .source-users{font-weight:650}`;
  doc.head.append(style);
  const brand = doc.querySelector<HTMLElement>(".brand");
  if (brand)
    brand.textContent =
      "PHASEKIT / " + (locale === "fi" ? "Vertailu" : "Comparison");
  const heading = doc.createElement("h1");
  heading.textContent = title;
  const subtitle = doc.createElement("p");
  subtitle.className = "meta";
  subtitle.textContent = refrigerants.map((r) => r.designation).join(" · ");
  doc.body.append(heading, subtitle);
  const cloned = doc.importNode(table, true);
  cloned
    .querySelectorAll("button, [data-comparison-sources]")
    .forEach((node) => node.remove());
  cloned.querySelectorAll("a").forEach((link) => {
    const text = doc.createElement("span");
    text.textContent = link.textContent;
    text.className = link.className;
    link.replaceWith(text);
  });
  const sourceIds = (r: Refrigerant) =>
    new Set([
      ...r.sourceIds,
      ...Object.values(r.facts).flatMap((fact) => fact.sourceIds),
      ...r.components.flatMap((component) => component.sourceIds),
    ]);
  const sets = refrigerants.map(sourceIds);
  const sources = dataset.sources.filter((source) =>
    sets.some((ids) => ids.has(source.id)),
  );
  const sourceRow = doc.createElement("tr");
  const sourceLabel = doc.createElement("th");
  sourceLabel.scope = "row";
  sourceLabel.textContent =
    locale === "fi" ? "Lähdeviitteet" : "Source references";
  sourceRow.append(sourceLabel);
  for (const ids of sets) {
    const cell = doc.createElement("td");
    cell.textContent =
      sources
        .map((source, index) => (ids.has(source.id) ? `[${index + 1}]` : ""))
        .filter(Boolean)
        .join(" ") ||
      (locale === "fi" ? "Lähde puuttuu" : "Source unavailable");
    sourceRow.append(cell);
  }
  cloned.tBodies[0]?.append(sourceRow);
  doc.body.append(cloned);
  const caution = doc.createElement("p");
  caution.className = "notice";
  caution.textContent = `${translate(locale, "compareHint")} ${refinementText(locale, "oilGuidanceHelp")}`;
  doc.body.append(caution);
  const sourceHeading = doc.createElement("h2");
  sourceHeading.textContent =
    locale === "fi"
      ? "Lähteet ja tietojen rajaukset"
      : "Sources and data limitations";
  doc.body.append(sourceHeading);
  const list = doc.createElement("ol");
  list.className = "comparison-sources";
  sources.forEach((source) => {
    const item = doc.createElement("li");
    const users = doc.createElement("p");
    users.className = "source-users";
    users.textContent = refrigerants
      .filter((_, index) => sets[index].has(source.id))
      .map((r) => r.designation)
      .join(" · ");
    const sourceTitle = doc.createElement("strong");
    sourceTitle.textContent = source.title;
    const url = doc.createElement("p");
    const link = doc.createElement("a");
    link.textContent = source.url;
    if (/^https?:\/\//i.test(source.url)) link.href = source.url;
    url.append(link);
    const metadata = doc.createElement("p");
    metadata.textContent = [
      source.id,
      source.version,
      `${locale === "fi" ? "Tarkistettu" : "Checked"}: ${source.checkedAt}`,
      source.license,
      source.note,
    ]
      .filter(Boolean)
      .join(" · ");
    item.append(users, sourceTitle, url, metadata);
    list.append(item);
  });
  doc.body.append(list);
  appendPrintFooter(doc, locale, [
    `${locale === "fi" ? "Aineistoversio" : "Dataset version"}: ${dataset.version}`,
  ]);
  printWhenReady(win, doc, locale);
  return true;
}
