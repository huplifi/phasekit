import type { ToolRecord } from "./storage";

export function downloadToolRecord(record: ToolRecord) {
  const blob = new Blob([JSON.stringify(record, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `phasekit-report-${safeFilename(record.id)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printToolRecord(record: ToolRecord, locale: "fi" | "en") {
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
  title.textContent = record.title;
  const style = doc.createElement("style");
  style.textContent = `body{font:15px/1.5 system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 24px;color:#182127}h1,h2{line-height:1.2}h1{font-size:26px}h2{font-size:18px;margin-top:28px}.meta,.muted{color:#53636d}dl{margin:0}dt{font-weight:650;margin-top:12px}dd{margin:2px 0 0 0;white-space:pre-wrap}li{margin:8px 0;overflow-wrap:anywhere}a{color:#174f72}.notice{border-top:1px solid #bbc6ca;margin-top:24px;padding-top:12px;color:#53636d}@media print{body{margin:0 auto;padding:0 12mm}a{color:inherit;text-decoration:none}}`;
  head.append(title, style);
  const body = doc.createElement("body");
  const h1 = doc.createElement("h1");
  h1.textContent = record.title;
  body.append(h1);
  const meta = doc.createElement("p");
  meta.className = "meta";
  meta.textContent = `${locale === "fi" ? "Tallennettu" : "Saved"}: ${record.createdAt}`;
  body.append(meta);
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
    link.href = source.url;
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
    dd.textContent = `${row.value}${row.unit ? ` ${row.unit}` : ""}`;
    dl.append(dt, dd);
  }
  body.append(dl);
}

function appendText(parent: HTMLElement, tag: "h2" | "p", value: string) {
  const el = parent.ownerDocument.createElement(tag);
  el.textContent = value;
  parent.append(el);
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9-]/gi, "-").slice(0, 80) || "saved";
}
